import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../../lib/auth';

/* ── icons (inline SVG so no extra deps) ──────────────── */
function IconHome({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? '#00C896' : '#7A92A8'} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}
function IconSearch({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? '#00C896' : '#7A92A8'} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function IconTrack({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? '#00C896' : '#7A92A8'} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="2.5" fill={active ? '#00C896' : 'none'}/>
    </svg>
  );
}
function IconBell({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? '#00C896' : '#7A92A8'} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}
function IconRoutes({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? '#00C896' : '#7A92A8'} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-10"/>
    </svg>
  );
}

const NAV_ITEMS = [
  { icon: IconHome,   label: 'Home',     path: '/home' },
  { icon: IconSearch, label: 'Search',   path: '/results' },
  { icon: IconTrack,  label: 'Track',    path: '/tracking' },
  { icon: IconBell,   label: 'Alerts',   path: '/alerts' },
  { icon: IconRoutes, label: 'My Routes',path: '/my-routes' },
];

export function MobileBottomNav() {
  const location = useLocation();
  const { user }  = useAuth();
  const [prevPath, setPrevPath] = useState(location.pathname);
  const [ripple, setRipple]   = useState<string | null>(null);

  // hide for operators or unauthenticated
  if (!user || user.role === 'operator') return null;

  const isActive = (path: string) =>
    path === '/home'
      ? location.pathname === '/home'
      : location.pathname.startsWith(path);

  const handleTap = (path: string) => {
    setRipple(path);
    setTimeout(() => setRipple(null), 400);
  };

  const activeIndex = NAV_ITEMS.findIndex(item => isActive(item.path));

  return (
    <>
      <style>{`
        @keyframes st-tab-ripple {
          from { transform: scale(0.5); opacity: 0.5; }
          to   { transform: scale(2.2); opacity: 0; }
        }
        @keyframes st-label-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes st-icon-bounce {
          0%   { transform: translateY(0); }
          40%  { transform: translateY(-5px); }
          70%  { transform: translateY(-2px); }
          100% { transform: translateY(0); }
        }
        @keyframes st-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(0,200,150,.45); }
          50%      { box-shadow: 0 0 0 5px rgba(0,200,150,0); }
        }
      `}</style>

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 1000,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid #EEF3F8',
        boxShadow: '0 -4px 24px rgba(15,34,64,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {/* Active pill indicator */}
        {activeIndex >= 0 && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: `calc(${activeIndex * 20}% + 10%)`,
            transform: 'translateX(-50%)',
            width: 40,
            height: 3,
            background: '#00C896',
            borderRadius: '0 0 3px 3px',
            transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: '0 2px 8px rgba(0,200,150,0.4)',
          }} />
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${NAV_ITEMS.length}, 1fr)`,
          height: 64,
        }}>
          {NAV_ITEMS.map((item) => {
            const active  = isActive(item.path);
            const Icon    = item.icon;
            const isRippling = ripple === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => handleTap(item.path)}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 3, textDecoration: 'none',
                  position: 'relative', overflow: 'hidden',
                  WebkitTapHighlightColor: 'transparent',
                  cursor: 'pointer',
                }}
              >
                {/* Ripple */}
                {isRippling && (
                  <div style={{
                    position: 'absolute',
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(0,200,150,0.15)',
                    animation: 'st-tab-ripple 0.4s ease-out both',
                    pointerEvents: 'none',
                  }} />
                )}

                {/* Active background glow */}
                {active && (
                  <div style={{
                    position: 'absolute', inset: '8px 12px',
                    background: '#E0FBF4', borderRadius: 12,
                    zIndex: 0,
                  }} />
                )}

                {/* Icon */}
                <div style={{
                  position: 'relative', zIndex: 1,
                  animation: active && location.pathname !== prevPath
                    ? 'st-icon-bounce 0.4s ease both'
                    : 'none',
                }}>
                  <Icon active={active} />

                  {/* Alert dot for Alerts tab */}
                  {item.path === '/alerts' && !active && (
                    <span style={{
                      position: 'absolute', top: -2, right: -2,
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#FF5252', border: '2px solid white',
                    }} />
                  )}
                </div>

                {/* Label */}
                <span style={{
                  position: 'relative', zIndex: 1,
                  fontSize: '0.65rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? '#00A87C' : '#7A92A8',
                  letterSpacing: active ? '0.01em' : '0',
                  animation: active ? 'st-label-in 0.2s ease both' : 'none',
                  lineHeight: 1,
                }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
