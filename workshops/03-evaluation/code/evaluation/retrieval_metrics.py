"""Retrieval metrics. No LLM, no cost, fully deterministic: run them on every commit.

We can do this because legal answers rest on article numbers, so "relevant" is an ID match.
"""
from __future__ import annotations

import math
from statistics import mean

from .runner import Record


def hit_at_k(retrieved: list[int], gold: set[int], k: int) -> float:
    return 1.0 if gold & set(retrieved[:k]) else 0.0


def recall_at_k(retrieved: list[int], gold: set[int], k: int) -> float:
    return len(gold & set(retrieved[:k])) / len(gold)


def precision_at_k(retrieved: list[int], gold: set[int], k: int) -> float:
    top = retrieved[:k]
    return sum(a in gold for a in top) / len(top) if top else 0.0


def reciprocal_rank(retrieved: list[int], gold: set[int]) -> float:
    for rank, article in enumerate(retrieved, start=1):
        if article in gold:
            return 1.0 / rank
    return 0.0


def ndcg_at_k(retrieved: list[int], gold: set[int], k: int) -> float:
    dcg = sum(1 / math.log2(r + 1) for r, a in enumerate(retrieved[:k], 1) if a in gold)
    ideal = sum(1 / math.log2(r + 1) for r in range(1, min(len(gold), k) + 1))
    return dcg / ideal


def score_retrieval(records: list[Record], k: int = 5) -> dict[str, float]:
    """Attach per-question scores to each record and return the averages."""
    scored = [r for r in records if r.item.gold_articles and r.error is None]
    for r in scored:
        gold, got = set(r.item.gold_articles), r.retrieved_articles
        r.scores.update({
            f"hit@{k}": hit_at_k(got, gold, k),
            f"recall@{k}": recall_at_k(got, gold, k),
            f"precision@{k}": precision_at_k(got, gold, k),
            "mrr": reciprocal_rank(got, gold),
            f"ndcg@{k}": ndcg_at_k(got, gold, k),
        })
    names = [f"hit@{k}", f"recall@{k}", f"precision@{k}", "mrr", f"ndcg@{k}"]
    return {n: mean(r.scores[n] for r in scored) for n in names} if scored else {}
