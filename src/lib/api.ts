/**
 * SmartTransit Jordan — API Service
 * ===================================
 * Central file for all backend + Supabase calls.
 * Import from any screen: import { api } from '../../lib/api'
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// ── Generic fetch with timeout + fallback ──────────────────
async function apiFetch<T>(
  url: string,
  fallback: T,
  timeoutMs = 5000
): Promise<T> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return fallback;
  }
}

// ── Supabase logger ───────────────────────────────────────
async function logPrediction(
  type: 'congestion' | 'travel_time',
  inputs: Record<string, unknown>,
  result: Record<string, unknown>
) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/prediction_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        prediction_type: type,
        input_features: inputs,
        result,
        created_at: new Date().toISOString(),
      }),
    });
  } catch {
    // silent fail — logging is optional
  }
}

// ══════════════════════════════════════════════════════════
// CONGESTION PREDICTION
// ══════════════════════════════════════════════════════════
export interface CongestionResult {
  level: 'Low' | 'Medium' | 'High';
  confidence: string;
  confidence_score: number;
  probabilities: Record<string, number>;
  color: string;
  advice: string;
  model_type: string;
  model_accuracy: number | null;
}

const CONGESTION_FALLBACK: CongestionResult = {
  level: 'Medium',
  confidence: 'Medium',
  confidence_score: 0.65,
  probabilities: { Low: 0.25, Medium: 0.55, High: 0.20 },
  color: '#FF9F43',
  advice: 'Moderate congestion expected.',
  model_type: 'fallback',
  model_accuracy: null,
};

export async function predictCongestion(params: {
  speed: number;
  occupancy?: number;
  waiting_time: number;
  flow: number;
  hour: number;
  map_region?: string;
}): Promise<CongestionResult> {
  const { speed, occupancy = 30, waiting_time, flow, hour, map_region = 'marj_alhamam' } = params;
  const url = `${API_URL}/api/predict/congestion?speed=${speed}&occupancy=${occupancy}&waiting_time=${waiting_time}&flow=${flow}&hour=${hour}&map_region=${map_region}`;
  const result = await apiFetch(url, CONGESTION_FALLBACK);
  // log to Supabase
  logPrediction('congestion', params, result as Record<string, unknown>);
  return result;
}

// ══════════════════════════════════════════════════════════
// ETA PREDICTION
// ══════════════════════════════════════════════════════════
export interface ETAResult {
  route_id: string;
  region: string;
  departure_time: string;
  predicted_arrival: string;
  total_minutes: number;
  minutes_away: number;
  n_edges: number;
  gridlock_edges: number;
  is_peak_hour: boolean;
  congestion: string;
  model_type: string;
  model_mae_seconds: number | null;
  confidence: string;
}

const ETA_FALLBACK: ETAResult = {
  route_id: 'R01',
  region: 'marj_alhamam',
  departure_time: '07:30',
  predicted_arrival: '--:-- --',
  total_minutes: 0,
  minutes_away: 0,
  n_edges: 0,
  gridlock_edges: 0,
  is_peak_hour: false,
  congestion: 'Medium',
  model_type: 'fallback',
  model_mae_seconds: null,
  confidence: 'Low',
};

export async function predictETA(
  routeId: string,
  departure?: string
): Promise<ETAResult> {
  const now = new Date();
  const dep = departure ||
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const url = `${API_URL}/api/predict/eta/live/${routeId}?departure=${dep}`;
  return apiFetch(url, ETA_FALLBACK);
}

// ══════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════
export interface DashboardOverview {
  kpis: {
    total_boardings: number;
    active_fleet: string;
    avg_load: string;
    peak_hour: string;
    peak_count: number;
    on_time_rate: string;
    unique_vehicles: number;
    unique_routes: number;
  };
  fleet_summary: {
    total_vehicles: number;
    active: number;
    delayed: number;
    maintenance: number;
    in_depot: number;
    avg_load_pct: number;
    avg_delay_min: number;
  };
  hourly_demand: Array<{
    hour: number;
    label: string;
    boardings: number;
    forecast: number;
    is_peak: boolean;
  }>;
  active_alerts: Array<{
    alert_id: number;
    severity: string;
    title: string;
    message: string;
    route_id: string;
    is_active: boolean;
    ai_generated: boolean;
  }>;
  ai_recommendations: Array<{
    rec_id: number;
    vehicle_id: string;
    action: string;
    urgent: boolean;
    reason: string;
    impact: string;
    confidence: number;
  }>;
  passenger_breakdown: Record<string, number>;
}

const DASHBOARD_FALLBACK: DashboardOverview = {
  kpis: {
    total_boardings: 18038,
    active_fleet: '6/8',
    avg_load: '72%',
    peak_hour: '7:00 PM',
    peak_count: 1644,
    on_time_rate: '87%',
    unique_vehicles: 104,
    unique_routes: 27,
  },
  fleet_summary: {
    total_vehicles: 8, active: 5, delayed: 2,
    maintenance: 1, in_depot: 0,
    avg_load_pct: 72, avg_delay_min: 4.2,
  },
  hourly_demand: [],
  active_alerts: [],
  ai_recommendations: [],
  passenger_breakdown: {
    Adult: 14778, EMV: 2161, 'Mobile QR': 1052, 'Free Card': 46,
  },
};

export async function getDashboardOverview(): Promise<DashboardOverview> {
  return apiFetch(`${API_URL}/api/dashboard/overview`, DASHBOARD_FALLBACK);
}

// ══════════════════════════════════════════════════════════
// FLEET
// ══════════════════════════════════════════════════════════
export interface Vehicle {
  vehicle_id: string;
  route_id: string;
  route_name: string;
  driver: string;
  status: 'active' | 'delayed' | 'maintenance' | 'depot';
  load_pct: number;
  delay_min: number;
  speed_kmh: number;
  position: { lat: number; lon: number };
  last_stop: string;
  next_stop: string;
  passengers: number;
  capacity: number;
}

export async function getFleet(): Promise<Vehicle[]> {
  const data = await apiFetch<{ vehicles: Vehicle[] }>(
    `${API_URL}/api/fleet/vehicles`,
    { vehicles: [] }
  );
  return data.vehicles || [];
}

// ══════════════════════════════════════════════════════════
// ALERTS
// ══════════════════════════════════════════════════════════
export async function getAlerts() {
  return apiFetch(
    `${API_URL}/api/alerts/active`,
    { alerts: [], summary: { total_active: 0, critical_count: 0, warning_count: 0 } }
  );
}

export async function getAIRecommendations() {
  return apiFetch(
    `${API_URL}/api/alerts/ai/recommendations`,
    { recommendations: [], count: 0, urgent_count: 0 }
  );
}

// ══════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════
export async function getRoutes() {
  return apiFetch(
    `${API_URL}/api/routes/`,
    { routes: [], count: 0 }
  );
}

// ══════════════════════════════════════════════════════════
// MODEL STATUS
// ══════════════════════════════════════════════════════════
export async function getModelStatus() {
  return apiFetch(
    `${API_URL}/api/predict/model/status`,
    { status: 'unknown', phase: 0 }
  );
}

// ══════════════════════════════════════════════════════════
// CURRENT TRAFFIC (for Home screen live stats)
// ══════════════════════════════════════════════════════════
export interface LiveStats {
  buses_active: number;
  avg_wait_min: number;
  on_time_pct: number;
  passengers_today: number;
}

export async function getLiveStats(): Promise<LiveStats> {
  const data = await apiFetch<DashboardOverview>(
    `${API_URL}/api/dashboard/overview`,
    DASHBOARD_FALLBACK
  );
  const fleet = data.fleet_summary;
  return {
    buses_active:     fleet.active || 312,
    avg_wait_min:     fleet.avg_delay_min || 6.2,
    on_time_pct:      parseInt(data.kpis.on_time_rate) || 87,
    passengers_today: data.kpis.total_boardings || 14200,
  };
}

export const api = {
  predictCongestion,
  predictETA,
  getDashboardOverview,
  getFleet,
  getAlerts,
  getAIRecommendations,
  getRoutes,
  getModelStatus,
  getLiveStats,
};

export default api;