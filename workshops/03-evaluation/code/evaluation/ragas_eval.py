"""The four RAGAS metrics, scored by an LLM judge. Every call costs tokens: use 20 questions in the room."""
from __future__ import annotations

import asyncio
import os
from statistics import mean

from openai import AsyncOpenAI
from ragas.embeddings import HuggingFaceEmbeddings
from ragas.llms import llm_factory
from ragas.metrics.collections import (AnswerRelevancy, ContextPrecisionWithReference,
                                       ContextRecall, Faithfulness)

from .golden_set import QuestionType
from .runner import Record


def build_judge(model: str | None = None):
    """The judge is a separate model choice from the generator. Log it: a new judge = new scores."""
    client = AsyncOpenAI(base_url=os.environ["LLM_BASE_URL"], api_key=os.environ["LLM_API_KEY"])
    return llm_factory(model or os.environ.get("JUDGE_MODEL", os.environ["LLM_MODEL"]), client=client)


def build_metrics(judge, embedding_model: str = "BAAI/bge-m3") -> dict:
    embeddings = HuggingFaceEmbeddings(model=embedding_model)   # multilingual: Arabic matters
    return {
        "faithfulness": Faithfulness(llm=judge),
        "answer_relevancy": AnswerRelevancy(llm=judge, embeddings=embeddings),
        "context_precision": ContextPrecisionWithReference(llm=judge),
        "context_recall": ContextRecall(llm=judge),
    }


async def _score_one(r: Record, metrics: dict) -> None:
    contexts = [c.text for c in r.contexts]
    inputs = {
        "faithfulness": dict(user_input=r.item.question, response=r.answer, retrieved_contexts=contexts),
        "answer_relevancy": dict(user_input=r.item.question, response=r.answer),
        "context_precision": dict(user_input=r.item.question, reference=r.item.reference_answer,
                                  retrieved_contexts=contexts),
        "context_recall": dict(user_input=r.item.question, reference=r.item.reference_answer,
                               retrieved_contexts=contexts),
    }
    for name, metric in metrics.items():
        try:
            r.scores[name] = float((await metric.ascore(**inputs[name])).value)
        except Exception:                 # a judge failure is "unknown", not 0
            r.scores[name] = None


async def score_ragas(records: list[Record], metrics: dict, concurrency: int = 4) -> dict[str, float]:
    # Out-of-scope questions have no supporting context, so these metrics do not apply to them.
    todo = [r for r in records if r.error is None and r.item.type != QuestionType.OUT_OF_SCOPE]
    gate = asyncio.Semaphore(concurrency)

    async def guarded(r: Record) -> None:
        async with gate:
            await _score_one(r, metrics)

    await asyncio.gather(*(guarded(r) for r in todo))
    return {name: mean(vals) for name in metrics
            if (vals := [r.scores[name] for r in todo if r.scores.get(name) is not None])}
