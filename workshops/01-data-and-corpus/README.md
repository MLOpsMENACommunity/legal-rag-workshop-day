# Workshop 1 — Arabic Corpus Engineering

*PDF parsing · normalization · validation*

**70 minutes · 10:20 – 11:30** · [Slides](SLIDES.md)

## Goal

Turn the bilingual, two-column Egyptian Civil Code PDF into `articles.json` — **one record per article**, with its hierarchy and citation, validated by tests.

## Why this is the most important workshop of the day

People come to RAG wanting to work on embeddings and vector databases. In practice, **most Arabic RAG failures happen here**, in parsing. A silent parsing bug becomes a hallucination three steps later, and the model gets the blame.

The message to land: **the PDF is not your corpus — it is your raw input.**

## Code we walk through

`src/parsing/pdf_parser.py` from the [reference repo](https://github.com/OmarFarghaly/ArabicLegalDocumentProject/blob/main/src/parsing/pdf_parser.py) — around 400 lines, every decision deliberate.

| Function | Concept it teaches |
|----------|--------------------|
| `extract_word_lines()` | Separating Arabic/English columns by coordinates, not by text dump |
| `scalar_pos()` | Page + y → one number, so the whole document can be ordered |
| `extract_bold_english_lines()` | Bold text as a heading signal, instead of regex on content |
| `build_context_timeline()` | Tracking Part/Book/Chapter/Section while scanning |
| `find_articles()` | `Article 451` (a heading) vs `Article 444.` (a reference in text) |
| `find_repealed_ranges()` | Repealed articles — flag, never delete |
| `strip_arabic_article_label()` | Removing the leading Arabic article label |

Note the sort key on `arabic_lines`:

```python
key=lambda l: (l.page, round(l.y0, 1), -l.x0)   # -x0 is the RTL fix
```

This is the nicest line in the parser: one minus sign solves right-to-left ordering.

## Target schema

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

> Teaching point: the reference repo writes `ar_text`; the handbook specifies `text_ar`. A small mismatch, but it breaks anyone building on top. Spend a minute on why a schema must be a written contract, not an assumption.

## Real challenges in Arabic legal data

The core of the workshop. Show a before/after on a real article for each:

1. **Two-column layouts interleave** — `pdftotext` mixes Arabic and English mid-sentence
2. **RTL and glyph issues** — text comes back reversed or with broken letters
3. **Arabic-Indic numerals** — ١٤٧ → 147, stored as an integer you can sort and range-query
4. **Repealed articles** — articles 54–80 are repealed. "This article was repealed" is a correct, useful answer; a system that drops them hallucinates around the gap
5. **Hierarchy lives in headings** — capture it in the same pass; far cheaper than re-parsing
6. **Diacritics, hamza and alef forms** — the same word becomes different tokens without consistent normalization

## Timeline

| Time | Activity |
|------|----------|
| 10 min | The PDF on screen; `pdftotext` on two pages so the room sees the mess |
| 15 min | Coordinate-based extraction and why it works (`extract_word_lines`) |
| 10 min | The context timeline — how article 147 knows its chapter |
| **checkpoint** | Everyone has `articles.json` with 1000+ records |
| 15 min | **Hands-on:** validation tests, written by participants |
| 10 min | Chunking by article, not token count — why 512-token windows destroy citations |
| 10 min | DVC: `dvc add` for the PDF and JSON + a `dvc.yaml` stage |

## Hands-on

Participants write `tests/test_corpus.py` themselves, with four assertions:

```python
def test_article_numbers_contiguous(articles): ...
def test_every_record_has_arabic_text(articles): ...
def test_no_record_is_absurdly_long(articles): ...   # a giant record = a failed split
def test_repealed_articles_are_flagged(articles): ...  # 54–80
```

Quick to write, and it surfaces real bugs immediately.

## Acceptance check

- [ ] `articles.json` exists, one record per article
- [ ] `article_number` is an integer in Western digits
- [ ] 20 random articles checked by eye — Arabic reads correctly, not reversed
- [ ] Repealed articles have `is_repealed: true`
- [ ] All 4 tests pass
- [ ] `dvc status` is clean

## Failure modes

- **Someone rushes to embeddings without validation.** Stop them.
- **"Why not have an LLM do the parsing?"** A fair question. Answer: expensive, non-deterministic, and not reproducible. Leave room: a hybrid (rules plus an LLM for edge cases) is a respectable design.
- **PyMuPDF fails to install** — common on Apple Silicon. PREWORK covers it.

## Out of scope

OCR, scanned PDFs, table extraction. Our PDF is text-based by design.
