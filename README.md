# From PDF to Production — Arabic Legal RAG in One Day

**MLOps MENA Community** · يوم واحد offline · 10:00 → 17:00

إحنا هنبني في يوم واحد نظام RAG على **القانون المدني المصري** — من الـPDF الخام لحد service مـobserved وعليه evaluation وCI gate.

المشروع ده هو `Project 2 — LLM / RAG · Arabic Legal Document Q&A` من الـMLOps Practitioner Handbook، مقسّم على 5 workshops.

---

## الـ5 workshops

| # | Workshop | بيتكلم عن | المدة | Slides | اللي بيخرج منه |
|---|----------|-----------|------|--------|----------------|
| 1 | [**Arabic Corpus Engineering**](workshops/01-data-and-corpus/) | PDF parsing · normalization · validation | 70 د | [deck](https://claude.ai/artifact/R2Mcwur69puABdJoYSSdXQ) | `articles.json` — record لكل مادة، validated |
| 2 | [**Hybrid Retrieval & RAG API**](workshops/02-rag-core-and-api/) | Dense + BM25 · RRF · reranking · citations | 70 د | [deck](https://claude.ai/artifact/BbPbJbKV2y9sobLcSyumry) | `/ask` بيرجّع إجابة + أرقام مواد |
| 3 | [**RAG Evaluation**](workshops/03-evaluation/) | RAGAS · golden sets · MLflow experiments | 60 د | [deck](https://claude.ai/artifact/PYnKQ9vs7zX3EQQZEkNzZj) | RAGAS على golden set + MLflow runs |
| 4 | [**Serving & Performance Optimization**](workshops/04-serving-and-optimization/) | Docker Compose · load testing · caching | 60 د | [deck](https://claude.ai/artifact/P7LZaFuAG6uNhMnrqF1hWV) | `docker compose up` + p95 مقاس |
| 5 | [**Observability, Guardrails & CI/CD**](workshops/05-observability-guardrails-mlops/) | Langfuse · injection defence · quality gates | 65 د | [deck](https://claude.ai/artifact/B6v8TmYNqgmMyWjSW34UAe) | Langfuse traces + guardrails + CI gate |

التوقيت بالدقيقة في [AGENDA.md](AGENDA.md). اللي لازم يتسطّب قبل اليوم في [PREWORK.md](PREWORK.md).

---

## Evaluation vs Observability vs Guardrails

التلاتة بيتلخبطوا في بعض كتير، بس كل واحد بيعمل شغلانة مختلفة:

| | Evaluation | Observability | Guardrails |
|---|---|---|---|
| السؤال | ينفع نعمله ship؟ | بيعمل إيه دلوقتي، وليه؟ | الإجابة دي تطلع ولا لأ؟ |
| إمتى | قبل الـrelease، على كل PR | بعد الـrelease، على الـtraffic الحقيقي | inline، جوه كل request |
| بيشتغل على | golden set ثابت | requests حقيقية، sample | الـrequest اللي بيحصل دلوقتي |
| بيطلّع | scores | traces, dashboards, alerts | allow / block / redact |
| بيوقف إجابة غلط؟ | لأ — بيوقف release غلط | لأ — بيقولك بعدها | أيوه — دي شغلته |
| أدوات اليوم | RAGAS · MLflow · CI gate | Langfuse · Prometheus · Grafana | PII · injection checks · rate limits |
| تشبيه | الامتحان | الـdashcam | الفرامل |

---

## الـreference implementation

كل الكود اللي هنشرحه مبني على ريبو **عمر فرغلي**:

> https://github.com/OmarFarghaly/ArabicLegalDocumentProject

الريبو ده production-shaped فعلاً، فإحنا مش بنبني من الصفر — إحنا بنفكّكه، نفهم كل قرار فيه ليه اتاخد، ونضيف الحاجات الناقصة.

**التعديل الأساسي:** الريبو الأصلي بيستخدم `vLLM` ومحتاج GPU (`gpus: all` في الـcompose). في القاعة ده مستحيل — إحنا هنستخدم **API-based LLM** ونسيب vLLM كـdemo على الشاشة بس.

### اللي موجود في ريبو عمر وهنستخدمه

| الحاجة | المكان |
|--------|--------|
| Column-aware bilingual PDF parser | `src/parsing/pdf_parser.py` |
| Hybrid retrieval (dense + BM25 + RRF) | `src/retrieval/retrieval.py` |
| Qdrant index building | `src/vectordb/build_index.py` |
| RAG endpoint + citation enforcement | `src/api/versions/v1/rag.py` |
| Reranker | `src/reranker/` |
| Semantic cache (Redis) | `src/cache/` |
| QA benchmark جاهز | `evaluation/data/civil_code_rag_qa_benchmark.json` |
| Retrieval eval @ k=10 ± reranker | `experiments/evaluation_retrivel.ipynb` |

### اللي ناقص وإحنا هنبنيه

- RAGAS في الكود نفسه مش في notebook
- MLflow tracking للـchunking experiments
- Langfuse tracing
- Guardrails: PII + prompt injection جوه documents مسترجَعة
- CI gate حقيقي (الـlint دلوقتي `continue-on-error: true` يعني مش gate)

---

## اللي **مش** في اليوم ده

بقرار واضح، عشان اليوم يخلص:

- ❌ vLLM self-hosting (demo بس)
- ❌ Airflow / continuous training
- ❌ Terraform / IaC
- ❌ Canary rollout
- ❌ Knowledge distillation

دي كلها take-home على نفس الريبو.

---

## بعد اليوم

اللي عايز يكمّل في اتجاه research — fine-tuning، RAFT، agentic pipelines — يبص على:

> https://github.com/ayanasser/LegalPolicy_LLM
