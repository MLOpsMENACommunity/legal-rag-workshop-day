"""The golden set: the fixed exam every version of the system must sit."""
from __future__ import annotations

import hashlib
import json
from enum import Enum
from pathlib import Path

from pydantic import BaseModel, Field, model_validator


class QuestionType(str, Enum):
    LOOKUP = "lookup"              # "What does Article 147 say?"
    CONCEPT = "concept"            # "When can a contract be rescinded?"
    MULTI_ARTICLE = "multi"        # needs two or more articles to answer
    REPEALED = "repealed"          # the right answer is "this article was repealed"
    OUT_OF_SCOPE = "out_of_scope"  # the right answer is a refusal


class GoldenItem(BaseModel):
    id: str
    question: str = Field(min_length=5)
    language: str = Field(pattern="^(ar|en)$")
    type: QuestionType
    reference_answer: str
    gold_articles: list[int] = []   # article numbers a correct answer must rest on
    pair_id: str | None = None      # links the AR and EN versions of one question

    @model_validator(mode="after")
    def _gold_articles_required(self) -> "GoldenItem":
        if self.type != QuestionType.OUT_OF_SCOPE and not self.gold_articles:
            raise ValueError(f"{self.id}: only out-of-scope questions may have no gold articles")
        return self


def load_golden_set(path: str | Path, limit: int | None = None,
                    languages: set[str] | None = None) -> list[GoldenItem]:
    """Read one JSON object per line and validate every record before spending a token."""
    items = [GoldenItem.model_validate_json(line)
             for line in Path(path).read_text(encoding="utf-8").splitlines() if line.strip()]
    if languages:
        items = [i for i in items if i.language in languages]
    ids = [i.id for i in items]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate ids in golden set")
    return items[:limit] if limit else items


def golden_set_fingerprint(path: str | Path) -> str:
    """Short content hash: logged with every run so scores are only compared on the same exam."""
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()[:12]


def to_jsonl(items: list[GoldenItem]) -> str:
    return "\n".join(json.dumps(i.model_dump(mode="json"), ensure_ascii=False) for i in items)
