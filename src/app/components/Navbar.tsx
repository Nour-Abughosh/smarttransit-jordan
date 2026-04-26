import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../lib/auth';
import { useLang, LangToggle } from '../../lib/i18n';
import { Menu, X, LogOut } from 'lucide-react';

export function Navbar() {
  const { user, logout }   = useAuth();
  const { t, isRTL }       = useLang();
  const location            = useNavigate ? useLocation() : { pathname: '/' };
  const navigate            = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => { setMenuOpen(false); setUserOpen(false); }, [location.pathname]);

  const isActive = (p: string) => location.pathname === p || location.pathname.startsWith(p + '/');

  const navLinks = user ? [
    { path:'/home',      label: t.nav.home      },
    { path:'/my-routes', label: t.nav.myRoutes  },
    { path:'/alerts',    label: t.nav.alerts     },
    { path:'/tracking',  label: t.nav.tracking   },
  ] : [];

  if (!user && location.pathname === '/login') return null;

  return (
    <>
      <style>{`
        @media (min-width: 768px) { .nav-desktop-links { display: flex !important; } .nav-hamburger { display: none !important; } }
        @media (max-width: 767px) { .nav-desktop-links { display: none !important; } .nav-hamburger { display: flex !important; } }
        @keyframes menu-drop { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <nav style={{
        position:'sticky', top:0, zIndex:100,
        background:'white',
        borderBottom:`1px solid ${scrolled?'#DDE6EE':'#EEF3F8'}`,
        boxShadow: scrolled?'0 2px 16px rgba(15,34,64,0.08)':'none',
        transition:'all 0.25s',
        direction: isRTL ? 'rtl' : 'ltr',
      }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 1rem', height:58, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>

          {/* Logo */}
          <Link to={user?'/home':'/login'} style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <div style={{ width:34, height:34, borderRadius:'50%', background:'#E0FBF4', border:'2px solid #B3F0E0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🚌</div>
            <div style={{ lineHeight:1.15 }}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:'.95rem', fontWeight:900, color:'#0F2240', letterSpacing:'-.02em' }}>
                Smart<span style={{ color:'#00C896' }}>Transit</span>
              </div>
              <div style={{ fontSize:'.55rem', color:'#7A92A8', fontWeight:600, letterSpacing:'.04em', textTransform:'uppercase' }}>Jordan</div>
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="nav-desktop-links" style={{ alignItems:'center', gap:4 }}>
            {navLinks.map(({ path, label }) => (
              <Link key={path} to={path} style={{
                padding:'6px 12px', borderRadius:99, textDecoration:'none',
                fontSize:'.82rem', fontWeight:600,
                color: isActive(path)?'#00A87C':'#4A6580',
                background: isActive(path)?'#E0FBF4':'transparent',
                transition:'all .15s', whiteSpace:'nowrap',
              }}>{label}</Link>
            ))}
          </div>

          {/* Right: lang + user + hamburger */}
          <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>

            {/* Language toggle */}
            <LangToggle style={{ padding:'5px 10px', fontSize:'.78rem' }} />

            {/* Desktop user menu */}
            {user && (
              <div className="nav-desktop-links" style={{ position:'relative', alignItems:'center' }}>
                <button onClick={() => setUserOpen(!userOpen)}
                  style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 12px', borderRadius:99, border:'1.5px solid #EEF3F8', background:'white', cursor:'pointer', fontFamily:'inherit' }}>
                  <div style={{ width:26, height:26, borderRadius:'50%', background:'#0F2240', color:'#00C896', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800 }}>
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize:'.8rem', fontWeight:600, color:'#0F2240' }}>{user.name}</span>
                </button>
                {userOpen && (
                  <div style={{ position:'absolute', top:'calc(100% + 8px)', [isRTL?'left':'right']:0, background:'white', borderRadius:14, border:'1px solid #EEF3F8', boxShadow:'0 8px 32px rgba(15,34,64,.12)', minWidth:170, overflow:'hidden', zIndex:200, animation:'menu-drop .2s ease' }}>
                    <div style={{ padding:'.75rem 1rem', borderBottom:'1px solid #EEF3F8' }}>
                      <div style={{ fontSize:'.82rem', fontWeight:700, color:'#0F2240' }}>{user.name}</div>
                      <div style={{ fontSize:'.7rem', color:'#7A92A8' }}>{user.role}</div>
                    </div>
                    {user.role === 'operator' && (
                      <Link to="/operator" onClick={()=>setUserOpen(false)} style={{ display:'flex', alignItems:'center', gap:8, padding:'.7rem 1rem', textDecoration:'none', fontSize:'.83rem', color:'#4A6580' }}>⚙ {t.nav.operator}</Link>
                    )}
                    <button onClick={()=>{logout();navigate('/login');setUserOpen(false);}}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'.7rem 1rem', background:'none', border:'none', cursor:'pointer', fontSize:'.83rem', color:'#FF5252', fontFamily:'inherit', textAlign:isRTL?'right':'left' }}>
                      <LogOut size={14}/> {t.nav.signOut}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile hamburger */}
            <button className="nav-hamburger"
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ width:34, height:34, borderRadius:9, border:'1.5px solid #EEF3F8', background:'white', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#4A6580' }}>
              {menuOpen ? <X size={17}/> : <Menu size={17}/>}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div style={{ borderTop:'1px solid #EEF3F8', background:'white', padding:'.75rem 1rem', animation:'menu-drop .2s ease', direction: isRTL?'rtl':'ltr' }}>
            {navLinks.map(({ path, label }) => (
              <Link key={path} to={path} style={{
                display:'block', padding:'11px 14px', borderRadius:10,
                textDecoration:'none', fontSize:'.92rem', fontWeight:600,
                color: isActive(path)?'#00A87C':'#4A6580',
                background: isActive(path)?'#E0FBF4':'transparent',
                marginBottom:4,
              }}>{label}</Link>
            ))}
            {user?.role === 'operator' && (
              <Link to="/operator" style={{ display:'block', padding:'11px 14px', borderRadius:10, textDecoration:'none', fontSize:'.92rem', fontWeight:600, color:'#4A6580', marginBottom:4 }}>
                ⚙ {t.nav.operator}
              </Link>
            )}
            <div style={{ borderTop:'1px solid #EEF3F8', marginTop:6, paddingTop:10, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:'.82rem', color:'#7A92A8', fontWeight:500 }}>{user?.name}</div>
              <button onClick={()=>{logout();navigate('/login');setMenuOpen(false);}}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:99, background:'#FFECEC', border:'none', color:'#FF5252', fontSize:'.82rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                <LogOut size={13}/> {t.nav.signOut}
              </button>
            </div>
          </div>
        )}
      </nav>

      {userOpen && <div style={{ position:'fixed', inset:0, zIndex:99 }} onClick={()=>setUserOpen(false)}/>}
    </>
  );
}
