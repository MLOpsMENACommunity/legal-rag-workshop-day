"""How the evaluator talks to the RAG system built in Workshop 2.

The evaluator never imports retrieval or prompt code. It only needs one call:
question in -> answer + the contexts that were actually used.
"""
from __future__ import annotations

from typing import Protocol

import httpx
from pydantic import BaseModel


class Context(BaseModel):
    article_number: int
    text: str
    score: float | None = None


class RagResult(BaseModel):
    answer: str
    contexts: list[Context]          # in rank order, after reranking
    sources: list[str] = []          # citations as the API returns them


class RagClient(Protocol):
    async def ask(self, question: str) -> RagResult: ...


class HttpRagClient:
    """Calls POST /ask. Needs the W2 API to return the contexts it used (`return_contexts`)."""

    def __init__(self, base_url: str, options: dict | None = None, timeout: float = 60.0):
        self._http = httpx.AsyncClient(base_url=base_url, timeout=timeout)
        self._options = options or {}    # e.g. {"top_k": 10, "use_reranker": True}

    async def ask(self, question: str) -> RagResult:
        payload = {"question": question, "return_contexts": True, **self._options}
        response = await self._http.post("/ask", json=payload)
        response.raise_for_status()
        return RagResult.model_validate(response.json())

    async def aclose(self) -> None:
        await self._http.aclose()
