# main.py  — SmartTransit Jordan  FastAPI backend
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any

import numpy as np
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from database import (
    save_prediction,
    upsert_home_stats,
    get_fleet,
    get_all_routes,
    get_boardings_for_route,
)

RF_MODEL = None
CB_MODEL = None

app = FastAPI(title="SmartTransit Jordan API", version="2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

CROWDING_LABELS: dict[int, str] = {0: "available", 1: "moderate", 2: "full"}

ROUTE_META: list[dict[str, Any]] = [
    {"route_id": "AM503", "route_code": "AM503",    "name": "Sweileh → JU Hospital",     "type": "coaster", "stops": ["Sweileh Circle", "Sports City", "UJ Main Gate"],       "fare": "0.35 JD", "n_stops": 8,  "walk_min": 3, "base_duration": 22},
    {"route_id": "AM504", "route_code": "AM504",    "name": "Wadi Seer → Sweileh",        "type": "coaster", "stops": ["Wadi Seer", "Shmeisani", "Gardens", "Sweileh"],         "fare": "0.35 JD", "n_stops": 9,  "walk_min": 2, "base_duration": 28},
    {"route_id": "AM505", "route_code": "AM505",    "name": "Al-Muhajereen → Wadi Seer", "type": "coaster", "stops": ["Al-Muhajereen", "3rd Circle", "Wadi Seer"],             "fare": "0.40 JD", "n_stops": 11, "walk_min": 4, "base_duration": 35},
    {"route_id": "R12",   "route_code": "Route 12", "name": "Tabarbour → Downtown",       "type": "express", "stops": ["Tabarbour", "Wadi Saqra", "Downtown"],                  "fare": "0.35 JD", "n_stops": 12, "walk_min": 5, "base_duration": 31},
    {"route_id": "SARF",  "route_code": "Sarfees",  "name": "Abdali → Mecca Mall",        "type": "sarfees", "stops": ["Abdali", "Mecca Mall Gate 2"],                          "fare": "0.50 JD", "n_stops": 6,  "walk_min": 1, "base_duration": 18},
    {"route_id": "ALAT",  "route_code": "Alatroon", "name": "Alatroon → Al Mahatta",      "type": "coaster", "stops": ["Alatroon", "Salt Road", "Zarqa Bridge", "Al Mahatta"], "fare": "0.45 JD", "n_stops": 15, "walk_min": 6, "base_duration": 40},
]

ROUTE_DISPLAY: dict[str, dict] = {
    "AM503":    {"from": "Sweileh",       "to": "Jordan University Hospital"},
    "AM504":    {"from": "Wadi Seer",     "to": "Sweileh"},
    "AM505":    {"from": "Al-Muhajereen", "to": "Wadi Seer"},
    "Route 12": {"from": "Tabarbour",     "to": "Downtown Amman"},
    "Sarfees":  {"from": "Abdali",        "to": "Mecca Mall"},
    "Alatroon": {"from": "Alatroon",      "to": "Al Mahatta Terminal"},
}

# ════════════════════════════════════════════════════════════
#  helpers
# ════════════════════════════════════════════════════════════

def _jordan_now() -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=3)

def _jordan_hour() -> int:
    return _jordan_now().hour

# FIX: was named _current_hour in dashboard but never defined — unified here
def _current_hour() -> int:
    return _jordan_hour()

def _crowding_from_load(load_pct: int) -> str:
    if load_pct < 50: return "available"
    if load_pct < 85: return "moderate"
    return "full"

def _ai_status_from_delay(delay_minutes: float) -> str:
    if delay_minutes < 2:  return "clear"
    if delay_minutes < 5:  return "moderate"
    if delay_minutes < 10: return "high"
    return "gridlock"

def _predict_duration(base_duration: int, load_pct: int, delay_min: int, hour: int) -> int:
    peak_penalty = 0
    if 7 <= hour <= 9 or 16 <= hour <= 19:
        peak_penalty = int(8 * min(load_pct / 100, 1.0))
    load_penalty = int(6 * max(0, (load_pct - 60) / 40)) if load_pct > 60 else 0
    return base_duration + peak_penalty + load_penalty + max(0, delay_min // 2)

def _next_departure_min(delay_min: int, walk_min: int) -> int:
    return max(1, walk_min + max(0, 5 - delay_min))

def _arrival_time_str(depart_offset_min: int, duration_min: int) -> str:
    arrival = _jordan_now() + timedelta(minutes=depart_offset_min + duration_min)
    h = arrival.hour % 12 or 12
    ampm = "AM" if arrival.hour < 12 else "PM"
    return f"{h}:{arrival.minute:02d} {ampm}"

def _seats_estimate(load_pct: int):
    if load_pct >= 95: return None
    return max(0, round((100 - load_pct) / 8))

# ════════════════════════════════════════════════════════════
#  /health
# ════════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    return {"status": "ok", "time": _jordan_now().isoformat()}

# ════════════════════════════════════════════════════════════
#  /fleet  — FIX: was missing, caused 404
# ════════════════════════════════════════════════════════════

@app.get("/fleet")
async def fleet_endpoint():
    return {"fleet": get_fleet()}

# ════════════════════════════════════════════════════════════
#  /home/stats
# ════════════════════════════════════════════════════════════

@app.get("/home/stats")
async def home_stats():
    fleet  = get_fleet()
    routes = get_all_routes()
    hour   = _jordan_hour()

    active_buses = sum(1 for v in fleet if v["status"] == "active")
    avg_delay    = (sum(v["delay_minutes"] for v in fleet) / len(fleet)) if fleet else 0
    on_time_pct  = round(sum(1 for v in fleet if v["delay_minutes"] <= 2) / len(fleet) * 100) if fleet else 0
    avg_wait     = round(max(1.0, 6.2 - avg_delay * 0.3), 1)
    total_pass   = sum(r["total_boardings"] for r in routes)

    try:
        upsert_home_stats(active_buses, avg_wait, on_time_pct, total_pass)
    except Exception as e:
        print(f"home_stats write skipped: {e}")

    fleet_map = {v["route_id"]: v for v in fleet}

    quick_routes = []
    for meta in ROUTE_META:
        rid     = meta["route_id"]
        vehicle = fleet_map.get(rid, {})
        load    = vehicle.get("load_pct", 60)
        delay   = vehicle.get("delay_minutes", 0)
        dur     = _predict_duration(meta["base_duration"], load, delay, hour)
        dep_min = _next_departure_min(delay, meta["walk_min"])

        quick_routes.append({
            "route_id": rid,
            "from":     ROUTE_DISPLAY[meta["route_code"]]["from"],
            "to":       ROUTE_DISPLAY[meta["route_code"]]["to"],
            "route":    meta["route_code"],
            "eta":      f"{dep_min} min",
            "duration": f"{dur} min",
            "crowding": _crowding_from_load(load),
            "delay":    delay,
            "fare":     meta["fare"],
        })

    return {
        "stats": {
            "buses_active":     active_buses,
            "avg_wait_min":     avg_wait,
            "on_time_pct":      on_time_pct,
            "total_passengers": total_pass,
        },
        "quick_routes": quick_routes,
    }

# ════════════════════════════════════════════════════════════
#  /route-predictions
# ════════════════════════════════════════════════════════════

@app.get("/route-predictions")
async def route_predictions(
    from_stop: str = Query(default="", alias="from"),
    to_stop:   str = Query(default="", alias="to"),
):
    hour      = _jordan_hour()
    fleet_map = {v["route_id"]: v for v in get_fleet()}
    results: list[dict] = []

    for meta in ROUTE_META:
        rid     = meta["route_id"]
        vehicle = fleet_map.get(rid, {})
        load    = vehicle.get("load_pct", 60)
        delay   = vehicle.get("delay_minutes", 0)

        boardings = get_boardings_for_route(meta["route_code"])
        total_b   = sum(b["boarding_count"] for b in boardings) or 300

        # classification (crowding)
        try:
            features  = np.array([[load / 100.0, hour, meta["n_stops"], total_b]])
            pred      = RF_MODEL.predict(features)[0]
            proba     = RF_MODEL.predict_proba(features)[0]
            crowding  = CROWDING_LABELS.get(int(pred), _crowding_from_load(load))
            confidence = round(float(max(proba)) * 100)
        except Exception:
            crowding, confidence = _crowding_from_load(load), 75

        # regression (duration)
        try:
            features2 = np.array([[load / 100.0, hour, meta["n_stops"], total_b]])
            delay     = max(0, round(float(CB_MODEL.predict(features2)[0])))
        except Exception:
            pass

        duration  = _predict_duration(meta["base_duration"], load, delay, hour)
        dep_min   = _next_departure_min(delay, meta["walk_min"])
        arrival   = _arrival_time_str(dep_min, duration)
        seats     = _seats_estimate(load)

        payload: dict[str, Any] = {
            "route_id":       rid,
            "route_name":     meta["name"],
            "route_type":     meta["type"],
            "stops":          meta["stops"],
            "fare":           meta["fare"],
            "crowding":       crowding,
            "ai_confidence":  confidence,
            "delay_min":      delay,
            "ai_status":      _ai_status_from_delay(delay),
            "duration_min":   duration,
            "seats":          seats,
            "next_departure": f"{dep_min} min",
            "arrival_time":   arrival,
            "walk_min":       meta["walk_min"],
            "co2":            f"{round(0.05 * meta['n_stops'], 1)} kg",
            "load_pct":       load,
            "computed_at":    _jordan_now().isoformat(),
        }

        try:
            save_prediction(
                "route_results",
                {"route_id": rid, "load_pct": load, "hour": hour,
                 "n_stops": meta["n_stops"], "boardings": total_b},
                payload,
            )
        except Exception as e:
            print(f"save_prediction error: {e}")

        results.append(payload)

    # Smart filter
    if from_stop or to_stop:
        from_lower = from_stop.lower().strip()
        to_lower   = to_stop.lower().strip()

        ALIASES = {
            'uj':                ['AM503', 'AM504'],
            'university':        ['AM503', 'AM504'],
            'ju hospital':       ['AM503'],
            'jordan university': ['AM503', 'AM504'],
            'sweileh':           ['AM503', 'AM504'],
            'wadi seer':         ['AM504', 'AM505'],
            'muhajereen':        ['AM505'],
            'tabarbour':         ['R12'],
            'downtown':          ['R12'],
            'abdali':            ['SARF'],
            'mecca mall':        ['SARF'],
            'alatroon':          ['ALAT'],
            'mahatta':           ['ALAT'],
            'marj al hamam':     ['AM504', 'AM505'],
            'marj':              ['AM504', 'AM505'],
            'jubaiha':           ['AM504'],
            'gardens':           ['AM504'],
            'shmeisani':         ['AM504', 'R12'],
            'sport city':        ['AM503'],
            'sports city':       ['AM503'],
        }

        def get_ids(loc):
            matched = set()
            for alias, rids in ALIASES.items():
                if alias in loc or loc in alias:
                    matched.update(rids)
            keywords = [w for w in loc.split() if len(w) > 2]
            for r in results:
                txt = (r["route_name"] + " " +
                       " ".join(r["stops"]) + " " +
                       r.get("route_id", "")).lower()
                if any(k in txt for k in keywords):
                    matched.add(r["route_id"])
            return matched

        relevant = get_ids(from_lower) | get_ids(to_lower)
        filtered = [r for r in results if r["route_id"] in relevant]
        results  = filtered if filtered else results

    # FIX: return was inside the if block — now always returns
    return {
        "routes":       results,
        "from":         from_stop,
        "to":           to_stop,
        "generated_at": _jordan_now().isoformat(),
    }

# ════════════════════════════════════════════════════════════
#  /dashboard  — operator dashboard
# ════════════════════════════════════════════════════════════

@app.get("/dashboard")
async def dashboard():
    fleet  = get_fleet()
    routes = get_all_routes()
    hour   = _current_hour()

    total       = len(fleet)
    active      = sum(1 for v in fleet if v["status"] == "active")
    delayed     = sum(1 for v in fleet if v["status"] == "delayed")
    maint       = sum(1 for v in fleet if v["status"] == "maintenance")
    on_time     = sum(1 for v in fleet if v.get("delay_minutes", 0) < 3)
    on_time_pct = round(on_time / total * 100) if total else 0
    avg_load    = round(sum(v.get("load_pct", 0) for v in fleet) / total) if total else 0
    avg_delay   = round(sum(v.get("delay_minutes", 0) for v in fleet) / total, 1) if total else 0
    total_boardings = sum(r.get("total_boardings", 0) for r in routes)

    recs = []
    for v in fleet:
        if v["status"] == "delayed" and v.get("delay_minutes", 0) >= 5:
            recs.append({
                "vehicle_id": v["vehicle_id"],
                "action":     "reroute",
                "urgent":     True,
                "confidence": 87,
                "reason":     f"{v['vehicle_id']} on {v.get('route_id','')} delayed {v.get('delay_minutes',0)} min.",
                "impact":     "Alternate route saves ~8 min for on-board passengers.",
            })
        if v.get("load_pct", 0) >= 90 and v["status"] == "active":
            recs.append({
                "vehicle_id": v["vehicle_id"],
                "action":     "dispatch",
                "urgent":     v.get("load_pct", 0) >= 95,
                "confidence": 91,
                "reason":     f"{v['vehicle_id']} at {v.get('load_pct',0)}% capacity on {v.get('route_id','')}.",
                "impact":     "Dispatch backup reduces crowding and improves on-time rate.",
            })

    route_perf = [{
        "route_id":      v.get("route_id", ""),
        "load_pct":      v.get("load_pct", 0),
        "delay_minutes": v.get("delay_minutes", 0),
        "status":        v.get("status", "active"),
        "speed_kmh":     v.get("speed_kmh", 0),
    } for v in fleet]

    return {
        "kpis": {
            "total_boardings":   total_boardings,
            "active_buses":      active,
            "delayed_buses":     delayed,
            "maintenance_buses": maint,
            "total_buses":       total,
            "on_time_pct":       on_time_pct,
            "avg_load_pct":      avg_load,
            "avg_delay_min":     avg_delay,
            "peak_hour":         "7:00 PM",
            "peak_count":        1644,
            "busiest_route":     "Alatroon–Al Mahatta",
            "busiest_count":     4344,
        },
        "fleet":           fleet,
        "recommendations": recs[:5],
        "route_perf":      route_perf,
        "generated_at":    _jordan_now().isoformat(),
    }

# ════════════════════════════════════════════════════════════
#  /predict  (legacy)
# ════════════════════════════════════════════════════════════

@app.get("/predict")
async def predict(
    density:      float = Query(default=1.5),
    waiting_time: float = Query(default=5.0),
):
    hour     = _jordan_hour()
    features = np.array([[density, waiting_time, hour, 8]])

    try:
        pred  = RF_MODEL.predict(features)[0]
        proba = RF_MODEL.predict_proba(features)[0]
        crowding, confidence = CROWDING_LABELS.get(int(pred), "moderate"), round(float(max(proba)) * 100)
    except Exception:
        crowding, confidence = "moderate", 70

    try:
        delay = round(float(CB_MODEL.predict(features)[0]))
    except Exception:
        delay = 3

    result = {"crowding": crowding, "delay_min": delay, "confidence": confidence}
    try:
        save_prediction("single_predict", {"density": density, "waiting_time": waiting_time}, result)
    except Exception as e:
        print(f"save_prediction error: {e}")
    return result