# Workshop 2 — Hybrid Retrieval & RAG API

*Dense + BM25 · RRF · reranking · citations*

**70 minutes · 11:30 – 12:40** · [Slides](SLIDES.md)

## Goal

From `articles.json` to a working endpoint: an Arabic question in, an answer plus **article numbers** a lawyer can verify out.

## Core idea

**Dense embeddings alone are not enough for Arabic legal text.** When someone asks about "Article 147" or a specific legal term, semantic search returns things that are *similar*, not the thing asked for. The fix is hybrid retrieval: dense + BM25, then fusion.

## Code we walk through

| File | What it teaches |
|------|-----------------|
| `src/vectordb/build_index.py` | Building the collection and payload |
| `src/retrieval/retrieval.py` | **The star file of this workshop** — hybrid + RRF |
| `src/reranker/` | Cross-encoder reranking after retrieval |
| `src/api/versions/v1/rag.py` | The full endpoint |
| `src/prompt_template/` | `build_llm_request` + `ensure_article_citations` |
| `src/utils/arabic_text.py` | `normalize_arabic_for_sparse` |

### Hybrid retrieval

```python
prefetch = [
    models.Prefetch(          # dense — meaning
        query=vector, using=lang,
        limit=retrieval_limit, score_threshold=score_threshold),
    models.Prefetch(          # sparse — exact terms
        query=models.Document(text=sparse_text, model="Qdrant/bm25"),
        using=f"bm25_{lang}", limit=retrieval_limit),
]
response = await self.client.query_points(
    collection_name=collection_name,
    prefetch=prefetch,
    query=models.FusionQuery(fusion=models.Fusion.RRF),
    limit=retrieval_reranked_limit, with_payload=True)
```

Three points to explain:

1. **Why one vector per language** (`using=lang`) instead of a single multilingual model
2. **Why BM25 needs its own normalization** (`normalize_arabic_for_sparse`) — sparse search treats diacritics and alef variants as different tokens
3. **RRF vs score fusion** — why ranks are safer than scores when fusing scorers on different scales

### Citation enforcement

```python
response.answer = ensure_article_citations(response.answer, reranked_payloads, lang)
```

The most important line in the endpoint. The LLM may give a correct answer and forget to cite, or cite an article it never saw. Enforcing citations after generation is what makes the system reviewable.

**Question for the room:** if the LLM cites an article that was not in the context, do we remove the citation, reject the whole answer, or return it with a warning? There is no single right answer — a five-minute discussion that sets up guardrails in W5.

### API contract

```http
POST /ask
{"question": "What are the conditions of a contract?"}

200
{
  "answer": "...",
  "sources": ["Egyptian Civil Code, Article 147", "..."]
}
```

The reference repo serves `/api/v1/rag/answer`; the handbook specifies `/ask`. We expose `/ask` to match the rubric, with the versioned path as an alias.

`sources` are article citations — **not chunk IDs, not page numbers**. That is the difference between a real system and a demo.

## Timeline

| Time | Activity |
|------|----------|
| 10 min | Chunk per article → embed → Qdrant collection |
| 15 min | **Hands-on:** dense search only. Ask about "Article 147" and inspect the results |
| 15 min | Add BM25 + RRF → same question → compare |
| **checkpoint** | Hybrid search works for everyone |
| 10 min | Reranker — why it is needed after fusion |
| 15 min | Prompt + citation enforcement + FastAPI `/ask` |
| 5 min | `/health` returns `documents_indexed: N`; Pydantic rejects empty questions (422) |

## The best moment of the day

After the checkpoint, everyone asks a legal question of their own in Arabic and watches the system return the correct article number. Give it three minutes — it is what people remember.

## Acceptance check

- [ ] The Qdrant collection holds every article with dense and BM25 vectors
- [ ] `/ask` answers an Arabic question and an English question
- [ ] `sources` contains article citations
- [ ] An empty question returns 422 with a readable message, not a stack trace
- [ ] `/health` reports how many documents are indexed

## Failure modes

- **Embedding models downloading in the room** → the network dies. PREWORK and the USB stick are the fix.
- **An English model used on Arabic text** without anyone noticing — results look plausible and are wrong. The perfect entry into W3.
- **langdetect misreads short questions** — the reference repo raises `ValueError` on unsupported languages. Discussion: error or fallback?

## Out of scope

Query rewriting, multi-hop retrieval, agentic RAG. They exist in the reference repo (`src/llm/query_rewriter.py`); point to them and move on.
