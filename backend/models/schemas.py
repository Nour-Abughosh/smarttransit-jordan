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
