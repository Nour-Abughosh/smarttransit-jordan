from fastapi import APIRouter, HTTPException
from datetime import datetime
from models.schemas import FleetSummary, DispatchRequest, DispatchResponse
from data.mock_data import get_fleet, get_fleet_summary

router = APIRouter()

@router.get("/vehicles")
def list_vehicles():
    fleet = get_fleet()
    return {"vehicles":fleet,"count":len(fleet),"timestamp":datetime.now().isoformat()}

@router.get("/vehicles/{vehicle_id}")
def get_vehicle(vehicle_id: str):
    fleet   = get_fleet()
    vehicle = next((v for v in fleet if v["vehicle_id"]==vehicle_id), None)
    if not vehicle: raise HTTPException(status_code=404, detail=f"Vehicle {vehicle_id} not found")
    return vehicle

@router.get("/summary", response_model=FleetSummary)
def fleet_summary():
    return get_fleet_summary()

@router.post("/dispatch", response_model=DispatchResponse)
def dispatch_vehicle(request: DispatchRequest):
    messages = {"dispatch":f"{request.vehicle_id} dispatched",
                "hold":f"{request.vehicle_id} held",
                "reroute":f"{request.vehicle_id} rerouted"}
    return DispatchResponse(success=True,vehicle_id=request.vehicle_id,
                            action=request.action,
                            message=messages.get(request.action,"Action executed"),
                            timestamp=datetime.now().isoformat())

@router.get("/positions")
def vehicle_positions():
    fleet  = get_fleet()
    active = [v for v in fleet if v["status"] in ["active","delayed"]]
    return {"positions":[{"vehicle_id":v["vehicle_id"],"route_id":v["route_id"],
                          "lat":v["position"]["lat"],"lon":v["position"]["lon"],
                          "status":v["status"],"load_pct":v["load_pct"]}
                         for v in active],"count":len(active),
            "timestamp":datetime.now().isoformat()}
