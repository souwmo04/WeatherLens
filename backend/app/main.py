"""WeatherLens API — FastAPI entrypoint."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api import ai, geo, weather
from app.api.errors import http_exception_handler, provider_error_handler
from app.config import get_settings
from app.providers.http import ProviderError, close_client

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    await close_client()


settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Weather, understood. Normalized Open-Meteo data + a grounded interpretation layer.",
    lifespan=lifespan,
)
app.add_middleware(GZipMiddleware, minimum_size=1_000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
app.add_exception_handler(HTTPException, http_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(ProviderError, provider_error_handler)  # type: ignore[arg-type]

app.include_router(weather.router)
app.include_router(geo.router)
app.include_router(ai.router)


@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok"}
