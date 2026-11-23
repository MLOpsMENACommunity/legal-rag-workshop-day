# Workshop 5 — Watch, Guard, Gate

*Observability, guardrails & MLOps*

**65 دقيقة · 15:40 – 16:45** · [Slides](SLIDES.md)

## الهدف

النظام يبقى مرئي من جوّا، ومحمي من برّا، وماحد يقدر يمرّر PR يخرّبه.

## الفكرة المركزية

**فشل الـLLM مش بيطلع stack trace — بيطلع نص فصيح واثق من نفسه.** كل الـmonitoring العادي (uptime، latency، error rate) مش بيشوف ده خالص. الـservice بترد 200 OK وبتهلوس.

وفي دومين قانوني، ده مش bug — ده مسؤولية.

الـworkshop بيبدأ بنفس slide الـ**Evaluation vs Observability vs Guardrails** اللي في W3 — المرة دي من زاوية الإنتاج.

## الجزء الأول — Observability (25 د)

### Langfuse

الـtrace الواحد لازم يوريك السلسلة كلها كـnested spans:

```
user question
 ├─ embed            (كام ms؟ أي موديل؟)
 ├─ retrieve         (أي مواد جاب؟ بأي scores؟)
 ├─ rerank           (غيّر الترتيب إزاي؟)
 └─ generate         (الـprompt النهائي، الـtokens، التكلفة، TTFT)
```

أقوى لحظة هنا: **ناخد سؤال النظام ردّ عليه غلط، ونفتح الـtrace ونشوف الغلط حصل في أنهي span.** retrieval جاب المادة الغلط؟ ولا جاب الصح والـLLM هلوس؟ ده سؤال مختلف تمامًا وحلّه مختلف.

حضّري السؤال ده من بدري من الـeval run بتاع W3.

### والـRAGAS score يتعلّق على الـtrace

دي الـloop اللي بتقفل: evaluation مش حاجة بتعملها مرة قبل الـrelease — دي signal مستمر على sample من الـtraffic الحقيقي.

### Drift والـcost

- **Cosine drift** على query embeddings مقابل baseline. مستخدمين بيسألوا عن الأحوال الشخصية على corpus عقود = **drift حقيقي ومشروع**، ولازم تعرفه قبل ما الناس تشتكي
- **Token cost** في Prometheus → Grafana panel بالـcost/hour
- **Alert:** `faithfulness < 0.80`

## الجزء التاني — Guardrails (20 د)

تلات حاجات، والتالتة هي المهمة:

### 1. PII detection على الـoutput

نظام قانوني ممكن يوصله عقود فيها أسماء وأرقام قومية. لازم detection على الـresponse نفسه.

### 2. Rate limiting وbudget cap

Redis token bucket، و**429 أمين بـ`Retry-After`**. الـrejection اللي الـclient يقدر يتصرف معاه فيتشر — الـhang مش فيتشر.

### 3. Prompt injection جوه مستند مسترجَع ← دي بتاعت الـRAG تحديدًا

الناس فاكرة الـprompt injection حد بيكتب "ignore previous instructions" في الـinput. في الـRAG النوع الخطر مختلف: **التعليمة مدفونة جوه مستند الـretriever بيجيبه.**

**Live demo (أقوى 5 دقايق في الـworkshop):** نزوّد مستند في الـcorpus فيه تعليمة مدفونة، نسأل سؤال عادي بيجيبه، ونشوف النظام بيطيعها. القاعة بتسكت.

بعدين نناقش الدفاع: عزل الـcontext عن الـinstructions، input scanning، output validation ضد الـretrieved articles.

## الجزء التالت — MLOps automation (20 د)

### الـCI gate الحقيقي

الـCI الموجود في ريبو عمر (`.github/workflows/ci.yml`) فيه حاجة نقف عندها:

```yaml
- name: Lint (Ruff)
  run: uv run ruff check .
  continue-on-error: true     # ← ده مش gate
```

`continue-on-error: true` يعني الـcheck بيبقى زينة. **الـgate اللي مابيفشّلش مش gate.** نقطة تدريسية ممتازة ومأخوذة من كود حقيقي.

الـpipeline اللي هنبنيه:

```
lint → test → rebuild index → RAGAS على 20 سؤال → build & push
                                      ↓
                         faithfulness < 0.75 → الـPR ميتمرّرش
```

ده الفرق بين مشروع شغال ونظام متشغّل — دلوقتي ماحدش يقدر يخرّب الـquality ويمرّر.

### و`dvc repro`

الـcorpus والـindex يتبنوا من الـPDF بأمر واحد. الـreviewer يقدر يعيد نفس النتيجة بالظبط.

## التايم لاين

| الوقت | الجزء |
|------|-------|
| 5 د | ليه الـmonitoring العادي مش بيشوف فشل الـLLM + الفرق بين التلاتة |
| 15 د | **Hands-on:** Langfuse + `@observe` → trace بـspans |
| 5 د | نفتح trace لإجابة غلط ونلاقي الـspan المسؤول |
| **checkpoint** | كل واحد شاف trace بتاعه |
| 5 د | RAGAS score على الـtrace + cost panel |
| 10 د | **Live demo:** prompt injection جوه مستند + الدفاع |
| 5 د | PII + rate limiting بسرعة |
| 15 د | الـCI gate — نفتح PR ونشوفه بيفشل فعلًا |
| 5 د | `dvc repro` |

## Acceptance check

- [ ] Langfuse self-hosted، وكل `/ask` بيعمل trace بـnested spans
- [ ] الـRAGAS score متعلّق على الـtrace
- [ ] Grafana panel بيوري الـcost/hour
- [ ] Alert متظبّط على `faithfulness < 0.80`
- [ ] PII guardrail شغال على الـresponses
- [ ] prompt injection demo اتعمل والدفاع اتناقش
- [ ] CI بيفشّل فعلًا لو الـfaithfulness نزلت (مجرّبة بـPR حقيقي)
- [ ] `dvc repro` بيعيد بناء الـcorpus والـindex

## Failure modes

- **Langfuse self-hosted محتاج Postgres وبياخد وقت أول مرة.** لازم في الـPREWORK.
- **الوقت هيضيق هنا.** ده أوسع workshop في اليوم. الأولوية: **Langfuse ثم الـinjection demo ثم الـCI gate**. الـPII والـrate limiting أول حاجة تتشال لو اتأخرنا.
- **حد هيسأل عن Prometheus وGrafana بالتفصيل.** متدخليش في PromQL — panel واحد وخلاص، والباقي take-home.

## اللي مش في الـworkshop ده

الـdrift taxonomy الكامل، الـ 6 statistical detection methods، Evidently suites، ELK/Loki، Alertmanager routing والـinhibition، والـrunbook. كله في الـhandbook كـtake-home.
