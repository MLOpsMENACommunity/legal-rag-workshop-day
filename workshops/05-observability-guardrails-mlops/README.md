# Workshop 5 — Observability, Guardrails & CI/CD

*Langfuse · injection defence · quality gates*

**65 minutes · 15:40 – 16:45** · [Slides](SLIDES.md)

## Goal

The system is visible from inside, protected from outside, and no one can merge a pull request that degrades it.

## Core idea

**LLM failures do not produce stack traces — they produce fluent, confident text.** Classic monitoring (uptime, latency, error rate) cannot see them. The service returns 200 OK while hallucinating.

In a legal domain, that is not a bug — it is a liability.

The workshop opens with the same **Evaluation vs Observability vs Guardrails** slide from W3, this time from the production angle.

## Part 1 — Observability (25 min)

### Langfuse

One trace shows the whole chain as nested spans:

```
user question
 ├─ embed            (how many ms? which model?)
 ├─ retrieve         (which articles? which scores?)
 ├─ rerank           (how did the order change?)
 └─ generate         (final prompt, tokens, cost, TTFT)
```

The strongest moment: **take a question the system answered wrongly, open its trace, and find which span failed.** Did retrieval bring the wrong article, or did it bring the right one and the LLM hallucinated? Different question, different fix.

Prepare this question in advance from the W3 eval run.

### RAGAS scores attached to traces

This closes the loop: evaluation is not a one-off before release — it is a continuous signal on a sample of real traffic.

### Drift and cost

- **Cosine drift** on query embeddings against a baseline. Users asking family-law questions of a contracts corpus is **real, legitimate drift** — know before users complain
- **Token cost** in Prometheus → a Grafana panel of cost per hour
- **Alert:** `faithfulness < 0.80`

## Part 2 — Guardrails (20 min)

Three items; the third is the important one.

### 1. PII detection on output

A legal system may ingest contracts containing names and national ID numbers. Responses must be scanned.

### 2. Rate limiting and budget caps

A Redis token bucket, and an **honest 429 with `Retry-After`**. A rejection the client can act on is a feature; a hang is not.

### 3. Prompt injection inside a retrieved document — RAG-specific

People think of prompt injection as a user typing "ignore previous instructions". In RAG the dangerous variant is different: **the instruction is hidden inside a document the retriever brings back.**

**Live demo (the strongest five minutes of the workshop):** add a document with a hidden instruction to the corpus, ask an ordinary question that retrieves it, and watch the system obey. The room goes quiet.

Then discuss defences: separating context from instructions, input scanning, and validating output against the retrieved articles.

## Part 3 — MLOps automation (20 min)

### A real CI gate

The reference repo's CI (`.github/workflows/ci.yml`) has a detail worth stopping on:

```yaml
- name: Lint (Ruff)
  run: uv run ruff check .
  continue-on-error: true     # ← this is not a gate
```

`continue-on-error: true` makes the check decorative. **A gate that never fails is not a gate.** An excellent teaching point taken from real code.

The pipeline we build:

```
lint → test → rebuild index → RAGAS on 20 questions → build & push
                                      ↓
                       faithfulness < 0.75 → the PR cannot merge
```

That is the difference between a project that works and an operated system: no one can degrade quality and merge.

### `dvc repro`

The corpus and index rebuild from the PDF in one command, so a reviewer can reproduce the exact result.

## Timeline

| Time | Activity |
|------|----------|
| 5 min | Why classic monitoring misses LLM failures + the three jobs |
| 15 min | **Hands-on:** Langfuse + `@observe` → traces with spans |
| 5 min | Open the trace of a wrong answer and find the responsible span |
| **checkpoint** | Everyone has seen their own trace |
| 5 min | RAGAS score on traces + cost panel |
| 10 min | **Live demo:** prompt injection in a document + defences |
| 5 min | PII and rate limiting, briefly |
| 15 min | The CI gate — open a PR and watch it fail |
| 5 min | `dvc repro` |

## Acceptance check

- [ ] Langfuse self-hosted; every `/ask` creates a trace with nested spans
- [ ] RAGAS score attached to traces
- [ ] Grafana panel shows cost per hour
- [ ] Alert configured on `faithfulness < 0.80`
- [ ] PII guardrail active on responses
- [ ] Prompt injection demo run and defences discussed
- [ ] CI actually fails when faithfulness drops (tested with a real PR)
- [ ] `dvc repro` rebuilds the corpus and index

## Failure modes

- **Self-hosted Langfuse needs Postgres and is slow the first time.** Must be in PREWORK.
- **Time gets tight here.** This is the widest workshop of the day. Priority: **Langfuse, then the injection demo, then the CI gate.** PII and rate limiting are the first to cut.
- **Detailed Prometheus/Grafana questions.** Do not go into PromQL — one panel, the rest is take-home.

## Out of scope

The full drift taxonomy, the six statistical detection methods, Evidently suites, ELK/Loki, Alertmanager routing and inhibition, and the runbook. All in the handbook as take-home.
