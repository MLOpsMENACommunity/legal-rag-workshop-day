"""python -m evaluation run --golden data/golden_set.seed.jsonl --limit 20 --run-name hybrid-k5

One command: ask -> score (retrieval, legal, RAGAS, bilingual) -> log to MLflow -> report.json
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path

from .bilingual import bilingual_agreement
from .client import HttpRagClient
from .gate import main as gate_main
from .golden_set import golden_set_fingerprint, load_golden_set
from .legal_checks import score_legal
from .retrieval_metrics import score_retrieval
from .runner import run_golden_set
from .tracking import log_run


async def run(args: argparse.Namespace) -> dict[str, float]:
    items = load_golden_set(args.golden, limit=args.limit)
    system = {"top_k": args.top_k, "use_reranker": not args.no_reranker, "retrieval": args.retrieval}
    client = HttpRagClient(args.api, options=system)
    try:
        records = await run_golden_set(items, client)
    finally:
        await client.aclose()

    metrics: dict[str, float] = {"error_rate": sum(r.error is not None for r in records) / len(records)}
    metrics |= score_retrieval(records, k=args.k)        # free, deterministic
    metrics |= score_legal(records)                      # free, deterministic
    metrics |= bilingual_agreement(records, k=args.k)    # free, deterministic
    if not args.skip_ragas:                              # costs tokens
        from .ragas_eval import build_judge, build_metrics, score_ragas
        metrics |= await score_ragas(records, build_metrics(build_judge(args.judge)))

    params = {**system, "k": args.k, "n_questions": len(items), "chunking": args.chunking,
              "judge": args.judge or os.environ.get("JUDGE_MODEL", os.environ.get("LLM_MODEL", "")),
              "golden_set_hash": golden_set_fingerprint(args.golden)}
    log_run(args.run_name, params, metrics, records, Path(args.out))
    for name, value in sorted(metrics.items()):
        print(f"{name:32s} {value:.3f}")
    return metrics


def cli() -> int:
    p = argparse.ArgumentParser(prog="evaluation")
    sub = p.add_subparsers(dest="cmd", required=True)

    r = sub.add_parser("run", help="evaluate the running API on the golden set")
    r.add_argument("--golden", default="data/golden_set.seed.jsonl")
    r.add_argument("--api", default="http://localhost:8000")
    r.add_argument("--limit", type=int, default=20)
    r.add_argument("--k", type=int, default=5)
    r.add_argument("--top-k", type=int, default=10)
    r.add_argument("--retrieval", choices=["hybrid", "dense", "bm25"], default="hybrid")
    r.add_argument("--no-reranker", action="store_true")
    r.add_argument("--chunking", default="per-article", help="logged only: how the index was built")
    r.add_argument("--judge", default=None)
    r.add_argument("--skip-ragas", action="store_true", help="retrieval + legal checks only, zero tokens")
    r.add_argument("--run-name", default="baseline")
    r.add_argument("--out", default="reports/eval")

    g = sub.add_parser("gate", help="fail (exit 1) if the report is below the floors")
    g.add_argument("report")
    g.add_argument("--thresholds", default="thresholds.toml")
    g.add_argument("--baseline", default=None)

    args = p.parse_args()
    if args.cmd == "run":
        asyncio.run(run(args))
        return 0
    return gate_main(args.report, args.thresholds, args.baseline)


if __name__ == "__main__":
    sys.exit(cli())
