import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { MapPreview } from '../components/MapPreview';
import {
  ArrowLeft, Navigation, AlertTriangle, CheckCircle2,
  Clock, Zap, Sparkles, RefreshCw, ChevronRight,
  Radio, TrendingUp, Bus, MapPin, Wind,
} from 'lucide-react';
import { useLang } from '../../lib/i18n';

/* ─── types ──────────────────────────────────────────── */
type StopStatus  = 'completed' | 'current' | 'upcoming';
type AIStatus    = 'clear' | 'moderate' | 'high' | 'gridlock';
type APIState    = 'idle' | 'loading' | 'ok' | 'error';

interface Stop {
  name:   string;
  time:   string;
  status: StopStatus;
  lat:    number;
  lng:    number;
}

interface AIResponse {
  delay:  number;
  status: string;
}

/* ─── static route data (keyed by routeId) ──────────── */
const ROUTE_DATA: Record<number, { name: string; stops: Stop[] }> = {
  1: {
    name: 'Route 27',
    stops: [
      { name: 'Sweileh Circle',   time: '2:15 PM', status: 'completed', lat: 31.9700, lng: 35.8800 },
      { name: 'Sports City',      time: '2:23 PM', status: 'current',   lat: 31.9560, lng: 35.8950 },
      { name: 'Gardens Junction', time: '2:32 PM', status: 'upcoming',  lat: 31.9420, lng: 35.9080 },
      { name: 'UJ Main Gate',     time: '2:42 PM', status: 'upcoming',  lat: 31.9200, lng: 35.9300 },
    ],
  },
  2: {
    name: 'Route 35',
    stops: [
      { name: 'Sweileh',    time: '2:18 PM', status: 'completed', lat: 31.9700, lng: 35.8800 },
      { name: 'Shmeisani',  time: '2:28 PM', status: 'current',   lat: 31.9540, lng: 35.9050 },
      { name: 'Gardens',    time: '2:38 PM', status: 'upcoming',  lat: 31.9380, lng: 35.9150 },
      { name: 'UJ',         time: '2:53 PM', status: 'upcoming',  lat: 31.9200, lng: 35.9300 },
    ],
  },
  3: {
    name: 'Route 12 Express',
    stops: [
      { name: 'Sweileh',    time: '2:25 PM', status: 'completed', lat: 31.9700, lng: 35.8800 },
      { name: 'Wadi Saqra', time: '2:33 PM', status: 'current',   lat: 31.9480, lng: 35.9100 },
      { name: 'UJ',         time: '2:47 PM', status: 'upcoming',  lat: 31.9200, lng: 35.9300 },
    ],
  },
  4: {
    name: 'Sarfees Direct',
    stops: [
      { name: 'Sweileh',   time: '2:12 PM', status: 'completed', lat: 31.9700, lng: 35.8800 },
      { name: 'UJ Gate 2', time: '2:32 PM', status: 'current',   lat: 31.9200, lng: 35.9300 },
    ],
  },
};

const AI_STATUS_CFG: Record<AIStatus, {
  label: string; bg: string; border: string; color: string;
  icon: React.ReactNode; severity: number;
}> = {
  clear:    { label: 'Clear ahead',        bg: '#E0FBF4', border: '#B3F0E0', color: '#00A87C', icon: <Wind size={15}/>,          severity: 0 },
  moderate: { label: 'Moderate traffic',   bg: '#FFF4E6', border: '#FFD8A0', color: '#C87800', icon: <TrendingUp size={15}/>,    severity: 1 },
  high:     { label: 'Heavy congestion',   bg: '#FFF0EA', border: '#FFB89A', color: '#E5521C', icon: <AlertTriangle size={15}/>, severity: 2 },
  gridlock: { label: 'Gridlock detected',  bg: '#FFECEC', border: '#FFB0B0', color: '#CC0000', icon: <AlertTriangle size={15}/>, severity: 3 },
};

function classifyStatus(raw: string): AIStatus {
  const s = raw.toLowerCase();
  if (s === 'gridlock')                       return 'gridlock';
  if (s === 'high' || s === 'heavy')          return 'high';
  if (s === 'moderate' || s === 'medium')     return 'moderate';
  return 'clear';
}

/* ─── ETA countdown display ──────────────────────────── */
function ETADisplay({ minutes, hasDelay }: { minutes: number; hasDelay: boolean }) {
  const [displayed, setDisplayed] = useState(minutes);

  // count-up animation when value changes
  useEffect(() => {
    let frame = 0;
    const start = displayed;
    const end   = minutes;
    const diff  = Math.abs(end - start);
    if (diff === 0) return;
    const step = () => {
      frame++;
      const progress = Math.min(frame / (diff * 6), 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(start + (end - start) * ease));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [minutes]);

  const mins = Math.max(0, displayed);
  const secs = 0; // could wire to a real second-countdown

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '4.5rem', fontWeight: 800,
        color: 'white', lineHeight: 1,
        letterSpacing: '-0.04em',
        textShadow: '0 2px 12px rgba(0,0,0,0.15)',
        transition: 'color 0.4s',
      }}>
        {String(mins).padStart(2, '0')}
        <span style={{ fontSize: '2rem', fontWeight: 500, opacity: 0.7, marginLeft: 4 }}>min</span>
      </div>
      {hasDelay && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6,
          background: 'rgba(255,255,255,0.18)', borderRadius: 99,
          padding: '3px 12px', fontSize: 12, fontWeight: 700, color: 'white',
        }}>
          <TrendingUp size={11} />
          Running late
        </div>
      )}
    </div>
  );
}

/* ─── stop timeline ───────────────────────────────────── */
function StopTimeline({ stops, currentIdx }: { stops: Stop[]; currentIdx: number }) {
  const progress = currentIdx / (stops.length - 1);

  return (
    <div style={{ padding: '1.25rem' }}>
      {/* Progress track */}
      <div style={{ position: 'relative', paddingLeft: 24 }}>
        {/* Vertical line */}
        <div style={{
          position: 'absolute', left: 11, top: 10, bottom: 10,
          width: 2, background: '#EEF3F8', borderRadius: 2,
        }}>
          {/* Filled progress */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: `${progress * 100}%`,
            background: 'linear-gradient(to bottom, #00C896, #00A87C)',
            borderRadius: 2,
            transition: 'height 0.8s cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>

        {stops.map((stop, i) => {
          const isDone    = stop.status === 'completed';
          const isCurrent = stop.status === 'current';
          const isUpcoming= stop.status === 'upcoming';

          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 16,
              marginBottom: i < stops.length - 1 ? '1.5rem' : 0,
              opacity: isUpcoming ? 0.65 : 1,
              transition: 'opacity 0.3s',
            }}>
              {/* Node */}
              <div style={{
                position: 'relative', width: 22, height: 22,
                flexShrink: 0, marginLeft: -23, marginTop: -1,
              }}>
                {/* Outer ring for current */}
                {isCurrent && (
                  <div style={{
                    position: 'absolute', inset: -5,
                    borderRadius: '50%',
                    border: '2px solid rgba(0,200,150,0.3)',
                    animation: 'st-ring-pulse 1.8s ease-in-out infinite',
                  }} />
                )}
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isDone ? '#00C896' : isCurrent ? '#0F2240' : 'white',
                  border: `2.5px solid ${isDone ? '#00C896' : isCurrent ? '#00C896' : '#DDE6EE'}`,
                  boxShadow: isCurrent ? '0 0 0 4px rgba(0,200,150,0.2)' : 'none',
                  transition: 'all 0.4s ease',
                  zIndex: 1, position: 'relative',
                }}>
                  {isDone && <CheckCircle2 size={12} color="white" strokeWidth={3} />}
                  {isCurrent && (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#00C896',
                      animation: 'st-dot-pulse 1.2s ease-in-out infinite',
                    }} />
                  )}
                  {isUpcoming && (
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#DDE6EE' }} />
                  )}
                </div>
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingTop: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{
                      fontSize: '0.9rem', fontWeight: isCurrent ? 700 : 600,
                      color: isCurrent ? '#00A87C' : isDone ? '#4A6580' : '#0F2240',
                      transition: 'color 0.3s',
                    }}>
                      {stop.name}
                    </div>
                    {isCurrent && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 11, color: '#00A87C', fontWeight: 600, marginTop: 2,
                      }}>
                        <Radio size={10} style={{ animation: 'st-dot-pulse 1.2s ease-in-out infinite' }} />
                        Bus is here now
                      </div>
                    )}
                    {isDone && (
                      <div style={{ fontSize: 11, color: '#7A92A8', fontWeight: 500, marginTop: 1 }}>
                        Departed
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontSize: '0.82rem', fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? '#0F2240' : '#7A92A8',
                    background: isCurrent ? '#F4F8FB' : 'transparent',
                    padding: isCurrent ? '2px 9px' : '2px 0',
                    borderRadius: 99,
                  }}>
                    {stop.time}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── AI status banner ─────────────────────────────────── */
function AIBanner({
  status, delay, apiState, lastUpdated, onRefresh,
}: {
  status: AIStatus; delay: number; apiState: APIState;
  lastUpdated: Date | null; onRefresh: () => void;
}) {
  const cfg = AI_STATUS_CFG[status];
  const isLoading = apiState === 'loading';

  return (
    <div style={{
      background: cfg.bg,
      border: `1.5px solid ${cfg.border}`,
      borderRadius: 14, padding: '0.95rem 1rem',
      transition: 'all 0.4s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
          {/* Icon */}
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'rgba(255,255,255,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: cfg.color, flexShrink: 0,
          }}>
            {isLoading
              ? <RefreshCw size={14} style={{ animation: 'st-spin 1s linear infinite' }} />
              : cfg.icon
            }
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: cfg.color,
                textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                AI · Traffic
              </span>
              <Sparkles size={9} color={cfg.color} />
              {apiState === 'ok' && (
                <span style={{ fontSize: 10, fontWeight: 600, color: '#7A92A8' }}>
                  Live
                </span>
              )}
              {apiState === 'error' && (
                <span style={{ fontSize: 10, fontWeight: 600, color: '#CC0000' }}>
                  Offline
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F2240', marginBottom: 2 }}>
              {isLoading ? 'Analysing traffic data…' : cfg.label}
            </div>
            {!isLoading && delay > 0 && (
              <div style={{ fontSize: '0.78rem', color: '#4A6580', lineHeight: 1.4 }}>
                Expected delay: <strong style={{ color: cfg.color }}>+{delay} min</strong> ·
                {status === 'gridlock' && ' Consider next departure'}
                {status === 'high' && ' Allow extra time'}
                {status === 'moderate' && ' Minor impact only'}
              </div>
            )}
            {!isLoading && delay === 0 && (
              <div style={{ fontSize: '0.78rem', color: '#4A6580' }}>
                Route is running on schedule
              </div>
            )}
            {lastUpdated && (
              <div style={{ fontSize: 10, color: '#7A92A8', marginTop: 4, fontWeight: 500 }}>
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            )}
          </div>
        </div>

        {/* Refresh button */}
        <button onClick={onRefresh}
          style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'rgba(255,255,255,0.7)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: cfg.color, flexShrink: 0,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'white'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.7)'}
        >
          <RefreshCw size={13} style={isLoading ? { animation: 'st-spin 1s linear infinite' } : {}} />
        </button>
      </div>
    </div>
  );
}

/* ─── main component ──────────────────────────────────── */
export function LiveTracking() {
  const { t, isRTL, lang } = useLang();

  const location = useLocation();
  const navigate  = useNavigate();
  const { routeId = 1, from = 'Sweileh', to = 'UJ' } = location.state || {};

  const routeData    = ROUTE_DATA[routeId] ?? ROUTE_DATA[1];
  const routeName    = routeData.name;

  /* ETA & delay state */
  const [minutesLeft,  setMinutesLeft]  = useState(8);
  const [aiDelay,      setAiDelay]      = useState(0);
  const [aiStatus,     setAiStatus]     = useState<AIStatus>('clear');
  const [apiState,     setApiState]     = useState<APIState>('idle');
  const [lastUpdated,  setLastUpdated]  = useState<Date | null>(null);
  const [currentIdx,   setCurrentIdx]   = useState(1);
  const [mounted,      setMounted]      = useState(false);

  /* Bus position interpolation (lat/lng between stops) */
  const [busProgress, setBusProgress] = useState(0.5); // 0→1 between current and next stop
  const busProgressRef = useRef(busProgress);
  busProgressRef.current = busProgress;

  /* Countdown ticker */
  const [secsLeft, setSecsLeft] = useState(minutesLeft * 60);
  useEffect(() => {
    setSecsLeft(minutesLeft * 60);
  }, [minutesLeft]);
  useEffect(() => {
    const iv = setInterval(() => setSecsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(iv);
  }, []);

  /* Animate bus along route */
  useEffect(() => {
    const iv = setInterval(() => {
      setBusProgress(p => {
        if (p >= 0.98) return 0; // loop for demo
        return p + 0.003;
      });
    }, 120);
    return () => clearInterval(iv);
  }, []);

  /* Mount */
  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  /* ── AI backend hook (exact pattern from original) ── */
  const fetchAIPrediction = useCallback(async () => {
    setApiState('loading');
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/predict?density=1.5&waiting_time=5.0`
      );
      const data: AIResponse = await response.json();

      setMinutesLeft(Math.max(1, Math.round(data.delay)));
      const status = classifyStatus(data.status);
      setAiStatus(status);
      setAiDelay(status === 'clear' ? 0 : Math.round(data.delay * 0.3));
      setApiState('ok');
      setLastUpdated(new Date());
    } catch {
      // backend offline → graceful fallback with simulated data
      setApiState('error');
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => {
    fetchAIPrediction();
    const interval = setInterval(fetchAIPrediction, 10000);
    return () => clearInterval(interval);
  }, [fetchAIPrediction]);

  /* derived */
  const hasDelay   = aiDelay > 0;
  const displayMins = Math.ceil(secsLeft / 60);
  const currentStop = routeData.stops[currentIdx];
  const nextStop    = routeData.stops[currentIdx + 1];

  /* live bus marker position (interpolated) */
  const busLat = currentStop && nextStop
    ? currentStop.lat + (nextStop.lat - currentStop.lat) * busProgress
    : currentStop?.lat ?? 31.9560;
  const busLng = currentStop && nextStop
    ? currentStop.lng + (nextStop.lng - currentStop.lng) * busProgress
    : currentStop?.lng ?? 35.8950;

  const mapMarkers = [
    ...routeData.stops.map(s => ({ position: [s.lat, s.lng] as [number, number], label: s.name })),
    { position: [busLat, busLng] as [number, number], label: '🚌 Your bus' },
  ];
  const mapRoute = routeData.stops.map(s => [s.lat, s.lng] as [number, number]);

  /* ETA card gradient — shifts red as delay grows */
  const etaBg = hasDelay
    ? 'linear-gradient(135deg, #1E3A5F 0%, #2C527A 100%)'
    : 'linear-gradient(135deg, #0F2240 0%, #1E3A5F 100%)';

  /* ── shared panel content ─────────────────────────── */
  const renderPanel = (compact = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 12 : 16 }}>

      {/* ── ETA card ──────────────────────────────────── */}
      <div style={{
        background: etaBg,
        borderRadius: compact ? 18 : 20,
        padding: compact ? '1.1rem 1.25rem' : '1.5rem',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(15,34,64,0.25)',
        opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(12px)',
        transition: 'all 0.5s ease',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 160, height: 160, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,200,150,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -30, left: -20,
          width: 120, height: 120, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,200,150,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Label + live dot */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: compact ? 12 : 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Navigation size={compact ? 14 : 16} color="rgba(255,255,255,0.7)" />
            <span style={{ fontSize: compact ? '0.78rem' : '0.85rem', fontWeight: 600,
              color: 'rgba(255,255,255,0.75)', letterSpacing: '0.02em' }}>
              Your bus arrives in
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(0,200,150,0.2)', borderRadius: 99, padding: '3px 10px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C896',
              animation: 'st-dot-pulse 1.4s ease-in-out infinite' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#00C896', letterSpacing: '0.05em' }}>LIVE</span>
          </div>
        </div>

        {/* Big time */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 12,
          marginBottom: compact ? 8 : 12,
        }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: compact ? '3.5rem' : '4.5rem', fontWeight: 800,
            color: 'white', lineHeight: 1, letterSpacing: '-0.04em',
          }}>
            {String(displayMins).padStart(2, '0')}
            <span style={{ fontSize: compact ? '1.5rem' : '2rem', fontWeight: 500,
              opacity: 0.6, marginLeft: 4 }}>min</span>
          </div>

          {/* Seconds ticker */}
          <div style={{ paddingBottom: compact ? 6 : 8, opacity: 0.55 }}>
            <div style={{ fontSize: '0.7rem', color: 'white', fontWeight: 500 }}>
              {String(secsLeft % 60).padStart(2, '0')} sec
            </div>
          </div>
        </div>

        {/* Next stop */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Bus size={13} color="rgba(255,255,255,0.6)" />
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
              Next stop
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>
              {nextStop?.name ?? currentStop?.name}
            </span>
          </div>
          {hasDelay && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#FF9F43',
              background: 'rgba(255,159,67,0.18)', padding: '2px 8px', borderRadius: 99 }}>
              +{aiDelay} min
            </span>
          )}
        </div>
      </div>

      {/* ── AI banner ────────────────────────────────── */}
      <div style={{
        opacity: mounted ? 1 : 0, transition: 'opacity 0.5s 0.15s ease',
      }}>
        <AIBanner
          status={aiStatus}
          delay={aiDelay}
          apiState={apiState}
          lastUpdated={lastUpdated}
          onRefresh={fetchAIPrediction}
        />
      </div>

      {/* ── Stop timeline ─────────────────────────────── */}
      <div style={{
        background: 'white', borderRadius: 16,
        border: '1px solid #EEF3F8',
        boxShadow: '0 2px 12px rgba(15,34,64,0.06)',
        overflow: 'hidden',
        opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(8px)',
        transition: 'all 0.5s 0.2s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '0.875rem 1.25rem',
          borderBottom: '1px solid #EEF3F8',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F2240' }}>
            Route Progress
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, color: '#00A87C', fontWeight: 600 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C896',
              animation: 'st-dot-pulse 1.4s ease-in-out infinite' }} />
            {routeData.stops.filter(s => s.status === 'completed').length} of {routeData.stops.length} stops
          </div>
        </div>

        <StopTimeline stops={routeData.stops} currentIdx={currentIdx} />
      </div>

      {/* ── Next bus card ─────────────────────────────── */}
      <div style={{
        background: 'white', borderRadius: 14,
        border: '1px solid #EEF3F8',
        borderLeft: '3.5px solid #00C896',
        padding: '0.875rem 1rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        opacity: mounted ? 1 : 0, transition: 'opacity 0.5s 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#E0FBF4',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bus size={16} color="#00A87C" />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F2240' }}>
              Next {routeName}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#7A92A8', marginTop: 1 }}>
              Following bus · space available
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#00A87C' }}>
            4 min
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
            background: '#E0FBF4', color: '#00A87C' }}>
            Available
          </span>
        </div>
      </div>
    </div>
  );

  /* ── render ───────────────────────────────────────── */
  return (
    <div style={{ minHeight: 'calc(100vh - 4rem)', background: '#F4F8FB' }}>

      {/* Keyframes */}
      <style>{`
        @keyframes st-dot-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:.5; transform:scale(.85); }
        }
        @keyframes st-ring-pulse {
          0%,100% { opacity:.6; transform:scale(1); }
          50%      { opacity:0; transform:scale(1.4); }
        }
        @keyframes st-spin {
          from { transform:rotate(0deg); }
          to   { transform:rotate(360deg); }
        }
        @keyframes st-fade-up {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>

      {/* ── DESKTOP ─────────────────────────────────── */}
      <div className="hidden lg:flex" style={{ height: 'calc(100vh - 4rem)' }}>

        {/* Left sidebar */}
        <div style={{
          width: 420, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          background: 'white', borderRight: '1px solid #EEF3F8',
          boxShadow: '4px 0 24px rgba(15,34,64,0.06)',
          overflowY: 'auto',
        }}>
          {/* Header */}
          <div style={{ padding: '1.5rem 1.5rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <button onClick={() => navigate(-1)}
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  border: '1.5px solid #EEF3F8', background: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0, transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#00C896'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#EEF3F8'}
              >
                <ArrowLeft size={15} color="#4A6580" />
              </button>

              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem',
                  fontWeight: 800, color: '#0F2240', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                  Live Tracking
                </div>
                <div style={{ fontSize: '0.78rem', color: '#7A92A8', marginTop: 2, fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontWeight: 600, color: '#4A6580' }}>{routeName}</span>
                  <span>·</span>
                  <span>{from}</span>
                  <ChevronRight size={11} color="#7A92A8" />
                  <span>{to}</span>
                </div>
              </div>

              {/* Live indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5,
                background: '#E0FBF4', borderRadius: 20, padding: '4px 10px', flexShrink: 0 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00C896',
                  animation: 'st-dot-pulse 1.4s ease-in-out infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#00A87C' }}>Live</span>
              </div>
            </div>
          </div>

          {/* Panel content */}
          <div style={{ padding: '0 1.5rem 2rem' }}>
            {renderPanel(false)}
          </div>
        </div>

        {/* Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapPreview
            height="100%"
            markers={mapMarkers}
            route={mapRoute}
            zoom={13}
          />

          {/* Floating ETA badge on map */}
          <div style={{
            position: 'absolute', top: 16, right: 16, zIndex: 20,
            background: '#0F2240', color: 'white', borderRadius: 14,
            padding: '0.6rem 1rem',
            boxShadow: '0 4px 20px rgba(15,34,64,0.3)',
            display: 'flex', alignItems: 'center', gap: 8,
            opacity: mounted ? 1 : 0, transition: 'opacity 0.5s 0.5s ease',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00C896',
              animation: 'st-dot-pulse 1.4s ease-in-out infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              {routeName} · {displayMins} min away
            </span>
          </div>

          {/* Bus icon overlay */}
          <div style={{
            position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            zIndex: 20, background: 'white', borderRadius: 14,
            padding: '0.6rem 1.25rem',
            boxShadow: '0 4px 20px rgba(15,34,64,0.14)',
            display: 'flex', alignItems: 'center', gap: 10,
            opacity: mounted ? 1 : 0, transition: 'opacity 0.5s 0.7s ease',
            whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: 18 }}>🚌</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0F2240' }}>{routeName} · On route</div>
              <div style={{ fontSize: 10, color: '#7A92A8', fontWeight: 500 }}>
                Heading to {nextStop?.name ?? currentStop?.name}
              </div>
            </div>
            <div style={{ width: 1, height: 28, background: '#EEF3F8' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#00A87C', letterSpacing: '-0.02em' }}>
                {displayMins}m
              </div>
              <div style={{ fontSize: 9, color: '#7A92A8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ETA
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE ──────────────────────────────────── */}
      <div className="lg:hidden">
        {/* Map hero */}
        <div style={{ position: 'relative', height: 260, flexShrink: 0 }}>
          <MapPreview height="100%" markers={mapMarkers} route={mapRoute} zoom={13} />

          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, transparent 50%, rgba(244,248,251,0.95))',
            pointerEvents: 'none', zIndex: 5,
          }} />

          {/* Back button */}
          <button onClick={() => navigate(-1)}
            style={{
              position: 'absolute', top: 12, left: 12, zIndex: 20,
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 2px 12px rgba(15,34,64,0.15)',
            }}>
            <ArrowLeft size={15} color="#0F2240" />
          </button>

          {/* Live badge */}
          <div style={{
            position: 'absolute', top: 12, right: 12, zIndex: 20,
            background: 'rgba(15,34,64,0.85)', backdropFilter: 'blur(8px)',
            borderRadius: 99, padding: '4px 12px',
            display: 'flex', alignItems: 'center', gap: 5,
            boxShadow: '0 2px 12px rgba(15,34,64,0.2)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C896',
              animation: 'st-dot-pulse 1.4s ease-in-out infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>Live · {routeName}</span>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ padding: '0 1rem 6rem', marginTop: -20, position: 'relative', zIndex: 10 }}>
          {/* Route label */}
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800,
              color: '#0F2240', letterSpacing: '-0.025em' }}>{t.tracking.title}</span>
            <span style={{ fontSize: '0.78rem', color: '#7A92A8', fontWeight: 500 }}>
              · {from} → {to}
            </span>
          </div>
          {renderPanel(true)}
        </div>
      </div>
    </div>
  );
}
