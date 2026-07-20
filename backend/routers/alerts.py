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
