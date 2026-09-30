"""Tiny, dependency-free text normalisation shared by the parser and the embeddings."""

import re

_TOKEN_RE = re.compile(r"[a-z0-9]+(?:'[a-z]+)?")
_KEEP_S = {"glass", "gloss", "chess", "dress", "kiss", "moss", "grass", "swiss", "iris", "lotus", "plus", "boss"}


def singular(word: str) -> str:
    """Crude English singulariser — good enough for nail vocabulary (bows, strawberries, cherries)."""
    if len(word) <= 3 or word in _KEEP_S or word.endswith("ss"):
        return word
    if word.endswith("ies") and len(word) > 4:
        return word[:-3] + "y"
    if word.endswith(("ches", "shes", "xes", "sses")):
        return word[:-2]
    if word.endswith("s") and not word.endswith("us"):
        return word[:-1]
    return word


def tokenize(text: str) -> list[str]:
    text = text.lower().replace("-", " ").replace("’", "'")
    return [singular(t.replace("'", "")) for t in _TOKEN_RE.findall(text)]


def normalise_phrase(text: str) -> str:
    return " ".join(tokenize(text))
