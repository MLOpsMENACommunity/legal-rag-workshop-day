# Workshop 2 — Ask the Code

*Hybrid retrieval & a citing API*

**70 دقيقة · 11:30 – 12:40** · [Slides](SLIDES.md)

## الهدف

من `articles.json` لـendpoint شغال: سؤال بالعربي → إجابة + **أرقام مواد** يقدر محامي يراجعها.

## الفكرة المركزية

**الـdense embeddings لوحدها مش كفاية في النص القانوني العربي.** لما حد يسأل عن "المادة 147" أو عن مصطلح قانوني محدد، الـsemantic search بيجيب حاجات "شبهها" مش هي. عشان كده الحل hybrid: dense + BM25 وبعدين fusion.

## الكود اللي هنشرحه

| الملف | اللي بيشرحه |
|------|-------------|
| `src/vectordb/build_index.py` | بناء الـcollection والـpayload |
| `src/retrieval/retrieval.py` | **الملف النجم في الـworkshop ده** — hybrid + RRF |
| `src/reranker/` | cross-encoder reranking بعد الـretrieval |
| `src/api/versions/v1/rag.py` | الـendpoint كامل |
| `src/prompt_template/` | `build_llm_request` + `ensure_article_citations` |
| `src/utils/arabic_text.py` | `normalize_arabic_for_sparse` |

### الـhybrid retrieval — الجزء اللي هنقعد عليه

```python
prefetch = [
    models.Prefetch(          # dense — المعنى
        query=vector, using=lang,
        limit=retrieval_limit, score_threshold=score_threshold),
    models.Prefetch(          # sparse — الكلمة بالظبط
        query=models.Document(text=sparse_text, model="Qdrant/bm25"),
        using=f"bm25_{lang}", limit=retrieval_limit),
]
response = await self.client.query_points(
    collection_name=collection_name,
    prefetch=prefetch,
    query=models.FusionQuery(fusion=models.Fusion.RRF),
    limit=retrieval_reranked_limit, with_payload=True)
```

تلات نقاط لازم تتشرح هنا:

1. **ليه فيه vector لكل لغة** (`using=lang`) ومش موديل واحد multilingual
2. **ليه الـBM25 محتاج normalization مختلف** (`normalize_arabic_for_sparse`) — الـsparse بيشوف التشكيل والألفات كـtokens مختلفة
3. **RRF vs score fusion** — ليه الـrank أأمن من الـscore لما بتدمج scorers مختلفين مقاييسهم مختلفة

### الـcitation enforcement

```python
response.answer = ensure_article_citations(response.answer, reanked_payloads, lang)
```

دي أهم سطر في الـendpoint. الـLLM ممكن يجيب إجابة سليمة وينسى يستشهد، أو يستشهد بمادة ماشافهاش. الـenforcement بعد الـgeneration هو اللي بيخلي النظام قابل للمراجعة.

**سؤال للقاعة:** لو الـLLM استشهد بمادة مش في الـcontext، نعمل إيه؟ نمسحه؟ نرفض الإجابة كلها؟ نرجّعها مع warning؟ (مفيش رد واحد صح — دي مناقشة 5 دقايق وبتوصّل فكرة الـguardrails في W5)

### الـAPI contract

```http
POST /ask
{"question": "ما هي شروط العقد؟"}

200
{
  "answer": "...",
  "sources": ["Egyptian Civil Code, Article 147", "..."]
}
```

ريبو عمر بيسمّيه `/api/v1/rag/answer`. الـhandbook بيقول `/ask`. هنمشي على `/ask` عشان الـrubric، مع الـversioned path كـalias.

`sources` أرقام مواد — **مش chunk IDs ولا أرقام صفحات**. ده الفرق بين نظام حقيقي وdemo.

## التايم لاين

| الوقت | الجزء |
|------|-------|
| 10 د | Chunking بالمادة → embedding → Qdrant collection |
| 15 د | **Hands-on:** الـdense search لوحده. اسأل "المادة 147" وشوف النتيجة |
| 15 د | زوّد الـBM25 + RRF → نفس السؤال → الفرق |
| **checkpoint** | الـhybrid search شغال عند الكل |
| 10 د | Reranker — وليه محتاجينه بعد الـfusion |
| 15 د | الـprompt + citation enforcement + FastAPI `/ask` |
| 5 د | `/health` بيرجّع `documents_indexed: N`، وPydantic بيرفض السؤال الفاضي (422) |

## أحلى لحظة في اليوم

بعد الـcheckpoint: كل واحد يسأل سؤال قانوني بالعربي من دماغه ويشوف النظام بيرجّع رقم المادة الصح. سيبي 3 دقايق لده — ده اللي هيفضل في دماغهم من اليوم.

## Acceptance check

- [ ] Qdrant collection فيها كل المواد، بـdense وbm25 vectors
- [ ] `/ask` بيرد على سؤال عربي وسؤال إنجليزي
- [ ] `sources` أرقام مواد
- [ ] سؤال فاضي → 422 برسالة مقروءة مش stack trace
- [ ] `/health` بيقول كم مستند مفهرس

## Failure modes

- **الـembedding model بيتحمّل في القاعة** → النت بتموت. الـPREWORK والـUSB stick هم الحل.
- **حد بيستخدم موديل إنجليزي على نص عربي** ومالاحظش — النتيجة بتبقى معقولة شكلًا وغلط فعليًا. دي أحسن مدخل لـW3.
- **الـlangdetect بيغلط على الأسئلة القصيرة** — ريبو عمر بيعمل `raise ValueError` على لغة غير مدعومة. نقطة مناقشة: ده صح ولا لازم fallback؟

## اللي مش في الـworkshop ده

query rewriting، multi-hop retrieval، agentic RAG. موجودين في ريبو عمر (`src/llm/query_rewriter.py`) — نشاور عليهم ونمشي.
