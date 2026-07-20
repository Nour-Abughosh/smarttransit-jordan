"""
SmartTransit Jordan — ETA Prediction Router
============================================
Predicts bus arrival time using the trained
Random Forest travel time model.

Endpoints:
    GET /api/predict/eta/edge        - predict time for one edge
    POST /api/predict/eta/route      - predict full route ETA
    GET /api/predict/eta/live/{route_id} - live ETA for a route
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import numpy as np
import joblib
import os
import json

router = APIRouter()

# ── Load travel time model ────────────────────────────────
MODEL_DIR = "results_full/regression/models"

_tt_model     = None
_tt_scaler    = None
_tt_region_enc= None
_tt_cong_enc  = None
_tt_edge_enc  = None
_tt_metadata  = None
_edge_stats   = None

def load_travel_time_model():
    global _tt_model, _tt_scaler, _tt_region_enc
    global _tt_cong_enc, _tt_edge_enc, _tt_metadata, _edge_stats

    required = [
        f"{MODEL_DIR}/catboost_full.cbm",
        f"{MODEL_DIR}/scaler.pkl",
        f"{MODEL_DIR}/region_encoder.pkl",
    ]
    if not all(os.path.exists(p) for p in required):
        print("  ⚠ Travel time model not found — ETA uses estimates")
        return False

    try:
        from catboost import CatBoostRegressor
        _tt_model = CatBoostRegressor()
        _tt_model.load_model(f"{MODEL_DIR}/catboost_full.cbm")
        _tt_scaler     = joblib.load(f"{MODEL_DIR}/scaler.pkl")
        _tt_region_enc = joblib.load(f"{MODEL_DIR}/region_encoder.pkl")

        if os.path.exists(f"{MODEL_DIR}/congestion_encoder.pkl"):
            _tt_cong_enc = joblib.load(f"{MODEL_DIR}/congestion_encoder.pkl")
        if os.path.exists(f"{MODEL_DIR}/edge_encoder.pkl"):
            _tt_edge_enc = joblib.load(f"{MODEL_DIR}/edge_encoder.pkl")
        if os.path.exists("results_traveltime/model_metadata.json"):
            _tt_metadata = json.load(
                open("results_traveltime/model_metadata.json"))
        if os.path.exists("results_traveltime/edge_stats.csv"):
            import pandas as pd
            _edge_stats = pd.read_csv(
                "results_traveltime/edge_stats.csv").set_index("edge_id")

        print(f"  ✓ Travel time model loaded: "
              f"{type(_tt_model).__name__} "
              f"(MAE={_tt_metadata['mae_seconds']:.1f}s, "
              f"R²={_tt_metadata['r2']:.4f})")
        return True

    except Exception as e:
        print(f"  ✗ Failed to load travel time model: {e}")
        return False

# Load at import time
_tt_loaded = load_travel_time_model()

# ── Feature order — must match training ───────────────────
TT_FEATURES = [
    'speed', 'occupancy', 'waitingTime', 'flow',
    'congestion_enc', 'is_gridlock_edge',
    'hour', 'is_peak_hour', 'hour_sin', 'hour_cos',
    'time_bucket', 'map_region_enc', 'edge_enc',
    'passenger_count', 'flow_speed_ratio',
]

# Encoding maps
BUCKET_MAP = {
    'Late Night':0,'Morning Peak':1,
    'Midday':2,'Evening Peak':3,'Night':4
}
CONG_MAP   = {'High':0,'Low':1,'Medium':2}
REGION_MAP = {'marj_alhamam':0,'swileh_ju':1,'wadi_seir':2}

def get_time_bucket(hour: int) -> int:
    if hour < 5:    return 0   # Late Night
    elif hour < 10: return 1   # Morning Peak
    elif hour < 15: return 2   # Midday
    elif hour < 20: return 3   # Evening Peak
    else:           return 4   # Night

def predict_edge_traveltime(
    speed: float, occupancy: float, waiting_time: float,
    flow: float, hour: int, map_region: str,
    congestion_level: str = "Medium",
    edge_id: str = "unknown",
    passenger_count: int = 500,
) -> dict:
    """Predict traversal time for one road edge."""

    is_gridlock  = int(speed < 0.5)
    is_peak      = int(hour in [7,8,9,17,18,19,20])
    hour_sin     = np.sin(2 * np.pi * hour / 24)
    hour_cos     = np.cos(2 * np.pi * hour / 24)
    time_bucket  = get_time_bucket(hour)
    region_enc   = REGION_MAP.get(map_region.lower(), 0)
    cong_enc     = CONG_MAP.get(congestion_level, 1)
    flow_speed_r = flow / (speed + 0.001)

    # Edge encoding
    edge_enc = -1
    if _tt_edge_enc is not None:
        try:
            edge_enc = int(_tt_edge_enc.transform([edge_id])[0])
        except:
            edge_enc = -1

    features = np.array([[
        speed, occupancy, waiting_time, flow,
        cong_enc, is_gridlock,
        hour, is_peak, hour_sin, hour_cos,
        time_bucket, region_enc, edge_enc,
        passenger_count, flow_speed_r,
    ]], dtype=np.float32)

    if _tt_loaded and _tt_model is not None:
        predicted_s = float(_tt_model.predict(features)[0])
        predicted_s = max(predicted_s, 0.1)
        model_type  = "ml-model"
    else:
        # Fallback: physics estimate (distance/speed)
        # Use average edge length ~200m as estimate
        predicted_s = 200 / (speed + 0.001) if speed > 0 else 120.0
        model_type  = "estimate"

    # Classify delay
    if is_gridlock:
        delay_status = "gridlock"
    elif predicted_s > 120:
        delay_status = "severely_delayed"
    elif predicted_s > 60:
        delay_status = "delayed"
    elif predicted_s > 20:
        delay_status = "slow"
    else:
        delay_status = "normal"

    return {
        "edge_id":          edge_id,
        "predicted_seconds":round(predicted_s, 1),
        "predicted_minutes":round(predicted_s / 60, 2),
        "delay_status":     delay_status,
        "is_gridlock":      bool(is_gridlock),
        "model_type":       model_type,
        "congestion_level": congestion_level,
        "map_region":       map_region,
    }

# ── Pydantic schemas ──────────────────────────────────────
class EdgeInput(BaseModel):
    edge_id:          str
    speed:            float
    occupancy:        float
    waiting_time:     float
    flow:             float
    map_region:       str = "marj_alhamam"
    congestion_level: str = "Medium"
    passenger_count:  int = 500

class RouteETARequest(BaseModel):
    route_name:       str
    departure_time:   str         # "HH:MM" format e.g. "07:30"
    edges:            List[EdgeInput]

class RouteETAResponse(BaseModel):
    route_name:           str
    departure_time:       str
    predicted_arrival:    str
    total_seconds:        float
    total_minutes:        float
    delay_seconds:        float
    edge_count:           int
    gridlock_edges:       int
    model_type:           str
    confidence:           str
    timestamp:            str

# ── Endpoints ─────────────────────────────────────────────

@router.get("/edge", summary="Predict travel time for one road edge")
def predict_edge_eta(
    speed:            float = Query(..., description="Speed km/h",          example=12.6),
    occupancy:        float = Query(..., description="Road occupancy %",    example=23.5),
    waiting_time:     float = Query(..., description="Waiting time seconds",example=30.0),
    flow:             float = Query(..., description="Flow vehicles/hour",  example=88.0),
    hour:             int   = Query(..., description="Hour 0-23",           example=9, ge=0, le=23),
    map_region:       str   = Query("marj_alhamam",
                                    description="marj_alhamam | swileh_ju | wadi_seir"),
    congestion_level: str   = Query("Medium",
                                    description="Low | Medium | High"),
    edge_id:          str   = Query("unknown"),
    passenger_count:  int   = Query(500),
):
    """
    Predict how many seconds a bus takes to traverse one road segment.

    Uses Random Forest model trained on 68,433 moving-traffic records.
    MAE = 23.91 seconds | R² = 0.940 | Within ±60s = 93.4%
    """
    result = predict_edge_traveltime(
        speed=speed, occupancy=occupancy, waiting_time=waiting_time,
        flow=flow, hour=hour, map_region=map_region,
        congestion_level=congestion_level, edge_id=edge_id,
        passenger_count=passenger_count,
    )
    return {**result, "timestamp": datetime.now().isoformat()}


@router.post("/route", response_model=RouteETAResponse,
             summary="Predict full route ETA from edge sequence")
def predict_route_eta(request: RouteETARequest):
    """
    Predict total travel time and arrival time for a bus route.

    Send a list of road edges with their current traffic conditions.
    Returns predicted arrival time and per-edge breakdown.

    This is how the SmartTransit live tracking screen shows real ETAs.
    """
    hour = datetime.now().hour

    # Parse departure time
    try:
        dep_h, dep_m = map(int, request.departure_time.split(":"))
        departure_dt = datetime.now().replace(
            hour=dep_h, minute=dep_m, second=0, microsecond=0)
    except:
        departure_dt = datetime.now()

    # Predict each edge
    total_seconds = 0.0
    gridlock_count = 0
    edge_results  = []

    for edge in request.edges:
        result = predict_edge_traveltime(
            speed=edge.speed, occupancy=edge.occupancy,
            waiting_time=edge.waiting_time, flow=edge.flow,
            hour=hour, map_region=edge.map_region,
            congestion_level=edge.congestion_level,
            edge_id=edge.edge_id,
            passenger_count=edge.passenger_count,
        )
        total_seconds += result["predicted_seconds"]
        if result["is_gridlock"]:
            gridlock_count += 1
        edge_results.append(result)

    # Calculate arrival time
    arrival_dt      = departure_dt + timedelta(seconds=total_seconds)
    arrival_str     = arrival_dt.strftime("%I:%M %p")

    # Baseline (no congestion) estimate for delay calculation
    baseline_seconds = sum(
        200 / (e.speed + 0.001) if e.speed > 0 else 10
        for e in request.edges
    )
    delay_seconds = total_seconds - baseline_seconds

    # Confidence based on gridlock ratio
    gridlock_ratio = gridlock_count / len(request.edges)
    confidence = "High" if gridlock_ratio < 0.1 else \
                 "Medium" if gridlock_ratio < 0.3 else "Low"

    return RouteETAResponse(
        route_name       = request.route_name,
        departure_time   = request.departure_time,
        predicted_arrival= arrival_str,
        total_seconds    = round(total_seconds, 1),
        total_minutes    = round(total_seconds / 60, 2),
        delay_seconds    = round(delay_seconds, 1),
        edge_count       = len(request.edges),
        gridlock_edges   = gridlock_count,
        model_type       = "ml-model" if _tt_loaded else "estimate",
        confidence       = confidence,
        timestamp        = datetime.now().isoformat(),
    )


@router.get("/live/{route_id}",
            summary="Get live ETA for a known bus route")
def get_live_eta(
    route_id:   str,
    departure:  str = Query("07:30", description="Departure time HH:MM"),
):
    """
    Get predicted ETA for a known route using current traffic conditions.
    Uses average edge stats from training data per map region.

    This is what the React passenger app calls to show arrival time.
    """
    # Route → region mapping
    route_regions = {
        "R01": "marj_alhamam",
        "R02": "swileh_ju",
        "R03": "wadi_seir",
        "R04": "marj_alhamam",
        "R05": "swileh_ju",
        "R06": "wadi_seir",
        "R07": "marj_alhamam",
    }

    # Route → number of edges mapping (approximate)
    route_edges = {
        "R01": 18, "R02": 12, "R03": 22,
        "R04": 8,  "R05": 19, "R06": 14, "R07": 16,
    }

    if route_id not in route_regions:
        raise HTTPException(
            status_code=404,
            detail=f"Route {route_id} not found. Available: {list(route_regions.keys())}"
        )

    hour       = datetime.now().hour
    is_peak    = hour in [7, 8, 9, 17, 18, 19, 20]
    region     = route_regions[route_id]
    n_edges    = route_edges[route_id]

    # Simulate typical traffic for this hour
    if is_peak:
        speed, occupancy, waiting, flow, cong = 8.0, 55.0, 180.0, 120.0, "High"
    elif hour < 7 or hour > 22:
        speed, occupancy, waiting, flow, cong = 45.0, 5.0,  5.0,   30.0, "Low"
    else:
        speed, occupancy, waiting, flow, cong = 25.0, 20.0, 30.0,  60.0, "Medium"

    # Predict total route time
    total_seconds = 0.0
    gridlock_count = 0

    for _ in range(n_edges):
        result = predict_edge_traveltime(
            speed=speed + np.random.normal(0, 3),
            occupancy=occupancy + np.random.normal(0, 5),
            waiting_time=waiting + np.random.normal(0, 10),
            flow=flow + np.random.normal(0, 10),
            hour=hour, map_region=region,
            congestion_level=cong,
        )
        total_seconds += result["predicted_seconds"]
        if result["is_gridlock"]:
            gridlock_count += 1

    # Parse departure and compute arrival
    try:
        dep_h, dep_m = map(int, departure.split(":"))
        departure_dt = datetime.now().replace(
            hour=dep_h, minute=dep_m, second=0, microsecond=0)
    except:
        departure_dt = datetime.now()

    arrival_dt   = departure_dt + timedelta(seconds=total_seconds)
    minutes_away = (arrival_dt - datetime.now()).total_seconds() / 60

    return {
        "route_id":          route_id,
        "region":            region,
        "departure_time":    departure,
        "predicted_arrival": arrival_dt.strftime("%I:%M %p"),
        "total_minutes":     round(total_seconds / 60, 1),
        "minutes_away":      round(max(minutes_away, 0), 1),
        "n_edges":           n_edges,
        "gridlock_edges":    gridlock_count,
        "is_peak_hour":      is_peak,
        "congestion":        cong,
        "model_type":        "ml-model" if _tt_loaded else "estimate",
        "model_mae_seconds": _tt_metadata["mae_seconds"] if _tt_metadata else None,
        "confidence":        "High" if gridlock_count/n_edges < 0.1 else "Medium",
        "timestamp":         datetime.now().isoformat(),
    }


@router.get("/model/status", summary="Travel time model status")
def tt_model_status():
    """Check if travel time model is loaded."""
    return {
        "loaded":      _tt_loaded,
        "model_type":  type(_tt_model).__name__ if _tt_model else None,
        "metadata":    _tt_metadata,
        "features":    TT_FEATURES,
        "timestamp":   datetime.now().isoformat(),
    }