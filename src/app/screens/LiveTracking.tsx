import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import {
  ArrowLeft, Navigation, AlertTriangle,
  Clock, Zap, Sparkles, RefreshCw,
  TrendingUp, Bus, MapPin, Wind,
} from 'lucide-react';
import { useLang } from '../../lib/i18n';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const MAP_ID  = 'YOUR_MAP_ID_HERE';

// Route stop coordinates — keyed by route_id
const ROUTE_STOPS: Record<string, {
  name: string;
  stops: { name: string; lat: number; lng: number }[];
  color: string;
}> = {
  AM503: {
    name: 'AM503 — Sweileh → JU Hospital',
    color: '#00C896',
    stops: [
      { name: 'Sweileh Terminal',           lat: 31.9968, lng: 35.8606 },
      { name: 'Sweileh Circle',             lat: 31.9950, lng: 35.8650 },
      { name: 'University Street',          lat: 31.9900, lng: 35.8720 },
      { name: 'Jordan University Gate 1',   lat: 31.9820, lng: 35.8880 },
      { name: 'Jordan University Hospital', lat: 31.9790, lng: 35.8940 },
    ],
  },
  AM504: {
    name: 'AM504 — Wadi Seer → Sweileh',
    color: '#3B9EFF',
    stops: [
      { name: 'Wadi Seer Terminal',   lat: 31.9481, lng: 35.8402 },
      { name: 'Wadi Seer Circle',     lat: 31.9530, lng: 35.8450 },
      { name: 'Jubaiha',              lat: 31.9720, lng: 35.8600 },
      { name: 'University of Jordan', lat: 31.9820, lng: 35.8710 },
      { name: 'Sweileh Terminal',     lat: 31.9968, lng: 35.8606 },
    ],
  },
  AM505: {
    name: 'AM505 — Al-Muhajereen → Wadi Seer',
    color: '#FF6B35',
    stops: [
      { name: 'Al-Muhajereen',  lat: 31.9650, lng: 35.9100 },
      { name: '3rd Circle',     lat: 31.9570, lng: 35.9000 },
      { name: '4th Circle',     lat: 31.9520, lng: 35.8900 },
      { name: 'Wadi Seer',      lat: 31.9481, lng: 35.8402 },
    ],
  },
  R12: {
    name: 'Route 12 — Tabarbour → Downtown',
    color: '#7C3AED',
    stops: [
      { name: 'Tabarbour',    lat: 32.0200, lng: 36.0000 },
      { name: 'Wadi Saqra',   lat: 31.9700, lng: 35.9100 },
      { name: 'Downtown',     lat: 31.9539, lng: 35.9106 },
    ],
  },
  SARF: {
    name: 'Sarfees — Abdali → Mecca Mall',
    color: '#FF9F43',
    stops: [
      { name: 'Abdali',         lat: 31.9773, lng: 35.9060 },
      { name: 'Mecca Mall',     lat: 31.9310, lng: 35.8570 },
    ],
  },
  ALAT: {
    name: 'Alatroon — Alatroon → Al Mahatta',
    color: '#FF5252',
    stops: [
      { name: 'Alatroon Hospital', lat: 31.9900, lng: 35.9200 },
      { name: 'Salt Road',         lat: 32.0100, lng: 35.9500 },
      { name: 'Zarqa Bridge',      lat: 32.0700, lng: 36.0800 },
      { name: 'Al Mahatta',        lat: 31.9539, lng: 35.9106 },
    ],
  },
};

const AMMAN_CENTER = { lat: 31.9700, lng: 35.8800 };

type AIStatus = 'clear' | 'moderate' | 'high' | 'gridlock';

const STATUS_CFG: Record<AIStatus, {
  label: string; bg: string; color: string; icon: React.ReactNode;
}> = {
  clear:    { label: 'Clear ahead',       bg: '#E0FBF4', color: '#00A87C', icon: <Wind size={15}/> },
  moderate: { label: 'Moderate traffic',  bg: '#FFF4E6', color: '#C87800', icon: <TrendingUp size={15}/> },
  high:     { label: 'Heavy congestion',  bg: '#FFF0EA', color: '#E5521C', icon: <AlertTriangle size={15}/> },
  gridlock: { label: 'Gridlock detected', bg: '#FFECEC', color: '#CC0000', icon: <AlertTriangle size={15}/> },
};

function classifyStatus(s: string): AIStatus {
  const l = s.toLowerCase();
  if (l === 'gridlock') return 'gridlock';
  if (l === 'high' || l === 'heavy' || l === 'full') return 'high';
  if (l === 'moderate' || l === 'medium') return 'moderate';
  return 'clear';
}

function formatTime(mins: number): string {
  const now  = new Date();
  now.setMinutes(now.getMinutes() + mins);
  const h    = now.getHours();
  const m    = now.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function LiveTracking() {
  const { t } = useLang();
  const navigate  = useNavigate();
  const location  = useLocation();
  const state     = (location.state as any) || {};

  // routeId comes from RouteResults.tsx via navigate('/tracking', { state: { routeId, from, to } })
  const routeId   = state.routeId || 'AM503';
  const fromStop  = state.from    || '';
  const toStop    = state.to      || '';

  const routeMeta = ROUTE_STOPS[routeId] || ROUTE_STOPS['AM503'];

  // Live prediction state
  const [liveData,    setLiveData]    = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mounted,     setMounted]     = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 80);
  }, []);

  // Fetch live prediction for this route
  const fetchLive = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const url = `${API_URL}/route-predictions?from=${encodeURIComponent(fromStop)}&to=${encodeURIComponent(toStop)}`;
      const res = await fetch(url, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Find this specific route in the predictions
      const route = data.routes?.find((r: any) => r.route_id === routeId)
                 ?? data.routes?.[0];

      if (route) setLiveData(route);
      setLastUpdated(new Date());
    } catch (e) {
      setError('Live data unavailable');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [routeId, fromStop, toStop]);

  useEffect(() => { fetchLive(); }, [fetchLive]);

  // Auto-refresh every 60s
  useEffect(() => {
    const iv = setInterval(() => fetchLive(true), 60_000);
    return () => clearInterval(iv);
  }, [fetchLive]);

  // Derived values from live data
  const aiStatus    = liveData ? classifyStatus(liveData.crowding || liveData.ai_status || 'moderate') : 'moderate';
  const statusCfg   = STATUS_CFG[aiStatus];
  const delayMin    = liveData?.delay_min ?? 0;
  const arrivalTime = liveData?.arrival_time ?? formatTime(30);
  const durationMin = liveData?.duration_min ?? 25;
  const confidence  = liveData?.ai_confidence ?? 80;
  const crowding    = liveData?.crowding ?? 'moderate';
  const nextDep     = liveData?.next_departure ?? '5 min';

  // Build stop list with estimated times
  const stops = routeMeta.stops.map((stop, i) => {
    const fraction    = i / (routeMeta.stops.length - 1);
    const estMinsFromNow = Math.round(fraction * durationMin) + delayMin;
    const isPast      = fraction < 0.3;
    const isCurrent   = fraction >= 0.3 && fraction < 0.6;
    return {
      ...stop,
      time:   formatTime(estMinsFromNow),
      status: isPast ? 'completed' : isCurrent ? 'current' : 'upcoming',
    };
  });

  const currentStop = stops.find(s => s.status === 'current') ?? stops[0];
  const mapCenter   = currentStop
    ? { lat: currentStop.lat, lng: currentStop.lng }
    : AMMAN_CENTER;

  return (
    <div style={{ minHeight: 'calc(100vh - 4rem)', background: '#F4F8FB' }}>

      {/* ── Header ─────────────────────────────────── */}
      <div style={{
        background: 'white', borderBottom: '1px solid #EEF3F8',
        padding: '1rem 1.25rem',
        boxShadow: '0 2px 12px rgba(15,34,64,0.06)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => navigate(-1)}
          style={{ width: 34, height: 34, borderRadius: 10, border: '1.5px solid #EEF3F8', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ArrowLeft size={15} color="#4A6580" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: routeMeta.color }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: '#0F2240' }}>
              {routeMeta.name}
            </span>
          </div>
          {fromStop && toStop && (
            <div style={{ fontSize: 11, color: '#7A92A8', marginTop: 2 }}>
              {fromStop} → {toStop}
            </div>
          )}
        </div>
        <button onClick={() => fetchLive(true)} disabled={refreshing}
          style={{ width: 32, height: 32, borderRadius: 9, border: '1.5px solid #EEF3F8', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <RefreshCw size={13} color="#4A6580"
            style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* ── Map ────────────────────────────────────── */}
      <div style={{ height: 260, position: 'relative' }}>
        <Map
          mapId={MAP_ID}
          defaultCenter={mapCenter}
          defaultZoom={13}
          style={{ width: '100%', height: '100%' }}
          gestureHandling="greedy"
          disableDefaultUI={true}
        >
          {/* Bus position marker */}
          {currentStop && (
            <AdvancedMarker position={{ lat: currentStop.lat, lng: currentStop.lng }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: routeMeta.color,
                border: '3px solid white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}>
                <Bus size={16} color="white" />
              </div>
            </AdvancedMarker>
          )}

          {/* Stop markers */}
          {stops.map((stop, i) => (
            <AdvancedMarker key={i} position={{ lat: stop.lat, lng: stop.lng }}>
              <div style={{
                width: stop.status === 'current' ? 14 : 10,
                height: stop.status === 'current' ? 14 : 10,
                borderRadius: '50%',
                background: stop.status === 'completed' ? '#B0BEC5'
                          : stop.status === 'current'   ? routeMeta.color
                          : 'white',
                border: `2px solid ${routeMeta.color}`,
              }} />
            </AdvancedMarker>
          ))}
        </Map>

        {/* AI status badge on map */}
        <div style={{
          position: 'absolute', top: 12, left: 12, zIndex: 20,
          background: statusCfg.bg, borderRadius: 20,
          padding: '5px 12px',
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 700, color: statusCfg.color,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          {statusCfg.icon}
          {statusCfg.label}
        </div>

        {/* Live dot */}
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 20,
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 20, padding: '4px 12px',
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 600, color: '#0F2240',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C896', animation: 'pulse 2s infinite' }} />
          LIVE
        </div>
      </div>

      {/* ── Content ────────────────────────────────── */}
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Error banner */}
        {error && (
          <div style={{ background: '#FFF4E6', border: '1px solid #FFE0B2', borderRadius: 10, padding: '8px 12px', fontSize: 11, color: '#C87800', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={12} /> {error} — showing cached predictions
          </div>
        )}

        {/* AI Prediction Card */}
        <div style={{
          background: 'white', borderRadius: 16,
          border: '1px solid #EEF3F8',
          padding: '1rem',
          boxShadow: '0 2px 12px rgba(15,34,64,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Sparkles size={14} color="#00C896" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#00A87C', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              AI Prediction · {confidence}% confidence
            </span>
            {lastUpdated && (
              <span style={{ fontSize: 10, color: '#7A92A8', marginLeft: 'auto' }}>
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { icon: <Clock size={14} color="#7A92A8" />,      label: 'Arrives',   value: loading ? '—' : arrivalTime },
              { icon: <Navigation size={14} color="#7A92A8" />, label: 'Duration',  value: loading ? '—' : `${durationMin} min` },
              { icon: <Zap size={14} color="#7A92A8" />,        label: 'Next bus',  value: loading ? '—' : nextDep },
            ].map(item => (
              <div key={item.label} style={{ background: '#F4F8FB', borderRadius: 10, padding: '0.6rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{item.icon}</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F2240', fontFamily: 'var(--font-display)' }}>
                  {item.value}
                </div>
                <div style={{ fontSize: 10, color: '#7A92A8' }}>{item.label}</div>
              </div>
            ))}
          </div>

          {delayMin > 0 && (
            <div style={{ marginTop: 10, padding: '6px 10px', background: '#FFF4E6', borderRadius: 8, fontSize: 11, color: '#C87800', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={11} /> +{delayMin} min delay detected on this route
            </div>
          )}
        </div>

        {/* Stop Timeline */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #EEF3F8', padding: '1rem', boxShadow: '0 2px 12px rgba(15,34,64,0.06)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F2240', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Stop Timeline
          </div>

          {stops.map((stop, i) => {
            const isLast    = i === stops.length - 1;
            const dotColor  = stop.status === 'completed' ? '#B0BEC5'
                            : stop.status === 'current'   ? routeMeta.color
                            : '#DDE6EE';
            return (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: isLast ? 0 : 4 }}>
                {/* Timeline line + dot */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: stop.status === 'current' ? 12 : 9,
                    height: stop.status === 'current' ? 12 : 9,
                    borderRadius: '50%',
                    background: dotColor,
                    border: stop.status === 'current' ? `2px solid ${routeMeta.color}` : 'none',
                    marginTop: 3,
                    boxShadow: stop.status === 'current' ? `0 0 0 3px ${routeMeta.color}22` : 'none',
                  }} />
                  {!isLast && (
                    <div style={{ width: 2, flex: 1, background: i < stops.findIndex(s => s.status === 'current') ? routeMeta.color : '#EEF3F8', minHeight: 20 }} />
                  )}
                </div>

                {/* Stop info */}
                <div style={{ flex: 1, paddingBottom: isLast ? 0 : 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: stop.status === 'current' ? 700 : 500,
                      color: stop.status === 'completed' ? '#B0BEC5' : '#0F2240',
                    }}>
                      {stop.name}
                      {stop.status === 'current' && (
                        <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: routeMeta.color, background: `${routeMeta.color}15`, padding: '1px 6px', borderRadius: 99 }}>
                          BUS HERE
                        </span>
                      )}
                    </span>
                    <span style={{ fontSize: 11, color: stop.status === 'completed' ? '#B0BEC5' : '#7A92A8', fontWeight: 500 }}>
                      {stop.time}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Crowding info */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #EEF3F8', padding: '1rem', boxShadow: '0 2px 12px rgba(15,34,64,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F2240', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bus Load</span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
              background: crowding === 'available' ? '#E0FBF4' : crowding === 'full' ? '#FFECEC' : '#FFF4E6',
              color: crowding === 'available' ? '#00A87C' : crowding === 'full' ? '#CC0000' : '#C87800',
            }}>
              {crowding === 'available' ? 'Available' : crowding === 'full' ? 'Full' : 'Moderate'}
            </span>
          </div>
          <div style={{ height: 8, background: '#EEF3F8', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: crowding === 'available' ? '35%' : crowding === 'full' ? '95%' : '65%',
              background: crowding === 'available' ? '#00C896' : crowding === 'full' ? '#FF5252' : '#FF9F43',
              transition: 'width 1s ease',
            }} />
          </div>
          <div style={{ fontSize: 11, color: '#7A92A8', marginTop: 6 }}>
            {crowding === 'available' ? 'Seats available — comfortable ride' :
             crowding === 'full'      ? 'Standing only — next bus in ~8 min' :
             'Limited seats — consider next bus'}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.6; transform:scale(0.85); } }
      `}</style>
    </div>
  );
}