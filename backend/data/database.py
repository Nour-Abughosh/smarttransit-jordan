# database.py
# ─────────────────────────────────────────────────────────────
#  Supabase client + all DB read/write helpers used by FastAPI
# ─────────────────────────────────────────────────────────────

import os
from datetime import datetime, timezone
from typing import Any

from supabase import create_client, Client

# ── env ──────────────────────────────────────────────────────
SUPABASE_URL: str = os.environ["SUPABASE_URL"]          # e.g. https://xxxx.supabase.co
SUPABASE_KEY: str = os.environ["SUPABASE_KEY"]  # service-role key (not anon)

# ── singleton client ─────────────────────────────────────────
_supabase: Client | None = None


def get_db() -> Client:
    global _supabase
    if _supabase is None:
        _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase


# ════════════════════════════════════════════════════════════
#  predictions table
# ════════════════════════════════════════════════════════════

def save_prediction(
    prediction_type: str,
    input_features: dict[str, Any],
    prediction: dict[str, Any],
) -> dict:
    """
    Insert one row into `predictions` and return it.

    prediction_type  – e.g. "classification" | "regression" | "route_results"
    input_features   – whatever you fed to the model
    prediction       – model output (crowding label, delay minutes, confidence …)
    """
    db = get_db()
    row = {
        "prediction_type": prediction_type,
        "input_features": input_features,
        "prediction": prediction,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = db.table("predictions").insert(row).execute()
    return res.data[0] if res.data else {}


def get_latest_route_predictions(limit: int = 20) -> list[dict]:
    """
    Fetch the most recent 'route_results' predictions from Supabase.
    The React front-end calls /route-predictions to get these.
    """
    db = get_db()
    res = (
        db.table("predictions")
        .select("*")
        .eq("prediction_type", "route_results")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []


def get_latest_prediction_by_type(prediction_type: str) -> dict | None:
    """Return the single most-recent prediction of the given type."""
    db = get_db()
    res = (
        db.table("predictions")
        .select("*")
        .eq("prediction_type", prediction_type)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


# ════════════════════════════════════════════════════════════
#  home_stats table
# ════════════════════════════════════════════════════════════

def upsert_home_stats(
    buses_active: int,
    avg_wait_min: float,
    on_time_pct: int,
    total_passengers: int,
) -> dict:
    """Append a fresh snapshot to home_stats (FastAPI writes on every /home/stats call)."""
    db = get_db()
    row = {
        "buses_active": buses_active,
        "avg_wait_min": avg_wait_min,
        "on_time_pct": on_time_pct,
        "total_passengers": total_passengers,
        "computed_at": datetime.now(timezone.utc).isoformat(),
    }
    res = db.table("home_stats").insert(row).execute()
    return res.data[0] if res.data else {}


def get_latest_home_stats() -> dict | None:
    db = get_db()
    res = (
        db.table("home_stats")
        .select("*")
        .order("computed_at", desc=True)
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


# ════════════════════════════════════════════════════════════
#  fleet table
# ════════════════════════════════════════════════════════════

def get_fleet(route_id: str | None = None) -> list[dict]:
    db = get_db()
    q = db.table("fleet").select("*")
    if route_id:
        q = q.eq("route_id", route_id)
    res = q.execute()
    return res.data or []


def get_all_routes() -> list[dict]:
    db = get_db()
    res = db.table("routes").select("*").execute()
    return res.data or []


# ════════════════════════════════════════════════════════════
#  boardings table
# ════════════════════════════════════════════════════════════

def get_boardings_for_route(route_code: str) -> list[dict]:
    db = get_db()
    res = (
        db.table("boardings")
        .select("*")
        .eq("route_code", route_code)
        .order("hour", desc=False)
        .execute()
    )
    return res.data or []


def get_recent_boardings(limit: int = 50) -> list[dict]:
    db = get_db()
    res = (
        db.table("boardings")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []