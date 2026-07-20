// src/pages/Home/Home.tsx  ← replace your existing file entirely

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Map } from '@vis.gl/react-google-maps';
import {
  Search, MapPin, ArrowRight, Clock,
  ChevronRight, RefreshCw, Sparkles, ArrowUpRight, Navigation, X,
} from 'lucide-react';
import { useLang } from '../../lib/i18n';
import { RouteMapOverlay } from '../components/RouteMapOverlay';
import { findRoute, TransitRoute } from '../../lib/routes_data';

/* ── static seed (shown before API responds) ──────────────── */
const SEED_ROUTES = [
  { id: 1, from: 'Sweileh',       to: 'Jordan University Hospital', route: 'AM503',    eta: '5 min',  duration: '22 min', crowding: 'available' as const, delay: 0, fare: '0.35 JD' },
  { id: 2, from: 'Wadi Seer',     to: 'Sweileh',                   route: 'AM504',    eta: '8 min',  duration: '28 min', crowding: 'moderate'  as const, delay: 4, fare: '0.35 JD' },
  { id: 3, from: 'Al-Muhajereen', to: 'Wadi Seer',                 route: 'AM505',    eta: '3 min',  duration: '35 min', crowding: 'full'       as const, delay: 0, fare: '0.40 JD' },
  { id: 4, from: 'Tabarbour',     to: 'Downtown Amman',            route: 'Route 12', eta: '3 min',  duration: '31 min', crowding: 'moderate'  as const, delay: 4, fare: '0.35 JD' },
  { id: 5, from: 'Abdali',        to: 'Mecca Mall',                route: 'Sarfees',  eta: '2 min',  duration: '18 min', crowding: 'full'       as const, delay: 0, fare: '0.50 JD' },
];

const AI_SUGGESTIONS = [
  { id: 1, icon: '⚡', label: 'Skip the jam',   text: 'AM503 via University St saves 9 min vs direct now',  color: '#00C896' },
  { id: 2, icon: '🚌', label: 'Next departure', text: 'AM504 leaves Wadi Seer in 3 min — walk fast!',        color: '#FF6B35' },
  { id: 3, icon: '👥', label: 'Less crowded',   text: 'AM505 is 40% lighter than usual right now',           color: '#3B9EFF' },
];

const AMMAN_LOCATIONS = [
  'Sweileh', 'Tabarbour', 'Abdali', 'Downtown', 'Mecca Mall',
  'Jordan University Hospital', 'University of Jordan', 'Gardens', 'Sport City',
  'Wadi Seer', 'Al-Muhajereen', 'Rainbow Street', 'Shmeisani', 'Jabal Amman',
  'Zarqa Bridge', 'Airport', 'Sahab', 'Marj Al Hamam', '3rd Circle', '4th Circle',
];

const AMMAN_CENTER = { lat: 31.9539, lng: 35.9106 };
const MAP_ID       = 'YOUR_MAP_ID_HERE';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type Crowding = 'available' | 'moderate' | 'full';

interface QuickRoute {
  id: number; from: string; to: string; route: string;
  eta: string; duration: string; crowding: Crowding; delay: number; fare: string;
}

interface LiveStats {
  label: string; value: string; unit: string; icon: string; trend: string;
}

/* ── small UI helpers ─────────────────────────────────────── */
function CrowdingPill({ level }: { level: Crowding }) {
  const cfg = {
    available: { bg: '#E0FBF4', color: '#00A87C', label: 'Available', dot: '#00C896' },
    moderate:  { bg: '#FFF4E6', color: '#C87800', label: 'Moderate',  dot: '#FF9F43' },
    full:      { bg: '#FFECEC', color: '#CC0000', label: 'Full',      dot: '#FF5252' },
  }[level];
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
      {cfg.label}
    </span>
  );
}

function CrowdingBar({ level }: { level: Crowding }) {
  const fill  = { available: '35%', moderate: '65%', full: '95%' }[level];
  const color = { available: '#00C896', moderate: '#FF9F43', full: '#FF5252' }[level];
  return (
    <div style={{ height: 4, background: '#EEF3F8', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ width: fill, height: '100%', background: color, borderRadius: 2, transition: 'width 1s ease' }} />
    </div>
  );
}

function LocationInput({ value, onChange, placeholder, icon: Icon, color }: {
  value: string; onChange: (v: string) => void;
  placeholder: string; icon: any; color: string;
}) {
  const [focused,     setFocused]     = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSuggestions(value.length > 0
      ? AMMAN_LOCATIONS.filter(l => l.toLowerCase().includes(value.toLowerCase())).slice(0, 5)
      : []);
  }, [value]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setFocused(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: focused ? 'white' : '#F4F8FB', border: `1.5px solid ${focused ? color : '#DDE6EE'}`, borderRadius: 12, padding: '0.7rem 1rem', boxShadow: focused ? `0 0 0 3px ${color}22` : 'none', transition: 'all 0.2s' }}>
        <Icon size={16} color={color} style={{ flexShrink: 0 }} />
        <input value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocused(true)} placeholder={placeholder}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.92rem', color: 'var(--st-navy)' }} />
        {value && <button onClick={() => onChange('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A92A8', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>}
      </div>
      {focused && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100, background: 'white', borderRadius: 12, boxShadow: '0 12px 40px rgba(15,34,64,0.15)', border: '1px solid #EEF3F8', overflow: 'hidden' }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => { onChange(s); setFocused(false); }}
              style={{ width: '100%', padding: '0.65rem 1rem', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--st-navy)', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F4F8FB'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <MapPin size={13} color="#7A92A8" />{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────── */
export function Home() {
  const { t } = useLang();
  const navigate = useNavigate();

  const [from, setFrom]                 = useState('');
  const [to,   setTo]                   = useState('');
  const [aiIdx, setAiIdx]               = useState(0);
  const [mounted, setMounted]           = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [swapping, setSwapping]         = useState(false);
  const [activeRoute, setActiveRoute]   = useState<number | null>(null);
  const [previewRoute, setPreviewRoute] = useState<TransitRoute | null>(null);
  const [previewFrom, setPreviewFrom]   = useState('');
  const [previewTo, setPreviewTo]       = useState('');
  const [matchedRoute, setMatchedRoute] = useState<TransitRoute | null>(null);

  // ── live data ─────────────────────────────────────────────
  const [liveStats, setLiveStats]         = useState<LiveStats[]>([
    { label: 'Buses active', value: '312',   unit: '',    icon: '🚌', trend: '+4%'  },
    { label: 'Avg wait',     value: '6.2',   unit: 'min', icon: '⏱',  trend: '-12%' },
    { label: 'On-time rate', value: '87',    unit: '%',   icon: '✅',  trend: '+3%'  },
    { label: 'Passengers',   value: '14.2k', unit: '',    icon: '👥',  trend: '+8%'  },
  ]);
  const [popularRoutes, setPopularRoutes] = useState<QuickRoute[]>(SEED_ROUTES);
  const [liveCount, setLiveCount]         = useState('312');
  const [apiError, setApiError]           = useState(false);
  const [lastFetched, setLastFetched]     = useState<Date | null>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setMounted(true), 80);
    const t2 = setTimeout(() => setStatsVisible(true), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setAiIdx(i => (i + 1) % AI_SUGGESTIONS.length), 4000);
    return () => clearInterval(iv);
  }, []);

  // ── fetch /home/stats from FastAPI ───────────────────────
  const fetchStats = async () => {
    try {
      const res  = await fetch(`${API_BASE}/home/stats`, { signal: AbortSignal.timeout(6000), headers: { 'ngrok-skip-browser-warning': 'true' } });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const s    = data.stats;

      setLiveStats([
        { label: 'Buses active', value: String(s.buses_active),  unit: '',    icon: '🚌', trend: '+4%'  },
        { label: 'Avg wait',     value: String(s.avg_wait_min),   unit: 'min', icon: '⏱',  trend: '-12%' },
        { label: 'On-time rate', value: String(s.on_time_pct),    unit: '%',   icon: '✅',  trend: '+3%'  },
        {
          label: 'Passengers',
          value: s.total_passengers > 1000
            ? `${(s.total_passengers / 1000).toFixed(1)}k`
            : String(s.total_passengers),
          unit: '', icon: '👥', trend: '+8%',
        },
      ]);
      setLiveCount(String(s.buses_active));

      // quick_routes come with real predicted eta + duration from the backend
      setPopularRoutes(
        (data.quick_routes as any[]).map((r, i) => ({
          id:       i + 1,
          from:     r.from,
          to:       r.to,
          route:    r.route,
          eta:      r.eta,        // e.g. "5 min" — predicted from fleet delay
          duration: r.duration,   // e.g. "24 min" — predicted from load + hour
          crowding: r.crowding as Crowding,
          delay:    r.delay,
          fare:     r.fare,
        }))
      );

      setApiError(false);
      setLastFetched(new Date());
    } catch {
      setApiError(true);
    }
  };

  useEffect(() => {
    fetchStats();
    const iv = setInterval(fetchStats, 60_000);
    return () => clearInterval(iv);
  }, []);

  // live-match route as user types
  useEffect(() => {
    setMatchedRoute(from && to ? (findRoute(from, to) ?? null) : null);
  }, [from, to]);

  const activeOverlayRoute = previewRoute ?? matchedRoute;
  const overlayFrom        = previewRoute ? previewFrom : from;
  const overlayTo          = previewRoute ? previewTo   : to;

  const handleFromChange = (v: string) => { setFrom(v); setPreviewRoute(null); };
  const handleToChange   = (v: string) => { setTo(v);   setPreviewRoute(null); };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (from && to) navigate('/results', { state: { from, to } });
  };

  const handleSwap = () => {
    setSwapping(true);
    setTimeout(() => { setFrom(to); setTo(from); setSwapping(false); }, 300);
  };

  const handleQuickRoute = (r: QuickRoute) => {
    const route = findRoute(r.from, r.to);
    setPreviewRoute(route ?? null);
    setPreviewFrom(r.from);
    setPreviewTo(r.to);
    setFrom(r.from);
    setTo(r.to);
  };

  const handleGoToResults = () => {
    navigate('/results', { state: { from: previewRoute ? previewFrom : from, to: previewRoute ? previewTo : to } });
  };

  const suggestion = AI_SUGGESTIONS[aiIdx];

  // ── shared stats grid ─────────────────────────────────────
  const StatsGrid = ({ cols }: { cols: number }) => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
      {liveStats.map((s, i) => (
        <div key={s.label} style={{ background: cols === 2 ? '#F4F8FB' : 'white', borderRadius: 12, padding: cols === 2 ? '0.75rem' : '0.6rem 0.5rem', border: '1px solid #EEF3F8', textAlign: cols === 4 ? 'center' : 'left', opacity: statsVisible ? 1 : 0, transition: `opacity 0.4s ${0.1 * i}s ease` }}>
          <div style={{ display: cols === 2 ? 'flex' : 'block', alignItems: 'center', justifyContent: 'space-between', marginBottom: cols === 2 ? 4 : 2 }}>
            <span style={{ fontSize: cols === 2 ? 16 : 14 }}>{s.icon}</span>
            {cols === 2 && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: s.trend.startsWith('+') ? '#E0FBF4' : '#FFF4E6', color: s.trend.startsWith('+') ? '#00A87C' : '#C87800' }}>{s.trend}</span>}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: cols === 2 ? '1.4rem' : '1rem', fontWeight: 800, color: '#0F2240', letterSpacing: '-0.03em', lineHeight: 1 }}>
            {s.value}<span style={{ fontSize: cols === 2 ? '0.75rem' : '0.65rem', fontWeight: 500, color: '#7A92A8', marginLeft: 2 }}>{s.unit}</span>
          </div>
          <div style={{ fontSize: cols === 2 ? 11 : 9, color: '#7A92A8', marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );

  // ── shared route card ─────────────────────────────────────
  const RouteCard = ({ r, compact }: { r: QuickRoute; compact?: boolean }) => {
    const isSelected = previewRoute && previewFrom === r.from && previewTo === r.to;
    return (
      <button
        onClick={() => handleQuickRoute(r)}
        onMouseEnter={() => !compact && setActiveRoute(r.id)}
        onMouseLeave={() => !compact && setActiveRoute(null)}
        style={{ width: '100%', background: isSelected ? '#E0FBF4' : activeRoute === r.id ? '#F4F8FB' : 'white', border: `1.5px solid ${isSelected ? '#00C896' : activeRoute === r.id ? '#00C896' : '#EEF3F8'}`, borderRadius: compact ? 14 : 12, padding: '0.875rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease', opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(6px)' }}
        onTouchStart={compact ? e => e.currentTarget.style.background = '#F4F8FB' : undefined}
        onTouchEnd={compact ? e => e.currentTarget.style.background = isSelected ? '#E0FBF4' : 'white' : undefined}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: r.route.startsWith('AM') ? '#E0FBF4' : r.route.startsWith('Sarf') ? '#FFF0EA' : '#E6F1FB', color: r.route.startsWith('AM') ? '#00A87C' : r.route.startsWith('Sarf') ? '#E5521C' : '#185FA5' }}>{r.route}</span>
            {r.delay > 0 && <span style={{ fontSize: 10, color: '#C87800', fontWeight: 600 }}>+{r.delay}m delay</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#7A92A8' }}>
            <Clock size={11} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#0F2240' }}>{r.duration}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00C896', flexShrink: 0 }} />
          <span style={{ fontSize: '0.83rem', color: '#0F2240', fontWeight: 500, flex: 1 }}>{r.from}</span>
          <div style={{ flex: 1, height: 1, background: 'repeating-linear-gradient(90deg,#DDE6EE 0,#DDE6EE 4px,transparent 4px,transparent 8px)' }} />
          <div style={{ width: 7, height: 7, borderRadius: 2, background: '#FF6B35', flexShrink: 0 }} />
          <span style={{ fontSize: '0.83rem', color: '#0F2240', fontWeight: 500, flex: 1, textAlign: 'right' }}>{r.to}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CrowdingPill level={r.crowding} />
            <span style={{ fontSize: 11, color: '#7A92A8' }}>{r.fare}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#00A87C' }}>in {r.eta}</span>
            <ChevronRight size={13} color="#7A92A8" />
          </div>
        </div>
        <CrowdingBar level={r.crowding} />
      </button>
    );
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 4rem)', background: '#F4F8FB', position: 'relative', overflow: 'hidden' }}>

      {apiError && (
        <div style={{ position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: '#FFF4E6', border: '1px solid #FCD34D', borderRadius: 10, padding: '6px 16px', fontSize: 12, color: '#92400E', fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          ⚠️ Could not reach API — showing last cached data
        </div>
      )}

      {/* ── DESKTOP ──────────────────────────────────────── */}
      <div className="hidden lg:flex" style={{ height: 'calc(100vh - 4rem)' }}>
        <div style={{ width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'white', borderRight: '1px solid #EEF3F8', boxShadow: '4px 0 24px rgba(15,34,64,0.06)', overflowY: 'auto', position: 'relative', zIndex: 10 }}>

          {/* Header */}
          <div style={{ padding: '1.75rem 1.75rem 0', opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(12px)', transition: 'all 0.5s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C896', animation: 'pulse-teal 2s infinite' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#00A87C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Live · Amman
                {lastFetched && <span style={{ fontWeight: 400, marginLeft: 6, color: '#7A92A8' }}>· updated {lastFetched.toLocaleTimeString()}</span>}
              </span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 800, color: '#0F2240', letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 0.25rem' }}>Where to today?</h1>
            <p style={{ color: '#7A92A8', fontSize: '0.875rem', margin: 0 }}>AI-powered routes across Amman</p>
          </div>

          {/* AI strip */}
          <div style={{ padding: '1rem 1.75rem 0', opacity: mounted ? 1 : 0, transition: 'opacity 0.5s 0.15s ease' }}>
            <div style={{ background: `linear-gradient(135deg,${suggestion.color}12,${suggestion.color}06)`, border: `1px solid ${suggestion.color}30`, borderRadius: 14, padding: '0.875rem 1rem', display: 'flex', alignItems: 'flex-start', gap: 10, transition: 'all 0.4s ease' }}>
              <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{suggestion.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Sparkles size={11} color={suggestion.color} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: suggestion.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>AI · {suggestion.label}</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#0F2240', margin: 0, lineHeight: 1.45 }}>{suggestion.text}</p>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {AI_SUGGESTIONS.map((_, i) => (
                  <div key={i} style={{ width: i === aiIdx ? 14 : 5, height: 5, borderRadius: 3, background: i === aiIdx ? suggestion.color : '#DDE6EE', transition: 'all 0.3s ease' }} />
                ))}
              </div>
            </div>
          </div>

          {/* Search form */}
          <div style={{ padding: '1rem 1.75rem', opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(8px)', transition: 'all 0.5s 0.1s ease' }}>
            <form onSubmit={handleSearch}>
              <div style={{ position: 'relative' }}>
                <LocationInput value={from} onChange={handleFromChange} placeholder="From — pick up point" icon={MapPin} color="#00C896" />
                <button type="button" onClick={handleSwap}
                  style={{ position: 'absolute', right: -14, top: '50%', transform: `translateY(-50%) rotate(${swapping ? 180 : 0}deg)`, width: 28, height: 28, borderRadius: '50%', background: 'white', border: '2px solid #DDE6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, transition: 'transform 0.3s ease,border-color 0.2s', boxShadow: '0 2px 8px rgba(15,34,64,0.1)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#00C896'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#DDE6EE'}
                >
                  <RefreshCw size={12} color="#4A6580" />
                </button>
                <div style={{ height: 10, borderLeft: '2px dashed #DDE6EE', marginLeft: '1.9rem', marginTop: 2, marginBottom: 2 }} />
                <LocationInput value={to} onChange={handleToChange} placeholder="To — destination" icon={Navigation} color="#FF6B35" />
              </div>
              <button type="submit" disabled={!from || !to}
                style={{ marginTop: '0.875rem', width: '100%', padding: '0.875rem', background: from && to ? '#00C896' : '#DDE6EE', color: from && to ? 'white' : '#7A92A8', border: 'none', borderRadius: 12, fontFamily: 'var(--font-display)', fontSize: '0.97rem', fontWeight: 700, cursor: from && to ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: from && to ? '0 8px 28px rgba(0,200,150,0.3)' : 'none', transition: 'all 0.25s ease' }}
                onMouseEnter={e => { if (from && to) { e.currentTarget.style.background = '#00A87C'; e.currentTarget.style.transform = 'translateY(-1px)'; }}}
                onMouseLeave={e => { if (from && to) { e.currentTarget.style.background = '#00C896'; e.currentTarget.style.transform = 'translateY(0)'; }}}
              >
                <Search size={16} /> Find Routes <ArrowRight size={16} />
              </button>
            </form>
          </div>

          {/* Stats */}
          <div style={{ padding: '0 1.75rem', opacity: statsVisible ? 1 : 0, transform: statsVisible ? 'none' : 'translateY(8px)', transition: 'all 0.5s ease' }}>
            <StatsGrid cols={2} />
          </div>

          {/* Routes */}
          <div style={{ padding: '1.25rem 1.75rem 2rem', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F2240', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Popular routes</span>
              <span style={{ fontSize: '0.78rem', color: '#00C896', fontWeight: 600, cursor: 'pointer' }}>See all</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {popularRoutes.map(r => <RouteCard key={r.id} r={r} />)}
            </div>
          </div>
        </div>

        {/* Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Map mapId={MAP_ID} defaultCenter={AMMAN_CENTER} defaultZoom={13} style={{ width: '100%', height: '100%' }} gestureHandling="greedy">
            <RouteMapOverlay from={overlayFrom} to={overlayTo} selectedRoute={activeOverlayRoute} />
          </Map>
          <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 20, background: 'white', borderRadius: 12, padding: '0.6rem 1rem', boxShadow: '0 4px 20px rgba(15,34,64,0.15)', display: 'flex', alignItems: 'center', gap: 8, opacity: mounted ? 1 : 0, transition: 'all 0.5s 0.4s ease' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C896', animation: 'pulse-teal 2s infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0F2240' }}>{liveCount} buses live</span>
          </div>
          {activeOverlayRoute && (
            <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 20, background: 'white', borderRadius: 16, padding: '0.9rem 1.25rem', boxShadow: '0 8px 32px rgba(15,34,64,0.18)', display: 'flex', alignItems: 'center', gap: 16, animation: 'slideUp 0.3s ease', whiteSpace: 'nowrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: activeOverlayRoute.color }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F2240' }}>{activeOverlayRoute.name}</span>
                <span style={{ fontSize: '0.82rem', color: '#7A92A8' }}>{overlayFrom} → {overlayTo}</span>
              </div>
              <button onClick={handleGoToResults}
                style={{ background: '#00C896', color: 'white', border: 'none', borderRadius: 10, padding: '8px 18px', fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(0,200,150,0.35)', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#00A87C'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#00C896'; e.currentTarget.style.transform = 'none'; }}
              >
                View Results <ArrowRight size={14} />
              </button>
              <button onClick={() => { setPreviewRoute(null); setMatchedRoute(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A92A8', display: 'flex', padding: 4 }}>
                <X size={15} />
              </button>
            </div>
          )}
          {!activeOverlayRoute && (
            <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 20, background: 'white', borderRadius: 14, padding: '0.75rem 1.25rem', boxShadow: '0 8px 32px rgba(15,34,64,0.14)', display: 'flex', alignItems: 'center', gap: 20, opacity: mounted ? 1 : 0, transition: 'opacity 0.5s 0.6s ease', whiteSpace: 'nowrap' }}>
              {[{ color: '#00C896', label: 'AM503 Sweileh–JU Hospital' }, { color: '#3B9EFF', label: 'AM504 Wadi Seer–Sweileh' }, { color: '#FF6B35', label: 'AM505 Muhajereen–Wadi Seer' }].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 20, height: 3, borderRadius: 2, background: item.color }} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#4A6580' }}>{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── MOBILE ───────────────────────────────────────── */}
      <div className="lg:hidden" style={{ minHeight: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 260, position: 'relative', flexShrink: 0 }}>
          <Map mapId={MAP_ID} defaultCenter={AMMAN_CENTER} defaultZoom={12} style={{ width: '100%', height: '100%' }} gestureHandling="greedy" disableDefaultUI>
            <RouteMapOverlay from={overlayFrom} to={overlayTo} selectedRoute={activeOverlayRoute} />
          </Map>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,transparent 40%,rgba(244,248,251,0.95))', pointerEvents: 'none', zIndex: 5 }} />
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 20, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderRadius: 20, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C896', animation: 'pulse-teal 2s infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#0F2240' }}>{liveCount} live</span>
          </div>
        </div>

        <div style={{ flex: 1, padding: '0 1rem 6rem', marginTop: -24, position: 'relative', zIndex: 10 }}>
          {/* Search card */}
          <div style={{ background: 'white', borderRadius: 20, padding: '1.25rem', boxShadow: '0 8px 40px rgba(15,34,64,0.12)', marginBottom: '1rem', border: '1px solid #EEF3F8' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800, color: '#0F2240', margin: '0 0 0.875rem', letterSpacing: '-0.025em' }}>Where to?</h2>
            <form onSubmit={handleSearch}>
              <div style={{ marginBottom: 8 }}>
                <LocationInput value={from} onChange={handleFromChange} placeholder="From" icon={MapPin} color="#00C896" />
              </div>
              <LocationInput value={to} onChange={handleToChange} placeholder="To" icon={Navigation} color="#FF6B35" />
              <button type="submit" disabled={!from || !to}
                style={{ marginTop: '0.875rem', width: '100%', padding: '0.8rem', background: from && to ? '#00C896' : '#DDE6EE', color: from && to ? 'white' : '#7A92A8', border: 'none', borderRadius: 12, fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, cursor: from && to ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: from && to ? '0 6px 20px rgba(0,200,150,0.28)' : 'none', transition: 'all 0.2s' }}>
                <Search size={15} /> Find Routes <ArrowRight size={15} />
              </button>
            </form>
          </div>

          {/* Mobile preview banner */}
          {activeOverlayRoute && (
            <div style={{ background: 'white', border: `1.5px solid ${activeOverlayRoute.color}`, borderRadius: 14, padding: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: `0 4px 16px ${activeOverlayRoute.color}22` }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: activeOverlayRoute.color }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F2240' }}>{activeOverlayRoute.name}</span>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#7A92A8' }}>{overlayFrom} → {overlayTo}</span>
              </div>
              <button onClick={handleGoToResults}
                style={{ background: '#00C896', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                Results <ArrowRight size={13} />
              </button>
            </div>
          )}

          {/* AI strip mobile */}
          <div style={{ background: `linear-gradient(135deg,${suggestion.color}14,${suggestion.color}07)`, border: `1px solid ${suggestion.color}28`, borderRadius: 14, padding: '0.875rem', marginBottom: '1rem', display: 'flex', gap: 10, alignItems: 'flex-start', transition: 'all 0.4s' }}>
            <span style={{ fontSize: 18 }}>{suggestion.icon}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                <Sparkles size={10} color={suggestion.color} />
                <span style={{ fontSize: 10, fontWeight: 700, color: suggestion.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI · {suggestion.label}</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#0F2240', margin: 0, lineHeight: 1.4 }}>{suggestion.text}</p>
            </div>
          </div>

          {/* Stats mobile */}
          <div style={{ marginBottom: '1.25rem' }}>
            <StatsGrid cols={4} />
          </div>

          {/* Routes mobile */}
          <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F2240', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick Routes</span>
            <span style={{ fontSize: '0.75rem', color: '#00C896', fontWeight: 600 }}>See all</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {popularRoutes.slice(0, 4).map(r => <RouteCard key={r.id} r={r} compact />)}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity:0; transform:translateX(-50%) translateY(12px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}