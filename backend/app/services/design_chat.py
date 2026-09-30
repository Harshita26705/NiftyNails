"""Conversational custom-design builder.

A deterministic slot-filling dialogue on top of the catalogue-driven attribute parser. The
client holds the conversation state and sends it back each turn; the server re-validates
everything, so a tampered state can never reference things we can't make.
"""

import re
from typing import Literal

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ml.attribute_parser import AttributeParser, ParsedQuery
from app.ml.text import normalise_phrase
from app.ml.vocabulary import Vocabulary
from app.schemas.design import NAIL_KEYS, CharmPlacement, DesignConfig, DesignQuoteOut, NailConfig
from app.services.designs import quote

Placement = Literal["accent", "double_accent", "thumbs", "every"]

PLACEMENT_NAILS: dict[str, tuple[str, ...]] = {
    "accent": ("L4", "R4"),
    "double_accent": ("L3", "L4", "R3", "R4"),
    "thumbs": ("L1", "R1"),
    "every": NAIL_KEYS,
}
PLACEMENT_REPLIES = {
    "accent": "One accent nail",
    "double_accent": "Two accent nails",
    "every": "Every nail",
    "thumbs": "Just the thumbs",
}
# Sensible default count per nail by charm category (pearls & gems are used in clusters).
PER_NAIL_DEFAULT = {"pearl": 3, "gem": 3, "celestial": 2}
LENGTH_REPLIES = {"Short": "short", "Medium": "medium", "Long": "long", "Extra long": "xlong"}
CHARM_ROWS = (0.74, 0.5, 0.26)  # relative y for the 1st/2nd/3rd charm type on a nail
RESET_WORDS =("start over", "restart", "reset", "start again", "new design")


class DraftCharm(BaseModel):
    slug: str
    per_nail: int | None = Field(default=None, ge=1, le=6)
    placement: Placement | None = None
    colour: str | None = None


class ChatState(BaseModel):
    shape: str | None = None
    length: str | None = None
    base_colour: str | None = None
    accent_colours: list[str] = Field(default_factory=list, max_length=6)
    finish: str | None = None
    pattern: str | None = None
    charms: list[DraftCharm] = Field(default_factory=list, max_length=8)
    pending: str | None = None  # slot we just asked about, e.g. "placement:bow"
    turns: int = 0


class ChatTurnIn(BaseModel):
    message: str = Field(min_length=1, max_length=600)
    state: ChatState = Field(default_factory=ChatState)


class Notice(BaseModel):
    kind: Literal["unavailable", "info", "warning"]
    text: str


class ChatTurnOut(BaseModel):
    reply: str
    quick_replies: list[str]
    notices: list[Notice]
    state: ChatState
    design: DesignConfig | None
    quote: DesignQuoteOut | None
    complete: bool


def _placement_from_text(text: str) -> Placement | None:
    t = normalise_phrase(text)
    if re.search(r"\b(every|all|each|both hand|full set|whole)\b", t):
        return "every"
    if re.search(r"\b(two|2|double|middle and ring|ring and middle)\b", t):
        return "double_accent"
    if re.search(r"\bthumb\b", t):
        return "thumbs"
    if re.search(r"\b(one|1|accent|ring|single|just one)\b", t):
        return "accent"
    return None


def _explicit_placement(text: str) -> Placement | None:
    """Placement only when the customer clearly states one ("on every nail", "as an accent")."""
    t = normalise_phrase(text)
    if re.search(r"\b(on|across)\s+(every|all|each|both)\b", t) or "full set" in t:
        return "every"
    if re.search(r"\bon\s+(the\s+|my\s+)?thumb", t):
        return "thumbs"
    if re.search(r"\b(two|2|double)\s+accent", t):
        return "double_accent"
    if re.search(r"\baccent\b", t):
        return "accent"
    return None


def plural(word: str) -> str:
    if word.endswith("s"):
        return word
    if word.endswith("y") and word[-2:-1] not in "aeiou":
        return word[:-1] + "ies"
    return word + "s"


class DesignChat:
    def __init__(self, db: Session):
        self.db = db
        self.vocab = Vocabulary.from_db(db)
        self.parser = AttributeParser(self.vocab)

    def _name(self, kind: str, slug: str | None) -> str:
        entry = self.vocab.find(kind, slug) if slug else None
        return entry.name if entry else (slug or "").replace("-", " ")

    # ------------------------------------------------------------------ turn

    def turn(self, payload: ChatTurnIn) -> ChatTurnOut:
        state = self._sanitise(payload.state)
        message = payload.message.strip()
        notices: list[Notice] = []

        if any(w in message.lower() for w in RESET_WORDS):
            state = ChatState()
            return self._respond(state, ["Fresh start! ✨ Describe the nails you're dreaming of."], notices)

        acknowledgements: list[str] = []
        answered = self._answer_pending(state, message, acknowledgements)
        parsed = self.parser.parse(message)
        captured = self._merge(state, parsed, notices, message)
        if captured:
            acknowledgements.insert(0, captured)
        elif not answered and parsed.is_empty and not parsed.unavailable:
            acknowledgements.append(
                "I didn't quite catch a colour, finish or charm there — try something like "
                "“milky white almond nails with gold stars”."
            )
        state.turns += 1
        return self._respond(state, acknowledgements, notices)

    # ------------------------------------------------------------------ helpers

    def _sanitise(self, state: ChatState) -> ChatState:
        """Drop anything in the client-held state that isn't a real, available catalogue element."""
        def ok(kind: str, slug: str | None) -> str | None:
            entry = self.vocab.find(kind, slug) if slug else None
            return slug if entry and entry.available else None

        state.shape = ok("shape", state.shape)
        state.base_colour = ok("colour", state.base_colour)
        state.finish = ok("finish", state.finish)
        state.pattern = ok("pattern", state.pattern)
        state.accent_colours = [c for c in state.accent_colours if ok("colour", c)]
        state.length = state.length if state.length in LENGTH_REPLIES.values() else None
        state.charms = [c for c in state.charms if ok("charm", c.slug)]
        return state

    def _answer_pending(self, state: ChatState, message: str, acks: list[str]) -> bool:
        pending = state.pending
        if not pending:
            return False
        if pending.startswith("placement:"):
            slug = pending.split(":", 1)[1]
            placement = _placement_from_text(message)
            charm = next((c for c in state.charms if c.slug == slug), None)
            if charm and placement:
                charm.placement = placement
                acks.append(f"{self._name('charm', slug)} on {PLACEMENT_REPLIES[placement].lower()} — noted.")
                state.pending = None
                return True
        elif pending == "length":
            value = LENGTH_REPLIES.get(message.strip().capitalize()) or next(
                (v for k, v in LENGTH_REPLIES.items() if k.lower() in message.lower()), None
            )
            if value:
                state.length = value
                state.pending = None
                return True
        elif pending in ("confirm", "confirmed") and re.search(
            r"\b(yes|yep|perfect|love|looks good|done)\b", message.lower()
        ):
            state.pending = "confirmed"
            return True
        return False

    def _merge(self, state: ChatState, q: ParsedQuery, notices: list[Notice], message: str) -> str:
        bits: list[str] = []
        for item in q.unavailable:
            if item.suggestion_name:
                notices.append(Notice(kind="unavailable", text=(
                    f"We don't currently offer {item.requested}. The closest we can create is "
                    f"{item.suggestion_name} — I've used that instead."
                )))
            else:
                notices.append(Notice(kind="unavailable", text=(
                    f"We don't currently offer {item.requested}, and there's no close alternative in stock — "
                    "I've left it out."
                )))

        charm_colour_slugs = set(q.charm_colours.values())
        nail_colours = [c for c in q.colours if c not in charm_colour_slugs] or (q.colours if not q.charms else [])
        if nail_colours:
            if state.base_colour is None or state.pending == "base_colour":
                state.base_colour = nail_colours[0]
                extra = nail_colours[1:]
            else:
                extra = nail_colours
            for c in extra:
                if c != state.base_colour and c not in state.accent_colours:
                    state.accent_colours.append(c)
            bits.append(" & ".join(self._name("colour", c) for c in nail_colours))
        for c in q.excluded_colours:
            if state.base_colour == c:
                state.base_colour = None
            state.accent_colours = [a for a in state.accent_colours if a != c]

        if q.finishes:
            state.finish = q.finishes[0]
            bits.append(self._name("finish", state.finish))
        if q.excluded_finishes and state.finish in q.excluded_finishes:
            state.finish = None
        if q.shapes:
            state.shape = q.shapes[0]
            bits.append(self._name("shape", state.shape))
        if q.length:
            state.length = q.length
            bits.append({"xlong": "extra long"}.get(q.length, q.length))
        if q.patterns:
            state.pattern = q.patterns[0]
            bits.append(self._name("pattern", state.pattern))

        placement_hint = _explicit_placement(message)
        for slug, qty in q.charms.items():
            existing = next((c for c in state.charms if c.slug == slug), None)
            if existing is None:
                if len(state.charms) >= 8:
                    notices.append(Notice(kind="info", text="That's plenty of charm types for one set! 💅"))
                    break
                existing = DraftCharm(slug=slug)
                state.charms.append(existing)
            if qty:
                existing.per_nail = min(qty, 6)
            if slug in q.charm_colours:
                existing.colour = q.charm_colours[slug]
            existing.placement = existing.placement or placement_hint
            bits.append(plural(self._name("charm", slug)))
        if q.excluded_charms:
            state.charms = [c for c in state.charms if c.slug not in q.excluded_charms]
            notices.append(Notice(kind="info", text="Removed: " + ", ".join(
                self._name("charm", s) for s in q.excluded_charms)))
        if not bits:
            return ""
        return f"Ooh, {', '.join(bits[:-1]) + ' and ' + bits[-1] if len(bits) > 1 else bits[0]} — lovely."

    def _next_question(self, state: ChatState) -> tuple[str | None, str | None, list[str]]:
        if state.base_colour is None:
            colours = [c.name for c in self.vocab.available("colour")][:6]
            return "base_colour", "What base colour are you feeling?", colours
        for charm in state.charms:
            if charm.placement is None:
                return (
                    f"placement:{charm.slug}",
                    f"Would you like the {plural(self._name('charm', charm.slug))} on:",
                    [PLACEMENT_REPLIES["accent"], PLACEMENT_REPLIES["double_accent"], PLACEMENT_REPLIES["every"]],
                )
        if state.shape is None:
            return "shape", "Which nail shape?", [s.name for s in self.vocab.available("shape")]
        if state.length is None:
            return "length", "And how long?", list(LENGTH_REPLIES)
        if state.finish is None:
            finishes = [f.name for f in self.vocab.available("finish")][:5]
            return "finish", "Last one — which finish?", finishes
        return None, None, []

    def _build_config(self, state: ChatState) -> DesignConfig | None:
        fallback_colour = next(iter(self.vocab.available("colour")), None)
        fallback_shape = next(iter(self.vocab.available("shape")), None)
        fallback_finish = next(iter(self.vocab.available("finish")), None)
        base = state.base_colour or (fallback_colour.slug if fallback_colour else None)
        shape = state.shape or (fallback_shape.slug if fallback_shape else None)
        finish = state.finish or (fallback_finish.slug if fallback_finish else None)
        if not (base and shape and finish):
            return None
        nails: dict[str, NailConfig] = {k: NailConfig() for k in NAIL_KEYS}
        # Accent colours go on the accent nails.
        if state.accent_colours:
            for i, key in enumerate(("L4", "R4", "L2", "R2")):
                nails[key].colour = state.accent_colours[i % len(state.accent_colours)]
        if state.pattern:
            for key in ("L3", "R3") if state.charms else NAIL_KEYS:
                nails[key].pattern = state.pattern
                nails[key].pattern_colour = state.accent_colours[0] if state.accent_colours else None
        for charm in state.charms:
            entry = self.vocab.find("charm", charm.slug)
            per_nail = charm.per_nail or PER_NAIL_DEFAULT.get(entry.get("category") if entry else "", 1)
            for key in PLACEMENT_NAILS[charm.placement or "accent"]:
                # Each charm type gets its own row (cuticle → tip) so types never overlap.
                row = len({c.charm for c in nails[key].charms})
                y = CHARM_ROWS[min(row, len(CHARM_ROWS) - 1)]
                small = per_nail > 1
                for n in range(per_nail):
                    if len(nails[key].charms) >= 12:
                        break
                    spread = (n - (per_nail - 1) / 2) * 0.26
                    nails[key].charms.append(
                        CharmPlacement(charm=charm.slug, x=min(0.85, max(0.15, 0.5 + spread)), y=y,
                                       scale=0.8 if small else 1.05)
                    )
        return DesignConfig(shape=shape, length=state.length or "medium", base_colour=base, finish=finish,
                            nails=nails)

    def _respond(self, state: ChatState, acks: list[str], notices: list[Notice]) -> ChatTurnOut:
        just_confirmed = state.pending == "confirmed"
        slot, question, replies = self._next_question(state)
        state.pending = slot
        design = self._build_config(state)
        q = quote(self.db, design) if design else None
        complete = slot is None
        if complete and just_confirmed:
            state.pending = "confirmed"
            lines = [*acks, "Yay! 💗 Save it to your designs or add it straight to your bag — our nail artist "
                            "reviews every custom set before we start making it."]
            replies = ["Start over"]
        elif complete:
            state.pending = "confirm"
            summary = self._summary(state)
            price = f"₹{q.price_paise / 100:,.0f}" if q else ""
            lines = [*acks, f"Here's your set: {summary}.", f"Estimated price {price}. Want to tweak anything?"]
            replies = ["Looks perfect!", "Make it longer", "Add pearls", "Start over"]
        else:
            lines = [*acks, question]
        return ChatTurnOut(
            reply="\n".join(line for line in lines if line),
            quick_replies=replies,
            notices=notices,
            state=state,
            design=design,
            quote=q,
            complete=complete,
        )

    def _summary(self, state: ChatState) -> str:
        parts = [
            {"xlong": "extra long"}.get(state.length or "", state.length or ""),
            self._name("colour", state.base_colour).lower(),
            self._name("shape", state.shape).lower(),
            f"with a {self._name('finish', state.finish).lower()} finish",
        ]
        text = " ".join(p for p in parts if p)
        if state.accent_colours:
            text += ", " + " & ".join(self._name("colour", c).lower() for c in state.accent_colours) + " accents"
        if state.charms:
            text += ", " + ", ".join(
                f"{plural(self._name('charm', c.slug))} on {PLACEMENT_REPLIES[c.placement or 'accent'].lower()}"
                for c in state.charms
            )
        return text
