import os
from datetime import datetime, timezone
from supabase import create_client

_db = None

def get_db():
    global _db
    if _db is None:
        _db = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
    return _db

def save_prediction(t, inp, pred):
    row = {"prediction_type": t, "input_features": inp, "prediction": pred, "created_at": datetime.now(timezone.utc).isoformat()}
    res = get_db().table("predictions").insert(row).execute()
    return res.data[0] if res.data else {}

def get_latest_route_predictions(limit=20):
    return get_db().table("predictions").select("*").eq("prediction_type","route_results").order("created_at",desc=True).limit(limit).execute().data or []

def get_latest_prediction_by_type(pt):
    res = get_db().table("predictions").select("*").eq("prediction_type",pt).order("created_at",desc=True).limit(1).execute()
    return res.data[0] if res.data else None

def upsert_home_stats(buses_active, avg_wait_min, on_time_pct, total_passengers):
    try:
        row = {"buses_active": buses_active, "avg_wait_min": avg_wait_min, "on_time_pct": on_time_pct, "total_passengers": total_passengers, "computed_at": datetime.now(timezone.utc).isoformat()}
        return get_db().table("home_stats").insert(row).execute().data
    except Exception as e:
        print(f"home_stats write skipped: {e}")
        return []

def get_latest_home_stats():
    res = get_db().table("home_stats").select("*").order("computed_at",desc=True).limit(1).execute()
    return res.data[0] if res.data else None

def get_fleet(route_id=None):
    q = get_db().table("fleet").select("*")
    if route_id: q = q.eq("route_id", route_id)
    return q.execute().data or []

def get_all_routes():
    return get_db().table("routes").select("*").execute().data or []

def get_boardings_for_route(route_code):
    return get_db().table("boardings").select("*").eq("route_code",route_code).order("hour").execute().data or []

def get_recent_boardings(limit=50):
    return get_db().table("boardings").select("*").order("created_at",desc=True).limit(limit).execute().data or []
