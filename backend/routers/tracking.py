from fastapi import APIRouter
from data.database import (
    get_latest_prediction,
    get_fleet_by_route,
)

router = APIRouter()


@router.get("/{route_id}")
def tracking(route_id: str):

    latest = get_latest_prediction(route_id)

    fleet = get_fleet_by_route(route_id)

    if latest:

        pred = latest["prediction"]

        return {
            "route_id": route_id,
            "eta_minutes": pred.get("eta_minutes", 8),
            "ai_status": pred.get("congestion", "clear"),
            "delay_minutes": pred.get("delay_minutes", 0),
            "confidence": pred.get("confidence", 0.80),
            "crowding": pred.get("crowding", "moderate"),
            "fleet": fleet,
        }

    return {
        "route_id": route_id,
        "eta_minutes": 8,
        "ai_status": "clear",
        "delay_minutes": 0,
        "confidence": 0.75,
        "crowding": "moderate",
        "fleet": fleet,
    }