import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { MapPreview } from '../components/MapPreview';
import { getFavorites, toggleFavorite } from '../../lib/favorites';
import {
  ArrowLeft, ArrowRight, Star, Zap, Clock, Users,
  Map, X, ChevronRight, AlertTriangle, Sparkles,
  TrendingDown, TrendingUp, Navigation, MapPin,
  Filter, SortAsc, Bus, RefreshCw,
} from 'lucide-react';
import { useLang } from '../../lib/i18n';

/* ─── types ────────────────────────────────────────────── */
type Crowding  = 'available' | 'moderate' | 'full';
type SortOpt   = 'fastest' | 'soonest' | 'least-crowded';
type AIStatus  = 'clear' | 'moderate' | 'high' | 'gridlock';
type RouteType = 'coaster' | 'sarfees' | 'express';

interface Route {
  id:            number;
  name:          string;
  type:          RouteType;
  stops:         string[];
  nextDeparture: string;
  arrivalTime:   string;
  duration:      number;       // minutes
  delay:         number;       // minutes
  crowding:      Crowding;
  fare:          string;
  walkMin:       number;
  aiStatus:      AIStatus;
  aiConfidence:  number;       // 0–100
  co2:           string;
  seats:         number | null; // null = standing room
}

/* ─── data ──────────────────────────────────────────────── */
const ROUTES: Route[] = [
  {
    id: 1, name: 'Route 27', type: 'coaster',
    stops: ['Sweileh Circle', 'Sports City', 'UJ Main Gate'],
    nextDeparture: '2:15 PM', arrivalTime: '2:42 PM',
    duration: 27, delay: 0, crowding: 'available',
    fare: '0.35 JD', walkMin: 3,
    aiStatus: 'clear', aiConfidence: 92, co2: '0.8 kg', seats: 14,
  },
  {
    id: 2, name: 'Route 35', type: 'coaster',
    stops: ['Sweileh', 'Shmeisani', 'Gardens', 'UJ'],
    nextDeparture: '2:18 PM', arrivalTime: '2:53 PM',
    duration: 35, delay: 5, crowding: 'moderate',
    fare: '0.35 JD', walkMin: 2,
    aiStatus: 'moderate', aiConfidence: 78, co2: '0.9 kg', seats: 4,
  },
  {
    id: 3, name: 'Route 12 Express', type: 'express',
    stops: ['Sweileh', 'Wadi Saqra', 'UJ'],
    nextDeparture: '2:25 PM', arrivalTime: '2:47 PM',
    duration: 22, delay: 0, crowding: 'full',
    fare: '0.50 JD', walkMin: 5,
    aiStatus: 'high', aiConfidence: 85, co2: '0.7 kg', seats: null,
  },
  {
    id: 4, name: 'Sarfees Direct', type: 'sarfees',
    stops: ['Sweileh', 'UJ Gate 2'],
    nextDeparture: '2:12 PM', arrivalTime: '2:32 PM',
    duration: 20, delay: 2, crowding: 'moderate',
    fare: '0.60 JD', walkMin: 1,
    aiStatus: 'moderate', aiConfidence: 81, co2: '0.6 kg', seats: 6,
  },
];

/* ─── cfg maps ──────────────────────────────────────────── */
const CROWD_CFG: Record<Crowding, { bg: string; color: string; label: string; barColor: string; barW: string }> = {
  available: { bg: '#E0FBF4', color: '#00A87C', label: 'Available',  barColor: '#00C896', barW: '32%'  },
  moderate:  { bg: '#FFF4E6', color: '#C87800', label: 'Moderate',   barColor: '#FF9F43', barW: '64%'  },
  full:      { bg: '#FFECEC', color: '#CC0000', label: 'Full',       barColor: '#FF5252', barW: '96%'  },
};

const AI_CFG: Record<AIStatus, { bg: string; color: string; label: string; icon: string }> = {
  clear:    { bg: '#E0FBF4', color: '#00A87C', label: 'AI: Clear',    icon: '✓'  },
  moderate: { bg: '#FFF4E6', color: '#C87800', label: 'AI: Moderate', icon: '~'  },
  high:     { bg: '#FFF0EA', color: '#E5521C', label: 'AI: High',     icon: '!'  },
  gridlock: { bg: '#FFECEC', color: '#CC0000', label: 'AI: Gridlock', icon: '✕'  },
};

const TYPE_CFG: Record<RouteType, { bg: string; color: string; label: string }> = {
  coaster: { bg: '#E0FBF4', color: '#00A87C', label: 'Coaster'  },
  sarfees: { bg: '#FFF0EA', color: '#E5521C', label: 'Sarfees'  },
  express: { bg: '#E6F1FB', color: '#185FA5', label: 'Express'  },
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
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: c.bg, color: c.color,
      padding: '3px 9px', borderRadius: 99,
      fontSize: 11, fontWeight: 700,
    }}>
      <Sparkles size={10} />
      {c.label}
      <span style={{ opacity: 0.7, fontWeight: 500 }}>{confidence}%</span>
    </div>
  );
}

function StopDots({ stops, type }: { stops: string[]; type: RouteType }) {
  const lineColor = type === 'sarfees' ? '#FF6B35' : type === 'express' ? '#3B9EFF' : '#00C896';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflow: 'hidden' }}>
      {stops.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: i === 0 || i === stops.length - 1 ? '0 0 auto' : '1 1 0' }}>
          {/* dot */}
          <div style={{
            width: i === 0 || i === stops.length - 1 ? 9 : 7,
            height: i === 0 || i === stops.length - 1 ? 9 : 7,
            borderRadius: '50%',
            background: i === 0 ? lineColor : i === stops.length - 1 ? '#FF6B35' : 'white',
            border: `2px solid ${lineColor}`,
            flexShrink: 0, zIndex: 1,
          }} />
          {/* line between */}
          {i < stops.length - 1 && (
            <div style={{ flex: 1, minWidth: 16, height: 2,
              background: `repeating-linear-gradient(90deg, ${lineColor} 0, ${lineColor} 4px, transparent 4px, transparent 8px)`,
              opacity: 0.5,
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── BEST BADGE ─────────────────────────────────────────── */
function BestBadge({ reason }: { reason: string }) {
  return (
    <div style={{
      position: 'absolute', top: -11, left: 16,
      background: '#0F2240', color: 'white',
      padding: '2px 10px', borderRadius: 99,
      fontSize: 10, fontWeight: 700,
      display: 'flex', alignItems: 'center', gap: 4,
      letterSpacing: '0.03em',
      boxShadow: '0 2px 8px rgba(15,34,64,0.25)',
    }}>
      <Zap size={9} color="#00C896" fill="#00C896" />
      {reason}
    </div>
  );
}

/* ─── main ──────────────────────────────────────────────── */
export function RouteResults() {
  const { t, isRTL, lang } = useLang();

  const location   = useLocation();
  const navigate   = useNavigate();
  const { from = 'Sweileh', to = 'UJ' } = location.state || {};

  const [sortBy,    setSortBy]    = useState<SortOpt>('fastest');
  const [showMap,   setShowMap]   = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(getFavorites);
  const [hoverId,   setHoverId]   = useState<number | null>(null);
  const [mounted,   setMounted]   = useState(false);
  const [aiLoading, setAiLoading] = useState(true);

  // AI backend hook — same pattern as LiveTracking
  useEffect(() => {
    const fetchDelays = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/predict?density=1.5&waiting_time=5.0');
        await res.json();
      } catch {
        // backend offline in demo — graceful fallback
      } finally {
        setAiLoading(false);
      }
    };
    fetchDelays();
  }, []);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  const handleFavorite = useCallback((e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    toggleFavorite(id);
    setFavorites(getFavorites());
  }, []);

  const handleTrack = (route: Route) =>
    navigate('/tracking', { state: { routeId: route.id, from, to } });

  /* sort */
  const sorted = [...ROUTES].sort((a, b) => {
    if (sortBy === 'fastest')      return a.duration - b.duration;
    if (sortBy === 'soonest')      return a.nextDeparture.localeCompare(b.nextDeparture);
    if (sortBy === 'least-crowded') {
      const o: Record<Crowding, number> = { available: 0, moderate: 1, full: 2 };
      return o[a.crowding] - o[b.crowding];
    }
    return 0;
  });

  /* best-pick label */
  const bestLabel: Record<SortOpt, string> = {
    'fastest':      'Fastest route',
    'soonest':      'Leaves soonest',
    'least-crowded': 'Least crowded',
  };

  /* map coords */
  const MAP_MARKERS: Array<{ position: [number, number]; label: string }> = [
    { position: [31.9700, 35.8800], label: from },
    { position: [31.9200, 35.9300], label: to   },
  ];
  const MAP_ROUTE: Array<[number, number]> = [
    [31.9700, 35.8800],
    [31.9500, 35.9000],
    [31.9200, 35.9300],
  ];

  /* ── shared card renderer ─────────────────────────────── */
  const renderCard = (route: Route, idx: number, isBest: boolean) => {
    const crowd  = CROWD_CFG[route.crowding];
    const type   = TYPE_CFG[route.type];
    const isFav  = favorites.has(String(route.id));
    const isHov  = hoverId === route.id;

    return (
      <div key={route.id}
        onClick={() => handleTrack(route)}
        onMouseEnter={() => setHoverId(route.id)}
        onMouseLeave={() => setHoverId(null)}
        style={{
          position: 'relative',
          background: 'white',
          border: `1.5px solid ${isHov ? '#00C896' : isBest ? '#B3F0E0' : '#EEF3F8'}`,
          borderRadius: 16,
          padding: '1.1rem 1.25rem 1rem',
          cursor: 'pointer',
          marginTop: isBest ? 14 : 0,
          boxShadow: isHov
            ? '0 8px 32px rgba(0,200,150,0.15), 0 2px 8px rgba(15,34,64,0.06)'
            : isBest
            ? '0 4px 20px rgba(0,200,150,0.10)'
            : '0 1px 4px rgba(15,34,64,0.06)',
          transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
          transform: isHov ? 'translateY(-2px)' : 'translateY(0)',
          opacity: mounted ? 1 : 0,
          transitionDelay: mounted ? `${idx * 0.07}s` : '0s',
        }}
      >
        {isBest && <BestBadge reason={bestLabel[sortBy]} />}

        {/* ── Top row ─────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Route type badge */}
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
              background: type.bg, color: type.color }}>
              {type.label}
            </span>
            {/* Route name */}
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F2240' }}>
              {route.name}
            </span>
            {/* Delay */}
            {route.delay > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 10, fontWeight: 700, color: '#C87800',
                background: '#FFF4E6', padding: '2px 7px', borderRadius: 99 }}>
                <TrendingUp size={9} />
                +{route.delay} min
              </span>
            )}
          </div>

          {/* Fav + chevron */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <button onClick={e => handleFavorite(e, route.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                borderRadius: '50%', display: 'flex', transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Star size={17}
                style={{ fill: isFav ? '#F59E0B' : 'none', stroke: isFav ? '#F59E0B' : '#7A92A8',
                  transition: 'all 0.2s' }} />
            </button>
            <ChevronRight size={16} color={isHov ? '#00C896' : '#7A92A8'}
              style={{ transition: 'color 0.2s, transform 0.2s',
                transform: isHov ? 'translateX(2px)' : 'translateX(0)' }} />
          </div>
        </div>

        {/* ── Stop line ──────────────────────────────── */}
        <div style={{ marginBottom: 10 }}>
          <StopDots stops={route.stops} type={route.type} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#4A6580' }}>{route.stops[0]}</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#4A6580' }}>{route.stops[route.stops.length - 1]}</span>
          </div>
        </div>

        {/* ── Stats row ──────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8, padding: '10px 0',
          borderTop: '1px solid #EEF3F8', borderBottom: '1px solid #EEF3F8',
          marginBottom: 10,
        }}>
          {[
            { icon: <Clock size={13} color="#7A92A8" />,        label: 'Departs',  value: route.nextDeparture },
            { icon: <Navigation size={13} color="#7A92A8" />,   label: 'Arrives',  value: route.arrivalTime   },
            { icon: <Bus size={13} color="#7A92A8" />,          label: 'Duration', value: `${route.duration} min` },
            { icon: <MapPin size={13} color="#7A92A8" />,       label: 'Walk',     value: `${route.walkMin} min`  },
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

        {/* ── Bottom row ─────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Crowding pill */}
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99,
              background: crowd.bg, color: crowd.color,
              display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%',
                background: crowd.barColor, display: 'inline-block' }} />
              {crowd.label}
            </span>
            {/* Seats */}
            {route.seats !== null
              ? <span style={{ fontSize: 11, color: '#7A92A8', fontWeight: 500 }}>{route.seats} seats left</span>
              : <span style={{ fontSize: 11, color: '#FF5252', fontWeight: 600 }}>Standing only</span>
            }
            {/* Fare */}
            <span style={{ fontSize: 11, fontWeight: 600, color: '#0F2240',
              background: '#F4F8FB', padding: '2px 8px', borderRadius: 99,
              border: '1px solid #EEF3F8' }}>{route.fare}</span>
          </div>

          {/* AI badge */}
          {aiLoading
            ? <div style={{ width: 90, height: 20, background: '#EEF3F8', borderRadius: 99,
                animation: 'st-shimmer 1.5s ease infinite' }} />
            : <AIBadge status={route.aiStatus} confidence={route.aiConfidence} />
          }
        </div>

        {/* Crowding bar */}
        <CrowdBar level={route.crowding} />
      </div>
    );
  };

  /* ── layout ─────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: 'calc(100vh - 4rem)', background: '#F4F8FB' }}>

      {/* ── DESKTOP ──────────────────────────────────────── */}
      <div className="hidden lg:flex" style={{ height: 'calc(100vh - 4rem)' }}>

        {/* Left panel */}
        <div style={{
          width: 480, flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: 'white', borderRight: '1px solid #EEF3F8',
          boxShadow: '4px 0 24px rgba(15,34,64,0.06)', overflowY: 'auto',
        }}>
          {/* Header */}
          <div style={{
            padding: '1.5rem 1.5rem 0',
            opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(10px)',
            transition: 'all 0.4s ease',
          }}>
            {/* Back + route bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button onClick={() => navigate('/home')}
                style={{ width: 34, height: 34, borderRadius: 10, border: '1.5px solid #EEF3F8',
                  background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0, transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#00C896'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#EEF3F8'}
              >
                <ArrowLeft size={15} color="#4A6580" />
              </button>

              {/* Route pill */}
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center',
                background: '#F4F8FB', border: '1px solid #EEF3F8',
                borderRadius: 12, padding: '8px 14px', gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C896' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F2240' }}>{from}</span>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowRight size={14} color="#7A92A8" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F2240' }}>{to}</span>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: '#FF6B35' }} />
                </div>
              </div>
            </div>

            {/* Title + count */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800,
                  color: '#0F2240', letterSpacing: '-0.03em', margin: 0 }}>
                  Available Routes
                </h1>
                <p style={{ fontSize: '0.8rem', color: '#7A92A8', margin: '3px 0 0', fontWeight: 500 }}>
                  {ROUTES.length} routes found · AI-enhanced
                </p>
              </div>
              <button onClick={() => setShowMap(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 10,
                  border: `1.5px solid ${showMap ? '#00C896' : '#EEF3F8'}`,
                  background: showMap ? '#E0FBF4' : 'white',
                  color: showMap ? '#00A87C' : '#4A6580',
                  fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Map size={13} />
                {showMap ? 'Hide map' : 'Map'}
              </button>
            </div>

            {/* Sort controls */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                color: '#7A92A8', fontWeight: 600, marginRight: 2 }}>
                <SortAsc size={12} /> Sort:
              </span>
              {([
                { v: 'fastest',       label: t.results.fastest  },
                { v: 'soonest',       label: t.results.soonest  },
                { v: 'least-crowded', label: t.results.emptiest },
              ] as { v: SortOpt; label: string }[]).map(opt => (
                <button key={opt.v} onClick={() => setSortBy(opt.v)}
                  style={{
                    padding: '6px 14px', borderRadius: 99, fontSize: '0.8rem',
                    fontWeight: sortBy === opt.v ? 700 : 500,
                    border: `1.5px solid ${sortBy === opt.v ? '#00C896' : '#EEF3F8'}`,
                    background: sortBy === opt.v ? '#E0FBF4' : 'white',
                    color: sortBy === opt.v ? '#00A87C' : '#4A6580',
                    cursor: 'pointer', transition: 'all 0.18s', whiteSpace: 'nowrap',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* AI insight banner */}
          <div style={{
            margin: '0 1.5rem 14px',
            background: 'linear-gradient(135deg, #E0FBF4, #F0FDF9)',
            border: '1px solid #B3F0E0', borderRadius: 14,
            padding: '0.875rem 1rem',
            display: 'flex', alignItems: 'flex-start', gap: 10,
            opacity: mounted ? 1 : 0, transition: 'opacity 0.5s 0.25s ease',
          }}>
            <Sparkles size={16} color="#00C896" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#00A87C',
                textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>
                AI Traffic Insight
              </div>
              <p style={{ fontSize: '0.8rem', color: '#0F2240', margin: 0, lineHeight: 1.5 }}>
                Route 27 is <strong>9 min faster</strong> than usual today due to lower density on Sports City road.
                Route 35 experiencing moderate congestion near Shmeisani.
              </p>
            </div>
          </div>

          {/* Cards */}
          <div style={{ padding: '0 1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {sorted.map((r, i) => renderCard(r, i, i === 0))}
          </div>
        </div>

        {/* Right: map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapPreview height="100%" markers={MAP_MARKERS} route={MAP_ROUTE} />

          {/* Floating from→to label */}
          <div style={{
            position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
            background: 'white', borderRadius: 12, padding: '8px 16px',
            boxShadow: '0 4px 20px rgba(15,34,64,0.15)',
            display: 'flex', alignItems: 'center', gap: 8, zIndex: 20,
            opacity: mounted ? 1 : 0, transition: 'opacity 0.5s 0.5s ease',
            whiteSpace: 'nowrap',
          }}>
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
        <div style={{
          background: 'white', borderBottom: '1px solid #EEF3F8',
          padding: '1rem 1rem 0',
          boxShadow: '0 2px 12px rgba(15,34,64,0.06)',
        }}>
          {/* Back + route */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <button onClick={() => navigate('/home')}
              style={{ width: 32, height: 32, borderRadius: 9, border: '1.5px solid #EEF3F8',
                background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0 }}>
              <ArrowLeft size={14} color="#4A6580" />
            </button>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center',
              background: '#F4F8FB', borderRadius: 10, padding: '7px 12px', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00C896' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F2240' }}>{from}</span>
              <ArrowRight size={12} color="#7A92A8" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F2240' }}>{to}</span>
              <div style={{ width: 7, height: 7, borderRadius: 2, background: '#FF6B35' }} />
            </div>
          </div>

          {/* Sort chips */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: '0.875rem',
            scrollbarWidth: 'none' }}>
            {([
              { v: 'fastest',       label: t.results.fastest  },
              { v: 'soonest',       label: t.results.soonest  },
              { v: 'least-crowded', label: t.results.emptiest },
            ] as { v: SortOpt; label: string }[]).map(opt => (
              <button key={opt.v} onClick={() => setSortBy(opt.v)}
                style={{
                  padding: '6px 14px', borderRadius: 99, fontSize: '0.78rem',
                  fontWeight: sortBy === opt.v ? 700 : 500,
                  border: `1.5px solid ${sortBy === opt.v ? '#00C896' : '#EEF3F8'}`,
                  background: sortBy === opt.v ? '#E0FBF4' : 'white',
                  color: sortBy === opt.v ? '#00A87C' : '#4A6580',
                  cursor: 'pointer', transition: 'all 0.18s', whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                {opt.label}
              </button>
            ))}
            <button onClick={() => setShowMap(v => !v)}
              style={{
                padding: '6px 14px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 600,
                border: `1.5px solid ${showMap ? '#00C896' : '#EEF3F8'}`,
                background: showMap ? '#E0FBF4' : 'white',
                color: showMap ? '#00A87C' : '#4A6580',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.18s',
              }}>
              <Map size={12} /> Map
            </button>
          </div>
        </div>

        {/* Collapsible map */}
        <div style={{
          overflow: 'hidden',
          height: showMap ? 220 : 0,
          transition: 'height 0.35s cubic-bezier(0.4,0,0.2,1)',
        }}>
          <MapPreview height="220px" markers={MAP_MARKERS} route={MAP_ROUTE} />
        </div>

        {/* AI banner — mobile */}
        <div style={{
          margin: '12px 1rem 0',
          background: 'linear-gradient(135deg, #E0FBF4, #F0FDF9)',
          border: '1px solid #B3F0E0', borderRadius: 12,
          padding: '0.75rem 0.875rem',
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <Sparkles size={14} color="#00C896" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: '0.78rem', color: '#0F2240', margin: 0, lineHeight: 1.5 }}>
            <strong>Route 27</strong> is 9 min faster than usual today. Route 35 has moderate congestion.
          </p>
        </div>

        {/* Cards */}
        <div style={{ padding: '12px 1rem 6rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sorted.map((r, i) => renderCard(r, i, i === 0))}
        </div>
      </div>

      {/* global shimmer keyframe */}
      <style>{`
        @keyframes st-shimmer {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
