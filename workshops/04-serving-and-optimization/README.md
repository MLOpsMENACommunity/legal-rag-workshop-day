# Workshop 4 — Serving & Performance Optimization

*Docker Compose · load testing · caching*

**60 minutes · 14:25 – 15:25** · [Slides](SLIDES.md)

## Goal

The system becomes a service someone else can run in three commands, and we know at how many users it breaks.

## Core idea

In RAG, latency is not one number — it is a chain: embed → retrieve → rerank → generate. **The bottleneck is not always the LLM**, and you only find it by measuring.

## Code we walk through

| File | What it teaches |
|------|-----------------|
| `docker-compose.yaml` | Real service dependencies and healthchecks |
| `docker/index_if_changed.py` | Why indexing must be idempotent |
| `src/cache/` | Semantic cache — the cheapest optimization in RAG |
| `Dockerfile` | Multi-stage, non-root |

### Two teaching points in the compose file

```yaml
depends_on:
  indexer:
    condition: service_completed_successfully   # not service_started
```

The difference between `service_started` and `service_completed_successfully` is the difference between a service answering from an empty index and one that waits for indexing to finish.

Also the Qdrant healthcheck: bash opens a TCP socket by hand (`exec 3<>/dev/tcp/...`) because the image has no curl. Worth a minute.

### The change we make

The original compose file contains:

```yaml
vllm:
  runtime: nvidia
  gpus: all
```

**Impossible in the room.** We remove this service and point `LLM_BASE_URL` at an external API.

This is itself the best lesson of the workshop: **the LLM must sit behind an interface.** Code hard-wired to vLLM cannot be switched. The reference repo does this right — `src/llm/base.py` + `factory.py` + `vllm_client.py`.

## Optimization — in the right order

People jump straight to quantization: the most expensive option with the least certain return. The sensible order:

| # | Change | Cost | Return |
|---|--------|------|--------|
| 1 | **Semantic cache** | An hour | Large — legal questions repeat a lot |
| 2 | **Lower top_k** | Five minutes | Large — less context, fewer tokens, faster and cheaper |
| 3 | **Smaller reranker** | An hour | Moderate |
| 4 | **AWQ 4-bit** | A day + a GPU | Moderate — with a risk to faithfulness |

1 and 2 are hands-on. 4 is an on-screen demo with numbers prepared in advance.

**The rule to land:** every optimization is measured with **RAGAS before/after**, not latency alone. A faster system that hallucinates more is not an improvement.

## Timeline

| Time | Activity |
|------|----------|
| 10 min | `docker compose up` — dependency graph and healthchecks |
| 10 min | Streaming `/ask` — why perceived latency matters more than total |
| 15 min | **Hands-on:** Locust at 10 then 50 users → record p95 |
| **checkpoint** | Everyone has a p95 number |
| 10 min | Enable the semantic cache → same Locust run → compare |
| 10 min | Cost model: dollars per 1,000 questions, before and after |
| 5 min | Demo: AWQ 4-bit and its numbers |

## Acceptance check

- [ ] `docker compose up` runs the service on a colleague's laptop
- [ ] README with three commands
- [ ] Locust report in `reports/` with p95 recorded
- [ ] The cache works — a repeated question is clearly faster
- [ ] Cost per 1,000 questions calculated

## Failure modes

- **Locust burns the API quota.** Use a mock LLM or cached responses — the load test measures the serving layer, not the LLM.
- **The cache returns an answer for a different question.** A real problem: the similarity threshold is sensitive. Questions about Article 147 and Article 148 are very close semantically. **The best discussion of this workshop.**
- **Docker build takes 10 minutes.** It must be done in PREWORK.

## Out of scope

vLLM internals (KV cache, preemption, continuous batching), canary rollouts, distillation, Kubernetes.
