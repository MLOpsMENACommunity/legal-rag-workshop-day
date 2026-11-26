"""The quality gate: turns a report into a pass/fail exit code that CI can act on (Workshop 5)."""
from __future__ import annotations

import json
import sys
import tomllib
from pathlib import Path


def check(metrics: dict[str, float], floors: dict[str, float], ceilings: dict[str, float] | None = None,
          baseline: dict[str, float] | None = None, max_drop: float = 0.05) -> list[str]:
    failures = []
    for name, minimum in floors.items():
        value = metrics.get(name)
        if value is None:
            failures.append(f"{name}: missing from report")   # a silent metric is a failing metric
        elif value < minimum:
            failures.append(f"{name}: {value:.3f} < floor {minimum:.2f}")
        elif baseline and name in baseline and baseline[name] - value > max_drop:
            failures.append(f"{name}: dropped {baseline[name] - value:.3f} vs main ({baseline[name]:.3f})")
    for name, maximum in (ceilings or {}).items():
        if metrics.get(name, 0.0) > maximum:
            failures.append(f"{name}: {metrics[name]:.3f} > ceiling {maximum:.2f}")
    return failures


def main(report: str, thresholds_file: str, baseline: str | None = None) -> int:
    metrics = json.loads(Path(report).read_text())["metrics"]
    config = tomllib.loads(Path(thresholds_file).read_text())
    base = json.loads(Path(baseline).read_text())["metrics"] if baseline else None
    failures = check(metrics, config["floors"], config.get("ceilings"), base, config.get("max_drop", 0.05))
    for line in failures:
        print(f"FAIL  {line}")
    print("GATE PASSED" if not failures else f"GATE FAILED ({len(failures)})")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:]))
