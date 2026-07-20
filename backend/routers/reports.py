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
