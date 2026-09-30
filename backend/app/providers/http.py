"""Shared HTTP client + provider error type."""
import httpx

from app.config import get_settings

_client: httpx.AsyncClient | None = None


class ProviderError(Exception):
    """An upstream data provider failed or returned unusable data."""

    def __init__(self, provider: str, message: str) -> None:
        super().__init__(f"{provider}: {message}")
        self.provider = provider
        self.message = message


def client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        s = get_settings()
        _client = httpx.AsyncClient(
            timeout=s.request_timeout,
            headers={"User-Agent": s.http_user_agent},
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )
    return _client


async def close_client() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


async def get_json(provider: str, url: str, params: dict | None = None) -> dict | list:
    try:
        resp = await client().get(url, params=params)
    except httpx.HTTPError as exc:
        raise ProviderError(provider, f"network error ({type(exc).__name__})") from exc
    if resp.status_code >= 400:
        reason = ""
        try:
            reason = resp.json().get("reason", "")
        except Exception:
            pass
        raise ProviderError(provider, f"HTTP {resp.status_code} {reason}".strip())
    return resp.json()
