#!/usr/bin/env python3
"""
SmartTransit Jordan — Complete Backend Generator
=================================================
Run this script from ~/trial/backend/ to create all missing files.

Usage:
    cd ~/trial/backend
    python generate_backend.py
"""

import os

files = {}

# ── __init__.py files ─────────────────────────────────────
files['data/__init__.py'] = ''
files['routers/__init__.py'] = ''
files['models/__init__.py'] = ''

# ── models/schemas.py ─────────────────────────────────────
files['models/schemas.py'] = '''
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum

class CongestionLevel(str, Enum):
    LOW      = "Low"
    MODERATE = "Medium"
    HIGH     = "High"

class CrowdingLevel(str, Enum):
    LOW      = "Low"
    MODERATE = "Moderate"
    HIGH     = "High"
    FULL     = "Full"

class VehicleStatus(str, Enum):
    ACTIVE      = "active"
    DELAYED     = "delayed"
    MAINTENANCE = "maintenance"
    DEPOT       = "depot"

class AlertSeverity(str, Enum):
    INFO     = "Info"
    WARNING  = "Warning"
    CRITICAL = "Critical"

class CrowdingPredictionRequest(BaseModel):
    route_id:       str
    hour:           int = Field(..., ge=0, le=23)
    day:            int = Field(0, ge=0, le=6)
    speed:          Optional[float] = None
    density:        Optional[float] = None
    passenger_count:Optional[int]   = None

class CrowdingPredictionResponse(BaseModel):
    route_id:             str
    hour:                 int
    crowding_level:       str
    crowding_probability: float
    confidence:           str
    color:                str
    emoji:                str
    advice:               str
    is_peak_hour:         bool
    probabilities:        Dict[str, float]
    model_type:           str
    model_accuracy:       Optional[float]
    timestamp:            str

class DemandForecastResponse(BaseModel):
    route_id:            str
    forecast_hour:       int
    predicted_demand:    int
    confidence_interval: Dict[str, int]
    trend:               str
    peak_hours:          List[int]
    model_type:          str
    timestamp:           str

class DispatchRequest(BaseModel):
    vehicle_id: str
    action:     str
    route_id:   Optional[str] = None
    reason:     Optional[str] = None

class DispatchResponse(BaseModel):
    success:    bool
    vehicle_id: str
    action:     str
    message:    str
    timestamp:  str

class FleetSummary(BaseModel):
    total_vehicles: int
    active:         int
    delayed:        int
    maintenance:    int
    in_depot:       int
    avg_load_pct:   float
    avg_delay_min:  float
    timestamp:      str

class DashboardKPIs(BaseModel):
    total_boardings:  int
    active_fleet:     str
    avg_load:         str
    peak_hour:        str
    peak_count:       int
    on_time_rate:     str
    unique_vehicles:  int
    unique_routes:    int
    timestamp:        str

class HourlyDemand(BaseModel):
    hour:      int
    label:     str
    boardings: int
    forecast:  int
    is_peak:   bool
'''

# ── data/mock_data.py ─────────────────────────────────────
files['data/mock_data.py'] = '''
"""
SmartTransit Jordan — Mock Data Layer
Phase 1: Hardcoded data from real Amman Vision stats
Phase 2: Replace with real DB queries
"""

import random
import numpy as np
from datetime import datetime, timedelta
from typing import List, Optional

random.seed(42)
np.random.seed(42)

REAL_STATS = {
    "total_boardings":  18038,
    "unique_vehicles":  104,
    "unique_routes":    27,
    "peak_hour":        19,
    "peak_hour_label":  "7:00 PM",
    "peak_count":       1644,
    "on_time_rate":     0.87,
    "busiest_route":    "Alatroon–Al Mahatta Terminal",
    "busiest_count":    4344,
    "passengers": {
        "Adult":     14778,
        "EMV":       2161,
        "Mobile QR": 1052,
        "Free Card": 46,
    }
}

HOURLY_DEMAND = {
    5:120,  6:380,  7:820,  8:1150, 9:960,
    10:680, 11:540, 12:610, 13:720, 14:640,
    15:710, 16:890, 17:1180,18:1420,19:1644,
    20:1210,21:880, 22:540, 23:280,
}

ROUTES_DATA = [
    {"route_id":"R01","route_name":"Alatroon–Al Mahatta","code":"ALA-MAH","type":"Coaster","boardings":4344,"stops":18,"distance":12.5,"duration":45,"vehicles":8,"color":"#00C896"},
    {"route_id":"R02","route_name":"Sarfees Direct",     "code":"SAR-DIR","type":"Sarfees","boardings":3102,"stops":12,"distance":8.2, "duration":30,"vehicles":6,"color":"#3B9EFF"},
    {"route_id":"R03","route_name":"Route 35",           "code":"RT-35",  "type":"Coaster","boardings":2891,"stops":22,"distance":15.1,"duration":55,"vehicles":7,"color":"#FF6B35"},
    {"route_id":"R04","route_name":"Route 12 Express",   "code":"RT-12X", "type":"Express","boardings":2340,"stops":8, "distance":10.3,"duration":25,"vehicles":5,"color":"#A78BFA"},
    {"route_id":"R05","route_name":"Route 15",           "code":"RT-15",  "type":"Coaster","boardings":1876,"stops":19,"distance":13.7,"duration":50,"vehicles":5,"color":"#FF9F43"},
    {"route_id":"R06","route_name":"Route 6",            "code":"RT-06",  "type":"Sarfees","boardings":1654,"stops":14,"distance":9.4, "duration":35,"vehicles":4,"color":"#10B981"},
    {"route_id":"R07","route_name":"Route 27",           "code":"RT-27",  "type":"Coaster","boardings":1831,"stops":16,"distance":11.2,"duration":40,"vehicles":5,"color":"#FF5252"},
]

DRIVERS = ["Omar K.","Ahmad S.","Samer A.","Tariq N.","Khalid M.",
           "Faris J.","Rami H.","Nizar W.","Bassam T.","Walid F."]

EDGE_IDS = ["156738306#2","-156738299#1","149881366#2",
            "-149881316#15","688438635#0","-156725033#0",
            "149813592#2","-150957664#1","-150948580#12"]

CONGESTION_THRESHOLDS = {
    "speed_gridlock": 1.0,
    "speed_high":     10.0,
    "speed_moderate": 25.0,
    "density_high":   100.0,
    "waiting_high":   300.0,
    "flow_high":      100.0,
}

def rule_based_congestion(speed, density, waiting_time, flow, hour, is_peak):
    t = CONGESTION_THRESHOLDS
    if speed <= t["speed_gridlock"] and waiting_time > t["waiting_high"]:
        level = "High"; conf = 0.94
        probs = {"Low":0.01,"Medium":0.05,"High":0.94}
    elif speed <= t["speed_high"] or density >= t["density_high"]:
        level = "High"; conf = 0.88
        probs = {"Low":0.05,"Medium":0.10,"High":0.85}
    elif is_peak and flow >= t["flow_high"] and speed <= t["speed_moderate"]:
        level = "High"; conf = 0.78
        probs = {"Low":0.10,"Medium":0.15,"High":0.75}
    elif speed <= t["speed_moderate"] or (is_peak and density > 20):
        level = "Medium"; conf = 0.75
        probs = {"Low":0.15,"Medium":0.70,"High":0.15}
    else:
        level = "Low"; conf = 0.91
        probs = {"Low":0.90,"Medium":0.08,"High":0.02}

    colors = {"Low":"#00C896","Medium":"#FF9F43","High":"#FF5252"}
    advice = {
        "Low":    "Traffic flowing freely.",
        "Medium": "Moderate congestion. Allow extra 5–10 minutes.",
        "High":   "Heavy congestion. Consider rerouting.",
    }
    return {"level":level,"confidence":conf,"probabilities":probs,
            "color":colors[level],"advice":advice[level],"model_type":"rule-based"}

def rule_based_crowding(route_id, hour, day, speed=None, density=None):
    demand      = HOURLY_DEMAND.get(hour, 500)
    max_demand  = max(HOURLY_DEMAND.values())
    demand_ratio= demand / max_demand
    route_mult  = {"R01":1.45,"R02":1.20,"R03":1.25,"R04":0.90,
                   "R05":0.95,"R06":0.85,"R07":1.00}.get(route_id, 1.0)
    weekend_mult= 0.75 if day >= 4 else 1.0
    load        = demand_ratio * route_mult * weekend_mult

    if load >= 0.90:
        level="Full";   prob=min(0.98,load); color="#FF5252"; emoji="🔴"
        advice="Bus likely full. Take the next departure."
        probs={"Low":0.01,"Moderate":0.04,"High":0.10,"Full":round(prob,2)}
    elif load >= 0.70:
        level="High";   prob=round(load*0.85,2); color="#FF6B35"; emoji="🟠"
        advice="Crowded. Consider the next bus."
        probs={"Low":0.05,"Moderate":0.15,"High":round(prob,2),"Full":0.10}
    elif load >= 0.40:
        level="Moderate";prob=round(0.55+load*0.2,2); color="#FF9F43"; emoji="🟡"
        advice="Some standing. Comfortable for short trips."
        probs={"Low":0.15,"Moderate":round(prob,2),"High":0.20,"Full":0.05}
    else:
        level="Low";    prob=round(0.85-load*0.3,2); color="#00C896"; emoji="🟢"
        advice="Comfortable — plenty of seats."
        probs={"Low":round(prob,2),"Moderate":0.20,"High":0.05,"Full":0.01}

    total = sum(probs.values())
    probs = {k: round(v/total,3) for k,v in probs.items()}
    return {"level":level,"probability":prob,"confidence":"High" if prob>0.75 else "Medium",
            "color":color,"emoji":emoji,"advice":advice,"probabilities":probs,
            "model_type":"rule-based","model_accuracy":None}

def get_fleet():
    statuses = ["active"]*6+["delayed"]*2+["maintenance"]+["depot"]
    hour     = datetime.now().hour
    is_peak  = hour in [7,8,9,17,18,19,20]
    vehicles = []
    for i, route in enumerate(ROUTES_DATA[:8]):
        status = statuses[i]
        load   = round(random.uniform(60,100),1) if status=="active" and is_peak else round(random.uniform(20,70),1) if status=="active" else 0
        delay  = round(random.uniform(5,15),1) if status=="delayed" else 0
        speed  = round(random.uniform(15,55),1) if status=="active" else 0
        vehicles.append({
            "vehicle_id": f"BUS-{100+i*111}",
            "route_id":   route["route_id"],
            "route_name": route["route_name"],
            "driver":     DRIVERS[i % len(DRIVERS)],
            "status":     status, "load_pct":load, "delay_min":delay, "speed_kmh":speed,
            "position":   {"lat":round(31.9539+random.uniform(-0.05,0.05),4),
                           "lon":round(35.9106+random.uniform(-0.05,0.05),4)},
            "last_stop":  random.choice(["Sweileh","Gardens","Shmeisani","Abdali"]),
            "next_stop":  random.choice(["Al Mahatta","Tabarbour","University St"]),
            "passengers": int(load/100*28), "capacity":28,
        })
    return vehicles

def get_fleet_summary():
    fleet   = get_fleet()
    active  = sum(1 for v in fleet if v["status"]=="active")
    delayed = sum(1 for v in fleet if v["status"]=="delayed")
    maint   = sum(1 for v in fleet if v["status"]=="maintenance")
    depot   = sum(1 for v in fleet if v["status"]=="depot")
    loads   = [v["load_pct"] for v in fleet if v["status"]=="active"]
    return {"total_vehicles":len(fleet),"active":active,"delayed":delayed,
            "maintenance":maint,"in_depot":depot,
            "avg_load_pct":round(sum(loads)/len(loads),1) if loads else 0,
            "avg_delay_min":round(sum(v["delay_min"] for v in fleet)/len(fleet),1),
            "timestamp":datetime.now().isoformat()}

def get_all_routes():
    return ROUTES_DATA

def get_route_detail(route_id):
    route = next((r for r in ROUTES_DATA if r["route_id"]==route_id), None)
    if not route: return None
    stops = [{"stop_id":f"S{route_id}{j:02d}","stop_name":name,
               "lat":round(31.95+j*0.008,4),"lon":round(35.90+j*0.006,4),"sequence":j}
              for j,name in enumerate(["Sweileh","Sports City","University","Gardens",
              "Shmeisani","Abdali","Downtown","Al Mahatta"][:route["stops"]],1)]
    return {**route,"stops":stops,
            "hourly_demand":{str(h):v for h,v in HOURLY_DEMAND.items()},
            "on_time_rate":round(random.uniform(0.78,0.94),2)}

def get_departures(route_id, hour):
    now    = datetime.now()
    h      = hour or now.hour
    routes = [r for r in ROUTES_DATA if not route_id or r["route_id"]==route_id]
    deps   = []
    for i,route in enumerate(routes[:6]):
        depart = now.replace(minute=0,second=0)+timedelta(minutes=i*12+random.randint(0,5))
        arrive = depart+timedelta(minutes=route["duration"])
        crowd  = rule_based_crowding(route["route_id"],h,now.weekday())
        deps.append({"route_id":route["route_id"],"route_name":route["route_name"],
                     "departs_at":depart.strftime("%I:%M %p"),
                     "arrives_at":arrive.strftime("%I:%M %p"),
                     "duration_min":route["duration"],
                     "fare_jd":0.35 if route["type"]!="Express" else 0.50,
                     "crowding":crowd["level"],"vehicle_type":route["type"],
                     "platform":random.choice(["A","B","C"]),
                     "status":"On time" if random.random()>0.2 else f"Delayed +{random.randint(3,12)}m",
                     "delay_min":0 if random.random()>0.2 else random.randint(3,12)})
    return deps

def get_active_alerts():
    now = datetime.now().isoformat()
    return [
        {"alert_id":1,"severity":"Critical","title":"Route 35 — 100% Capacity",
         "message":"BUS-209 fully loaded. 42 passengers waiting at Gardens Junction.",
         "route_id":"R03","edge_id":None,"created_at":now,"is_active":True,"ai_generated":True},
        {"alert_id":2,"severity":"Warning","title":"BUS-088 — +9 min delay",
         "message":"Road closure near 4th Circle. Reroute via Mecca Street saves 9 min.",
         "route_id":"R05","edge_id":"-149881316#15","created_at":now,"is_active":True,"ai_generated":True},
        {"alert_id":3,"severity":"Warning","title":"Vehicle Clustering — Alatroon",
         "message":"BUS-104 and BUS-115 within 2 min. Dispatch BUS-402.",
         "route_id":"R01","edge_id":None,"created_at":now,"is_active":True,"ai_generated":True},
    ]

def get_ai_recommendations():
    now = datetime.now().isoformat()
    return [
        {"rec_id":1,"vehicle_id":"BUS-402","action":"dispatch","urgent":True,
         "reason":"Clustering on Alatroon–Mahatta: BUS-104 & BUS-115 are 2 min apart.",
         "impact":"Restores 8-min headway. ~340 passengers benefit.","confidence":0.94,"created_at":now},
        {"rec_id":2,"vehicle_id":"BUS-088","action":"reroute","urgent":True,
         "reason":"Road closure near 4th Circle.","confidence":0.88,
         "impact":"Alternate via Mecca St saves 9 min. 127 on-board passengers.","created_at":now},
    ]

def get_dashboard_kpis():
    summary = get_fleet_summary()
    return {"total_boardings":REAL_STATS["total_boardings"],
            "active_fleet":f"{summary[\'active\']}/{summary[\'total_vehicles\']}",
            "avg_load":f"{summary[\'avg_load_pct\']}%",
            "peak_hour":REAL_STATS["peak_hour_label"],
            "peak_count":REAL_STATS["peak_count"],
            "on_time_rate":f"{int(REAL_STATS[\'on_time_rate\']*100)}%",
            "unique_vehicles":REAL_STATS["unique_vehicles"],
            "unique_routes":REAL_STATS["unique_routes"],
            "timestamp":datetime.now().isoformat()}

def get_hourly_demand_data():
    max_d = max(HOURLY_DEMAND.values())
    return [{"hour":h,"label":f"{h}am" if h<12 else "12pm" if h==12 else f"{h-12}pm",
             "boardings":v,"forecast":int(v*1.08),"is_peak":h in [7,8,9,17,18,19,20]}
            for h,v in HOURLY_DEMAND.items()]

def get_daily_report():
    return {"date":datetime.now().strftime("%Y-%m-%d"),
            "total_boardings":REAL_STATS["total_boardings"],
            "unique_vehicles":REAL_STATS["unique_vehicles"],
            "unique_routes":REAL_STATS["unique_routes"],
            "peak_hour":REAL_STATS["peak_hour_label"],
            "peak_boardings":REAL_STATS["peak_count"],
            "on_time_rate":REAL_STATS["on_time_rate"],
            "avg_load_pct":72.0,"delayed_routes":2,
            "ai_recommendations":["Deploy extra vehicle on Alatroon during 6:30–8 PM",
                                   "Increase Route 35 frequency","Promote Mobile QR payment"],
            "passenger_breakdown":REAL_STATS["passengers"],
            "route_performance":[{"route":r["route_name"],"boardings":r["boardings"],
                                  "load_pct":random.randint(45,100),
                                  "on_time":round(random.uniform(0.74,0.95),2)}
                                 for r in ROUTES_DATA]}
'''

# ── routers/traffic.py ────────────────────────────────────
files['routers/traffic.py'] = '''
from fastapi import APIRouter, Query
from datetime import datetime
from data.mock_data import rule_based_congestion, EDGE_IDS
from data.model_loader import predict_congestion, is_loaded
import random

router = APIRouter()

def get_edge_data(edge_id):
    hour    = datetime.now().hour
    is_peak = hour in [7,8,9,17,18,19,20]
    speed   = round(random.uniform(0,15),2) if is_peak else round(random.uniform(25,55),2)
    density = round(random.uniform(80,150),2) if is_peak else round(random.uniform(0.1,20),2)
    waiting = round(random.uniform(200,720),0) if is_peak else round(random.uniform(0,30),0)
    flow    = round(random.uniform(80,180),2) if is_peak else round(random.uniform(10,60),2)
    occ     = round(density/2.5,2)
    pc      = {7:820,8:1150,9:960,17:1180,18:1420,19:1644}.get(hour,500)
    result  = predict_congestion(speed=speed,occupancy=occ,waiting_time=waiting,
                                  flow=flow,travel_time=30.0,incident_active=0,
                                  passenger_count=pc,hour=hour)
    return {"edge_id":edge_id,"speed":speed,"density":density,"occupancy":occ,
            "waiting_time":waiting,"flow":flow,"hour":hour,"is_peak_hour":is_peak,
            "congestion_level":result["level"],"congestion_color":result["color"],
            "model_type":result["model_type"],"passenger_count":pc,
            "incident_active":random.random()<0.05}

@router.get("/edges")
def get_edges():
    edges = [get_edge_data(eid) for eid in EDGE_IDS]
    return {"edges":edges,"count":len(edges),"timestamp":datetime.now().isoformat()}

@router.get("/edges/{edge_id}")
def get_edge(edge_id: str):
    return get_edge_data(edge_id)

@router.get("/network/status")
def network_status():
    edges     = [get_edge_data(eid) for eid in EDGE_IDS]
    congested = sum(1 for e in edges if e["congestion_level"] in ["High","Medium"])
    avg_speed = sum(e["speed"] for e in edges)/len(edges)
    hour      = datetime.now().hour
    return {"total_edges":len(edges),"congested_edges":congested,
            "avg_speed":round(avg_speed,2),
            "peak_hour":hour in [7,8,9,17,18,19,20],
            "model_type":"ml-model" if is_loaded() else "rule-based",
            "timestamp":datetime.now().isoformat()}

@router.post("/congestion/predict")
def predict_from_features(
    speed:float=Query(...),occupancy:float=Query(...),
    waiting_time:float=Query(...),flow:float=Query(...),
    hour:int=Query(...,ge=0,le=23),
    map_region:str=Query("marj_alhamam")):
    result = predict_congestion(speed=speed,occupancy=occupancy,waiting_time=waiting_time,
                                 flow=flow,travel_time=30.0,incident_active=0,
                                 passenger_count=500,hour=hour,map_region=map_region)
    return {**result,"timestamp":datetime.now().isoformat()}
'''

# ── routers/fleet.py ──────────────────────────────────────
files['routers/fleet.py'] = '''
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
'''

# ── routers/routes.py ─────────────────────────────────────
files['routers/routes.py'] = '''
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from typing import Optional
from data.mock_data import get_all_routes, get_route_detail, get_departures

router = APIRouter()

@router.get("/")
def list_routes():
    return {"routes":get_all_routes(),"count":len(get_all_routes()),
            "timestamp":datetime.now().isoformat()}

@router.get("/{route_id}")
def route_detail(route_id: str):
    detail = get_route_detail(route_id)
    if not detail: raise HTTPException(status_code=404,detail=f"Route {route_id} not found")
    return detail

@router.get("/{route_id}/departures")
def route_departures(route_id: str, hour: Optional[int]=None):
    detail = get_route_detail(route_id)
    if not detail: raise HTTPException(status_code=404,detail=f"Route {route_id} not found")
    return {"route_id":route_id,"route_name":detail["route_name"],
            "departures":get_departures(route_id,hour),"timestamp":datetime.now().isoformat()}

@router.get("/search/departures")
def search_departures(from_stop:Optional[str]=None,to_stop:Optional[str]=None,
                      hour:Optional[int]=None):
    deps = get_departures(None,hour)
    return {"query":{"from":from_stop,"to":to_stop,"hour":hour},
            "results":deps,"count":len(deps),"timestamp":datetime.now().isoformat()}
'''

# ── routers/alerts.py ─────────────────────────────────────
files['routers/alerts.py'] = '''
from fastapi import APIRouter
from datetime import datetime
from data.mock_data import get_active_alerts, get_ai_recommendations

router = APIRouter()

@router.get("/active")
def active_alerts():
    alerts   = get_active_alerts()
    critical = sum(1 for a in alerts if a["severity"]=="Critical")
    warning  = sum(1 for a in alerts if a["severity"]=="Warning")
    return {"alerts":alerts,"summary":{"total_active":len(alerts),
            "critical_count":critical,"warning_count":warning,
            "ai_summary":f"{critical} critical alerts active. {warning} warnings."},
            "timestamp":datetime.now().isoformat()}

@router.get("/ai/recommendations")
def ai_recommendations():
    recs = get_ai_recommendations()
    return {"recommendations":recs,"count":len(recs),
            "urgent_count":sum(1 for r in recs if r["urgent"]),
            "timestamp":datetime.now().isoformat()}

@router.post("/ai/recommendations/{rec_id}/accept")
def accept_recommendation(rec_id: int):
    return {"success":True,"rec_id":rec_id,"action":"accepted",
            "timestamp":datetime.now().isoformat()}

@router.post("/ai/recommendations/{rec_id}/dismiss")
def dismiss_recommendation(rec_id: int):
    return {"success":True,"rec_id":rec_id,"action":"dismissed",
            "timestamp":datetime.now().isoformat()}
'''

# ── routers/reports.py ────────────────────────────────────
files['routers/reports.py'] = '''
from fastapi import APIRouter
from datetime import datetime
from data.mock_data import get_daily_report, REAL_STATS, ROUTES_DATA
import random

router = APIRouter()

@router.get("/daily")
def daily_report():
    return get_daily_report()

@router.get("/passenger-breakdown")
def passenger_breakdown():
    total = REAL_STATS["total_boardings"]
    return {"total":total,"breakdown":[{"type":k,"count":v,"percentage":round(v/total*100,1)}
            for k,v in REAL_STATS["passengers"].items()],
            "timestamp":datetime.now().isoformat()}

@router.get("/route-efficiency")
def route_efficiency():
    return {"routes":[{"route_id":r["route_id"],"route_name":r["route_name"],
                       "boardings":r["boardings"],"load_pct":random.randint(45,100),
                       "on_time_pct":round(random.uniform(0.74,0.95),2),
                       "delay_avg_min":round(random.uniform(0,12),1)}
                      for r in ROUTES_DATA],
            "generated_at":datetime.now().isoformat()}
'''

# ── routers/dashboard.py ──────────────────────────────────
files['routers/dashboard.py'] = '''
from fastapi import APIRouter
from datetime import datetime
from models.schemas import DashboardKPIs
from data.mock_data import (get_dashboard_kpis, get_hourly_demand_data,
                             get_fleet_summary, get_active_alerts,
                             get_ai_recommendations, REAL_STATS)

router = APIRouter()

@router.get("/kpis", response_model=DashboardKPIs)
def dashboard_kpis():
    return get_dashboard_kpis()

@router.get("/overview")
def dashboard_overview():
    return {"kpis":get_dashboard_kpis(),"fleet_summary":get_fleet_summary(),
            "hourly_demand":get_hourly_demand_data(),"active_alerts":get_active_alerts(),
            "ai_recommendations":get_ai_recommendations(),
            "passenger_breakdown":REAL_STATS["passengers"],
            "timestamp":datetime.now().isoformat()}

@router.get("/demand/hourly")
def hourly_demand():
    return {"data":get_hourly_demand_data(),"peak_hour":19,"peak_label":"7:00 PM",
            "peak_count":REAL_STATS["peak_count"],"total":REAL_STATS["total_boardings"],
            "timestamp":datetime.now().isoformat()}
'''

# ── main.py ───────────────────────────────────────────────
files['main.py'] = '''
"""
SmartTransit Jordan — FastAPI Backend
Run: uvicorn main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime

from routers import traffic, predictions, fleet, routes, alerts, reports, dashboard
from data.model_loader import load_model, get_model_info

app = FastAPI(title="SmartTransit Jordan API", version="2.0.0",
    description="AI-powered public transport platform. Decision Tree: 99.57% accuracy.")

app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup_event():
    print("\\n" + "="*50)
    print("  SmartTransit Jordan API")
    print("="*50)
    loaded = load_model(model_dir="results/models")
    info   = get_model_info()
    if loaded:
        print(f"  ✓ ML model: {info[\'model_name\']} ({info[\'accuracy\']*100:.2f}%)")
    else:
        print("  ⚠ Rule-based fallback active")
    print("  Docs: http://localhost:8000/docs\\n")

app.include_router(traffic.router,     prefix="/api/traffic",   tags=["Traffic"])
app.include_router(predictions.router, prefix="/api/predict",   tags=["Predictions"])
app.include_router(fleet.router,       prefix="/api/fleet",     tags=["Fleet"])
app.include_router(routes.router,      prefix="/api/routes",    tags=["Routes"])
app.include_router(alerts.router,      prefix="/api/alerts",    tags=["Alerts"])
app.include_router(reports.router,     prefix="/api/reports",   tags=["Reports"])
app.include_router(dashboard.router,   prefix="/api/dashboard", tags=["Dashboard"])

@app.get("/")
def root():
    return {"service":"SmartTransit Jordan API","version":"2.0.0",
            "model":get_model_info(),"docs":"/docs",
            "timestamp":datetime.now().isoformat()}

@app.get("/health")
def health():
    info = get_model_info()
    return {"status":"ok","model":info["status"],"phase":info["phase"],
            "timestamp":datetime.now().isoformat()}

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(status_code=500,
        content={"error":str(exc),"timestamp":datetime.now().isoformat()})
'''

# ── requirements.txt ──────────────────────────────────────
files['requirements.txt'] = '''fastapi>=0.104.0
uvicorn>=0.24.0
pydantic>=2.0.0
scikit-learn>=1.3.0
numpy>=1.24.0
pandas>=2.0.0
python-multipart>=0.0.6
'''

# ── Write all files ───────────────────────────────────────
print("Creating SmartTransit backend files...")
print()

for filepath, content in files.items():
    # Create directory if needed
    dirpath = os.path.dirname(filepath)
    if dirpath:
        os.makedirs(dirpath, exist_ok=True)

    with open(filepath, 'w') as f:
        f.write(content.lstrip('\n'))

    lines = content.count('\n')
    print(f"  ✓ {filepath:<45} ({lines} lines)")

print()
print("="*55)
print("  All files created!")
print()
print("  Next steps:")
print("  1. pip install -r requirements.txt")
print("  2. uvicorn main:app --reload --port 8000")
print("  3. Open http://localhost:8000/docs")
print()
print("  Test the ML model:")
print("  curl 'http://localhost:8000/api/predict/congestion?speed=3.69&occupancy=57.24&waiting_time=136&flow=68.62&hour=18'")
print("="*55)