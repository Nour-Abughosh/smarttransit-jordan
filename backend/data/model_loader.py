"""
SmartTransit Jordan — Model Loader
====================================
Loads the trained Random Forest model (full 5.5M dataset)
into the FastAPI backend.

Model: Random Forest (95.36% accuracy on 5.5M rows)
Features: 13 (without occupancy, without density)
"""

import os
import joblib
import numpy as np

# ── Model registry ────────────────────────────────────────
_model         = None
_label_encoder = None
_model_name    = None
_model_accuracy= None

# ── Feature order — must match training exactly ───────────
FEATURE_ORDER = [
    'speed', 'waitingTime', 'flow', 'traveltime',
    'incident_active', 'passenger_count', 'hour', 'is_peak_hour',
    'hour_sin', 'hour_cos', 'flow_speed_ratio',
    'time_bucket', 'map_region',
]

TIME_BUCKET_MAP = {
    'Late Night':   0,
    'Morning Peak': 1,
    'Midday':       2,
    'Evening Peak': 3,
    'Night':        4,
}

MAP_REGION_MAP = {
    'marj_alhamam': 0,
    'swileh_ju':    1,
    'wadi_seir':    2,
}


def load_model(model_dir: str = "results_full/classification/models") -> bool:
    global _model, _label_encoder, _model_name, _model_accuracy

    model_path = os.path.join(model_dir, "random_forest_full.pkl")
    label_path = os.path.join(model_dir, "label_encoder.pkl")

    missing = [p for p in [model_path, label_path]
               if not os.path.exists(p)]
    if missing:
        print(f"  ⚠ Model files not found: {missing}")
        print(f"  → Using rule-based predictions (Phase 1)")
        return False

    try:
        _model         = joblib.load(model_path)
        _label_encoder = joblib.load(label_path)
        _model_name    = type(_model).__name__
        _model_accuracy= 0.9536

        print(f"  ✓ ML model loaded: {_model_name}")
        print(f"  ✓ Accuracy: {_model_accuracy*100:.2f}%")
        print(f"  ✓ Classes: {list(_label_encoder.classes_)}")
        return True

    except Exception as e:
        print(f"  ✗ Failed to load model: {e}")
        return False


def is_loaded() -> bool:
    return _model is not None


def get_model_info() -> dict:
    if not is_loaded():
        return {
            "status":     "rule-based",
            "model_name": "Rule-based (Phase 1)",
            "accuracy":   None,
            "classes":    ["High", "Low", "Medium"],
            "features":   FEATURE_ORDER,
            "phase":      1,
        }
    return {
        "status":     "ml-model",
        "model_name": _model_name,
        "accuracy":   _model_accuracy,
        "classes":    list(_label_encoder.classes_),
        "features":   FEATURE_ORDER,
        "n_features": len(FEATURE_ORDER),
        "phase":      2,
    }


def encode_time_bucket(hour: int) -> int:
    if hour < 5:    return 0
    elif hour < 10: return 1
    elif hour < 15: return 2
    elif hour < 20: return 3
    else:           return 4


def encode_map_region(region: str) -> int:
    return MAP_REGION_MAP.get(region.lower(), 0)


def build_feature_vector(
    speed:           float,
    waiting_time:    float,
    flow:            float,
    travel_time:     float,
    incident_active: int,
    passenger_count: int,
    hour:            int,
    map_region:      str = "marj_alhamam",
) -> np.ndarray:
    is_peak_hour     = int(hour in [7, 8, 9, 17, 18, 19, 20])
    hour_sin         = np.sin(2 * np.pi * hour / 24)
    hour_cos         = np.cos(2 * np.pi * hour / 24)
    flow_speed_ratio = flow / (speed + 0.001)
    time_bucket      = encode_time_bucket(hour)
    map_region_enc   = encode_map_region(map_region)

    features = np.array([[
        speed, waiting_time, flow, travel_time,
        incident_active, passenger_count, hour, is_peak_hour,
        hour_sin, hour_cos, flow_speed_ratio,
        time_bucket, map_region_enc,
    ]], dtype=np.float32)

    return features


def predict_congestion(
    speed:           float,
    occupancy:       float,
    waiting_time:    float,
    flow:            float,
    travel_time:     float,
    incident_active: int,
    passenger_count: int,
    hour:            int,
    map_region:      str = "marj_alhamam",
) -> dict:
    COLORS = {"Low": "#00C896", "Medium": "#FF9F43", "High": "#FF5252"}
    ADVICE = {
        "Low":    "Traffic is flowing freely.",
        "Medium": "Moderate congestion. Allow extra 5-10 minutes.",
        "High":   "Heavy congestion. Consider rerouting.",
    }

    if not is_loaded():
        from data.mock_data import rule_based_congestion
        is_peak = hour in [7, 8, 9, 17, 18, 19, 20]
        result  = rule_based_congestion(
            speed, occupancy / 10, waiting_time, flow, hour, is_peak)
        return {
            "level":          result["level"],
            "confidence":     result["confidence"],
            "probabilities":  result["probabilities"],
            "color":          result["color"],
            "advice":         result["advice"],
            "model_type":     "rule-based",
            "model_accuracy": None,
        }

    # Random Forest prediction — no scaling needed
    features = build_feature_vector(
        speed=speed, waiting_time=waiting_time,
        flow=flow, travel_time=travel_time,
        incident_active=incident_active,
        passenger_count=passenger_count,
        hour=hour, map_region=map_region,
    )

    pred_enc   = _model.predict(features)[0]
    pred_class = _label_encoder.inverse_transform([pred_enc])[0]

    if hasattr(_model, 'predict_proba'):
        probs_arr      = _model.predict_proba(features)[0]
        probs          = {cls: round(float(p), 4)
                         for cls, p in zip(_label_encoder.classes_, probs_arr)}
        confidence_val = float(probs_arr.max())
    else:
        probs          = {cls: 1.0 if cls == pred_class else 0.0
                         for cls in _label_encoder.classes_}
        confidence_val = 1.0

    confidence = ("High"   if confidence_val > 0.80 else
                  "Medium" if confidence_val > 0.60 else "Low")

    return {
        "level":            pred_class,
        "confidence":       confidence,
        "confidence_score": round(confidence_val, 4),
        "probabilities":    probs,
        "color":            COLORS.get(pred_class, "#FF9F43"),
        "advice":           ADVICE.get(pred_class, ""),
        "model_type":       "ml-model",
        "model_name":       _model_name,
        "model_accuracy":   _model_accuracy,
    }