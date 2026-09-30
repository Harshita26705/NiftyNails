"""Catalogue-driven vocabulary: every phrase the AI understands comes from admin-managed rows."""

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ml.text import normalise_phrase

# When one phrase maps to several kinds, the earlier kind wins.
KIND_PRIORITY = ("charm", "finish", "shape", "colour", "pattern", "style", "category", "occasion", "tag")


@dataclass(frozen=True)
class VocabEntry:
    kind: str
    id: int
    slug: str
    name: str
    available: bool = True
    # kind-specific extras: hex, category, flashiness, svg_key, stock, price_paise
    meta: tuple[tuple[str, Any], ...] = ()

    def get(self, key: str, default: Any = None) -> Any:
        return dict(self.meta).get(key, default)


@dataclass
class Vocabulary:
    entries: dict[str, list[VocabEntry]] = field(default_factory=lambda: defaultdict(list))
    by_kind: dict[str, list[VocabEntry]] = field(default_factory=lambda: defaultdict(list))
    max_phrase_len: int = 1

    def add(self, entry: VocabEntry, phrases: list[str]) -> None:
        self.by_kind[entry.kind].append(entry)
        for phrase in {normalise_phrase(p) for p in phrases if p and p.strip()}:
            if not phrase:
                continue
            bucket = self.entries[phrase]
            if not any(e.kind == entry.kind and e.id == entry.id for e in bucket):
                bucket.append(entry)
            self.max_phrase_len = max(self.max_phrase_len, len(phrase.split()))

    def lookup(self, phrase: str) -> list[VocabEntry]:
        found = self.entries.get(phrase, [])
        return sorted(found, key=lambda e: KIND_PRIORITY.index(e.kind))

    def available(self, kind: str) -> list[VocabEntry]:
        return [e for e in self.by_kind.get(kind, []) if e.available]

    def find(self, kind: str, slug: str) -> VocabEntry | None:
        return next((e for e in self.by_kind.get(kind, []) if e.slug == slug), None)

    # ------------------------------------------------------------------ builders

    @classmethod
    def from_rows(cls, **rows_by_kind: list[Any]) -> "Vocabulary":
        """Build from ORM rows (or any objects with the same attributes)."""
        vocab = cls()
        for kind, rows in rows_by_kind.items():
            for row in rows:
                meta: dict[str, Any] = {}
                available = bool(getattr(row, "is_active", True))
                if kind == "colour":
                    meta["hex"] = row.hex
                    meta["family"] = row.family
                elif kind == "finish":
                    meta["flashiness"] = row.flashiness
                    meta["surcharge_paise"] = row.surcharge_paise
                elif kind == "shape":
                    meta["svg_key"] = row.svg_key
                elif kind == "charm":
                    meta.update(
                        category=row.category,
                        flashiness=row.flashiness,
                        stock=row.stock,
                        price_paise=row.price_paise,
                        asset_key=row.asset_key,
                    )
                    available = available and row.stock > 0
                entry = VocabEntry(
                    kind=kind,
                    id=row.id,
                    slug=row.slug,
                    name=row.name,
                    available=available,
                    meta=tuple(sorted(meta.items())),
                )
                vocab.add(entry, [row.name, row.slug.replace("-", " "), *(row.synonyms or [])])
        return vocab

    @classmethod
    def from_db(cls, db: Session) -> "Vocabulary":
        from app.models import Category, Charm, Colour, Finish, NailShape, Occasion, Pattern, Style, Tag

        def rows(model):
            return list(db.scalars(select(model)))

        return cls.from_rows(
            charm=rows(Charm),
            finish=rows(Finish),
            shape=rows(NailShape),
            colour=rows(Colour),
            pattern=rows(Pattern),
            style=rows(Style),
            category=rows(Category),
            occasion=rows(Occasion),
            tag=rows(Tag),
        )
