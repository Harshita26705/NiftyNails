"""Small sliding-window rate limiter.

In-memory is fine for a single API process. For multiple workers swap `_store`
for Redis behind the same `RateLimiter` interface.
"""

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request, status

from app.core.config import get_settings


class RateLimiter:
    def __init__(self, limit: int, window_seconds: int, scope: str):
        self.limit = limit
        self.window = window_seconds
        self.scope = scope
        self._store: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def _key(self, request: Request) -> str:
        client = request.client.host if request.client else "unknown"
        # Only honour X-Forwarded-For when the API sits behind our own proxy (Next.js rewrites / load balancer);
        # otherwise a client could rotate the header to dodge limits.
        if get_settings().trust_forwarded_for:
            forwarded = request.headers.get("x-forwarded-for")
            if forwarded:
                client = forwarded.split(",")[0].strip()
        return f"{self.scope}:{client}"

    def __call__(self, request: Request) -> None:
        now = time.monotonic()
        key = self._key(request)
        with self._lock:
            hits = self._store[key]
            while hits and now - hits[0] > self.window:
                hits.popleft()
            if len(hits) >= self.limit:
                retry_after = int(self.window - (now - hits[0])) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests — please slow down and try again shortly.",
                    headers={"Retry-After": str(retry_after)},
                )
            hits.append(now)

    def reset(self) -> None:
        with self._lock:
            self._store.clear()


auth_limiter = RateLimiter(limit=10, window_seconds=60, scope="auth")
ai_limiter = RateLimiter(limit=30, window_seconds=60, scope="ai")
upload_limiter = RateLimiter(limit=20, window_seconds=60, scope="upload")
checkout_limiter = RateLimiter(limit=10, window_seconds=60, scope="checkout")

ALL_LIMITERS = (auth_limiter, ai_limiter, upload_limiter, checkout_limiter)
