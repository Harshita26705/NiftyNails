"""Deterministic natural-language → structured nail attributes.

"I want baby pink almond nails with chrome, little bows and pearls. Something cute but not too flashy."
→ colours=[baby-pink], shape=almond, finish=chrome, charms={bow, pearl}, flash_preference=low

Only catalogue vocabulary produces matches. Recognised-but-unoffered things (from the general
lexicon) are reported in `unavailable`, each with the closest thing Nifty Nails can actually make.
"""

import re
from dataclasses import asdict, dataclass, field

from app.ml.colour import hex_distance
from app.ml.lexicon import (
    COLOUR_LEXICON,
    DECORATION_LEXICON,
    HIGH_FLASH_WORDS,
    LENGTH_LEXICON,
    LOW_FLASH_WORDS,
    NEGATION_WORDS,
    NUMBER_WORDS,
    RELATED_CATEGORIES,
    SHAPE_LEXICON,
    SIMILAR_SHAPES,
)
from app.ml.text import normalise_phrase, tokenize
from app.ml.vocabulary import VocabEntry, Vocabulary

CLAUSE_BREAKS = {"but", "with", "and", "or", "plus", "also"}
SIZE_ADJECTIVES = {"tiny", "little", "small", "mini", "big", "large", "cute", "dainty", "3d", "some", "of"}
MIN_PRICE_RUPEES = 50
# Single words that name an attribute on their own; a negation never reaches past one of these.
_ATTRIBUTE_WORDS = {
    w for lex in (COLOUR_LEXICON, DECORATION_LEXICON, SHAPE_LEXICON) for w in map(normalise_phrase, lex) if " " not in w
}

_CUR = r"(?:₹|rs\.?|inr|rupees?)?\s*"
_NUM = r"(\d[\d,]*(?:\.\d+)?)\s*(k)?"
_RANGE_RE = re.compile(rf"(?:between|from)\s*{_CUR}{_NUM}\s*(?:and|to|-)\s*{_CUR}{_NUM}")
_MAX_RE = re.compile(
    rf"(?:under|below|less than|within|max(?:imum)?|budget(?:\s+(?:of|is))?|up\s?to|not more than|no more than|"
    rf"cheaper than)\s*{_CUR}{_NUM}"
)
_MIN_RE = re.compile(rf"(?:over|above|more than|at least|min(?:imum)?)\s*(?:₹|rs\.?|inr)\s*{_NUM}")
_BARE_RE = re.compile(rf"(?:₹|rs\.?\s?|inr\s?){_NUM}|{_NUM}\s*(?:rupees|rs\b|inr\b|/-)")


@dataclass
class Unavailable:
    requested: str
    kind: str  # charm | colour | shape | finish ...
    reason: str  # not_offered | out_of_stock | inactive
    suggestion_slug: str | None = None
    suggestion_name: str | None = None


@dataclass
class ParsedQuery:
    colours: list[str] = field(default_factory=list)
    excluded_colours: list[str] = field(default_factory=list)
    finishes: list[str] = field(default_factory=list)
    excluded_finishes: list[str] = field(default_factory=list)
    shapes: list[str] = field(default_factory=list)
    charms: dict[str, int | None] = field(default_factory=dict)  # slug → requested quantity (None = unspecified)
    excluded_charms: list[str] = field(default_factory=list)
    charm_colours: dict[str, str] = field(default_factory=dict)  # "white bows" → {"bow": "white"}
    patterns: list[str] = field(default_factory=list)
    styles: list[str] = field(default_factory=list)
    categories: list[str] = field(default_factory=list)
    occasions: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    length: str | None = None
    price_min_paise: int | None = None
    price_max_paise: int | None = None
    flash_preference: str | None = None  # low | high
    unavailable: list[Unavailable] = field(default_factory=list)
    matched_phrases: list[str] = field(default_factory=list)

    @property
    def is_empty(self) -> bool:
        return not any(
            (self.colours, self.finishes, self.shapes, self.charms, self.patterns, self.styles, self.categories,
             self.occasions, self.tags, self.length, self.price_max_paise, self.price_min_paise, self.flash_preference)
        )

    def to_dict(self) -> dict:
        return asdict(self)


def _rupees(amount: str, k: str | None) -> int:
    value = float(amount.replace(",", ""))
    return int(round(value * (1000 if k else 1)))


def parse_price(text: str) -> tuple[int | None, int | None]:
    """Return (min_paise, max_paise)."""
    t = text.lower()
    if m := _RANGE_RE.search(t):
        lo, hi = _rupees(m.group(1), m.group(2)), _rupees(m.group(3), m.group(4))
        return min(lo, hi) * 100, max(lo, hi) * 100
    lo = hi = None
    if (m := _MAX_RE.search(t)) and _rupees(m.group(1), m.group(2)) >= MIN_PRICE_RUPEES:
        hi = _rupees(m.group(1), m.group(2)) * 100
    if (m := _MIN_RE.search(t)) and _rupees(m.group(1), m.group(2)) >= MIN_PRICE_RUPEES:
        lo = _rupees(m.group(1), m.group(2)) * 100
    if lo is None and hi is None and (m := _BARE_RE.search(t)):
        amount, k = (m.group(1), m.group(2)) if m.group(1) else (m.group(3), m.group(4))
        if _rupees(amount, k) >= MIN_PRICE_RUPEES:
            hi = _rupees(amount, k) * 100
    return lo, hi


def _flash_preference(text: str) -> str | None:
    t = " " + normalise_phrase(text) + " "
    low = any(f" {normalise_phrase(w)} " in t for w in LOW_FLASH_WORDS)
    high = any(f" {normalise_phrase(w)} " in t for w in HIGH_FLASH_WORDS)
    # "not too flashy" contains "flashy" — the low-flash phrase must win.
    if low:
        return "low"
    return "high" if high else None


def _is_negated(tokens: list[str], start: int, claimed: set[int] | None = None) -> bool:
    """True when a negation word governs the phrase at `start`.

    Scope ends at a clause break or at a previously matched attribute, so in
    "without red, matte please" only red is negated.
    """
    for i in range(start - 1, max(-1, start - 5), -1):
        tok = tokens[i]
        if tok in CLAUSE_BREAKS or tok in _ATTRIBUTE_WORDS or (claimed is not None and i in claimed):
            return False
        if tok in NEGATION_WORDS:
            return True
    return False


def _quantity_before(tokens: list[str], start: int, claimed: set[int]) -> int | None:
    for i in range(start - 1, max(-1, start - 4), -1):
        tok = tokens[i]
        if tok.isdigit():
            return max(1, min(int(tok), 50))
        if tok in NUMBER_WORDS:
            return NUMBER_WORDS[tok]
        if i in claimed and tok not in SIZE_ADJECTIVES:
            # an adjacent colour ("white bows") is fine to skip; anything else ends the search
            continue
        if tok not in SIZE_ADJECTIVES:
            return None
    return None


def _closest_charm(vocab: Vocabulary, category: str) -> VocabEntry | None:
    charms = vocab.available("charm")
    for cat in [category, *RELATED_CATEGORIES.get(category, [])]:
        match = next((c for c in charms if c.get("category") == cat), None)
        if match:
            return match
    return None


def _closest_colour(vocab: Vocabulary, hex_value: str) -> VocabEntry | None:
    colours = vocab.available("colour")
    if not colours:
        return None
    best = min(colours, key=lambda c: hex_distance(c.get("hex"), hex_value))
    return best if hex_distance(best.get("hex"), hex_value) < 30 else None


def _closest_shape(vocab: Vocabulary, svg_key: str) -> VocabEntry | None:
    shapes = vocab.available("shape")
    for key in [svg_key, *SIMILAR_SHAPES.get(svg_key, [])]:
        match = next((s for s in shapes if s.get("svg_key") == key), None)
        if match:
            return match
    return None


def _substitute_for(vocab: Vocabulary, entry: VocabEntry) -> VocabEntry | None:
    """Closest *available* alternative for an unavailable catalogue entry."""
    if entry.kind == "charm":
        alt = _closest_charm(vocab, entry.get("category", ""))
        return alt if alt and alt.id != entry.id else None
    if entry.kind == "colour":
        return _closest_colour(vocab, entry.get("hex"))
    if entry.kind == "shape":
        return _closest_shape(vocab, entry.get("svg_key"))
    others = vocab.available(entry.kind)
    return others[0] if others else None


class AttributeParser:
    def __init__(self, vocab: Vocabulary):
        self.vocab = vocab

    def parse(self, text: str) -> ParsedQuery:
        result = ParsedQuery()
        text = (text or "")[:1000]
        tokens = tokenize(text)
        claimed: set[int] = set()
        colour_positions: dict[int, str] = {}
        charm_positions: dict[int, str] = {}

        # 1) Catalogue vocabulary — greedy longest match.
        i = 0
        while i < len(tokens):
            matched = False
            for n in range(min(self.vocab.max_phrase_len, len(tokens) - i), 0, -1):
                phrase = " ".join(tokens[i : i + n])
                entries = self.vocab.lookup(phrase)
                if not entries:
                    continue
                # "<x> finish" disambiguates a finish from e.g. a same-named charm/colour.
                follow = tokens[i + n] if i + n < len(tokens) else ""
                if follow in {"finish", "effect", "look", "top"}:
                    entries = sorted(entries, key=lambda e: e.kind != "finish")
                entry = entries[0]
                negated = _is_negated(tokens, i, claimed)
                self._apply(result, entry, phrase, negated, tokens, i, claimed)
                if entry.kind == "colour":
                    colour_positions[i + n - 1] = entry.slug
                if entry.kind == "charm":
                    charm_positions[i] = entry.slug
                claimed.update(range(i, i + n))
                result.matched_phrases.append(phrase)
                i += n
                matched = True
                break
            if not matched:
                i += 1

        # "white bows": colour immediately before a charm describes the charm.
        for pos, charm_slug in charm_positions.items():
            for back in (1, 2):
                if pos - back in colour_positions:
                    result.charm_colours[charm_slug] = colour_positions[pos - back]
                    break

        # 2) General lexicon — recognise things the catalogue does not cover.
        self._scan_lexicon(result, tokens, claimed)

        # 3) Price, length and "vibe".
        result.price_min_paise, result.price_max_paise = parse_price(text)
        result.flash_preference = _flash_preference(text)
        return result

    # ------------------------------------------------------------------ helpers

    def _apply(self, r: ParsedQuery, e: VocabEntry, phrase: str, negated: bool, tokens, i, claimed) -> None:
        if not e.available and not negated:
            alt = _substitute_for(self.vocab, e)
            reason = "out_of_stock" if e.kind == "charm" and e.get("stock", 0) <= 0 else "inactive"
            r.unavailable.append(
                Unavailable(e.name, e.kind, reason, alt.slug if alt else None, alt.name if alt else None)
            )
            if not alt:
                return
            e = alt
        match e.kind:
            case "colour":
                target = r.excluded_colours if negated else r.colours
                if e.slug not in target:
                    target.append(e.slug)
            case "finish":
                target = r.excluded_finishes if negated else r.finishes
                if e.slug not in target:
                    target.append(e.slug)
            case "charm":
                if negated:
                    r.excluded_charms.append(e.slug)
                else:
                    qty = _quantity_before(tokens, i, claimed)
                    r.charms[e.slug] = qty if qty is not None else r.charms.get(e.slug)
            case "shape":
                if not negated and e.slug not in r.shapes:
                    r.shapes.append(e.slug)
            case _:
                bucket = {
                    "pattern": r.patterns,
                    "style": r.styles,
                    "category": r.categories,
                    "occasion": r.occasions,
                    "tag": r.tags,
                }[e.kind]
                if not negated and e.slug not in bucket:
                    bucket.append(e.slug)

    def _scan_lexicon(self, r: ParsedQuery, tokens: list[str], claimed: set[int]) -> None:
        lexicons = (
            ("length", {normalise_phrase(k): v for k, v in LENGTH_LEXICON.items()}),
            ("shape", {normalise_phrase(k): v for k, v in SHAPE_LEXICON.items()}),
            ("charm", {normalise_phrase(k): v for k, v in DECORATION_LEXICON.items()}),
            ("colour", {normalise_phrase(k): v for k, v in COLOUR_LEXICON.items()}),
        )
        max_len = 3
        i = 0
        while i < len(tokens):
            if i in claimed:
                i += 1
                continue
            hit = False
            for n in range(min(max_len, len(tokens) - i), 0, -1):
                span = range(i, i + n)
                if any(j in claimed for j in span):
                    continue
                phrase = " ".join(tokens[i : i + n])
                for kind, lex in lexicons:
                    if phrase not in lex:
                        continue
                    negated = _is_negated(tokens, i, claimed)
                    self._apply_lexicon(r, kind, phrase, lex[phrase], negated)
                    claimed.update(span)
                    hit = True
                    break
                if hit:
                    break
            i += n if hit else 1

    def _apply_lexicon(self, r: ParsedQuery, kind: str, phrase: str, value: str, negated: bool) -> None:
        if kind == "length":
            if not negated:
                r.length = value
            return
        if negated:
            # "no red" should exclude the red we stock, even though "red" itself is only a family word.
            if kind == "colour":
                family = [c for c in self.vocab.available("colour") if c.get("family") == phrase]
                target = (min(family, key=lambda c: hex_distance(c.get("hex"), value)) if family
                          else _closest_colour(self.vocab, value))
                if target and target.slug not in r.excluded_colours:
                    r.excluded_colours.append(target.slug)
            return
        if kind == "shape":
            alt = _closest_shape(self.vocab, value)
            if alt and alt.get("svg_key") == value:
                if alt.slug not in r.shapes:  # e.g. "ballerina" → our Coffin shape
                    r.shapes.append(alt.slug)
                return
            r.unavailable.append(Unavailable(phrase, "shape", "not_offered", alt and alt.slug, alt and alt.name))
            if alt and alt.slug not in r.shapes:
                r.shapes.append(alt.slug)
        elif kind == "charm":
            alt = _closest_charm(self.vocab, value)
            r.unavailable.append(Unavailable(phrase, "charm", "not_offered", alt and alt.slug, alt and alt.name))
            if alt and alt.slug not in r.charms:
                r.charms[alt.slug] = None
        elif kind == "colour":
            # A family word ("pink", "blue") is satisfied by any colour we stock in that family.
            family = [c for c in self.vocab.available("colour") if c.get("family") == phrase]
            if family:
                best = min(family, key=lambda c: hex_distance(c.get("hex"), value))
                if best.slug not in r.colours:
                    r.colours.append(best.slug)
                return
            alt = _closest_colour(self.vocab, value)
            r.unavailable.append(Unavailable(phrase, "colour", "not_offered", alt and alt.slug, alt and alt.name))
            if alt and alt.slug not in r.colours:
                r.colours.append(alt.slug)
