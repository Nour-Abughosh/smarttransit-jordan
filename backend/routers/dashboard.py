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
