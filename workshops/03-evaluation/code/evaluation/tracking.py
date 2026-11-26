"""MLflow: every eval run becomes a comparable experiment, not a number in someone's terminal."""
from __future__ import annotations

import csv
import json
import subprocess
from pathlib import Path

import mlflow

from .runner import Record


def _git_sha() -> str:
    try:
        return subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], text=True).strip()
    except Exception:
        return "unknown"


def write_per_question(records: list[Record], path: Path) -> Path:
    """One row per question: this is the file you open to find out *why* a score dropped."""
    names = sorted({k for r in records for k in r.scores})
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["id", "language", "type", "gold", "retrieved", "error", *names, "answer"])
        for r in records:
            w.writerow([r.item.id, r.item.language, r.item.type.value, r.item.gold_articles,
                        r.retrieved_articles[:10], r.error or "",
                        *[r.scores.get(n) for n in names], r.answer])
    return path


def log_run(run_name: str, params: dict, metrics: dict[str, float],
            records: list[Record], out_dir: Path, experiment: str = "legal-rag-eval") -> str:
    out_dir.mkdir(parents=True, exist_ok=True)      # files first: the gate reads report.json
    per_question = write_per_question(records, out_dir / "per_question.csv")
    report = out_dir / "report.json"
    report.write_text(json.dumps({"params": params, "metrics": metrics}, indent=2, ensure_ascii=False))

    mlflow.set_experiment(experiment)                # MLFLOW_TRACKING_URI=sqlite:///mlflow.db
    with mlflow.start_run(run_name=run_name) as run:
        mlflow.set_tags({"git_sha": _git_sha(), "golden_set": params.get("golden_set_hash", "")})
        mlflow.log_params(params)        # what we changed: chunking, top_k, reranker, judge...
        mlflow.log_metrics({k.replace("@", "_at_"): v for k, v in metrics.items()})
        mlflow.log_artifact(str(per_question))
        mlflow.log_artifact(str(report))
        return run.info.run_id
