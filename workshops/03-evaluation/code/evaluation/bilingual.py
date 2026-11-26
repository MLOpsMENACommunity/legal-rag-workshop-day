"""Bilingual ablation: ask the same question in Arabic and English, expect the same articles back.

A cheap test of whether the embedding model understands Arabic or only matches characters.
"""
from __future__ import annotations

from collections import defaultdict

from .runner import Record


def bilingual_agreement(records: list[Record], k: int = 5) -> dict[str, float]:
    pairs: dict[str, dict[str, Record]] = defaultdict(dict)
    for r in records:
        if r.item.pair_id and r.error is None:
            pairs[r.item.pair_id][r.item.language] = r

    complete = [(p["ar"], p["en"]) for p in pairs.values() if {"ar", "en"} <= p.keys()]
    if not complete:
        return {}

    top1_same, overlap, ar_hits, en_hits = 0, 0.0, 0, 0
    for ar, en in complete:
        a, e = ar.retrieved_articles[:k], en.retrieved_articles[:k]
        top1_same += bool(a and e and a[0] == e[0])
        overlap += len(set(a) & set(e)) / len(set(a) | set(e)) if (a or e) else 0.0
        gold = set(ar.item.gold_articles)
        ar_hits += bool(gold & set(a))
        en_hits += bool(gold & set(e))

    n = len(complete)
    return {
        "bilingual_pairs": float(n),
        "bilingual_top1_agreement": top1_same / n,
        f"bilingual_jaccard@{k}": overlap / n,
        # The gap is the headline number: how much worse is Arabic than English?
        f"hit@{k}_ar_minus_en": (ar_hits - en_hits) / n,
    }
