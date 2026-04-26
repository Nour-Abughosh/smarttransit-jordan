import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { MapPreview } from '../components/MapPreview';
import {
  Search, MapPin, ArrowRight, Zap, Clock, Users,
  TrendingUp, ChevronRight, Star, Wind, Navigation,
  AlertCircle, RefreshCw, Sparkles, ArrowUpRight
} from 'lucide-react';
import { useLang } from '../../lib/i18n';

/* ── Amman route data ─────────────────────────────────────── */
const POPULAR_ROUTES = [
  { id: 1, from: 'Sweileh', to: 'University of Jordan', route: 'Route 27', eta: '8 min', duration: '24 min', crowding: 'available' as const, delay: 0,    fare: '0.35 JD' },
  { id: 2, from: 'Tabarbour', to: 'Downtown Amman',     route: 'Route 12', eta: '3 min', duration: '31 min', crowding: 'moderate' as const,  delay: 4,    fare: '0.35 JD' },
  { id: 3, from: 'Abdali',   to: 'Mecca Mall',          route: 'Sarfees',  eta: '2 min', duration: '18 min', crowding: 'full'      as const,  delay: 0,    fare: '0.50 JD' },
  { id: 4, from: 'Gardens',  to: 'Rainbow St',          route: 'Route 35', eta: '11 min',duration: '14 min', crowding: 'available' as const, delay: 0,    fare: '0.35 JD' },
  { id: 5, from: 'Wadi Seer','to': 'Sport City',        route: 'Coaster',  eta: '6 min', duration: '22 min', crowding: 'moderate' as const,  delay: 2,    fare: '0.40 JD' },
];

const AI_SUGGESTIONS = [
  { id: 1, icon: '⚡', label: 'Skip the jam',    text: 'Route 12 via 3rd Circle saves 9 min vs direct now',   color: '#00C896' },
  { id: 2, icon: '🚌', label: 'Next departure',  text: 'Route 27 leaves Sweileh in 3 min — walk fast!',        color: '#FF6B35' },
  { id: 3, icon: '👥', label: 'Less crowded',    text: 'Sarfees on University St is 40% lighter right now',    color: '#3B9EFF' },
];

const AMMAN_LOCATIONS = [
  'Sweileh', 'Tabarbour', 'Abdali', 'Downtown', 'Mecca Mall',
  'University of Jordan', 'Gardens', 'Sport City', 'Wadi Seer',
  'Rainbow Street', 'Shmeisani', 'Jabal Amman', 'Ras Al Ain',
  'Zarqa Bridge', 'Airport', 'Sahab', 'Marj Al Hamam',
];

const LIVE_STATS = [
  { label: 'Buses active',  value: '312',   unit: '',    icon: '🚌', trend: '+4%'  },
  { label: 'Avg wait',      value: '6.2',   unit: 'min', icon: '⏱',  trend: '-12%' },
  { label: 'On-time rate',  value: '87',    unit: '%',   icon: '✅',  trend: '+3%'  },
  { label: 'Passengers',    value: '14.2k', unit: '',    icon: '👥',  trend: '+8%'  },
];

type Crowding = 'available' | 'moderate' | 'full';

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
  const fill = { available: '35%', moderate: '65%', full: '95%' }[level];
  const color = { available: '#00C896', moderate: '#FF9F43', full: '#FF5252' }[level];
  return (
    <div style={{ height: 4, background: '#EEF3F8', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ width: fill, height: '100%', background: color, borderRadius: 2, transition: 'width 1s ease' }} />
    </div>
  );
}

/* ── Autocomplete input ───────────────────────────────────── */
function LocationInput({ value, onChange, placeholder, icon: Icon, color }: {
  value: string; onChange: (v: string) => void;
  placeholder: string; icon: any; color: string;
}) {
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length > 0) {
      setSuggestions(AMMAN_LOCATIONS.filter(l => l.toLowerCase().includes(value.toLowerCase())).slice(0, 5));
    } else {
      setSuggestions([]);
    }
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setFocused(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: focused ? 'white' : '#F4F8FB',
        border: `1.5px solid ${focused ? color : '#DDE6EE'}`,
        borderRadius: 12, padding: '0.7rem 1rem',
        boxShadow: focused ? `0 0 0 3px ${color}22` : 'none',
        transition: 'all 0.2s',
      }}>
        <Icon size={16} color={color} style={{ flexShrink: 0 }} />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: 'var(--font-body)', fontSize: '0.92rem', color: 'var(--st-navy)' }}
        />
        {value && (
          <button onClick={() => onChange('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A92A8', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
        )}
      </div>

      {focused && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100,
          background: 'white', borderRadius: 12, boxShadow: '0 12px 40px rgba(15,34,64,0.15)',
          border: '1px solid #EEF3F8', overflow: 'hidden',
        }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => { onChange(s); setFocused(false); }}
              style={{
                width: '100%', padding: '0.65rem 1rem', border: 'none', background: 'none',
                textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--st-navy)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F4F8FB'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <MapPin size={13} color="#7A92A8" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────── */
export function Home() {
  const { t, isRTL, lang } = useLang();

  const navigate = useNavigate();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [aiIdx, setAiIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [activeRoute, setActiveRoute] = useState<number | null>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setMounted(true), 80);
    const t2 = setTimeout(() => setStatsVisible(true), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Rotate AI suggestions
  useEffect(() => {
    const iv = setInterval(() => setAiIdx(i => (i + 1) % AI_SUGGESTIONS.length), 4000);
    return () => clearInterval(iv);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (from && to) navigate('/results', { state: { from, to } });
  };

  const handleSwap = () => {
    setSwapping(true);
    setTimeout(() => { setFrom(to); setTo(from); setSwapping(false); }, 300);
  };

  const handleQuickRoute = (r: typeof POPULAR_ROUTES[0]) => {
    navigate('/results', { state: { from: r.from, to: r.to } });
  };

  const suggestion = AI_SUGGESTIONS[aiIdx];

  return (
    <div style={{ minHeight: 'calc(100vh - 4rem)', background: '#F4F8FB', position: 'relative', overflow: 'hidden' }}>

      {/* ── Desktop layout ── */}
      <div className="hidden lg:flex" style={{ height: 'calc(100vh - 4rem)' }}>

        {/* Left panel — planner */}
        <div style={{
          width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: 'white', borderRight: '1px solid #EEF3F8',
          boxShadow: '4px 0 24px rgba(15,34,64,0.06)',
          overflowY: 'auto', position: 'relative', zIndex: 10,
        }}>

          {/* Header */}
          <div style={{
            padding: '1.75rem 1.75rem 0',
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.5s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C896',
                animation: 'pulse-teal 2s infinite' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#00A87C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Live · Amman
              </span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 800,
              color: '#0F2240', letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 0.25rem' }}>
              Where to today?
            </h1>
            <p style={{ color: '#7A92A8', fontSize: '0.875rem', margin: 0 }}>
              AI-powered routes across Amman
            </p>
          </div>

          {/* AI Suggestion strip */}
          <div style={{ padding: '1rem 1.75rem 0', opacity: mounted ? 1 : 0, transition: 'opacity 0.5s 0.15s ease' }}>
            <div style={{
              background: `linear-gradient(135deg, ${suggestion.color}12, ${suggestion.color}06)`,
              border: `1px solid ${suggestion.color}30`,
              borderRadius: 14, padding: '0.875rem 1rem',
              display: 'flex', alignItems: 'flex-start', gap: 10,
              transition: 'all 0.4s ease',
            }}>
              <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{suggestion.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Sparkles size={11} color={suggestion.color} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: suggestion.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    AI · {suggestion.label}
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#0F2240', margin: 0, lineHeight: 1.45 }}>
                  {suggestion.text}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {AI_SUGGESTIONS.map((_, i) => (
                  <div key={i} style={{
                    width: i === aiIdx ? 14 : 5, height: 5, borderRadius: 3,
                    background: i === aiIdx ? suggestion.color : '#DDE6EE',
                    transition: 'all 0.3s ease',
                  }} />
                ))}
              </div>
            </div>
          </div>

          {/* Search form */}
          <div style={{
            padding: '1rem 1.75rem',
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)',
            transition: 'all 0.5s 0.1s ease',
          }}>
            <form onSubmit={handleSearch}>
              <div style={{ position: 'relative' }}>
                <LocationInput value={from} onChange={setFrom} placeholder="From — pick up point" icon={MapPin} color="#00C896" />

                {/* Swap button */}
                <button type="button" onClick={handleSwap}
                  style={{
                    position: 'absolute', right: -14, top: '50%', transform: `translateY(-50%) rotate(${swapping ? 180 : 0}deg)`,
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'white', border: '2px solid #DDE6EE',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 10, transition: 'transform 0.3s ease, border-color 0.2s',
                    boxShadow: '0 2px 8px rgba(15,34,64,0.1)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#00C896'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#DDE6EE'}
                >
                  <RefreshCw size={12} color="#4A6580" />
                </button>

                <div style={{ height: 10, borderLeft: '2px dashed #DDE6EE', marginLeft: '1.9rem', marginTop: 2, marginBottom: 2 }} />

                <LocationInput value={to} onChange={setTo} placeholder="To — destination" icon={Navigation} color="#FF6B35" />
              </div>

              <button type="submit" disabled={!from || !to}
                style={{
                  marginTop: '0.875rem', width: '100%', padding: '0.875rem',
                  background: from && to ? '#00C896' : '#DDE6EE',
                  color: from && to ? 'white' : '#7A92A8',
                  border: 'none', borderRadius: 12,
                  fontFamily: 'var(--font-display)', fontSize: '0.97rem', fontWeight: 700,
                  cursor: from && to ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: from && to ? '0 8px 28px rgba(0,200,150,0.3)' : 'none',
                  transition: 'all 0.25s ease', letterSpacing: '-0.01em',
                }}
                onMouseEnter={e => { if (from && to) { e.currentTarget.style.background = '#00A87C'; e.currentTarget.style.transform = 'translateY(-1px)'; }}}
                onMouseLeave={e => { if (from && to) { e.currentTarget.style.background = '#00C896'; e.currentTarget.style.transform = 'translateY(0)'; }}}
              >
                <Search size={16} />
                Find Routes
                <ArrowRight size={16} />
              </button>
            </form>
          </div>

          {/* Live stats row */}
          <div style={{ padding: '0 1.75rem', opacity: statsVisible ? 1 : 0, transform: statsVisible ? 'translateY(0)' : 'translateY(8px)', transition: 'all 0.5s ease' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {LIVE_STATS.map((s, i) => (
                <div key={s.label} style={{
                  background: '#F4F8FB', borderRadius: 12, padding: '0.75rem',
                  border: '1px solid #EEF3F8',
                  opacity: statsVisible ? 1 : 0, transition: `opacity 0.4s ${0.1 * i}s ease`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 16 }}>{s.icon}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                      background: s.trend.startsWith('+') ? '#E0FBF4' : '#FFF4E6',
                      color: s.trend.startsWith('+') ? '#00A87C' : '#C87800',
                    }}>{s.trend}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: '#0F2240', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {s.value}<span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#7A92A8', marginLeft: 2 }}>{s.unit}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#7A92A8', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Popular routes */}
          <div style={{ padding: '1.25rem 1.75rem 2rem', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F2240', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Popular routes
              </span>
              <span style={{ fontSize: '0.78rem', color: '#00C896', fontWeight: 600, cursor: 'pointer' }}>See all</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {POPULAR_ROUTES.map((r, i) => (
                <button key={r.id} onClick={() => handleQuickRoute(r)}
                  onMouseEnter={() => setActiveRoute(r.id)}
                  onMouseLeave={() => setActiveRoute(null)}
                  style={{
                    width: '100%', background: activeRoute === r.id ? '#F4F8FB' : 'white',
                    border: `1.5px solid ${activeRoute === r.id ? '#00C896' : '#EEF3F8'}`,
                    borderRadius: 12, padding: '0.875rem', cursor: 'pointer',
                    textAlign: 'left', transition: 'all 0.2s ease',
                    opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(6px)',
                    ...(mounted ? { transitionDelay: `${0.05 * i + 0.3}s` } : {}),
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                        background: r.route.startsWith('Sarf') ? '#FFF0EA' : r.route.startsWith('Coast') ? '#E6F1FB' : '#E0FBF4',
                        color: r.route.startsWith('Sarf') ? '#E5521C' : r.route.startsWith('Coast') ? '#185FA5' : '#00A87C',
                      }}>{r.route}</span>
                      {r.delay > 0 && (
                        <span style={{ fontSize: 10, color: '#C87800', fontWeight: 600 }}>+{r.delay}m</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#7A92A8' }}>
                      <Clock size={11} />
                      <span style={{ fontSize: 11, fontWeight: 500 }}>{r.duration}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00C896', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.83rem', color: '#0F2240', fontWeight: 500, flex: 1, textAlign: 'left' }}>{r.from}</span>
                    <div style={{ flex: 1, height: 1, background: 'repeating-linear-gradient(90deg, #DDE6EE 0, #DDE6EE 4px, transparent 4px, transparent 8px)' }} />
                    <div style={{ width: 7, height: 7, borderRadius: 2, background: '#FF6B35', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.83rem', color: '#0F2240', fontWeight: 500, flex: 1, textAlign: 'right' }}>{r.to}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — full map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapPreview height="100%" zoom={13} />

          {/* Floating map overlays */}

          {/* Top-right: live network badge */}
          <div style={{
            position: 'absolute', top: 16, right: 16, zIndex: 20,
            background: 'white', borderRadius: 12, padding: '0.6rem 1rem',
            boxShadow: '0 4px 20px rgba(15,34,64,0.15)',
            display: 'flex', alignItems: 'center', gap: 8,
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(-8px)',
            transition: 'all 0.5s 0.4s ease',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C896', animation: 'pulse-teal 2s infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0F2240' }}>312 buses live</span>
          </div>

          {/* Bottom: route legend */}
          <div style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            zIndex: 20, background: 'white', borderRadius: 14,
            padding: '0.75rem 1.25rem', boxShadow: '0 8px 32px rgba(15,34,64,0.14)',
            display: 'flex', alignItems: 'center', gap: 20,
            opacity: mounted ? 1 : 0, transition: 'opacity 0.5s 0.6s ease',
            whiteSpace: 'nowrap',
          }}>
            {[
              { color: '#00C896', label: 'Coaster routes' },
              { color: '#FF6B35', label: 'Sarfees' },
              { color: '#3B9EFF', label: 'Express' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 20, height: 3, borderRadius: 2, background: item.color }} />
                <span style={{ fontSize: 11, fontWeight: 500, color: '#4A6580' }}>{item.label}</span>
              </div>
            ))}
            <div style={{ width: 1, height: 16, background: '#EEF3F8' }} />
            <span style={{ fontSize: 11, color: '#7A92A8' }}>Tap route to track</span>
          </div>
        </div>
      </div>

      {/* ── Mobile layout ── */}
      <div className="lg:hidden" style={{ minHeight: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column' }}>

        {/* Hero map */}
        <div style={{ height: 260, position: 'relative', flexShrink: 0 }}>
          <MapPreview height="100%" zoom={12} />

          {/* Overlay gradient */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(244,248,251,0.95))', pointerEvents: 'none', zIndex: 5 }} />

          {/* Live pill */}
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 20,
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderRadius: 20,
            padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 12px rgba(15,34,64,0.12)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C896', animation: 'pulse-teal 2s infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#0F2240' }}>312 live</span>
          </div>
        </div>

        {/* Content slides up over map */}
        <div style={{ flex: 1, padding: '0 1rem 6rem', marginTop: -24, position: 'relative', zIndex: 10 }}>

          {/* Search card */}
          <div style={{
            background: 'white', borderRadius: 20, padding: '1.25rem',
            boxShadow: '0 8px 40px rgba(15,34,64,0.12)', marginBottom: '1rem',
            border: '1px solid #EEF3F8',
          }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800, color: '#0F2240', margin: '0 0 0.875rem', letterSpacing: '-0.025em' }}>
              Where to?
            </h2>
            <form onSubmit={handleSearch}>
              <div style={{ marginBottom: 8 }}>
                <LocationInput value={from} onChange={setFrom} placeholder="From" icon={MapPin} color="#00C896" />
              </div>
              <LocationInput value={to} onChange={setTo} placeholder="To" icon={Navigation} color="#FF6B35" />
              <button type="submit" disabled={!from || !to}
                style={{
                  marginTop: '0.875rem', width: '100%', padding: '0.8rem',
                  background: from && to ? '#00C896' : '#DDE6EE', color: from && to ? 'white' : '#7A92A8',
                  border: 'none', borderRadius: 12, fontFamily: 'var(--font-display)',
                  fontSize: '0.95rem', fontWeight: 700, cursor: from && to ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: from && to ? '0 6px 20px rgba(0,200,150,0.28)' : 'none', transition: 'all 0.2s',
                }}>
                <Search size={15} /> Find Routes <ArrowRight size={15} />
              </button>
            </form>
          </div>

          {/* AI suggestion strip — mobile */}
          <div style={{
            background: `linear-gradient(135deg, ${suggestion.color}14, ${suggestion.color}07)`,
            border: `1px solid ${suggestion.color}28`, borderRadius: 14, padding: '0.875rem',
            marginBottom: '1rem', display: 'flex', gap: 10, alignItems: 'flex-start', transition: 'all 0.4s',
          }}>
            <span style={{ fontSize: 18 }}>{suggestion.icon}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                <Sparkles size={10} color={suggestion.color} />
                <span style={{ fontSize: 10, fontWeight: 700, color: suggestion.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  AI · {suggestion.label}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#0F2240', margin: 0, lineHeight: 1.4 }}>{suggestion.text}</p>
            </div>
          </div>

          {/* Stats row — mobile */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: '1.25rem' }}>
            {LIVE_STATS.map(s => (
              <div key={s.label} style={{ background: 'white', borderRadius: 12, padding: '0.6rem 0.5rem', textAlign: 'center', border: '1px solid #EEF3F8' }}>
                <div style={{ fontSize: 14, marginBottom: 2 }}>{s.icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, color: '#0F2240', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 9, color: '#7A92A8', marginTop: 1, lineHeight: 1.2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Popular routes — mobile */}
          <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F2240', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.home.quickRoutes}</span>
            <span style={{ fontSize: '0.75rem', color: '#00C896', fontWeight: 600 }}>See all</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {POPULAR_ROUTES.slice(0, 4).map(r => (
              <button key={r.id} onClick={() => handleQuickRoute(r)}
                style={{
                  width: '100%', background: 'white', border: '1.5px solid #EEF3F8',
                  borderRadius: 14, padding: '0.875rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                }}
                onTouchStart={e => e.currentTarget.style.background = '#F4F8FB'}
                onTouchEnd={e => e.currentTarget.style.background = 'white'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                    background: '#E0FBF4', color: '#00A87C' }}>{r.route}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#00A87C' }}>in {r.eta}</span>
                    <ArrowUpRight size={12} color="#7A92A8" />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F2240' }}>{r.from}</span>
                  <div style={{ flex: 1, height: 1, background: 'repeating-linear-gradient(90deg, #DDE6EE 0, #DDE6EE 4px, transparent 4px, transparent 8px)' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F2240' }}>{r.to}</span>
                </div>
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CrowdingPill level={r.crowding} />
                  <span style={{ fontSize: 11, color: '#7A92A8' }}>{r.duration} · {r.fare}</span>
                </div>
                <CrowdingBar level={r.crowding} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
