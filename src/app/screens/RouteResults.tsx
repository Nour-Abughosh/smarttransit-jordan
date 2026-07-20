// src/screens/RouteResults.tsx  ← replace your existing file entirely

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Map } from '@vis.gl/react-google-maps';
import { getFavorites, toggleFavorite } from '../../lib/favorites';
import {
  ArrowLeft, ArrowRight, Star, Zap, Clock, Users,
  Map as MapIcon, X, ChevronRight, AlertTriangle, Sparkles,
  TrendingDown, TrendingUp, Navigation, MapPin,
  Filter, SortAsc, Bus, RefreshCw,
} from 'lucide-react';
import { useLang } from '../../lib/i18n';
import { RouteMapOverlay } from '../components/RouteMapOverlay';
import { ROUTES as TRANSIT_ROUTES, findRoute, TransitRoute } from '../../lib/routes_data';

const MAP_ID = 'YOUR_MAP_ID_HERE';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ─── types ────────────────────────────────────────────── */
type Crowding  = 'available' | 'moderate' | 'full';
type SortOpt   = 'fastest' | 'soonest' | 'least-crowded';
type AIStatus  = 'clear' | 'moderate' | 'high' | 'gridlock';
type RouteType = 'coaster' | 'sarfees' | 'express';

interface LiveRoute {
  route_id:       string;
  route_name:     string;
  route_type:     RouteType;
  stops:          string[];
  fare:           string;
  crowding:       Crowding;
  ai_confidence:  number;
  delay_min:      number;
  ai_status:      AIStatus;
  duration_min:   number;
  seats:          number | null;
  next_departure: string;
  arrival_time:   string;
  walk_min:       number;
  co2:            string;
  load_pct:       number;
  computed_at:    string;
}

/* ─── static fallback (used while loading or if API is down) */
const FALLBACK_ROUTES: LiveRoute[] = [
  { route_id: 'AM503', route_name: 'Sweileh → JU Hospital',    route_type: 'coaster', stops: ['Sweileh Circle', 'Sports City', 'UJ Main Gate'],     fare: '0.35 JD', crowding: 'available', ai_confidence: 88, delay_min: 0, ai_status: 'clear',    duration_min: 22, seats: 14,   next_departure: '5 min',  arrival_time: '2:42 PM', walk_min: 3, co2: '0.8 kg', load_pct: 35, computed_at: '' },
  { route_id: 'AM504', route_name: 'Wadi Seer → Sweileh',      route_type: 'coaster', stops: ['Wadi Seer', 'Shmeisani', 'Gardens', 'Sweileh'],       fare: '0.35 JD', crowding: 'moderate',  ai_confidence: 76, delay_min: 4, ai_status: 'moderate', duration_min: 28, seats: 4,    next_departure: '8 min',  arrival_time: '2:53 PM', walk_min: 2, co2: '0.9 kg', load_pct: 65, computed_at: '' },
  { route_id: 'R12',   route_name: 'Tabarbour → Downtown',     route_type: 'express', stops: ['Tabarbour', 'Wadi Saqra', 'Downtown'],               fare: '0.35 JD', crowding: 'moderate',  ai_confidence: 82, delay_min: 4, ai_status: 'moderate', duration_min: 31, seats: null, next_departure: '3 min',  arrival_time: '2:47 PM', walk_min: 5, co2: '0.7 kg', load_pct: 70, computed_at: '' },
  { route_id: 'SARF',  route_name: 'Abdali → Mecca Mall',      route_type: 'sarfees', stops: ['Abdali', 'Mecca Mall Gate 2'],                       fare: '0.50 JD', crowding: 'full',      ai_confidence: 91, delay_min: 0, ai_status: 'clear',    duration_min: 20, seats: null, next_departure: '2 min',  arrival_time: '2:32 PM', walk_min: 1, co2: '0.6 kg', load_pct: 95, computed_at: '' },
  { route_id: 'AM505', route_name: 'Al-Muhajereen → Wadi Seer',route_type: 'coaster', stops: ['Al-Muhajereen', '3rd Circle', 'Wadi Seer'],          fare: '0.40 JD', crowding: 'full',      ai_confidence: 79, delay_min: 1, ai_status: 'moderate', duration_min: 35, seats: null, next_departure: '3 min',  arrival_time: '3:05 PM', walk_min: 4, co2: '1.1 kg', load_pct: 98, computed_at: '' },
  { route_id: 'ALAT',  route_name: 'Alatroon → Al Mahatta',    route_type: 'coaster', stops: ['Alatroon', 'Salt Road', 'Zarqa Bridge', 'Al Mahatta'],fare: '0.45 JD', crowding: 'moderate',  ai_confidence: 84, delay_min: 2, ai_status: 'moderate', duration_min: 40, seats: 8,    next_departure: '6 min',  arrival_time: '3:18 PM', walk_min: 6, co2: '1.3 kg', load_pct: 76, computed_at: '' },
];

/* ─── config maps ───────────────────────────────────────── */
const CROWD_CFG: Record<Crowding, { bg: string; color: string; label: string; barColor: string; barW: string }> = {
  available: { bg: '#E0FBF4', color: '#00A87C', label: 'Available', barColor: '#00C896', barW: '32%' },
  moderate:  { bg: '#FFF4E6', color: '#C87800', label: 'Moderate',  barColor: '#FF9F43', barW: '64%' },
  full:      { bg: '#FFECEC', color: '#CC0000', label: 'Full',      barColor: '#FF5252', barW: '96%' },
};

const AI_CFG: Record<AIStatus, { bg: string; color: string; label: string }> = {
  clear:    { bg: '#E0FBF4', color: '#00A87C', label: 'AI: Clear'    },
  moderate: { bg: '#FFF4E6', color: '#C87800', label: 'AI: Moderate' },
  high:     { bg: '#FFF0EA', color: '#E5521C', label: 'AI: High'     },
  gridlock: { bg: '#FFECEC', color: '#CC0000', label: 'AI: Gridlock' },
};

const TYPE_CFG: Record<RouteType, { bg: string; color: string; label: string }> = {
  coaster: { bg: '#E0FBF4', color: '#00A87C', label: 'Coaster' },
  sarfees: { bg: '#FFF0EA', color: '#E5521C', label: 'Sarfees' },
  express: { bg: '#E6F1FB', color: '#185FA5', label: 'Express' },
};

/* ─── sub-components ────────────────────────────────────── */
function CrowdBar({ level }: { level: Crowding }) {
  const c = CROWD_CFG[level];
  const [w, setW] = useState('0%');
  useEffect(() => { const t = setTimeout(() => setW(c.barW), 120); return () => clearTimeout(t); }, [level]);
  return (
    <div style={{ height: 5, background: '#EEF3F8', borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ width: w, height: '100%', background: c.barColor, borderRadius: 3, transition: 'width 0.8s cubic-bezier(.4,0,.2,1)' }} />
    </div>
  );
}

function AIBadge({ status, confidence }: { status: AIStatus; confidence: number }) {
  const c = AI_CFG[status];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: c.bg, color: c.color, padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
      <Sparkles size={10} />
      {c.label}
      <span style={{ opacity: 0.7, fontWeight: 500 }}>{confidence}%</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: 'white', border: '1.5px solid #EEF3F8', borderRadius: 16, padding: '1.1rem 1.25rem 1rem' }}>
      {[80, 55, 100, 70].map((w, i) => (
        <div key={i} style={{ height: 12, width: `${w}%`, background: '#EEF3F8', borderRadius: 6, marginBottom: 10, animation: 'st-shimmer 1.5s ease infinite' }} />
      ))}
    </div>
  );
}

function StopDots({ stops, type }: { stops: string[]; type: RouteType }) {
  const lineColor = type === 'sarfees' ? '#FF6B35' : type === 'express' ? '#3B9EFF' : '#00C896';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflow: 'hidden' }}>
      {stops.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: i === 0 || i === stops.length - 1 ? '0 0 auto' : '1 1 0' }}>
          <div style={{ width: i === 0 || i === stops.length - 1 ? 9 : 7, height: i === 0 || i === stops.length - 1 ? 9 : 7, borderRadius: '50%', background: i === 0 ? lineColor : i === stops.length - 1 ? '#FF6B35' : 'white', border: `2px solid ${lineColor}`, flexShrink: 0, zIndex: 1 }} />
          {i < stops.length - 1 && <div style={{ flex: 1, minWidth: 16, height: 2, background: `repeating-linear-gradient(90deg, ${lineColor} 0, ${lineColor} 4px, transparent 4px, transparent 8px)`, opacity: 0.5 }} />}
        </div>
      ))}
    </div>
  );
}

function BestBadge({ reason }: { reason: string }) {
  return (
    <div style={{ position: 'absolute', top: -11, left: 16, background: '#0F2240', color: 'white', padding: '2px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, letterSpacing: '0.03em', boxShadow: '0 2px 8px rgba(15,34,64,0.25)' }}>
      <Zap size={9} color="#00C896" fill="#00C896" />
      {reason}
    </div>
  );
}

function LiveDot() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, color: '#00A87C' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C896', display: 'inline-block', animation: 'st-pulse 1.5s ease infinite' }} />
      LIVE
    </span>
  );
}

/* ─── AI insight generator based on live data ───────────── */
function buildInsight(routes: LiveRoute[]): string {
  const fastest = routes.reduce((a, b) => a.duration_min < b.duration_min ? a : b, routes[0]);
  const delayed = routes.filter(r => r.delay_min >= 5);
  if (delayed.length > 0 && fastest) {
    return `${fastest.route_name} is ${fastest.duration_min} min and running on time. ${delayed[0].route_name} is delayed by ${delayed[0].delay_min} min.`;
  }
  if (fastest) {
    return `${fastest.route_name} is the fastest option at ${fastest.duration_min} min with ${fastest.ai_confidence}% AI confidence.`;
  }
  return 'All routes are operating normally. Real-time data updated just now.';
}

/* ─── Main component ────────────────────────────────────── */
export function RouteResults() {
  const { t, isRTL, lang } = useLang();
  const location = useLocation();
  const navigate = useNavigate();
  const { from = 'Sweileh', to = 'UJ' } = location.state || {};

  const [sortBy,      setSortBy]      = useState<SortOpt>('fastest');
  const [showMap,     setShowMap]     = useState(false);
  const [favorites,   setFavorites]   = useState<Set<string>>(getFavorites);
  const [hoverId,     setHoverId]     = useState<string | null>(null);
  const [mounted,     setMounted]     = useState(false);

  // ── live data state ──────────────────────────────────────
  const [routes,      setRoutes]      = useState<LiveRoute[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing,  setRefreshing]  = useState(false);

  const [mapRoute, setMapRoute] = useState<TransitRoute | null>(null);
  useEffect(() => { setMapRoute(findRoute(from, to) ?? null); }, [from, to]);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  // ── fetch predictions from FastAPI ───────────────────────
  const fetchRoutes = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE}/route-predictions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { signal: AbortSignal.timeout(8000), headers: { 'ngrok-skip-browser-warning': 'true' } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const liveRoutes: LiveRoute[] = data.routes ?? [];
      setRoutes(liveRoutes.length > 0 ? liveRoutes : FALLBACK_ROUTES);
      setLastUpdated(new Date());
    } catch {
      // Graceful fallback to static data when backend is offline
      setRoutes(FALLBACK_ROUTES);
      setError('Live data unavailable — showing cached results');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [from, to]);

  useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

  // Auto-refresh every 60 s
  useEffect(() => {
    const id = setInterval(() => fetchRoutes(true), 60_000);
    return () => clearInterval(id);
  }, [fetchRoutes]);

  const handleFavorite = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleFavorite(id);
    setFavorites(getFavorites());
  }, []);

  const handleTrack = (route: LiveRoute) =>
    navigate('/tracking', { state: { routeId: route.route_id, from, to } });

  // ── sort ─────────────────────────────────────────────────
  const sorted = [...routes].sort((a, b) => {
    if (sortBy === 'fastest')       return a.duration_min - b.duration_min;
    if (sortBy === 'soonest')       return a.next_departure.localeCompare(b.next_departure);
    if (sortBy === 'least-crowded') {
      const o: Record<Crowding, number> = { available: 0, moderate: 1, full: 2 };
      return o[a.crowding] - o[b.crowding];
    }
    return 0;
  });

  const bestLabel: Record<SortOpt, string> = {
    'fastest':       'Fastest route',
    'soonest':       'Leaves soonest',
    'least-crowded': 'Least crowded',
  };

  const insight = routes.length > 0 ? buildInsight(routes) : null;

  /* ── card renderer ────────────────────────────────────── */
  const renderCard = (route: LiveRoute, idx: number, isBest: boolean) => {
    const crowd = CROWD_CFG[route.crowding];
    const type  = TYPE_CFG[route.route_type];
    const isFav = favorites.has(route.route_id);
    const isHov = hoverId === route.route_id;

    return (
      <div key={route.route_id}
        onClick={() => handleTrack(route)}
        onMouseEnter={() => setHoverId(route.route_id)}
        onMouseLeave={() => setHoverId(null)}
        style={{
          position: 'relative', background: 'white',
          border: `1.5px solid ${isHov ? '#00C896' : isBest ? '#B3F0E0' : '#EEF3F8'}`,
          borderRadius: 16, padding: '1.1rem 1.25rem 1rem',
          cursor: 'pointer', marginTop: isBest ? 14 : 0,
          boxShadow: isHov ? '0 8px 32px rgba(0,200,150,0.15), 0 2px 8px rgba(15,34,64,0.06)' : isBest ? '0 4px 20px rgba(0,200,150,0.10)' : '0 1px 4px rgba(15,34,64,0.06)',
          transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
          transform: isHov ? 'translateY(-2px)' : 'translateY(0)',
          opacity: mounted ? 1 : 0,
          transitionDelay: mounted ? `${idx * 0.07}s` : '0s',
        }}
      >
        {isBest && <BestBadge reason={bestLabel[sortBy]} />}

        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: type.bg, color: type.color }}>{type.label}</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F2240' }}>{route.route_name}</span>
            {route.delay_min > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#C87800', background: '#FFF4E6', padding: '2px 7px', borderRadius: 99 }}>
                <TrendingUp size={9} /> +{route.delay_min} min
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <button onClick={e => handleFavorite(e, route.route_id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: '50%', display: 'flex', transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Star size={17} style={{ fill: isFav ? '#F59E0B' : 'none', stroke: isFav ? '#F59E0B' : '#7A92A8', transition: 'all 0.2s' }} />
            </button>
            <ChevronRight size={16} color={isHov ? '#00C896' : '#7A92A8'} style={{ transition: 'color 0.2s, transform 0.2s', transform: isHov ? 'translateX(2px)' : 'translateX(0)' }} />
          </div>
        </div>

        {/* Stop line */}
        <div style={{ marginBottom: 10 }}>
          <StopDots stops={route.stops} type={route.route_type} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#4A6580' }}>{route.stops[0]}</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#4A6580' }}>{route.stops[route.stops.length - 1]}</span>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '10px 0', borderTop: '1px solid #EEF3F8', borderBottom: '1px solid #EEF3F8', marginBottom: 10 }}>
          {[
            { icon: <Clock size={13} color="#7A92A8" />,      label: 'Departs',  value: route.next_departure },
            { icon: <Navigation size={13} color="#7A92A8" />, label: 'Arrives',  value: route.arrival_time  },
            { icon: <Bus size={13} color="#7A92A8" />,        label: 'Duration', value: `${route.duration_min} min` },
            { icon: <MapPin size={13} color="#7A92A8" />,     label: 'Walk',     value: `${route.walk_min} min`  },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {s.icon}
                <span style={{ fontSize: 10, color: '#7A92A8', fontWeight: 500 }}>{s.label}</span>
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F2240' }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99, background: crowd.bg, color: crowd.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: crowd.barColor, display: 'inline-block' }} />
              {crowd.label}
            </span>
            {route.seats !== null
              ? <span style={{ fontSize: 11, color: '#7A92A8', fontWeight: 500 }}>{route.seats} seats left</span>
              : <span style={{ fontSize: 11, color: '#FF5252', fontWeight: 600 }}>Standing only</span>
            }
            <span style={{ fontSize: 11, fontWeight: 600, color: '#0F2240', background: '#F4F8FB', padding: '2px 8px', borderRadius: 99, border: '1px solid #EEF3F8' }}>{route.fare}</span>
          </div>
          <AIBadge status={route.ai_status} confidence={route.ai_confidence} />
        </div>
        <CrowdBar level={route.crowding} />
      </div>
    );
  };

  /* ── shared header content ──────────────────────────────── */
  const routePill = (compact = false) => (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#F4F8FB', border: '1px solid #EEF3F8', borderRadius: compact ? 10 : 12, padding: compact ? '7px 12px' : '8px 14px', gap: compact ? 6 : 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: compact ? 7 : 8, height: compact ? 7 : 8, borderRadius: '50%', background: '#00C896' }} />
        <span style={{ fontSize: compact ? '0.82rem' : '0.85rem', fontWeight: 600, color: '#0F2240' }}>{from}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ArrowRight size={compact ? 12 : 14} color="#7A92A8" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: compact ? '0.82rem' : '0.85rem', fontWeight: 600, color: '#0F2240' }}>{to}</span>
        <div style={{ width: compact ? 7 : 8, height: compact ? 7 : 8, borderRadius: 2, background: '#FF6B35' }} />
      </div>
    </div>
  );

  const sortControls = (small = false) => (
    <>
      {!small && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#7A92A8', fontWeight: 600, marginRight: 2 }}>
          <SortAsc size={12} /> Sort:
        </span>
      )}
      {(['fastest', 'soonest', 'least-crowded'] as SortOpt[]).map((v, i) => {
        const labels = [t.results.fastest, t.results.soonest, t.results.emptiest];
        return (
          <button key={v} onClick={() => setSortBy(v)}
            style={{ padding: small ? '6px 14px' : '6px 14px', borderRadius: 99, fontSize: small ? '0.78rem' : '0.8rem', fontWeight: sortBy === v ? 700 : 500, border: `1.5px solid ${sortBy === v ? '#00C896' : '#EEF3F8'}`, background: sortBy === v ? '#E0FBF4' : 'white', color: sortBy === v ? '#00A87C' : '#4A6580', cursor: 'pointer', transition: 'all 0.18s', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {labels[i]}
          </button>
        );
      })}
    </>
  );

  const mapToggle = (small = false) => (
    <button onClick={() => setShowMap(v => !v)}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: small ? '6px 14px' : '7px 14px', borderRadius: small ? 99 : 10, border: `1.5px solid ${showMap ? '#00C896' : '#EEF3F8'}`, background: showMap ? '#E0FBF4' : 'white', color: showMap ? '#00A87C' : '#4A6580', fontSize: small ? '0.78rem' : '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0 }}
    >
      <MapIcon size={small ? 12 : 13} /> Map
    </button>
  );

  const aiInsightBanner = (compact = false) => (
    <div style={{ background: 'linear-gradient(135deg, #E0FBF4, #F0FDF9)', border: '1px solid #B3F0E0', borderRadius: compact ? 12 : 14, padding: compact ? '0.75rem 0.875rem' : '0.875rem 1rem', display: 'flex', alignItems: 'flex-start', gap: compact ? 8 : 10, opacity: mounted ? 1 : 0, transition: 'opacity 0.5s 0.25s ease' }}>
      <Sparkles size={compact ? 14 : 16} color="#00C896" style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        {!compact && <div style={{ fontSize: 11, fontWeight: 700, color: '#00A87C', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>AI Traffic Insight</div>}
        <p style={{ fontSize: compact ? '0.78rem' : '0.8rem', color: '#0F2240', margin: 0, lineHeight: 1.5 }}>
          {loading ? 'Analyzing live traffic data…' : (insight ?? 'All routes operating normally.')}
        </p>
      </div>
      {lastUpdated && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
          <LiveDot />
          <span style={{ fontSize: 9, color: '#7A92A8' }}>{lastUpdated.toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );

  const refreshBtn = () => (
    <button
      onClick={() => fetchRoutes(true)}
      disabled={refreshing || loading}
      title="Refresh predictions"
      style={{ width: 32, height: 32, borderRadius: 9, border: '1.5px solid #EEF3F8', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.5 : 1, flexShrink: 0, transition: 'all 0.2s' }}
    >
      <RefreshCw size={13} color="#4A6580" style={{ animation: refreshing ? 'st-spin 1s linear infinite' : 'none' }} />
    </button>
  );

  const errorBanner = () => error ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#FFF4E6', border: '1px solid #FFE0B2', borderRadius: 10, fontSize: 11, color: '#C87800', fontWeight: 500 }}>
      <AlertTriangle size={12} /> {error}
    </div>
  ) : null;

  const mapSection = (height: number) => (
    <Map
      mapId={MAP_ID}
      defaultCenter={{ lat: 31.9700, lng: 35.8800 }}
      defaultZoom={height > 300 ? 13 : 12}
      style={{ width: '100%', height: `${height}px` }}
      gestureHandling="greedy"
      disableDefaultUI={height < 300}
    >
      <RouteMapOverlay from={from} to={to} selectedRoute={mapRoute} />
    </Map>
  );

  /* ── layout ─────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: 'calc(100vh - 4rem)', background: '#F4F8FB' }}>

      {/* ── DESKTOP ──────────────────────────────────────── */}
      <div className="hidden lg:flex" style={{ height: 'calc(100vh - 4rem)' }}>

        {/* Left panel */}
        <div style={{ width: 480, flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'white', borderRight: '1px solid #EEF3F8', boxShadow: '4px 0 24px rgba(15,34,64,0.06)', overflowY: 'auto' }}>
          <div style={{ padding: '1.5rem 1.5rem 0', opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(10px)', transition: 'all 0.4s ease' }}>

            {/* Back + route pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button onClick={() => navigate('/home')}
                style={{ width: 34, height: 34, borderRadius: 10, border: '1.5px solid #EEF3F8', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#00C896'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#EEF3F8'}
              >
                <ArrowLeft size={15} color="#4A6580" />
              </button>
              {routePill()}
              {refreshBtn()}
            </div>

            {/* Title */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: '#0F2240', letterSpacing: '-0.03em', margin: 0 }}>Available Routes</h1>
                <p style={{ fontSize: '0.8rem', color: '#7A92A8', margin: '3px 0 0', fontWeight: 500 }}>
                  {loading ? 'Fetching live predictions…' : `${sorted.length} routes · AI-powered`}
                </p>
              </div>
              {mapToggle()}
            </div>

            {/* Sort controls */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {sortControls()}
            </div>
          </div>

          {/* AI insight + error */}
          <div style={{ margin: '0 1.5rem 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {aiInsightBanner()}
            {errorBanner()}
          </div>

          {/* Cards */}
          <div style={{ padding: '0 1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {loading
              ? [1, 2, 3].map(i => <SkeletonCard key={i} />)
              : sorted.map((r, i) => renderCard(r, i, i === 0))
            }
          </div>
        </div>

        {/* Right panel — Google Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          {mapSection(window.innerHeight - 64)}
          {/* Floating from→to label */}
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: 'white', borderRadius: 12, padding: '8px 16px', boxShadow: '0 4px 20px rgba(15,34,64,0.15)', display: 'flex', alignItems: 'center', gap: 8, zIndex: 20, opacity: mounted ? 1 : 0, transition: 'opacity 0.5s 0.5s ease', whiteSpace: 'nowrap' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C896' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0F2240' }}>{from}</span>
            <ArrowRight size={12} color="#7A92A8" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0F2240' }}>{to}</span>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: '#FF6B35' }} />
          </div>
        </div>
      </div>

      {/* ── MOBILE ───────────────────────────────────────── */}
      <div className="lg:hidden" style={{ minHeight: 'calc(100vh - 4rem)' }}>

        {/* Header */}
        <div style={{ background: 'white', borderBottom: '1px solid #EEF3F8', padding: '1rem 1rem 0', boxShadow: '0 2px 12px rgba(15,34,64,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <button onClick={() => navigate('/home')}
              style={{ width: 32, height: 32, borderRadius: 9, border: '1.5px solid #EEF3F8', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <ArrowLeft size={14} color="#4A6580" />
            </button>
            {routePill(true)}
            {refreshBtn()}
          </div>

          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: '0.875rem', scrollbarWidth: 'none' }}>
            {sortControls(true)}
            {mapToggle(true)}
          </div>
        </div>

        {/* Collapsible map */}
        <div style={{ overflow: 'hidden', height: showMap ? 220 : 0, transition: 'height 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
          {mapSection(220)}
        </div>

        {/* AI banner + error */}
        <div style={{ margin: '12px 1rem 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {aiInsightBanner(true)}
          {errorBanner()}
        </div>

        {/* Cards */}
        <div style={{ padding: '12px 1rem 6rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading
            ? [1, 2, 3].map(i => <SkeletonCard key={i} />)
            : sorted.map((r, i) => renderCard(r, i, i === 0))
          }
        </div>
      </div>

      <style>{`
        @keyframes st-shimmer { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes st-spin     { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes st-pulse    { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.6; transform:scale(0.85); } }
      `}</style>
    </div>
  );
}