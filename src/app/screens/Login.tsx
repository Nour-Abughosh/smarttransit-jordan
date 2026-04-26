import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth, MOCK_USERS } from '../../lib/auth';
import { useLang } from '../../lib/i18n';

function DataStreet() {
  useEffect(() => {
    const canvas = document.getElementById('st-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf: number, t = 0;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const nodes: { x:number;y:number;vx:number;vy:number;r:number;p:number }[] = [];
    for (let i = 0; i < 55; i++) nodes.push({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
      r: Math.random() * 2 + 1, p: Math.random() * Math.PI * 2,
    });
    const draw = () => {
      t += .012;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#1C1C1C'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      const vg = ctx.createRadialGradient(canvas.width/2,canvas.height/2,0,canvas.width/2,canvas.height/2,canvas.width*.75);
      vg.addColorStop(0,'rgba(40,5,5,0)'); vg.addColorStop(1,'rgba(20,0,0,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let row = 0; row < 22; row++) {
        const y = (canvas.height/22)*row + (canvas.height/44);
        for (let s = 0; s < 28; s++) {
          const x = (canvas.width/28)*s, w = (canvas.width/28)*.68;
          const pulse = ((t*.6+row*.32+s*.11)%1);
          const glow = Math.max(0, 1 - Math.abs(s/28 - pulse)*6.5);
          ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+w,y);
          ctx.strokeStyle = 'rgba(180,20,20,' + (.03+glow*.42) + ')';
          ctx.lineWidth = row%5===0?2.5:row%3===0?1.8:1; ctx.stroke();
        }
      }
      for (let c = 0; c < 26; c++) {
        const x = (canvas.width/26)*c;
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height);
        ctx.strokeStyle='rgba(150,15,15,0.04)'; ctx.lineWidth=1; ctx.stroke();
      }
      nodes.forEach(n => {
        n.x+=n.vx; n.y+=n.vy; n.p+=.025;
        if(n.x<0||n.x>canvas.width) n.vx*=-1;
        if(n.y<0||n.y>canvas.height) n.vy*=-1;
        nodes.forEach(m => {
          const dx=m.x-n.x,dy=m.y-n.y,d=Math.sqrt(dx*dx+dy*dy);
          if(d<110&&d>0){ ctx.beginPath(); ctx.moveTo(n.x,n.y); ctx.lineTo(m.x,m.y); ctx.strokeStyle='rgba(180,20,20,'+((1-d/110)*.22)+')'; ctx.lineWidth=.8; ctx.stroke(); }
        });
        const pa=.35+Math.sin(n.p)*.25;
        ctx.beginPath(); ctx.arc(n.x,n.y,Math.max(.1,n.r+Math.sin(n.p)),0,Math.PI*2); ctx.fillStyle='rgba(180,20,20,'+pa+')'; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x,n.y,Math.max(.1,n.r*3.2),0,Math.PI*2); ctx.strokeStyle='rgba(180,20,20,'+(pa*.1)+')'; ctx.lineWidth=1; ctx.stroke();
      });
      for(let b=0;b<3;b++){
        const x=((t*.22+b*.33)%1)*canvas.width*1.6-canvas.width*.3;
        const g=ctx.createLinearGradient(x-200,0,x+200,canvas.height);
        g.addColorStop(0,'rgba(180,20,20,0)'); g.addColorStop(.5,'rgba(180,20,20,0.04)'); g.addColorStop(1,'rgba(180,20,20,0)');
        ctx.beginPath(); ctx.moveTo(x-200,0); ctx.lineTo(x+200,canvas.height); ctx.strokeStyle=g; ctx.lineWidth=90; ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return null;
}

const BusSVG = ({ wheelAnim }: { wheelAnim: string }) => (
  <svg width="540" height="220" viewBox="0 0 520 220" style={{ filter: 'drop-shadow(0 8px 40px rgba(180,20,20,0.65)) drop-shadow(0 0 20px rgba(180,20,20,0.3))' }}>
    <ellipse cx="260" cy="208" rx="228" ry="11" fill="rgba(0,0,0,0.5)"/>
    <rect x="30" y="60" width="440" height="130" rx="18" fill="#F0F0F0"/>
    <rect x="30" y="60" width="440" height="32" rx="18" fill="#FAFAFA"/>
    <rect x="30" y="145" width="440" height="45" rx="4" fill="#E0E0E0"/>
    <rect x="30" y="128" width="440" height="22" fill="#CC1515"/>
    <rect x="30" y="128" width="440" height="4" fill="rgba(255,100,100,0.35)"/>
    <rect x="440" y="60" width="50" height="130" rx="18" fill="#E8E8E8"/>
    <rect x="448" y="72" width="34" height="48" rx="6" fill="#1a3a5c" opacity="0.85"/>
    <rect x="450" y="74" width="8" height="16" rx="2" fill="rgba(255,255,255,0.28)"/>
    <rect x="440" y="125" width="50" height="22" fill="#CC1515"/>
    <rect x="454" y="154" width="28" height="13" rx="4" fill="#FFEE88"/>
    <rect x="442" y="170" width="46" height="12" rx="4" fill="#999"/>
    <rect x="30" y="60" width="28" height="130" rx="18" fill="#E0E0E0"/>
    <rect x="34" y="74" width="20" height="42" rx="4" fill="#1a3a5c" opacity="0.75"/>
    <rect x="32" y="154" width="22" height="12" rx="3" fill="#CC1515"/>
    {[70,132,194,256,318,380].map((x,i) => (
      <g key={i}>
        <rect x={x} y="72" width={i===5?46:52} height="42" rx="6" fill="#1a3a5c" opacity="0.8"/>
        <rect x={x+2} y="74" width="11" height="14" rx="2" fill="rgba(255,255,255,0.2)"/>
      </g>
    ))}
    <rect x="168" y="118" width="38" height="50" rx="3" fill="#D8D8D8" stroke="#BBBBBB" strokeWidth="1.5"/>
    <rect x="186" y="130" width="4" height="22" rx="2" fill="#AAAAAA"/>
    <rect x="30" y="171" width="440" height="20" rx="4" fill="#C8C8C8"/>
    <text x="255" y="148" fontFamily="DM Sans,sans-serif" fontSize="14" fontWeight="800" fill="white" letterSpacing="0.5" textAnchor="middle">SmartTransit</text>
    {[{cx:400},{cx:110}].map((w,i) => (
      <g key={i}>
        <circle cx={w.cx} cy="195" r="27" fill="#222"/>
        <circle cx={w.cx} cy="195" r="20" fill="#333"/>
        <circle cx={w.cx} cy="195" r="12" fill="#555"/>
        <circle cx={w.cx} cy="195" r="6" fill="#666"/>
        <path d={'M'+w.cx+' 173 L'+w.cx+' 217'} stroke="#777" strokeWidth="2" style={{transformOrigin: w.cx+'px 195px', animation: wheelAnim}}/>
        <path d={'M'+(w.cx-20)+' 195 L'+(w.cx+20)+' 195'} stroke="#777" strokeWidth="2" style={{transformOrigin: w.cx+'px 195px', animation: wheelAnim}}/>
      </g>
    ))}
    <path d="M372 172 Q400 168 428 172" stroke="#CCC" strokeWidth="2.5" fill="none"/>
    <path d="M82 172 Q110 168 138 172" stroke="#CCC" strokeWidth="2.5" fill="none"/>
  </svg>
);

export function Login() {
  const { t, isRTL, lang } = useLang();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [error, setError]         = useState('');
  const [phase, setPhase]         = useState<'driving'|'parked'|'revealed'>('driving');
  const [activeTab, setActiveTab] = useState<'passenger'|'operator'>('passenger');
  const { login } = useAuth();
  const navigate  = useNavigate();

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('parked'),  1700);
    const t2 = setTimeout(() => setPhase('revealed'), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const fillDemo = (role: 'passenger'|'operator') => {
    setActiveTab(role);
    setUsername(role === 'passenger' ? 'amman_commuter' : 'fleet_admin_01');
    setPassword(role === 'passenger' ? 'TransitPass2026!' : 'SecureOperatorAdmin#99');
    setError('');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    const user = MOCK_USERS[username];
    if (!user) { setError(t.login.invalidCreds); return; }
    if (username === 'amman_commuter' && password !== 'TransitPass2026!') { setError(t.login.wrongPass); return; }
    if (username === 'fleet_admin_01' && password !== 'SecureOperatorAdmin#99') { setError(t.login.wrongPass); return; }
    login(username);
    navigate(user.role === 'operator' ? '/operator' : '/home');
  };

  const wheelAnim = phase === 'driving' ? 'spin .22s linear infinite' : 'spin 2.5s linear infinite';

  return (
    <div style={{ minHeight:'100vh', width:'100vw', background:'#1C1C1C', position:'relative', overflow:'hidden', display:'flex', flexDirection:'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes bus-idle{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes exhaust-puff{0%{transform:translate(0,0) scale(1);opacity:.5}100%{transform:translate(45px,-18px) scale(3.5);opacity:0}}
        @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(1.5)}}
        @keyframes road-dash{from{background-position:0 0}to{background-position:-100px 0}}
      `}</style>

      <canvas id="st-canvas" style={{ position:'fixed', inset:0, width:'100%', height:'100%', zIndex:0, pointerEvents:'none' }} />
      <DataStreet />

      {/* Road */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:85, background:'linear-gradient(to top,#111,rgba(20,20,20,0.75))', borderTop:'2px solid rgba(180,20,20,0.5)', zIndex:2, overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'45%', left:0, right:0, height:3, transform:'translateY(-50%)', animation:'road-dash .4s linear infinite',
          background:'repeating-linear-gradient(90deg,rgba(180,20,20,0.6) 0,rgba(180,20,20,0.6) 35px,transparent 35px,transparent 75px)' }} />
      </div>

      {/* Bus scene */}
      <div style={{ position:'relative', flex:1, minHeight:'58vh', zIndex:3 }}>

        {/* Speed lines */}
        {phase === 'driving' && (
          <div style={{ position:'absolute', bottom:90, right:'34%', display:'flex', flexDirection:'column', gap:13, pointerEvents:'none' }}>
            {[{w:200,d:'0s'},{w:280,d:'.07s'},{w:160,d:'.14s'},{w:240,d:'.21s'},{w:190,d:'.28s'}].map((l,i) => (
              <div key={i} style={{ height: i%2===0?3:2, width:l.w, background:'linear-gradient(90deg,transparent,rgba(180,20,20,0.7))', borderRadius:2, opacity:.85 }} />
            ))}
          </div>
        )}

        {/* Bus */}
        <div style={{
          position:'absolute', bottom:16,
          right: phase==='driving' ? '-600px' : '6%',
          transition: phase!=='driving' ? 'right 1.6s cubic-bezier(0.22,1,0.36,1)' : 'none',
          animation: phase!=='driving' ? 'bus-idle 2.2s ease-in-out infinite' : 'none',
        }}>
          {phase === 'driving' && (
            <div style={{ position:'absolute', right:-12, top:'32%' }}>
              {[{s:13,d:'0s'},{s:20,d:'.18s'},{s:10,d:'.36s'}].map((p,i) => (
                <div key={i} style={{ position:'absolute', right:0, width:p.s, height:p.s, borderRadius:'50%', background:'rgba(180,20,20,0.2)', animation:'exhaust-puff .75s '+p.d+' ease-out infinite' }} />
              ))}
            </div>
          )}
          <BusSVG wheelAnim={wheelAnim} />
        </div>

        {/* Title */}
        <div style={{
          position:'absolute', bottom:110, left:'4%',
          opacity: phase==='revealed'?1:0,
          transform: phase==='revealed'?'translateX(0)':'translateX(-60px)',
          transition:'all .9s cubic-bezier(0.22,1,0.36,1)',
        }}>
          <div style={{ fontSize:'clamp(3rem,7vw,6rem)', fontWeight:900, lineHeight:.95, letterSpacing:'-.04em', fontFamily:"'DM Sans',sans-serif" }}>
            <span style={{ color:'#CC1515', display:'block', textShadow:'0 0 40px rgba(200,20,20,0.6)' }}>Smart</span>
            <span style={{ color:'white', display:'block' }}>Transit</span>
          </div>
          <div style={{ marginTop:10, fontSize:'.88rem', fontWeight:600, color:'rgba(255,255,255,0.38)', letterSpacing:'.22em', textTransform:'uppercase' }}>
            Jordan · النقل الذكي
          </div>
          <div style={{ marginTop:10, fontSize:'.8rem', color:'rgba(180,20,20,0.75)', fontWeight:500, display:'flex', alignItems:'center', gap:8,
            opacity: phase==='revealed'?1:0, transition:'opacity .7s .5s' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#CC1515', animation:'pulse-dot 1.5s infinite' }} />
            AI-powered public transport platform
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{ position:'relative', zIndex:10, display:'flex', justifyContent:'flex-end', padding:'0 2.5rem 2.5rem',
        opacity: phase==='revealed'?1:0, transform: phase==='revealed'?'translateY(0)':'translateY(30px)',
        transition:'all .8s .35s cubic-bezier(0.22,1,0.36,1)' }}>
        <div style={{ width:360, background:'rgba(12,8,8,0.9)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
          border:'1px solid rgba(180,20,20,0.35)', borderRadius:18, padding:'1.4rem',
          boxShadow:'0 32px 80px rgba(0,0,0,0.8),inset 0 1px 0 rgba(255,255,255,0.04)' }}>

          <div style={{ display:'flex', background:'rgba(255,255,255,0.04)', borderRadius:11, padding:3, gap:3, marginBottom:'1.1rem' }}>
            {(['passenger','operator'] as const).map(role => (
              <button key={role} onClick={() => fillDemo(role)} style={{
                flex:1, padding:'.5rem', borderRadius:9, border:'none', cursor:'pointer',
                fontFamily:'inherit', fontSize:'.82rem',
                background: activeTab===role ? '#CC1515' : 'transparent',
                color: activeTab===role ? 'white' : 'rgba(255,255,255,0.4)',
                fontWeight: activeTab===role ? 700 : 500, transition:'all .2s',
              }}>
                {role==='passenger' ? t.login.passenger : t.login.operator}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:11 }}>
            {error && <div style={{ background:'rgba(180,20,20,0.15)', border:'1px solid rgba(180,20,20,0.4)', borderRadius:9, padding:'.6rem .875rem', color:'#FF8888', fontSize:'.8rem', fontWeight:500 }}>⚠ {error}</div>}

            {(['username','password'] as const).map(f => (
              <div key={f}>
                <label style={{ fontSize:'.73rem', fontWeight:600, color:'rgba(255,255,255,0.45)', display:'block', marginBottom:5 }}>
                  {f.charAt(0).toUpperCase()+f.slice(1)}
                </label>
                <div style={{ position:'relative' }}>
                  <input
                    value={f==='username'?username:password}
                    onChange={e => f==='username'?setUsername(e.target.value):setPassword(e.target.value)}
                    type={f==='password'&&!showPass?'password':'text'}
                    placeholder={'Enter '+f} required
                    style={{ width:'100%', padding:'.68rem 1rem', paddingRight:f==='password'?'2.75rem':'1rem',
                      background:'rgba(255,255,255,0.06)', border:'1px solid rgba(180,20,20,0.3)',
                      borderRadius:10, color:'white', fontFamily:'inherit', fontSize:'.88rem', outline:'none', transition:'all .2s' }}
                    onFocus={e => { e.currentTarget.style.borderColor='#CC1515'; e.currentTarget.style.boxShadow='0 0 0 3px rgba(180,20,20,0.15)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor='rgba(180,20,20,0.3)'; e.currentTarget.style.boxShadow='none'; }}
                  />
                  {f==='password' && (
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.3)', fontSize:15 }}>
                      {showPass?'🙈':'👁'}
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button type="submit"
              style={{ marginTop:3, width:'100%', padding:'.82rem', background:'#CC1515', color:'white', border:'none', borderRadius:11, fontFamily:'inherit', fontSize:'.97rem', fontWeight:800, cursor:'pointer', boxShadow:'0 8px 28px rgba(180,20,20,0.45)', transition:'all .2s', letterSpacing:'-.01em' }}
              onMouseEnter={e => { e.currentTarget.style.background='#AA1010'; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 14px 40px rgba(180,20,20,0.6)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='#CC1515'; e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(180,20,20,0.45)'; }}
            >{t.login.signIn}</button>
          </form>


        </div>
      </div>
    </div>
  );
}
