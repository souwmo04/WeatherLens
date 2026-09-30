"""Tiny async-safe in-memory TTL cache with in-flight request de-duplication."""
import asyncio
import time
from collections.abc import Awaitable, Callable
from typing import Any, TypeVar

T = TypeVar("T")


class TTLCache:
    def __init__(self, max_items: int = 2_000) -> None:
        self._store: dict[str, tuple[float, Any]] = {}
        self._inflight: dict[str, asyncio.Future[Any]] = {}
        self._max_items = max_items

    def get(self, key: str) -> Any | None:
        hit = self._store.get(key)
        if not hit:
            return None
        expires, value = hit
        if expires < time.monotonic():
            self._store.pop(key, None)
            return None
        return value

    def set(self, key: str, value: Any, ttl: float) -> None:
        if len(self._store) >= self._max_items:
            # drop the soonest-to-expire ~10%
            for k, _ in sorted(self._store.items(), key=lambda kv: kv[1][0])[: self._max_items // 10]:
                self._store.pop(k, None)
        self._store[key] = (time.monotonic() + ttl, value)

    async def get_or_set(self, key: str, ttl: float, factory: Callable[[], Awaitable[T]]) -> T:
        cached = self.get(key)
        if cached is not None:
            return cached
        if key in self._inflight:
            return await self._inflight[key]
        future: asyncio.Future[Any] = asyncio.get_running_loop().create_future()
        self._inflight[key] = future
        try:
            value = await factory()
            self.set(key, value, ttl)
            future.set_result(value)
            return value
        except Exception as exc:
            future.set_exception(exc)
            future.exception()  # mark retrieved so asyncio doesn't warn when nobody else awaited
            raise
        finally:
            self._inflight.pop(key, None)


cache = TTLCache()
