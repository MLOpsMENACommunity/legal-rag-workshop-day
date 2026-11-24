# Workshop 3 — RAG Evaluation

*RAGAS · golden sets · MLflow experiments*

**60 minutes · 13:25 – 14:25** · [Slides](SLIDES.md)

## Goal

Turn "it seems to work" into **numbers**: a golden set, RAGAS and MLflow, with decisions based on metrics rather than impressions.

## Core idea

After W2 people are happy — the system answers and cites. This workshop shows them **it has problems they have not noticed**, and the only way to find them is to measure.

The key message of the day: **there is no universal LLM metric.** A legal RAG system needs a completely different scorecard from a chatbot or a summarizer.

## Evaluation vs Observability vs Guardrails

The workshop opens with the slide that separates the three: evaluation is the exam before release, observability is the dashcam after it, and guardrails are the brakes inside every request. Details in the [main README](../../README.md#evaluation-vs-observability-vs-guardrails).

## Code and data

The reference repo ships a **ready benchmark**:

| File | Contents |
|------|----------|
| `evaluation/data/civil_code_rag_qa_benchmark.json` | A QA set on the Civil Code |
| `evaluation/data/evaluation_results.csv` | Results of a previous run |
| `experiments/evaluation_retrivel.ipynb` | Retrieval eval @ k=10, with and without reranker |
| `experiments/evaluation_rag_response.ipynb` | Response-level eval |
| `evaluation/score_results*.jpg` | Before/after charts |

One important change: **we move evaluation from a notebook into a module in the repo.** A notebook cannot be a CI gate.

## The four RAGAS metrics

Explain each through how it fails, not its definition:

| Metric | Measures | Drops when |
|--------|----------|------------|
| **Faithfulness** | Is the answer grounded in the context? | The LLM invents a ruling not in the article — **the most dangerous failure here** |
| **Answer relevancy** | Does it answer the question? | It pastes the article text instead of answering |
| **Context precision** | Are retrieved articles relevant? | Ten articles retrieved, one useful |
| **Context recall** | Did we retrieve everything needed? | The answer needs three articles and we found one |

## Bilingual ablation — the corpus's biggest asset

Every article exists in Arabic and English, so we can **ask the same question in both languages and check that retrieval returns the same article**.

A cheap test that reveals something rarely measured: **does your embedding model understand Arabic, or does it just match characters?**

Also stress: **metrics and LLM judges trained on English can misjudge Arabic.** An English-centric judge scoring Arabic legal answers has unknown bias.

## MLflow — the MLOps part

The chunking strategy is the first real experiment:

```python
with mlflow.start_run():
    mlflow.log_params({"chunk_size": ..., "overlap": ...,
                       "embedding_model": ..., "top_k": ..., "reranker": ...})
    mlflow.log_metrics({"faithfulness": ..., "answer_relevancy": ...,
                        "context_precision": ..., "context_recall": ...})
```

Runs in the room (each table takes one, compared on screen):

1. Per-article chunks (baseline)
2. 512-token chunks — so the difference shows in numbers
3. Dense only vs hybrid
4. With and without reranker
5. top_k = 5 vs 10 vs 20

The payoff: **participants see that the W1 and W2 decisions were right — by the numbers, not by assertion.**

## Timeline

| Time | Activity |
|------|----------|
| 10 min | Why eyeballing is not evaluation + evaluation vs observability vs guardrails |
| 10 min | The golden set: reference benchmark + two questions from each participant |
| 15 min | **Hands-on:** RAGAS on the first 20 questions |
| **checkpoint** | Everyone has four numbers |
| 10 min | Bilingual ablation — the same question in both languages |
| 10 min | MLflow: each table logs a run; compare on screen |
| 5 min | Thresholds: why 0.75 in CI and 0.80 for alerts? |

## Acceptance check

- [ ] Golden set of ≥ 20 questions, Arabic and English
- [ ] All four metrics computed and logged
- [ ] ≥ 3 MLflow runs with different configurations
- [ ] Bilingual test run and its result written in the report
- [ ] Evaluation lives as a module in `src/`, not a notebook

## Failure modes

- **RAGAS consumes API quota.** Every metric makes LLM calls; 50 questions × 4 metrics adds up. **Use 20 questions in the room**; the full 50 is take-home.
- **Someone sees faithfulness = 0.95 and relaxes.** Ask about context recall: a system answering from one of three needed articles is faithful and incomplete at the same time.
- **LLM-as-judge is slow and expensive.** Leave calibration and bias tests as take-home.

## Out of scope

LLM-judge calibration, position/verbosity bias tests, human annotation protocols.
