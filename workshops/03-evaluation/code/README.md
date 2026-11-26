# Workshop 3 — evaluation module

The code shown in the W3 deck. It is written to drop into the main repo as `src/evaluation/`.

```
code/
├── evaluation/
│   ├── __main__.py           # python -m evaluation run | gate
│   ├── golden_set.py         # schema (Pydantic) + loader + fingerprint
│   ├── client.py             # the only contact with the W2 API
│   ├── runner.py             # asks every question, keeps answers + contexts
│   ├── retrieval_metrics.py  # hit@k, recall@k, precision@k, MRR, nDCG   (free)
│   ├── legal_checks.py       # citations, repealed articles, refusals    (free)
│   ├── bilingual.py          # same question in AR and EN                (free)
│   ├── ragas_eval.py         # 4 RAGAS metrics via an LLM judge          (costs tokens)
│   ├── tracking.py           # MLflow run + per_question.csv + report.json
│   └── gate.py               # thresholds -> exit 0 / exit 1 for CI
├── data/golden_set.seed.jsonl  # 10 AR/EN pairs covering every question type
├── thresholds.toml           # CI floors and ceilings
├── mock_rag_api.py           # fake /ask with 5 planted mistakes (stdlib only)
└── tests/test_evaluation.py  # tests for every free scorer and the gate
```

## Run it

```bash
pip install -r requirements.txt          # or: uv add ... in the main repo
export MLFLOW_TRACKING_URI=sqlite:///mlflow.db
export LLM_BASE_URL=... LLM_API_KEY=... LLM_MODEL=...   # same as PREWORK; JUDGE_MODEL optional

python mock_rag_api.py &                                 # or start the real W2 API on :8000
python -m evaluation run --skip-ragas --run-name mock    # free scorers only
python -m evaluation run --limit 20 --run-name hybrid    # + RAGAS
python -m evaluation gate reports/eval/report.json       # exit 1 = blocked
mlflow ui --backend-store-uri sqlite:///mlflow.db
pytest -q
```

Against the mock, the free scorers catch the planted failures and the gate fails:
`citation_grounded 0.778`, `repeal_flagged 0.000`, `hit@5_ar_minus_en -0.100`.

## What the W2 API must expose

The evaluator needs the contexts the generator actually saw, not only citations. `client.py` sends:

```json
POST /ask
{"question": "...", "return_contexts": true, "top_k": 10, "use_reranker": true, "retrieval": "hybrid"}
```

and expects:

```json
{"answer": "...",
 "contexts": [{"article_number": 147, "text": "...", "score": 0.91}],
 "sources": ["Egyptian Civil Code, Article 147"]}
```

If the final W2 API differs, change `HttpRagClient` only; nothing else touches the API.
The experiment options (`top_k`, `use_reranker`, `retrieval`) are optional: if the API ignores them,
start one API per configuration and pass `--run-name` so MLflow keeps them apart.

## Notes

- Uses the ragas **0.4** API (`ragas.metrics.collections`, `llm_factory`). Older `ragas.metrics` imports are deprecated.
- The seed golden set is written from the Civil Code articles cited in the workshop outlines. Check every
  `gold_articles` value against `articles.json` from W1 before relying on it, then merge in the reference
  benchmark (`evaluation/data/civil_code_rag_qa_benchmark.json` in the reference repo).
- MLflow 3 refuses the plain `./mlruns` file store by default; use the SQLite URI above.
