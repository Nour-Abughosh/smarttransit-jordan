"""
SmartTransit Jordan — Predictions Router (Phase 2)
Uses real Decision Tree model when available.
"""

from fastapi import APIRouter, Query
from datetime import datetime
from typing import Optional, List

from data.model_loader import predict_congestion, get_model_info, is_loaded
from data.mock_data import rule_based_crowding, HOURLY_DEMAND, ROUTES_DATA, REAL_STATS
from models.schemas import (CrowdingPredictionRequest, CrowdingPredictionResponse,
                             DemandForecastResponse)

router = APIRouter()

@router.get("/congestion", summary="Predict congestion from SUMO features")
def predict_congestion_endpoint(
    speed:           float = Query(..., example=3.69),
    occupancy:       float = Query(..., example=57.24),
    waiting_time:    float = Query(..., example=136.0),
    flow:            float = Query(..., example=68.62),
    travel_time:     float = Query(0.0),
    incident_active: int   = Query(0),
    passenger_count: int   = Query(800),
    hour:            int   = Query(..., example=18, ge=0, le=23),
    map_region:      str   = Query("marj_alhamam"),
):
    """Predict road congestion. Uses ML model if loaded, else rule-based."""
    result = predict_congestion(
        speed=speed, occupancy=occupancy, waiting_time=waiting_time,
        flow=flow, travel_time=travel_time, incident_active=incident_active,
        passenger_count=passenger_count, hour=hour, map_region=map_region,
    )
    return {**result, "input": {"speed":speed,"occupancy":occupancy,
            "waiting_time":waiting_time,"flow":flow,"hour":hour,
            "map_region":map_region}, "timestamp": datetime.now().isoformat()}

@router.get("/congestion/batch", summary="Batch congestion predictions")
def predict_congestion_batch(hours: str = Query("7,8,9,17,18,19"),
                              map_region: str = Query("marj_alhamam")):
    hour_list = [int(h.strip()) for h in hours.split(",") if h.strip().isdigit()]
    results   = []
    for hour in hour_list:
        pc      = HOURLY_DEMAND.get(hour, 500)
        is_peak = hour in [7,8,9,17,18,19,20]
        result  = predict_congestion(
            speed=5.0 if is_peak else 35.0, occupancy=60.0 if is_peak else 10.0,
            waiting_time=200.0 if is_peak else 10.0, flow=150.0 if is_peak else 50.0,
            travel_time=30.0, incident_active=0, passenger_count=pc,
            hour=hour, map_region=map_region,
        )
        results.append({"hour":hour,"level":result["level"],
                        "color":result["color"],"is_peak":is_peak,
                        "passenger_count":pc})
    return {"predictions":results, "model_type":"ml-model" if is_loaded() else "rule-based",
            "timestamp":datetime.now().isoformat()}

@router.get("/crowding", response_model=CrowdingPredictionResponse)
def predict_crowding(route_id: str=Query(...,example="R01"),
                     hour: int=Query(...,ge=0,le=23,example=19),
                     day: int=Query(0,ge=0,le=6),
                     speed: Optional[float]=Query(None),
                     density: Optional[float]=Query(None)):
    result = rule_based_crowding(route_id, hour, day, speed, density)
    return CrowdingPredictionResponse(
        route_id=route_id, hour=hour, crowding_level=result["level"],
        crowding_probability=result["probability"], confidence=result["confidence"],
        color=result["color"], emoji=result["emoji"], advice=result["advice"],
        is_peak_hour=hour in [7,8,9,17,18,19,20], probabilities=result["probabilities"],
        model_type=result["model_type"], model_accuracy=result["model_accuracy"],
        timestamp=datetime.now().isoformat())

@router.get("/model/status", summary="Get AI model status")
def model_status():
    info = get_model_info()
    return {**info, "message": (
        f"Phase 2: {info['model_name']} ({info['accuracy']*100:.2f}% accuracy)"
        if info["phase"]==2 else
        "Phase 1: rule-based. Copy .pkl files to results/models/ to enable ML."
    ), "timestamp": datetime.now().isoformat()}

@router.post("/model/reload", summary="Reload ML model without restart")
def reload_model(model_dir: str=Query("results/models")):
    from data.model_loader import load_model
    success = load_model(model_dir=model_dir)
    return {"success":success, "model_info":get_model_info(),
            "timestamp":datetime.now().isoformat()}

@router.get("/demand/network/hourly")
def network_demand_forecast():
    return {"hourly_demand":[
        {"hour":h,"label":f"{h}am" if h<12 else "12pm" if h==12 else f"{h-12}pm",
         "actual":v,"forecast":int(v*1.08),"is_peak":h in [7,8,9,17,18,19,20]}
        for h,v in HOURLY_DEMAND.items()],
        "peak_hour":19,"peak_boardings":REAL_STATS["peak_count"],
        "total_boardings":REAL_STATS["total_boardings"],
        "timestamp":datetime.now().isoformat()}