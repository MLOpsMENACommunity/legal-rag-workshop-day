"""Step 1 of every eval: ask the system every golden question and keep everything it returns."""
from __future__ import annotations

import asyncio
import time

from pydantic import BaseModel

from .client import Context, RagClient
from .golden_set import GoldenItem


class Record(BaseModel):
    item: GoldenItem
    answer: str = ""
    contexts: list[Context] = []
    latency_ms: float = 0.0
    error: str | None = None
    scores: dict[str, float | None] = {}   # filled in later by each scorer

    @property
    def retrieved_articles(self) -> list[int]:
        return [c.article_number for c in self.contexts]


async def run_golden_set(items: list[GoldenItem], client: RagClient,
                         concurrency: int = 4) -> list[Record]:
    """Ask every question with bounded concurrency. One failure never kills the run."""
    gate = asyncio.Semaphore(concurrency)

    async def one(item: GoldenItem) -> Record:
        async with gate:
            start = time.perf_counter()
            try:
                result = await client.ask(item.question)
            except Exception as exc:  # recorded and counted, not raised
                return Record(item=item, error=f"{type(exc).__name__}: {exc}")
            return Record(item=item, answer=result.answer, contexts=result.contexts,
                          latency_ms=(time.perf_counter() - start) * 1000)

    return await asyncio.gather(*(one(i) for i in items))
