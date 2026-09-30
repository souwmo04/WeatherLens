import asyncio

from fastapi import APIRouter

from app.api.errors import api_error
from app.config import get_settings
from app.mocks.scenarios import SCENARIOS
from app.models.ai import AdviceRequest, AdviceResponse
from app.providers.http import ProviderError
from app.services import ai_service, rain_service, weather_service

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/weather-advice", response_model=AdviceResponse, summary="Grounded weather advice")
async def weather_advice(req: AdviceRequest) -> AdviceResponse:
    if req.scenario and req.scenario not in SCENARIOS:
        raise api_error(400, "invalid_scenario", f"Unknown demo scenario '{req.scenario}'.")
    bundle_task = weather_service.get_bundle(req.latitude, req.longitude, req.location_name,
                                             scenario=req.scenario, prefs=req.preferences)
    rain_task = rain_service.nowcast(req.latitude, req.longitude, req.scenario)
    bundle, rain = await asyncio.gather(bundle_task, rain_task, return_exceptions=True)
    if isinstance(bundle, BaseException):
        if isinstance(bundle, ProviderError):
            raise api_error(502, "provider_unavailable",
                            "I can't reach the weather service right now, so I can't give grounded advice.")
        raise bundle
    return await ai_service.advise(req, bundle, None if isinstance(rain, BaseException) else rain)


@router.get("/status", summary="Which AI engine is active")
async def status() -> dict:
    s = get_settings()
    return {"engine": "claude" if s.anthropic_api_key else "rules",
            "model": s.anthropic_model if s.anthropic_api_key else None}
