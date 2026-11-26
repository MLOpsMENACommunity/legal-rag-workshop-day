"""Tests for the free, deterministic parts of the evaluator. No API key needed."""
from pathlib import Path

import pytest

from evaluation.bilingual import bilingual_agreement
from evaluation.client import Context
from evaluation.gate import check
from evaluation.golden_set import GoldenItem, load_golden_set
from evaluation.legal_checks import cited_articles, score_legal
from evaluation.retrieval_metrics import (hit_at_k, ndcg_at_k, precision_at_k, recall_at_k,
                                          reciprocal_rank, score_retrieval)
from evaluation.runner import Record

SEED = Path(__file__).parents[1] / "data" / "golden_set.seed.jsonl"


def record(gold, retrieved, answer="", qtype="concept", lang="ar", pair=None, id_="q"):
    item = GoldenItem(id=id_, question="سؤال تجريبي طويل", language=lang, type=qtype,
                      reference_answer="ref", gold_articles=gold, pair_id=pair)
    return Record(item=item, answer=answer, contexts=[Context(article_number=a, text="t") for a in retrieved])


def test_seed_golden_set_is_valid():
    items = load_golden_set(SEED)
    assert len(items) >= 20
    assert {i.language for i in items} == {"ar", "en"}


def test_golden_item_requires_gold_articles_unless_out_of_scope():
    with pytest.raises(ValueError):
        GoldenItem(id="x", question="a question", language="en", type="lookup", reference_answer="r")


def test_retrieval_metrics_by_hand():
    got, gold = [12, 147, 3, 148, 9], {147, 148}
    assert hit_at_k(got, gold, 1) == 0.0
    assert hit_at_k(got, gold, 2) == 1.0
    assert recall_at_k(got, gold, 2) == 0.5
    assert precision_at_k(got, gold, 5) == pytest.approx(0.4)
    assert reciprocal_rank(got, gold) == 0.5
    assert 0 < ndcg_at_k(got, gold, 5) < 1
    assert ndcg_at_k([147, 148], gold, 5) == pytest.approx(1.0)


def test_score_retrieval_averages_over_questions():
    recs = [record([147], [147, 1, 2]), record([89], [1, 2, 3])]
    out = score_retrieval(recs, k=3)
    assert out["hit@3"] == 0.5 and out["mrr"] == 0.5


def test_cited_articles_handles_arabic_and_english_and_indic_digits():
    assert cited_articles("وفقاً للمادة ١٤٧ والمادة 148") == {147, 148}
    assert cited_articles("See Article 89 and Art. 163.") == {89, 163}


def test_phantom_citation_is_caught():
    r = record([147], [147, 148], answer="حسب المادة 147 والمادة 999")
    score_legal([r])
    assert r.scores["citation_grounded"] == 0.0     # 999 was never retrieved
    assert r.scores["citation_correct"] == 1.0


def test_repealed_and_out_of_scope_checks():
    rep = record([60], [60], answer="Article 60 was repealed.", qtype="repealed")
    oos = record([], [1], answer="This question is outside the Civil Code.", qtype="out_of_scope")
    out = score_legal([rep, oos])
    assert out["repeal_flagged"] == 1.0 and out["refused_out_of_scope"] == 1.0
    assert oos.scores["citation_present"] is None   # not applicable is not zero


def test_bilingual_agreement():
    recs = [record([147], [147, 1], lang="ar", pair="p", id_="a"),
            record([147], [147, 2], lang="en", pair="p", id_="e")]
    out = bilingual_agreement(recs, k=2)
    assert out["bilingual_top1_agreement"] == 1.0
    assert out["bilingual_jaccard@2"] == pytest.approx(1 / 3)


def test_gate_floors_ceilings_and_regression():
    floors = {"faithfulness": 0.75}
    assert check({"faithfulness": 0.80}, floors) == []
    assert check({"faithfulness": 0.70}, floors)
    assert check({}, floors) == ["faithfulness: missing from report"]
    assert check({"faithfulness": 0.78}, floors, baseline={"faithfulness": 0.90})   # dropped 0.12
    assert check({"faithfulness": 0.8, "error_rate": 0.1}, floors, ceilings={"error_rate": 0.0})
