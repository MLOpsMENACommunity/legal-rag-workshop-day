# Workshop 3 — Trust, but Measure

*Evaluating legal RAG*

**60 دقيقة · 13:25 – 14:25** · [Slides](SLIDES.md)

## الهدف

نحوّل "النظام شكله شغال" لـ**رقم**. golden set + RAGAS + MLflow، وقرار مبني على الأرقام مش على الإحساس.

## الفكرة المركزية

بعد W2 الناس بتكون مبسوطة — النظام بيرد وبيستشهد. الـworkshop ده مهمته يوريهم إن **النظام اللي بنوه فيه مشاكل مش ملاحظة** — ومافيش طريقة تعرف غير إنك تقيس.

وأهم رسالة في اليوم كله: **مفيش metric عام للـLLMs.** نظام RAG قانوني له scorecard مختلف تمامًا عن chatbot أو summarizer.

## Evaluation vs Observability vs Guardrails

الـworkshop ده بيبدأ بالـslide اللي بتفرّق بين التلاتة — Evaluation هو الامتحان قبل الـrelease، Observability هي الـdashcam بعده، والـGuardrails هي الفرامل جوه كل request. التفاصيل في الـ[README الرئيسي](../../README.md#evaluation-vs-observability-vs-guardrails).

## الكود والداتا اللي هنشتغل عليها

ريبو عمر فيه **benchmark جاهز** ودي هدية:

| الملف | اللي فيه |
|------|----------|
| `evaluation/data/civil_code_rag_qa_benchmark.json` | QA set جاهز على القانون المدني |
| `evaluation/data/evaluation_results.csv` | نتائج run سابق |
| `experiments/evaluation_retrivel.ipynb` | retrieval eval @ k=10، بـreranker وبدونه |
| `experiments/evaluation_rag_response.ipynb` | response-level eval |
| `evaluation/score_results*.jpg` | الـbefore/after بالصور |

إحنا هنعمل حاجة مهمة هنا: **ننقل الـeval من notebook لـmodule في الـrepo.** notebook مابينفعش يبقى CI gate.

## الـ 4 metrics بتاعة RAGAS

اشرحيهم بمثال فشل لكل واحدة — مش بالتعريف:

| Metric | بيقيس إيه | بيوقع إمتى |
|--------|-----------|-------------|
| **Faithfulness** | الإجابة مستندة على الـcontext؟ | الـLLM ألّف حكم مش في المادة — **أخطر واحد عندنا** |
| **Answer relevancy** | الإجابة ردّت على السؤال؟ | جاب نص المادة بدل الإجابة |
| **Context precision** | المواد المسترجعة علاقتها إيه؟ | 10 مواد واحدة بس مفيدة |
| **Context recall** | جبنا كل المواد اللازمة؟ | الإجابة محتاجة 3 مواد وجبنا 1 |

## الـbilingual ablation — أقوى حاجة في الـcorpus بتاعنا

كل مادة موجودة بالعربي والإنجليزي. يعني نقدر **نسأل نفس السؤال باللغتين ونشوف هل الـretrieval بيرجّع نفس المادة**.

ده test رخيص جدًا وبيكشف حاجة مافيش حد بيقيسها: **هل الـembedding model بتاعك بيفهم عربي فعلًا ولا بيمثّل أحرف؟**

ونقطة لازم تنقال: **الـmetrics المدرّبة على إنجليزي بتغلط على العربي.** الـLLM-as-judge لو بيحكم بالإنجليزي على إجابة عربية قانونية، الـbias بتاعه مش معروف.

## MLflow — الجزء اللي بيخلّيه MLOps

الـchunking strategy هي أول experiment حقيقي:

```python
with mlflow.start_run():
    mlflow.log_params({"chunk_size": ..., "overlap": ...,
                       "embedding_model": ..., "top_k": ..., "reranker": ...})
    mlflow.log_metrics({"faithfulness": ..., "answer_relevancy": ...,
                        "context_precision": ..., "context_recall": ...})
```

الـruns اللي هنعملها في القاعة (كل حد ياخد واحد، ونجمّع على الشاشة):

1. chunk بالمادة (baseline)
2. chunk 512 token — عشان الفرق يبان بالرقم
3. dense لوحده ضد hybrid
4. بـreranker وبدونه
5. top_k = 5 ضد 10 ضد 20

أحسن حاجة في الترتيب ده: **الناس بتشوف بعينها إن القرارات اللي أخدناها في W1 وW2 كانت صح — بالرقم مش بكلامي.**

## التايم لاين

| الوقت | الجزء |
|------|-------|
| 10 د | ليه الـeyeballing مش evaluation + الفرق بين evaluation وobservability وguardrails |
| 10 د | الـgolden set: الـbenchmark بتاع عمر + كل واحد يزود سؤالين |
| 15 د | **Hands-on:** RAGAS على أول 20 سؤال |
| **checkpoint** | كل واحد عنده 4 أرقام |
| 10 د | الـbilingual ablation — نفس السؤال باللغتين |
| 10 د | MLflow: كل حد يسجل run، ونقارن على الشاشة |
| 5 د | نحدد الـthreshold: ليه 0.75 في الـCI وليه 0.80 في الـalert؟ |

## Acceptance check

- [ ] golden set ≥ 20 سؤال، بالعربي والإنجليزي
- [ ] الـ 4 metrics محسوبين ومسجّلين
- [ ] ≥ 3 MLflow runs بـconfigs مختلفة
- [ ] الـbilingual test معمول، والنتيجة مكتوبة في الـreport
- [ ] الـeval بقى module في `src/` مش notebook

## Failure modes

- **RAGAS بتستهلك كوتة من الـAPI.** كل metric بتعمل LLM calls. 50 سؤال × 4 metrics = حساب كبير. **ابدأي بـ 20 سؤال في القاعة** والـ 50 تبقى take-home.
- **حد هيشوف faithfulness = 0.95 ويبسط.** اسألي: الـcontext recall بقا كام؟ نظام بيرد من مادة واحدة من تلاتة بيبقى faithful وناقص في نفس الوقت.
- **الـLLM-as-judge غالي وبطيء.** سيبي الـcalibration والـbias tests كـtake-home.

## اللي مش في الـworkshop ده

LLM-judge calibration، position/verbosity bias tests، human annotation protocols.
