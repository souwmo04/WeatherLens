from typing import Literal

from pydantic import BaseModel, Field


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4_000)


class UserPreferences(BaseModel):
    home: str | None = None
    work: str | None = None
    departure_time: str | None = Field(None, description="HH:MM")
    return_time: str | None = Field(None, description="HH:MM")
    commute_mode: str | None = None
    activities: list[str] = []
    activity_time: str | None = Field(None, description="HH:MM")


class AdviceRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1_000)
    latitude: float
    longitude: float
    location_name: str | None = None
    scenario: str | None = Field(None, description="demo scenario key; uses demo data instead of live data")
    history: list[ChatTurn] = []
    preferences: UserPreferences | None = None


class AdviceResponse(BaseModel):
    answer: str
    engine: Literal["claude", "rules"]
    data_points: list[str] = Field(default_factory=list, description="the facts the answer was grounded on")
    location: str
    source: Literal["open-meteo", "demo"]
