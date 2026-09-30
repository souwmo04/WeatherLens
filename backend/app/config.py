"""Application configuration, loaded from environment variables / .env."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), env_file_encoding="utf-8", extra="ignore")

    app_name: str = "WeatherLens API"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Weather provider (Open-Meteo is free and keyless)
    open_meteo_forecast_url: str = "https://api.open-meteo.com/v1/forecast"
    open_meteo_geocoding_url: str = "https://geocoding-api.open-meteo.com/v1/search"
    open_meteo_air_quality_url: str = "https://air-quality-api.open-meteo.com/v1/air-quality"

    # Routing + reverse geocoding (free public services)
    osrm_url: str = "https://router.project-osrm.org"
    nominatim_url: str = "https://nominatim.openstreetmap.org"
    http_user_agent: str = "WeatherLens/1.0 (portfolio project)"

    # AI (optional). Without a key, the grounded rule engine answers instead.
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-opus-5-5"

    # Cache TTLs (seconds)
    forecast_ttl: int = 600
    geocode_ttl: int = 86_400
    air_quality_ttl: int = 1_800
    route_ttl: int = 900
    request_timeout: float = 12.0

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
