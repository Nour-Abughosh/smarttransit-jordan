import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle, Info, XCircle, CheckCircle2, Sparkles,
  Clock, MapPin, ChevronRight, Bell, BellOff, TrendingUp,
  RefreshCw, Filter, Bus, Zap, ArrowRight, X,
} from 'lucide-react';
import { useLang } from '../../lib/i18n';

/* ─── types ──────────────────────────────────────────── */
type TimeFilter  = 'now' | 'next-hour' | 'today';
type AlertType   = 'critical' | 'warning' | 'info';
type SchedStatus = 'on-time' | 'delayed' | 'cancelled';
type Crowding    = 'available' | 'moderate' | 'full';
type RouteType   = 'coaster' | 'sarfees' | 'express';

interface Alert {
  id:        number;
  type:      AlertType;
  route?:    string;
  title:     string;
  message:   string;
  time:      string;
  dismissed: boolean;
  affectedRoutes?: string[];
}

interface ScheduleRow {
  id:        number;
  departure: string;
  route:     string;
  routeType: RouteType;
  via:       string;
  arrival:   string;
  duration:  string;
  status:    SchedStatus;
  crowding:  Crowding;
  delay?:    number;
  platform?: string;
  fare:      string;
}

/* ─── config maps ────────────────────────────────────── */
const ALERT_CFG: Record<AlertType, {
  bg: string; border: string; titleColor: string; textColor: string;
  iconColor: string; labelBg: string; labelColor: string; label: string;
  icon: React.ReactNode;
}> = {
  critical: {
    bg: '#FFECEC', border: '#FFB0B0', titleColor: '#7A0000', textColor: '#CC2200',
    iconColor: '#CC0000', labelBg: '#FFD0D0', labelColor: '#CC0000', label: 'Critical',
    icon: <XCircle size={18} />,
  },
  warning: {
    bg: '#FFF4E6', border: '#FFD8A0', titleColor: '#5C3800', textColor: '#C87800',
    iconColor: '#FF9F43', labelBg: '#FFE8B0', labelColor: '#C87800', label: 'Warning',
    icon: <AlertTriangle size={18} />,
  },
  info: {
    bg: '#EEF5FF', border: '#B0CCFF', titleColor: '#002255', textColor: '#185FA5',
    iconColor: '#3B9EFF', labelBg: '#D0E4FF', labelColor: '#185FA5', label: 'Info',
    icon: <Info size={18} />,
  },
};

const CROWD_CFG: Record<Crowding, { bg: string; color: string; dot: string; label: string; barW: string; barColor: string }> = {
  available: { bg: '#E0FBF4', color: '#00A87C', dot: '#00C896', label: 'Available', barW: '30%',  barColor: '#00C896' },
  moderate:  { bg: '#FFF4E6', color: '#C87800', dot: '#FF9F43', label: 'Moderate',  barW: '65%',  barColor: '#FF9F43' },
  full:      { bg: '#FFECEC', color: '#CC0000', dot: '#FF5252', label: 'Full',       barW: '97%',  barColor: '#FF5252' },
};

const STATUS_CFG: Record<SchedStatus, { bg: string; color: string; label: string; icon: React.ReactNode }> = {
  'on-time':  { bg: '#E0FBF4', color: '#00A87C', label: 'On time',   icon: <CheckCircle2 size={11} strokeWidth={3} /> },
  'delayed':  { bg: '#FFF4E6', color: '#C87800', label: 'Delayed',   icon: <TrendingUp size={11} />    },
  'cancelled':{ bg: '#FFECEC', color: '#CC0000', label: 'Cancelled', icon: <XCircle size={11} />       },
};

const ROUTE_TYPE_CFG: Record<RouteType, { bg: string; color: string; label: string }> = {
  coaster: { bg: '#E0FBF4', color: '#00A87C', label: 'Coaster'  },
  sarfees: { bg: '#FFF0EA', color: '#E5521C', label: 'Sarfees'  },
  express: { bg: '#E6F1FB', color: '#185FA5', label: 'Express'  },
};

/* ─── data ───────────────────────────────────────────── */
const ALL_ALERTS: Alert[] = [
  {
    id: 1, type: 'critical', route: 'Route 15',
    title: 'Route 15 — Temporary Reroute',
    message: 'Route 15 is temporarily rerouted via Mecca Street due to emergency road maintenance near 4th Circle. All stops between Abdali and Gardens are affected. Expect an additional 8–12 minutes.',
    time: '5 min ago', dismissed: false,
    affectedRoutes: ['Route 15'],
  },
  {
    id: 2, type: 'warning', route: 'Route 27',
    title: 'Heavy Traffic — Sports City Area',
    message: 'AI has detected significant congestion on the Sports City corridor. Route 27 and Route 35 are both impacted with delays of 7–10 minutes. Consider Route 12 Express as an alternative.',
    time: '12 min ago', dismissed: false,
    affectedRoutes: ['Route 27', 'Route 35'],
  },
  {
    id: 3, type: 'info', route: undefined,
    title: 'Peak Hour: Increased Frequency',
    message: 'Evening rush hour begins at 4:00 PM. Routes 12, 27, and 35 will run at increased frequency (every 8 min). Additional sarfees deployed on University Street corridor.',
    time: '1 hr ago', dismissed: false,
    affectedRoutes: ['Route 12', 'Route 27', 'Route 35'],
  },
  {
    id: 4, type: 'warning', route: 'Sarfees',
    title: 'Sarfees — Reduced Availability',
    message: 'Sarfees availability on Sweileh–Airport route is reduced due to a driver shortage until 6:00 PM. Expected wait times are 15–20 minutes instead of the usual 8 minutes.',
    time: '45 min ago', dismissed: false,
    affectedRoutes: ['Sarfees'],
  },
];

const ALL_SCHEDULES: ScheduleRow[] = [
  { id:1,  departure:'2:05 PM', route:'Sarfees Direct', routeType:'sarfees', via:'Direct',              arrival:'2:25 PM', duration:'20 min', status:'on-time',  crowding:'moderate', fare:'0.60 JD', platform:'A' },
  { id:2,  departure:'2:15 PM', route:'Route 27',       routeType:'coaster', via:'Sports City',         arrival:'2:42 PM', duration:'27 min', status:'on-time',  crowding:'available',fare:'0.35 JD', platform:'B' },
  { id:3,  departure:'2:18 PM', route:'Route 35',       routeType:'coaster', via:'Shmeisani',           arrival:'2:53 PM', duration:'35 min', status:'delayed',  crowding:'moderate', fare:'0.35 JD', delay:5, platform:'C' },
  { id:4,  departure:'2:25 PM', route:'Route 12 Exp',   routeType:'express', via:'Wadi Saqra',          arrival:'2:47 PM', duration:'22 min', status:'on-time',  crowding:'full',     fare:'0.50 JD', platform:'A' },
  { id:5,  departure:'2:35 PM', route:'Route 27',       routeType:'coaster', via:'Sports City',         arrival:'3:02 PM', duration:'27 min', status:'on-time',  crowding:'available',fare:'0.35 JD', platform:'B' },
  { id:6,  departure:'2:40 PM', route:'Route 15',       routeType:'coaster', via:'Mecca St (Rerouted)', arrival:'3:10 PM', duration:'30 min', status:'delayed',  crowding:'moderate', fare:'0.35 JD', delay:10, platform:'D' },
  { id:7,  departure:'3:00 PM', route:'Sarfees Exp',    routeType:'sarfees', via:'Airport Rd',          arrival:'3:22 PM', duration:'22 min', status:'cancelled',crowding:'available',fare:'0.60 JD', platform:'A' },
  { id:8,  departure:'3:15 PM', route:'Route 35',       routeType:'coaster', via:'Shmeisani',           arrival:'3:50 PM', duration:'35 min', status:'on-time',  crowding:'available',fare:'0.35 JD', platform:'C' },
  { id:9,  departure:'3:25 PM', route:'Route 12 Exp',   routeType:'express', via:'Wadi Saqra',          arrival:'3:47 PM', duration:'22 min', status:'on-time',  crowding:'moderate', fare:'0.50 JD', platform:'A' },
  { id:10, departure:'4:00 PM', route:'Route 27',       routeType:'coaster', via:'Sports City',         arrival:'4:27 PM', duration:'27 min', status:'on-time',  crowding:'available',fare:'0.35 JD', platform:'B' },
];

const SCHEDULE_LIMITS: Record<TimeFilter, number> = { 'now': 4, 'next-hour': 7, 'today': 10 };

/* ─── AI summary text (keyed by alert count) ─────────── */
function buildAISummary(alerts: Alert[]) {
  const critical = alerts.filter(a => !a.dismissed && a.type === 'critical').length;
  const warnings = alerts.filter(a => !a.dismissed && a.type === 'warning').length;
  const delayed  = ALL_SCHEDULES.filter(s => s.status === 'delayed').length;
  const cancelled= ALL_SCHEDULES.filter(s => s.status === 'cancelled').length;

  if (critical > 0) {
    return `${critical} critical disruption${critical > 1 ? 's' : ''} active right now — Route 15 rerouted, affecting 8–12 min of travel time. ${warnings} warning${warnings !== 1 ? 's' : ''} also active. ${delayed} departure${delayed !== 1 ? 's' : ''} delayed, ${cancelled} cancelled. Consider Route 12 Express as the fastest alternative.`;
  }
  if (warnings > 0) {
    return `${warnings} traffic warning${warnings !== 1 ? 's' : ''} detected on the Sports City corridor. ${delayed} departure${delayed !== 1 ? 's' : ''} delayed by 5–10 min. All other routes operating normally. Peak hour frequency increase starts at 4:00 PM.`;
  }
  return `All routes operating normally. No significant disruptions. ${ALL_SCHEDULES.filter(s => s.status === 'on-time').length} departures on schedule today.`;
}

/* ─── crowding bar ───────────────────────────────────── */
function CrowdBar({ level, animate }: { level: Crowding; animate?: boolean }) {
  const [w, setW] = useState('0%');
  const c = CROWD_CFG[level];
  useEffect(() => {
    if (!animate) { setW(c.barW); return; }
    const t = setTimeout(() => setW(c.barW), 80);
    return () => clearTimeout(t);
  }, [level, animate]);
  return (
    <div style={{ height: 4, background: '#EEF3F8', borderRadius: 2, overflow: 'hidden', marginTop: 5 }}>
      <div style={{ width: w, height: '100%', background: c.barColor, borderRadius: 2,
        transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)' }} />
    </div>
  );
}

/* ─── alert card ─────────────────────────────────────── */
function AlertCard({ alert, onDismiss }: { alert: Alert; onDismiss: (id: number) => void }) {
  const { t } = useLang();
  const [expanded, setExpanded] = useState(false);
  const [exiting, setExiting] = useState(false);
  const cfg = { ...ALERT_CFG[alert.type], label: alert.type === 'critical' ? t.alerts.critical : alert.type === 'warning' ? t.alerts.warning : t.alerts.info };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExiting(true);
    setTimeout(() => onDismiss(alert.id), 280);
  };

  return (
    <div
      onClick={() => setExpanded(v => !v)}
      style={{
        background: cfg.bg,
        border: `1.5px solid ${cfg.border}`,
        borderRadius: 14,
        padding: '0.9rem 1rem',
        cursor: 'pointer',
        transition: 'all 0.28s cubic-bezier(0.4,0,0.2,1)',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateX(20px) scale(0.97)' : 'translateX(0) scale(1)',
        borderLeft: `4px solid ${cfg.iconColor}`,
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Icon */}
        <div style={{ color: cfg.iconColor, flexShrink: 0, marginTop: 1 }}>
          {cfg.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* Severity badge */}
              <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99,
                background: cfg.labelBg, color: cfg.labelColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {cfg.label}
              </span>
              {/* Route tag */}
              {alert.route && (
                <span style={{ fontSize: 11, fontWeight: 600, color: cfg.titleColor,
                  background: 'rgba(255,255,255,0.55)', padding: '1px 7px', borderRadius: 99 }}>
                  {alert.route}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: cfg.textColor, fontWeight: 500, opacity: 0.75, whiteSpace: 'nowrap' }}>
                {alert.time}
              </span>
              <button onClick={handleDismiss}
                style={{ background: 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer',
                  width: 22, height: 22, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: cfg.iconColor, transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.9)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.5)'}
              >
                <X size={11} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Title */}
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: cfg.titleColor, marginTop: 5, lineHeight: 1.3 }}>
            {alert.title}
          </div>

          {/* Message — collapsed/expanded */}
          <div style={{
            fontSize: '0.78rem', color: cfg.textColor, marginTop: 5, lineHeight: 1.55,
            maxHeight: expanded ? 200 : 38, overflow: 'hidden',
            transition: 'max-height 0.3s ease',
          }}>
            {alert.message}
          </div>

          {/* Expand toggle + affected routes */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 }}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {alert.affectedRoutes?.map(r => (
                <span key={r} style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 99,
                  background: 'rgba(255,255,255,0.55)', color: cfg.titleColor }}>
                  {r}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3,
              fontSize: 10, fontWeight: 600, color: cfg.textColor, opacity: 0.7 }}>
              {expanded ? 'Less' : 'More'}
              <ChevronRight size={11} style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── schedule row (desktop table) ───────────────────── */
function ScheduleTableRow({ row, index }: { row: ScheduleRow; index: number }) {
  const status = STATUS_CFG[row.status];
  const crowd  = CROWD_CFG[row.crowding];
  const rtype  = ROUTE_TYPE_CFG[row.routeType];
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: row.status === 'cancelled'
          ? '#FFFAFA'
          : hovered ? '#F8FCFB' : 'white',
        transition: 'background 0.15s',
        opacity: row.status === 'cancelled' ? 0.7 : 1,
        animation: `st-row-in 0.35s ${index * 0.04}s ease both`,
      }}
    >
      {/* Departure */}
      <td style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #EEF3F8', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#F4F8FB',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={13} color="#7A92A8" />
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F2240' }}>{row.departure}</div>
            {row.delay && (
              <div style={{ fontSize: 10, color: '#C87800', fontWeight: 600 }}>+{row.delay} min</div>
            )}
          </div>
        </div>
      </td>

      {/* Route */}
      <td style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #EEF3F8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
            background: rtype.bg, color: rtype.color, whiteSpace: 'nowrap' }}>
            {rtype.label}
          </span>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F2240' }}>{row.route}</div>
            <div style={{ fontSize: 10, color: '#7A92A8', fontWeight: 500 }}>via {row.via}</div>
          </div>
        </div>
      </td>

      {/* Arrival */}
      <td style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #EEF3F8', whiteSpace: 'nowrap' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F2240' }}>{row.arrival}</div>
        <div style={{ fontSize: 10, color: '#7A92A8', fontWeight: 500 }}>{row.duration}</div>
      </td>

      {/* Status */}
      <td style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #EEF3F8' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99,
          background: status.bg, color: status.color }}>
          {status.icon}
          {status.label}{row.delay ? ` +${row.delay}m` : ''}
        </span>
      </td>

      {/* Crowding */}
      <td style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #EEF3F8' }}>
        <div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600, color: crowd.color }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: crowd.dot, display: 'inline-block' }} />
            {crowd.label}
          </span>
          <CrowdBar level={row.crowding} animate />
        </div>
      </td>

      {/* Fare + platform */}
      <td style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #EEF3F8' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F2240' }}>{row.fare}</div>
        {row.platform && (
          <div style={{ fontSize: 10, color: '#7A92A8', fontWeight: 500 }}>Platform {row.platform}</div>
        )}
      </td>
    </tr>
  );
}

/* ─── schedule card (mobile) ─────────────────────────── */
function ScheduleCard({ row, index }: { row: ScheduleRow; index: number }) {
  const status = STATUS_CFG[row.status];
  const crowd  = CROWD_CFG[row.crowding];
  const rtype  = ROUTE_TYPE_CFG[row.routeType];

  return (
    <div style={{
      background: 'white', borderRadius: 14,
      border: `1.5px solid ${row.status === 'cancelled' ? '#FFD0D0' : '#EEF3F8'}`,
      padding: '0.875rem',
      boxShadow: '0 1px 6px rgba(15,34,64,0.05)',
      opacity: row.status === 'cancelled' ? 0.75 : 1,
      animation: `st-row-in 0.35s ${index * 0.05}s ease both`,
    }}>
      {/* Top */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 9 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
            background: rtype.bg, color: rtype.color }}>
            {rtype.label}
          </span>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F2240' }}>{row.route}</span>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
          background: status.bg, color: status.color }}>
          {status.icon}
          {status.label}{row.delay ? ` +${row.delay}m` : ''}
        </span>
      </div>

      {/* Via */}
      <div style={{ fontSize: 11, color: '#7A92A8', fontWeight: 500, marginBottom: 8 }}>via {row.via}</div>

      {/* Times */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9,
        padding: '8px 10px', background: '#F4F8FB', borderRadius: 10 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F2240', letterSpacing: '-0.02em' }}>{row.departure}</div>
          <div style={{ fontSize: 10, color: '#7A92A8', fontWeight: 500 }}>Departs</div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <div style={{ flex: 1, height: 1, background: 'repeating-linear-gradient(90deg,#DDE6EE 0,#DDE6EE 4px,transparent 4px,transparent 8px)' }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: '#7A92A8', whiteSpace: 'nowrap' }}>{row.duration}</span>
          <div style={{ flex: 1, height: 1, background: 'repeating-linear-gradient(90deg,#DDE6EE 0,#DDE6EE 4px,transparent 4px,transparent 8px)' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F2240', letterSpacing: '-0.02em' }}>{row.arrival}</div>
          <div style={{ fontSize: 10, color: '#7A92A8', fontWeight: 500 }}>Arrives</div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600, color: crowd.color }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: crowd.dot, display: 'inline-block' }} />
            {crowd.label}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#0F2240',
            background: '#F4F8FB', padding: '2px 8px', borderRadius: 99,
            border: '1px solid #EEF3F8' }}>
            {row.fare}
          </span>
        </div>
        {row.platform && (
          <span style={{ fontSize: 10, fontWeight: 600, color: '#7A92A8' }}>Platform {row.platform}</span>
        )}
      </div>
      <CrowdBar level={row.crowding} animate />
    </div>
  );
}

/* ─── main ───────────────────────────────────────────── */
export function AlertsSchedule() {
  const { t, isRTL, lang } = useLang();

  const navigate = useNavigate();

  const [timeFilter,  setTimeFilter]  = useState<TimeFilter>('now');
  const [alerts,      setAlerts]      = useState<Alert[]>(ALL_ALERTS);
  const [mounted,     setMounted]     = useState(false);
  const [filterType,  setFilterType]  = useState<AlertType | 'all'>('all');
  const [refreshing,  setRefreshing]  = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  const dismissAlert = (id: number) =>
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a));

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  /* filtered data */
  const visibleAlerts = alerts.filter(a =>
    !a.dismissed && (filterType === 'all' || a.type === filterType)
  );
  const schedules = ALL_SCHEDULES.slice(0, SCHEDULE_LIMITS[timeFilter]);

  const aiSummary = buildAISummary(alerts);
  const criticalCount = alerts.filter(a => !a.dismissed && a.type === 'critical').length;
  const warningCount  = alerts.filter(a => !a.dismissed && a.type === 'warning').length;

  /* ── page ─────────────────────────────────────────── */
  return (
    <div style={{ minHeight: 'calc(100vh - 4rem)', background: '#F4F8FB' }}>

      <style>{`
        @keyframes st-row-in {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes st-fade-in {
          from { opacity:0; }
          to   { opacity:1; }
        }
        @keyframes st-spin {
          from { transform:rotate(0); }
          to   { transform:rotate(360deg); }
        }
        @keyframes st-pulse {
          0%,100% { box-shadow:0 0 0 0 rgba(204,0,0,.4); }
          50%      { box-shadow:0 0 0 6px rgba(204,0,0,0); }
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.75rem 1.25rem 5rem' }}>

        {/* ── Page header ─────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 16, marginBottom: '1.5rem', flexWrap: 'wrap',
          opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(10px)',
          transition: 'all 0.45s ease',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6,
                background: criticalCount > 0 ? '#FFD0D0' : '#E0FBF4',
                borderRadius: 99, padding: '3px 10px' }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: criticalCount > 0 ? '#CC0000' : '#00C896',
                  animation: criticalCount > 0 ? 'st-pulse 2s infinite' : 'none',
                }} />
                <span style={{ fontSize: 10, fontWeight: 700,
                  color: criticalCount > 0 ? '#CC0000' : '#00A87C',
                  textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {criticalCount > 0 ? `${criticalCount} Critical` : 'Live'}
                </span>
              </div>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem,3vw,2rem)',
              fontWeight: 800, color: '#0F2240', letterSpacing: '-0.03em', margin: 0 }}>
              Alerts & Schedule
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#7A92A8', marginTop: 4 }}>
              Real-time transit updates · AI-enhanced
            </p>
          </div>

          <button onClick={handleRefresh}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 12,
              border: '1.5px solid #EEF3F8', background: 'white',
              color: '#4A6580', fontSize: '0.82rem', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.18s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#00C896'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#EEF3F8'}
          >
            <RefreshCw size={13} style={refreshing ? { animation: 'st-spin 0.8s linear infinite' } : {}} />
            Refresh
          </button>
        </div>

        {/* ── AI Disruption Summary Banner ─────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #0F2240 0%, #1E3A5F 100%)',
          borderRadius: 18, padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 8px 32px rgba(15,34,64,0.2)',
          position: 'relative', overflow: 'hidden',
          opacity: mounted ? 1 : 0, transition: 'opacity 0.5s 0.15s ease',
        }}>
          {/* glow */}
          <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160,
            borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,200,150,.12) 0%,transparent 70%)',
            pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -20, left: 60, width: 100, height: 100,
            borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,200,150,.07) 0%,transparent 70%)',
            pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative' }}>
            {/* AI icon */}
            <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: 'rgba(0,200,150,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1.5px solid rgba(0,200,150,0.3)' }}>
              <Sparkles size={20} color="#00C896" />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#00C896',
                  textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  AI · Disruption Summary
                </span>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'inline-block' }} />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                  Updated just now
                </span>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, margin: 0 }}>
                {aiSummary}
              </p>
            </div>

            {/* Summary pills */}
            <div className="hidden md:flex" style={{ flexDirection: 'column', gap: 5, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Disruptions</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800,
                  color: criticalCount > 0 ? '#FF5252' : '#00C896', letterSpacing: '-0.03em' }}>
                  {criticalCount + warningCount}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{t.alerts.onTime}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800,
                  color: '#00C896', letterSpacing: '-0.03em' }}>
                  {ALL_SCHEDULES.filter(s => s.status === 'on-time').length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Two-column layout on desktop ─────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: '1.5rem' }}
          className="lg:grid-cols-[380px_1fr]"
        >

          {/* ── LEFT: Alerts ─────────────────────────── */}
          <div>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 800, color: '#0F2240' }}>
                  Active Alerts
                </span>
                {visibleAlerts.length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 99,
                    background: criticalCount > 0 ? '#FFD0D0' : '#EEF3F8',
                    color: criticalCount > 0 ? '#CC0000' : '#4A6580' }}>
                    {visibleAlerts.length}
                  </span>
                )}
              </div>

              {/* Filter pills */}
              <div style={{ display: 'flex', gap: 4 }}>
                {(['all', 'critical', 'warning', 'info'] as const).map(t => (
                  <button key={t} onClick={() => setFilterType(t)}
                    style={{
                      padding: '4px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600,
                      border: `1.5px solid ${filterType === t ? '#00C896' : '#EEF3F8'}`,
                      background: filterType === t ? '#E0FBF4' : 'white',
                      color: filterType === t ? '#00A87C' : '#4A6580',
                      cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize',
                    }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Alert cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {visibleAlerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem',
                  background: 'white', borderRadius: 14, border: '1.5px solid #EEF3F8' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                  <div style={{ fontWeight: 700, color: '#0F2240', marginBottom: 4 }}>All clear</div>
                  <div style={{ fontSize: '0.8rem', color: '#7A92A8' }}>No active alerts matching this filter</div>
                </div>
              ) : (
                visibleAlerts.map((alert, i) => (
                  <div key={alert.id} style={{ animation: `st-row-in 0.35s ${i * 0.06}s ease both` }}>
                    <AlertCard alert={alert} onDismiss={dismissAlert} />
                  </div>
                ))
              )}
            </div>

            {/* Dismissed count */}
            {alerts.filter(a => a.dismissed).length > 0 && (
              <button
                onClick={() => setAlerts(ALL_ALERTS)}
                style={{ marginTop: 10, width: '100%', padding: '8px', borderRadius: 10,
                  border: '1.5px dashed #DDE6EE', background: 'transparent',
                  fontSize: '0.78rem', color: '#7A92A8', fontWeight: 500, cursor: 'pointer',
                  transition: 'all 0.15s', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 5 }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#00C896'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#DDE6EE'}
              >
                <Bell size={12} />
                Restore {alerts.filter(a => a.dismissed).length} dismissed alert{alerts.filter(a => a.dismissed).length > 1 ? 's' : ''}
              </button>
            )}
          </div>

          {/* ── RIGHT: Schedule ───────────────────────── */}
          <div>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '0.875rem', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 800, color: '#0F2240' }}>
                Departure Schedule
              </span>

              {/* Time filter tabs */}
              <div style={{ display: 'flex', background: '#EEF3F8', borderRadius: 10, padding: 3, gap: 2 }}>
                {([
                  { v: 'now',       label: t.alerts.now       },
                  { v: 'next-hour', label: t.alerts.nextHour },
                  { v: 'today',     label: t.alerts.today     },
                ] as { v: TimeFilter; label: string }[]).map(opt => (
                  <button key={opt.v} onClick={() => setTimeFilter(opt.v)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem',
                      fontWeight: timeFilter === opt.v ? 700 : 500,
                      background: timeFilter === opt.v ? 'white' : 'transparent',
                      color: timeFilter === opt.v ? '#0F2240' : '#7A92A8',
                      border: 'none', cursor: 'pointer', transition: 'all 0.18s',
                      boxShadow: timeFilter === opt.v ? '0 1px 6px rgba(15,34,64,0.08)' : 'none',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block" style={{
              background: 'white', borderRadius: 16,
              border: '1px solid #EEF3F8',
              boxShadow: '0 2px 12px rgba(15,34,64,0.06)',
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Departs', 'Route', 'Arrives', 'Status', 'Crowding', 'Fare'].map(h => (
                      <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left',
                        fontSize: 11, fontWeight: 700, color: '#7A92A8',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        borderBottom: '1px solid #EEF3F8' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((row, i) => (
                    <ScheduleTableRow key={row.id} row={row} index={i} />
                  ))}
                </tbody>
              </table>

              {/* Table footer */}
              <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #EEF3F8',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: '#7A92A8', fontWeight: 500 }}>
                  Showing {schedules.length} of {ALL_SCHEDULES.length} departures
                </span>
                <button
                  onClick={() => setTimeFilter('today')}
                  style={{ display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: '0.75rem', fontWeight: 600, color: '#00A87C',
                    background: 'none', border: 'none', cursor: 'pointer' }}>
                  View all today <ArrowRight size={12} />
                </button>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {schedules.map((row, i) => (
                <ScheduleCard key={row.id} row={row} index={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
