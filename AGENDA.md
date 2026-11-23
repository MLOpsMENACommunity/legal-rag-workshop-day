# Agenda — facilitator timing

**From PDF to Production — Arabic Legal RAG in One Day** · 7 ساعات، 10:00 → 17:00. الأوقات دي مش اقتراح — لو اتأخرنا 15 دقيقة في Workshop 1 اليوم مش بيخلص.

| الوقت | المدة | الجزء |
|-------|------|-------|
| 10:00 – 10:20 | 20 د | **Opening** — architecture diagram لليوم كله + `make check` على كل لابتوب |
| 10:20 – 11:30 | 70 د | **W1 — Taming the PDF** · data & corpus |
| 11:30 – 12:40 | 70 د | **W2 — Ask the Code** · retrieval & API |
| 12:40 – 13:25 | 45 د | غدا + صلاة |
| 13:25 – 14:25 | 60 د | **W3 — Trust, but Measure** · evaluation |
| 14:25 – 15:25 | 60 د | **W4 — From Laptop to Load** · serving & optimization |
| 15:25 – 15:40 | 15 د | break |
| 15:40 – 16:45 | 65 د | **W5 — Watch, Guard, Gate** · observability, guardrails & MLOps |
| 16:45 – 17:00 | 15 د | **Demos** — 2-3 فرق + wrap-up |

**إجمالي وقت الـworkshops: 325 دقيقة (~5.4 ساعة).** الباقي breaks وopening وdemos.

---

## قواعد إدارة الوقت

1. **كل workshop فيه checkpoint في النص.** لو أكتر من تلت القاعة مش وصل للـcheckpoint، اعملي switch للـ`solution/` وكمّلي شرح. متستنّيش حد.
2. **الـ`solution/` موجودة من بدري.** مش مكافأة في الآخر — ده safety net عشان حد يتعطّل في W1 ميخرجش من اليوم كله.
3. **اللي مش راكب عنده، ياخد من حد جانبه.** الناس تشتغل في أزواج افتراضيًا.
4. **Opening بالظبط 20 دقيقة.** لو الـsetup بايظ عند حد، ياخده في الـbreak مش في الوقت.

---

## لوجيستيات

- **Wi-Fi:** كل حد هيعمل `docker pull` و`pip install` — الشبكة هي أكبر خطر في اليوم. الـPREWORK بيحل ده.
- **شاشة:** محتاجين الكود يبان من آخر القاعة — font كبير، theme فاتح.
- **USB stick:** عليه الـdocker images والـmodels والـPDF، عشان أي حد شبكته وقعت.
