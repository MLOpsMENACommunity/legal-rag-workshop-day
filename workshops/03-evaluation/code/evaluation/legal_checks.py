"""Domain checks for legal answers. Plain code, no judge: a citation is either right or wrong."""
from __future__ import annotations

import re
from statistics import mean

from .golden_set import QuestionType
from .runner import Record

_ARABIC_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
_CITATION = re.compile(r"(?:Article|Art\.|المادة|مادة|للمادة|بالمادة)\s*\(?\s*([0-9٠-٩]{1,4})")
_REPEALED = re.compile(r"repealed|abrogated|ملغا[ةه]|ألغيت|إلغاء|ملغي", re.IGNORECASE)
_REFUSAL = re.compile(r"not cover|not found|cannot answer|outside|decline|لا يتناول|لا يغطي|خارج نطاق|لا أستطيع",
                      re.IGNORECASE)


def cited_articles(answer: str) -> set[int]:
    """'المادة ١٤٧' and 'Article 147' both become 147."""
    return {int(n.translate(_ARABIC_DIGITS)) for n in _CITATION.findall(answer)}


def check_record(r: Record) -> dict[str, float | None]:
    cited, retrieved, gold = cited_articles(r.answer), set(r.retrieved_articles), set(r.item.gold_articles)
    t = r.item.type
    return {
        # Did the answer cite anything at all? (refusals are exempt)
        "citation_present": None if t == QuestionType.OUT_OF_SCOPE else float(bool(cited)),
        # Phantom citations: cited articles the model never saw in its context
        "citation_grounded": float(cited <= retrieved) if cited else None,
        # Did it cite at least one of the articles the answer must rest on?
        "citation_correct": float(bool(cited & gold)) if gold else None,
        # Repealed articles: the only right answer says so
        "repeal_flagged": float(bool(_REPEALED.search(r.answer))) if t == QuestionType.REPEALED else None,
        # Out of scope: the system should decline instead of inventing law
        "refused_out_of_scope": float(bool(_REFUSAL.search(r.answer))) if t == QuestionType.OUT_OF_SCOPE else None,
    }


def score_legal(records: list[Record]) -> dict[str, float]:
    per_metric: dict[str, list[float]] = {}
    for r in records:
        if r.error:
            continue
        for name, value in check_record(r).items():
            r.scores[name] = value
            if value is not None:          # None = "not applicable", never counted as 0
                per_metric.setdefault(name, []).append(value)
    return {name: mean(values) for name, values in per_metric.items()}
