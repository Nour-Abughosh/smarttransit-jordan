from fastapi import APIRouter
from data.database import (
    get_routes,
    get_schedule,
    get_latest_prediction,
)

router = APIRouter()


@router.get("/routes")
def route_results(from_location: str = "Sweileh", to: str = "Downtown"):

    routes = get_routes()

    final_routes = []

    for idx, route in enumerate(routes):

        schedule = get_schedule(route["route_id"])

        latest = get_latest_prediction(route["route_id"])

        pred = latest["prediction"] if latest else {}

        next_trip = schedule[0] if len(schedule) > 0 else {}

        final_routes.append({
            "id": idx + 1,
            "route_id": route["route_id"],
            "name": route["route_name"],
            "type": next_trip.get("route_type", "coaster"),
            "stops": [from_location, to],
            "nextDeparture": next_trip.get("departure", "2:15 PM"),
            "arrivalTime": next_trip.get("arrival", "2:42 PM"),
            "duration": pred.get("eta_minutes", 18),
            "delay": pred.get("delay_minutes", 0),
            "crowding": pred.get("crowding", "moderate"),
            "fare": next_trip.get("fare", "0.35 JD"),
            "walkMin": 4,
            "aiStatus": pred.get("congestion", "clear"),
            "aiConfidence": int(pred.get("confidence", 0.80) * 100),
            "co2": "-35%",
            "seats": 12,
            "congestion": pred.get("congestion", "clear")
        })

    return {
        "routes": final_routes
    }