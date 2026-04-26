import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Star, MapPin, ArrowRight, Clock } from 'lucide-react';
import { getFavorites } from '../../lib/favorites';

const ALL_ROUTES = [
  { id: 1, from: 'Sweileh', to: 'University of Jordan', route: 'Route 27', eta: '8 min', fare: '0.35 JD' },
  { id: 2, from: 'Tabarbour', to: 'Downtown Amman',     route: 'Route 12', eta: '3 min', fare: '0.35 JD' },
  { id: 3, from: 'Abdali',   to: 'Mecca Mall',          route: 'Sarfees',  eta: '2 min', fare: '0.50 JD' },
  { id: 4, from: 'Gardens',  to: 'Rainbow St',          route: 'Route 35', eta: '11 min',fare: '0.35 JD' },
];

export function MyRoutes() {
  const navigate = useNavigate();
  const [favs] = useState(getFavorites());
  const saved = ALL_ROUTES.filter(r => favs.has(String(r.id)));

  return (
    <div style={{ minHeight: 'calc(100vh - 4rem)', background: '#F4F8FB', padding: '1.5rem 1rem' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800,
          color: '#0F2240', letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>My Routes</h1>
        <p style={{ color: '#7A92A8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Your saved favourites</p>

        {saved.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 16, padding: '3rem 1.5rem',
            textAlign: 'center', border: '1.5px dashed #DDE6EE' }}>
            <Star size={36} color="#DDE6EE" style={{ margin: '0 auto 1rem' }} />
            <div style={{ fontWeight: 700, color: '#0F2240', marginBottom: 6 }}>No saved routes yet</div>
            <div style={{ fontSize: '0.82rem', color: '#7A92A8', marginBottom: '1.25rem' }}>
              Star a route on the Route Results page to save it here
            </div>
            <button onClick={() => navigate('/home')}
              style={{ background: '#00C896', color: 'white', border: 'none', borderRadius: 10,
                padding: '0.7rem 1.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
              Find a route
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {saved.map(r => (
              <div key={r.id} onClick={() => navigate('/results', { state: { from: r.from, to: r.to } })}
                style={{ background: 'white', border: '1.5px solid #EEF3F8', borderRadius: 14,
                  padding: '1rem', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#00C896'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#EEF3F8'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, background: '#E0FBF4', color: '#00A87C',
                    padding: '2px 9px', borderRadius: 99 }}>{r.route}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#00A87C' }}>in {r.eta}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C896' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F2240' }}>{r.from}</span>
                  </div>
                  <ArrowRight size={13} color="#7A92A8" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: '#FF6B35' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F2240' }}>{r.to}</span>
                  </div>
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: '#7A92A8' }}>{r.fare}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
