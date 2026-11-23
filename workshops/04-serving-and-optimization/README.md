# Workshop 4 — From Laptop to Load

*Serving & optimization*

**60 دقيقة · 14:25 – 15:25** · [Slides](SLIDES.md)

## الهدف

النظام يبقى service حد تاني يقدر يشغّله بتلات أوامر، ونعرف بيقع عند كام مستخدم.

## الفكرة المركزية

في الـRAG، الـlatency مش رقم واحد — دي سلسلة: embed → retrieve → rerank → generate. والـ**bottleneck مش دايمًا الـLLM**. مش هتعرف منين إلا لما تقيس.

## الكود اللي هنشرحه

| الملف | اللي بيشرحه |
|------|-------------|
| `docker-compose.yaml` | service dependencies وhealthchecks حقيقية |
| `docker/index_if_changed.py` | ليه الـindexing لازم يبقى idempotent |
| `src/cache/` | semantic cache — أرخص optimization في الـRAG كله |
| `Dockerfile` | multi-stage، non-root |

### الـcompose — نقطتين تدريسيتين جميلين

ريبو عمر فيه حاجتين محترمين نقف عندهم:

```yaml
depends_on:
  indexer:
    condition: service_completed_successfully   # مش service_started
```

الفرق بين `service_started` و `service_completed_successfully` هو الفرق بين service بيرد على فهرس فاضي وservice بيستنى الفهرسة تخلص.

والـhealthcheck بتاع Qdrant — bash بيفتح TCP socket بالإيد (`exec 3<>/dev/tcp/...`) عشان مافيش curl جوه الـimage. تريك يستاهل دقيقة.

### التعديل اللي هنعمله

الـcompose الأصلي فيه:

```yaml
vllm:
  runtime: nvidia
  gpus: all
```

**ده مستحيل في القاعة.** هنشيل الـservice ده ونحط `LLM_BASE_URL` على API برّا.

ودي في نفسها أحسن درس في الـworkshop: **الـLLM لازم يكون ورا interface**. لو الكود بتاعك متشكل على vLLM، مش هتقدر تغيره. ريبو عمر عامل ده صح — `src/llm/base.py` + `factory.py` + `vllm_client.py`.

## Optimization — بالترتيب الصح

الناس بتروح على quantization علطول. ده أغلى حاجة وأقلهم مردود. الترتيب العقلاني:

| # | التحسين | التكلفة | المردود |
|---|---------|---------|---------|
| 1 | **Semantic cache** | ساعة شغل | ضخم — الأسئلة القانونية بتتكرر جدًا |
| 2 | **قلّل top_k** | 5 دقايق | كبير — context أقل = tokens أقل = أسرع وأرخص |
| 3 | **reranker أصغر** | ساعة | متوسط |
| 4 | **AWQ-4bit** | يوم + GPU | متوسط — ومخاطرة على الـfaithfulness |

الـ 1 و 2 هنعملهم hands-on. الـ 4 demo على الشاشة بأرقام جاهزة من ريبو عمر.

**القاعدة اللي لازم تتقال:** أي optimization لازم يتقاس بـ**RAGAS before/after** مش بالـlatency بس. نظام أسرع وبيهلوس أكتر مش تحسين.

## التايم لاين

| الوقت | الجزء |
|------|-------|
| 10 د | `docker compose up` — الـdependency graph والـhealthchecks |
| 10 د | Streaming `/ask` — وليه الـperceived latency أهم من الـtotal |
| 15 د | **Hands-on:** Locust على 10 ثم 50 user → اكتب الـp95 |
| **checkpoint** | كل واحد عنده رقم p95 |
| 10 د | فعّل الـsemantic cache → نفس الـLocust → الفرق |
| 10 د | الـcost model: دولار لكل 1000 سؤال، قبل وبعد |
| 5 د | Demo: AWQ-4bit وأرقامها |

## Acceptance check

- [ ] `docker compose up` والـservice شغال على لابتوب الزميل
- [ ] README بتلات أوامر
- [ ] Locust report في `reports/`، والـp95 مكتوب
- [ ] الـcache شغال — نفس السؤال تاني أسرع بشكل واضح
- [ ] الـcost per 1000 questions محسوب

## Failure modes

- **الـLocust هيحرق الـAPI quota.** استخدمي mock LLM للـload test أو cached responses — الـload test بيقيس الـserving layer مش الـLLM.
- **الـcache بيجيب إجابة لسؤال مختلف.** مشكلة حقيقية — الـthreshold بتاع الـsimilarity حساس جدًا. سؤال عن المادة 147 وسؤال عن 148 قريبين جدًا semantically. **دي أحلى مناقشة في الـworkshop ده.**
- **الـdocker build بياخد 10 دقايق.** لازم يكون معمول في الـPREWORK.

## اللي مش في الـworkshop ده

vLLM internals (KV cache، preemptions، continuous batching)، canary rollout، distillation، Kubernetes.
