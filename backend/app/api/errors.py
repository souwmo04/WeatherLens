"""Consistent JSON error shape: {"error": {"code", "message"}} so the UI can render friendly states."""
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

from app.providers.http import ProviderError


def api_error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status, detail={"code": code, "message": message})


async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, dict) else {"code": "error", "message": str(exc.detail)}
    return JSONResponse(status_code=exc.status_code, content={"error": detail})


async def provider_error_handler(_: Request, exc: ProviderError) -> JSONResponse:
    return JSONResponse(status_code=502, content={"error": {
        "code": "provider_unavailable",
        "message": "The weather service is temporarily unavailable. Please try again shortly.",
        "provider": exc.provider,
    }})
