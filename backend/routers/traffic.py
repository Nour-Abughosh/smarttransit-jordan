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
