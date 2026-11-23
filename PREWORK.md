# Pre-work — اعمل ده قبل اليوم

> ⚠️ الورشة 7 ساعات، والـsetup بياكل ساعتين لو مش جاهز. **اللي مش معمول عنده الحاجات دي مش هيلحق اليوم.**

## 1. تسطيب

```bash
# Docker + compose
docker --version          # 24+
docker compose version    # v2

# Python
python --version          # 3.11+

# uv
curl -LsSf https://astral.sh/uv/install.sh | sh
```

على Windows: WSL2 لازم يكون version 2.

## 2. اسحب الـimages من بدري

ده أهم خطوة. اعملها على نت بيتك مش على نت القاعة:

```bash
docker pull qdrant/qdrant
docker pull redis/redis-stack-server:latest
docker pull langfuse/langfuse:2
docker pull postgres:16-alpine
```

## 3. الـrepo والـdependencies

```bash
git clone https://github.com/MLOpsMENACommunity/legal-rag-workshop-day.git
cd legal-rag-workshop-day
uv sync
```

## 4. الـembedding models

الموديلات بتتحمّل أول استخدام. حمّلها قبل:

```bash
uv run python scripts/warm_cache.py
```

## 5. API key للـLLM

محتاج key لواحد من دول، وتحطه في `.env`:

```dotenv
LLM_API_KEY=...
LLM_BASE_URL=...
LLM_MODEL=...
```

هنوفّر key مشترك للورشة لو مش معاك — بس لو معاك واحدة خاصة بيك أحسن (الـrate limit).

## 6. تأكد إن كل حاجة شغالة

```bash
make check
```

لازم يطلع **كله أخضر**. لو حاجة حمرا، اسأل في جروب الورشة **قبل** اليوم مش في اليوم.

---

## حاجات هتحتاجها في اليوم

- لابتوب + الشاحن (مفيش prizes لحد بطاريته خلصت 2 الضهر)
- حساب GitHub
- الـPDF بتاع القانون المدني (موجود في `data/raw/` — DVC-tracked)
