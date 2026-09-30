from typing import Annotated

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.providers import open_meteo, osm

router = APIRouter(prefix="/geo", tags=["geo"])


class Place(BaseModel):
    name: str
    country: str | None = None
    country_code: str | None = None
    admin1: str | None = None
    latitude: float
    longitude: float
    timezone: str | None = None
    population: int | None = None


@router.get("/search", response_model=list[Place], summary="City search")
async def search(q: Annotated[str, Query(min_length=2, max_length=80)],
                 count: Annotated[int, Query(ge=1, le=10)] = 8) -> list[Place]:
    results = await open_meteo.geocode(q, count)
    return [Place(name=r["name"], country=r.get("country"), country_code=r.get("country_code"),
                  admin1=r.get("admin1"), latitude=r["latitude"], longitude=r["longitude"],
                  timezone=r.get("timezone"), population=r.get("population")) for r in results]


class ReverseResult(BaseModel):
    name: str | None


@router.get("/reverse", response_model=ReverseResult, summary="Best-effort place name for coordinates")
async def reverse(lat: Annotated[float, Query(ge=-90, le=90)],
                  lon: Annotated[float, Query(ge=-180, le=180)]) -> ReverseResult:
    return ReverseResult(name=await osm.reverse(lat, lon))
