# Workshop 3 — RAG Evaluation

*RAGAS · golden sets · MLflow experiments*

**45 minutes** · [Slides](SLIDES.md) · interactive deck: [`slides/index.html`](slides/index.html)

> Timing note: [AGENDA.md](../../AGENDA.md) still reserves 60 minutes (13:25 – 14:25) for this slot. The deck is planned for 45; the spare 15 minutes can go to the hands-on run or to W4.

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

## Materials

| Folder | Contents |
|--------|----------|
| [`slides/`](slides/) | `index.html`: the interactive deck. One offline file: open it in a browser, no network needed |
| [`code/`](code/) | The evaluation module shown in the deck, tests, seed golden set, and a mock `/ask` API |
| [`diagrams/`](diagrams/) | The Excalidraw diagrams as editable `.excalidraw` files, built from [libraries.excalidraw.com](https://libraries.excalidraw.com) icons |

Deck keys: `→` next step, `N` speaker notes (with per-slide timing), `P` presenter window (notes, timer and next slide on your laptop while the projector shows slides), `O` overview, `T` timer, `D` dark mode, `F` fullscreen. On phones: swipe.

What moves, and why: every visual acts out the process it explains, one phase per `→`. The actors are the Excalidraw library icons (robots, stick figures, magnifier, database…), exported as sprites by `diagrams/tools/export_sprites.js`, so the style matches the libraries:
- **the day:** the PDF becomes `articles.json`, W2 answers from it, W3 scores the answer, W4 ships it, W5 gates it; the scores flow back to W4 and W5
- **evaluation vs observability vs guardrails:** a golden question goes through the system, the answer is compared with the reference and judged onto a scoreboard ×20; live users and traces until an alert rings; an answer carrying a national ID gets redacted at the guardrail
- **where RAG breaks:** one question through the pipeline, with a zoom on each failure (parser merging two articles, query landing near the wrong article, top_k cutting the 9th result, an invented clause being written, a citation with no match)
- **golden set:** questions flowing in from four sources, LLM drafts passing a human checker, versioning and what an edit does to comparability
- **the four RAGAS arrows:** the pipeline produces question, articles and answer; a judge then compares each pair
- **LLM-as-judge:** inputs fill a prompt template, it is sent, JSON comes back, code turns it into a number
- **judge biases:** four small experiments (verbosity, self-preference, language, noise)
- **faithfulness, relevancy, precision, recall, bilingual:** each metric computed step by step
- **legal checks:** regex finds citations, digits are normalised, citations are matched against the retrieved and gold sets, the repeal check fails
- **the eval module:** a records table filling row by row, scorers filling their columns, averages to MLflow, the gate blocking the PR
- **MLflow:** config knobs set, eval runs, a run card lands in the experiment table, ×3
- **the loop:** one change goes round; a production failure becomes golden question 21

`←` always shows the finished state; `↺ replay` restarts an animation. Motion is off for viewers who ask their system for reduced motion.
On the code slides, click a file, then any highlighted line to see what it does.

## Timeline (45 min)

| Min | Slides | Activity |
|-----|--------|----------|
| 3.5 | 1–4 | Where we are in the day · the eyeball test · why reading a few answers misses failures (animated) |
| 3.5 | 5–7 | Evaluation vs observability vs guardrails · no universal metric · where RAG breaks |
| 5 | 8–10 | The golden set: sources, one record field by field, coverage and pitfalls |
| 4.5 | 11–12 | The four questions (RAGAS triad + recall) · **live retrieval-metrics playground** |
| 10 | 13–20 | LLM-as-judge · its biases · faithfulness, relevancy, precision and recall, each animated as computed · failure clinic · legal checks in plain code |
| 2 | 21 | Bilingual ablation in embedding space |
| **checkpoint** | | Everyone has seen the four RAGAS numbers and the free metrics |
| 5.5 | 22–24 | Module structure (records flowing to the gate) · clickable code walkthrough · run it |
| 3 | 25–26 | MLflow: what to log · comparing runs |
| 2.5 | 27 | Thresholds: why 0.75 in CI and 0.80 for alerts (noise simulator) |
| 2 | 28–29 | Eval-driven development loop · takeaways and acceptance check |

About 42 planned minutes, leaving 3 for questions.

With 45 minutes the hands-on is a demo: run `python -m evaluation run --skip-ragas` against the mock API on screen.
If the slot stays at 60 minutes, give the extra 15 to the room running it themselves against their own W2 API.

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
