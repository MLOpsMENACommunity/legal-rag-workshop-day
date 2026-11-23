# Workshop 1 — Taming the PDF

*Data & corpus engineering*

**70 دقيقة · 10:20 – 11:30** · [Slides](SLIDES.md)

## الهدف

نحوّل PDF القانون المدني المصري (bilingual، عمودين) لـ`articles.json` — **record لكل مادة**، معاه الهيراركية والـcitation، ومعموله validation.

## ليه دي أهم workshop في اليوم

الناس بتيجي للـRAG عايزة تشتغل على embeddings وvector DBs. واقعيًا **أغلب فشل الـRAG العربي بيحصل هنا** — في الـparsing. parsing bug ساكت بيبقى hallucination بعد 3 خطوات، ووقتها هتلوم الموديل.

الرسالة اللي لازم توصل: **الـPDF مش الـcorpus. الـPDF هو الـraw input.**

## الكود اللي هنشرحه

`src/parsing/pdf_parser.py` من [ريبو عمر](https://github.com/OmarFarghaly/ArabicLegalDocumentProject/blob/main/src/parsing/pdf_parser.py) — 400 سطر، وكل قرار فيه له سبب.

الـfunctions اللي هنقف عندها:

| Function | الفكرة اللي بيشرحها |
|----------|---------------------|
| `extract_word_lines()` | إزاي تفصل عمودين عربي/إنجليزي — بالـcoordinates مش بالـtext dump |
| `scalar_pos()` | تريك حلو: page + y → رقم واحد، عشان تقدر ترتّب المستند كله |
| `extract_bold_english_lines()` | الـbold كـsignal للـheadings — مش regex على النص |
| `build_context_timeline()` | إزاي تحتفظ بـPart/Book/Chapter/Section وهي ماشية |
| `find_articles()` | الفرق بين `Article 451` (عنوان) و `Article 444.` (إشارة جوه نص) |
| `find_repealed_ranges()` | المواد الملغية — flag مش delete |
| `strip_arabic_article_label()` | تنظيف الـ"مادة (١٤٧)" من أول النص |

لاحظي في الـsort بتاع `arabic_lines`:

```python
key=lambda l: (l.page, round(l.y0, 1), -l.x0)   # الـ -x0 دي هي الـRTL
```

دي أحلى نقطة في الـparser كله — سطر واحد بيحل مشكلة الـright-to-left.

## الـschema المستهدف

```json
{
  "article_number": 147,
  "book": "Obligations or Personal Rights",
  "chapter": "Sources of Obligations",
  "section": "Contracts",
  "topic": "The Effects of a Contract",
  "text_ar": "...",
  "text_en": "...",
  "is_repealed": false,
  "source_page": 34,
  "citation": "Egyptian Civil Code, Article 147"
}
```

> نقطة تدريسية: ريبو عمر بيسمّيها `ar_text` والـhandbook بيقول `text_ar`. اختلاف بسيط بس بيكسر أي حد بيبني فوقيك. اتكلمي دقيقة عن ليه الـschema لازم تكون contract مكتوب، مش اتفاق ضمني.

## التحديات الحقيقية في الداتا العربية

دي قلب الـworkshop. كل واحدة فيها هنوري الـbefore/after على مادة حقيقية:

1. **الـtwo-column layout بيتداخل** — `pdftotext` بيخرّج عربي وإنجليزي متلخبطين نص الجملة
2. **RTL والـglyphs** — النص بيرجع معكوس أو الحروف مقطعة
3. **الأرقام العربية** — ١٤٧ → 147، لازم integer تقدر تعمل عليه sort وrange query
4. **المواد الملغية** — المواد 54–80 ملغية. "المادة دي ملغية" دي إجابة **صح** ومفيدة. النظام اللي بيشيلها بيهلوس حول الفراغ
5. **الـheadings بتحمل الهيراركية** — اخدها في نفس الـpass، أرخص بكتير من re-parsing
6. **التشكيل والهمزات والألفات** — نفس الكلمة بتبقى tokenين مختلفين لو مانعملتش normalization موحّد

## التايم لاين

| الوقت | الجزء |
|------|-------|
| 10 د | الـPDF على الشاشة. `pdftotext` لأول صفحتين → الناس تشوف الكارثة بعينها |
| 15 د | الـcoordinate-based extraction وليه هي الحل (`extract_word_lines`) |
| 10 د | الـcontext timeline — إزاي تعرف المادة 147 تابعة لأي باب |
| **checkpoint** | كل واحد عنده `articles.json` فيه 1000+ record |
| 15 د | **Hands-on:** الـvalidation test — دي الناس تكتبها بنفسها |
| 10 د | Chunking بالمادة مش بالـtoken count — وليه 512-token window بيقتل الـcitation |
| 10 د | DVC: `dvc add` للـPDF والـJSON + `dvc.yaml` stage |

## الـhands-on بتاع الـworkshop ده

الناس تكتب `tests/test_corpus.py` بنفسها. أربع assertions:

```python
def test_article_numbers_contiguous(articles): ...
def test_every_record_has_arabic_text(articles): ...
def test_no_record_is_absurdly_long(articles): ...   # record عملاق = split فشل
def test_repealed_articles_are_flagged(articles): ...  # 54–80
```

دي أحسن حاجة يعملوها بإيديهم في الـworkshop ده — سريعة، وبتكشف bugs حقيقية عندهم فورًا.

## Acceptance check

- [ ] `articles.json` موجود، record لكل مادة
- [ ] `article_number` أرقام إنجليزية integer
- [ ] 20 مادة راندوم اتفحصو بالعين — العربي مقروء ومش معكوس
- [ ] المواد الملغية `is_repealed: true`
- [ ] الـ 4 tests passing
- [ ] `dvc status` clean

## Failure modes

- **حد هيستعجل ويبدأ embedding من غير validation.** اوقفيه.
- **حد هيسأل "مانستخدمش LLM يعمل الـparsing ليه؟"** سؤال عاقل — الرد: غالي، وغير deterministic، ومش بتعرف تجيبلك نفس النتيجة مرتين. بس سيبي مساحة: hybrid (regex + LLM للحالات الشاذة) قرار محترم.
- **الـ PyMuPDF مش بيتسطّب** — مشكلة شائعة على ماك M1/M2. الـPREWORK بيحلها.

## اللي مش في الـworkshop ده

OCR، scanned PDFs، table extraction. الـPDF بتاعنا text-based وده مقصود.
