# Pre-work — do this before the day

> ⚠️ The workshop is 7 hours, and setup takes two of them if it is not done in advance. **Anyone who arrives without this done will not keep up.**

## 1. Install

```bash
# Docker + compose
docker --version          # 24+
docker compose version    # v2

# Python
python --version          # 3.11+

# uv
curl -LsSf https://astral.sh/uv/install.sh | sh
```

On Windows: WSL must be version 2.

## 2. Pull the images in advance

The most important step. Do it on your home connection, not the venue's:

```bash
docker pull qdrant/qdrant
docker pull redis/redis-stack-server:latest
docker pull langfuse/langfuse:2
docker pull postgres:16-alpine
```

## 3. Repository and dependencies

```bash
git clone https://github.com/MLOpsMENACommunity/legal-rag-workshop-day.git
cd legal-rag-workshop-day
uv sync
```

## 4. Embedding models

Models download on first use. Download them now:

```bash
uv run python scripts/warm_cache.py
```

## 5. LLM API key

You need a key for an LLM provider, set in `.env`:

```dotenv
LLM_API_KEY=...
LLM_BASE_URL=...
LLM_MODEL=...
```

A shared workshop key will be provided if you do not have one, but your own key is better (rate limits).

## 6. Check everything works

```bash
make check
```

Everything must be **green**. If anything is red, ask in the workshop group **before** the day, not on the day.

---

## Bring on the day

- Laptop and charger
- A GitHub account
- The Civil Code PDF (in `data/raw/`, DVC-tracked)
