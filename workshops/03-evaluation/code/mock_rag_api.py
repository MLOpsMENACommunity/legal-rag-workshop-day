"""A fake /ask endpoint with realistic, deliberate mistakes. Stdlib only.

Use it to rehearse the workshop, or to run the evaluator before the W2 API is ready:

    python mock_rag_api.py &                     # serves http://localhost:8000/ask
    python -m evaluation run --skip-ragas --run-name mock

The mistakes are the ones the evaluator should catch:
  q003  retrieval miss: never returns Article 163 (hit@k drops)
  q005  Arabic only: the Arabic question retrieves the wrong article (bilingual gap)
  q006  incomplete: finds 148 but not 147 (context recall drops, still "faithful")
  q007  ignores the repeal and invents a rule (repeal_flagged + faithfulness drop)
  q008  phantom citation: cites Article 375, which it never retrieved
"""
from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

GOLDEN = {json.loads(l)["question"]: json.loads(l)
          for l in (Path(__file__).parent / "data/golden_set.seed.jsonl").read_text(encoding="utf-8").splitlines() if l}
FILLER = [12, 90, 151, 176, 420, 559, 375, 88, 100, 200]


def answer_for(item: dict, top_k: int) -> dict:
    qid, gold, ref = item["id"], list(item["gold_articles"]), item["reference_answer"]
    retrieved, answer = gold + FILLER, ref
    if qid.startswith("q003"):
        retrieved = FILLER
    if qid == "q005-ar":
        retrieved = [45, 46] + FILLER
        answer = "سن الرشد هي ثماني عشرة سنة (المادة 45)."
    if qid.startswith("q006"):
        retrieved = [148] + FILLER
        answer = ref.split(". ")[0] + "."
    if qid.startswith("q007"):
        answer = ("تنظم المادة 60 إجراءات تأسيس الجمعيات." if item["language"] == "ar"
                  else "Article 60 regulates how associations are founded.")
    if qid.startswith("q008"):
        answer = ref + (" (والمادة 375)" if item["language"] == "ar" else " (see also Article 375)")
        retrieved = [374] + [a for a in FILLER if a != 375]
    if item["type"] == "out_of_scope":
        retrieved = FILLER
    contexts = [{"article_number": a, "text": f"[text of article {a}]", "score": round(1 - i * 0.05, 2)}
                for i, a in enumerate(dict.fromkeys(retrieved).keys()) if i < top_k]
    return {"answer": answer, "contexts": contexts,
            "sources": [f"Egyptian Civil Code, Article {c['article_number']}" for c in contexts[:3]]}


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        item = GOLDEN.get(body.get("question", ""))
        if self.path != "/ask" or item is None:
            self.send_response(404); self.end_headers(); return
        payload = json.dumps(answer_for(item, int(body.get("top_k", 10))), ensure_ascii=False).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print("mock RAG API on http://localhost:8000/ask")
    HTTPServer(("127.0.0.1", 8000), Handler).serve_forever()
