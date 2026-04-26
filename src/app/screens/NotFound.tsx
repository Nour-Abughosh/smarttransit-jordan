import { Link } from 'react-router';

export function NotFound() {
  return (
    <div style={{ minHeight: 'calc(100vh - 4rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '5rem', fontWeight: 800, color: '#00C896', margin: 0 }}>404</h1>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F2240', margin: '0.5rem 0' }}>Page Not Found</h2>
        <p style={{ color: '#7A92A8', marginBottom: '1.5rem' }}>The route you're looking for doesn't exist.</p>
        <Link to="/" style={{ background: '#00C896', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '10px', textDecoration: 'none', fontWeight: 600 }}>
          Return Home
        </Link>
      </div>
    </div>
  );
}
