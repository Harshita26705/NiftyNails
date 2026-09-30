"""Text embeddings for semantic product search.

Default: scikit-learn `HashingVectorizer` (word 1-2 grams + char 3-5 grams). It is stateless,
so vectors can be persisted in `product_embeddings` and compared with query vectors without
re-fitting anything — free, fast, CPU-only and deterministic.

Optional: `sentence-transformers` (all-MiniLM-L6-v2, open-source) for true semantic similarity.
Install it and set EMBEDDING_PROVIDER=sentence-transformers; nothing else changes.
"""

import hashlib
import logging
from functools import lru_cache
from typing import Protocol

import numpy as np
from scipy import sparse
from sklearn.feature_extraction.text import HashingVectorizer

from app.core.config import get_settings
from app.ml.text import normalise_phrase

log = logging.getLogger(__name__)


class EmbeddingProvider(Protocol):
    model_name: str
    dim: int

    def embed(self, texts: list[str]) -> list[dict]: ...

    def similarity(self, a: dict, b: dict) -> float: ...


class HashingEmbeddingProvider:
    model_name = "hashing-v1"
    dim = 2**18

    def __init__(self) -> None:
        common = dict(n_features=self.dim // 2, alternate_sign=False, norm="l2", lowercase=True)
        self._words = HashingVectorizer(analyzer="word", ngram_range=(1, 2), preprocessor=normalise_phrase, **common)
        self._chars = HashingVectorizer(analyzer="char_wb", ngram_range=(3, 5), **common)

    def _matrix(self, texts: list[str]) -> sparse.csr_matrix:
        words = self._words.transform(texts)
        chars = self._chars.transform(texts)
        combined = sparse.hstack([words * 0.7, chars * 0.3]).tocsr()
        norms = np.sqrt(combined.multiply(combined).sum(axis=1)).A1
        norms[norms == 0] = 1.0
        return sparse.diags(1.0 / norms) @ combined

    def embed(self, texts: list[str]) -> list[dict]:
        matrix = self._matrix(texts)
        out = []
        for row in range(matrix.shape[0]):
            vec = matrix.getrow(row)
            out.append({"i": vec.indices.tolist(), "v": [round(float(x), 6) for x in vec.data]})
        return out

    def similarity(self, a: dict, b: dict) -> float:
        da = dict(zip(a["i"], a["v"], strict=True))
        return float(sum(da.get(i, 0.0) * v for i, v in zip(b["i"], b["v"], strict=True)))


class SentenceTransformerProvider:  # pragma: no cover - optional dependency
    def __init__(self, model: str = "sentence-transformers/all-MiniLM-L6-v2") -> None:
        from sentence_transformers import SentenceTransformer

        self._model = SentenceTransformer(model)
        self.model_name = model.split("/")[-1]
        self.dim = self._model.get_sentence_embedding_dimension()

    def embed(self, texts: list[str]) -> list[dict]:
        vectors = self._model.encode(texts, normalize_embeddings=True)
        return [{"v": [round(float(x), 6) for x in v]} for v in vectors]

    def similarity(self, a: dict, b: dict) -> float:
        return float(np.dot(a["v"], b["v"]))


@lru_cache
def get_embedding_provider() -> EmbeddingProvider:
    if get_settings().embedding_provider == "sentence-transformers":
        try:
            return SentenceTransformerProvider()
        except Exception:  # noqa: BLE001 - fall back to the free default rather than failing search
            log.warning("sentence-transformers unavailable; falling back to hashing embeddings", exc_info=True)
    return HashingEmbeddingProvider()


def text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
