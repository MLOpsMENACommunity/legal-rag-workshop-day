# From PDF to Production — Arabic Legal RAG in One Day

**MLOps MENA Community** · Full-day offline workshop · 10:00 → 17:00

In one day we build a RAG system over the **Egyptian Civil Code** — from the raw bilingual PDF to an observed, evaluated service protected by a CI quality gate.

The project is `Project 2 — LLM / RAG · Arabic Legal Document Q&A` from the MLOps Practitioner Handbook, split into five workshops.

---

## The five workshops

| # | Workshop | Focus | Duration | Slides | Deliverable |
|---|----------|-------|----------|--------|-------------|
| 1 | [**Arabic Corpus Engineering**](workshops/01-data-and-corpus/) | PDF parsing · normalization · validation | 70 min | [deck](https://claude.ai/artifact/R2Mcwur69puABdJoYSSdXQ) | `articles.json` — one validated record per article |
| 2 | [**Hybrid Retrieval & RAG API**](workshops/02-rag-core-and-api/) | Dense + BM25 · RRF · reranking · citations | 70 min | [deck](https://claude.ai/artifact/BbPbJbKV2y9sobLcSyumry) | `/ask` returns an answer plus article citations |
| 3 | [**RAG Evaluation**](workshops/03-evaluation/) | RAGAS · golden sets · MLflow experiments | 60 min | [deck](https://claude.ai/artifact/PYnKQ9vs7zX3EQQZEkNzZj) | RAGAS scores on a golden set + MLflow runs |
| 4 | [**Serving & Performance Optimization**](workshops/04-serving-and-optimization/) | Docker Compose · load testing · caching | 60 min | [deck](https://claude.ai/artifact/P7LZaFuAG6uNhMnrqF1hWV) | `docker compose up` + measured p95 |
| 5 | [**Observability, Guardrails & CI/CD**](workshops/05-observability-guardrails-mlops/) | Langfuse · injection defence · quality gates | 65 min | [deck](https://claude.ai/artifact/B6v8TmYNqgmMyWjSW34UAe) | Langfuse traces + guardrails + CI gate |

Minute-by-minute timing is in [AGENDA.md](AGENDA.md). Setup required before the day is in [PREWORK.md](PREWORK.md).

---

## Evaluation vs Observability vs Guardrails

These three are often confused, but each does a different job:

| | Evaluation | Observability | Guardrails |
|---|---|---|---|
| The question | Is it good enough to ship? | What is it doing right now, and why? | Should this one answer go out? |
| When | Before release, on every PR | After release, on live traffic | Inline, during every request |
| Works on | A fixed golden set | Real requests, sampled | The single request in flight |
| Produces | Scores | Traces, dashboards, alerts | Allow / block / redact |
| Stops a bad answer? | No — it stops a bad release | No — it tells you afterwards | Yes — that is its job |
| Tools today | RAGAS · MLflow · CI gate | Langfuse · Prometheus · Grafana | PII scan · injection checks · rate limits |
| Think of it as | The exam | The dashcam | The brakes |

---

## Reference implementation

All code covered in the workshops is based on **Omar Farghaly's** repository:

> https://github.com/OmarFarghaly/ArabicLegalDocumentProject

It is genuinely production-shaped, so we do not build from scratch: we take it apart, understand why each decision was made, and add what is missing.

**Main change:** the original repo serves the LLM with `vLLM` and requires a GPU (`gpus: all` in the compose file). That is not possible in a workshop room, so we use an **API-based LLM** and keep vLLM as an on-screen demo only.

### What we reuse from the reference repo

| Component | Location |
|-----------|----------|
| Column-aware bilingual PDF parser | `src/parsing/pdf_parser.py` |
| Hybrid retrieval (dense + BM25 + RRF) | `src/retrieval/retrieval.py` |
| Qdrant index building | `src/vectordb/build_index.py` |
| RAG endpoint + citation enforcement | `src/api/versions/v1/rag.py` |
| Reranker | `src/reranker/` |
| Semantic cache (Redis) | `src/cache/` |
| Ready QA benchmark | `evaluation/data/civil_code_rag_qa_benchmark.json` |
| Retrieval eval @ k=10 ± reranker | `experiments/evaluation_retrivel.ipynb` |

### What is missing and we build

- RAGAS evaluation as code, not a notebook
- MLflow tracking for chunking experiments
- Langfuse tracing
- Guardrails: PII detection and prompt injection inside retrieved documents
- A real CI gate (lint currently runs with `continue-on-error: true`, so it never blocks)

---

## Out of scope for the day

Deliberately excluded so the day can finish:

- vLLM self-hosting (demo only)
- Airflow / continuous training
- Terraform / IaC
- Canary rollouts
- Knowledge distillation

All are take-home extensions on the same repository.

---

## After the day

For research directions — fine-tuning, RAFT, agentic pipelines — see:

> https://github.com/ayanasser/LegalPolicy_LLM
