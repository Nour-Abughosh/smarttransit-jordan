import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Star, ArrowRight, Clock, Navigation, RefreshCw, Sparkles } from 'lucide-react';
import { getFavorites } from '../../lib/favorites';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const NGROK_HEADERS = { 'ngrok-skip-browser-warning': 'true' };

const ROUTE_ID_TO_FROM_TO: Record<string, {from:string;to:string}> = {
  'AM503': {from:'Sweileh',          to:'Jordan University Hospital'},
  'AM504': {from:'Wadi Seer',        to:'Sweileh'},
  'AM505': {from:'Al-Muhajereen',    to:'Wadi Seer'},
  'R12':   {from:'Tabarbour',        to:'Downtown Amman'},
  'SARF':  {from:'Abdali',           to:'Mecca Mall'},
  'ALAT':  {from:'Alatroon',         to:'Al Mahatta Terminal'},
};

interface LiveRoute {
  route_id: string; route_name: string; crowding: string;
  duration_min: number; delay_min: number; arrival_time: string;
  next_departure: string; fare: string; ai_confidence: number;
}

export function MyRoutes() {
  const navigate = useNavigate();
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [liveRoutes, setLiveRoutes] = useState<LiveRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load favorites from localStorage
  useEffect(() => {
    setFavIds(getFavorites());
  }, []);

  // Fetch live predictions for all routes
  const fetchLiveData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/route-predictions?from=&to=`, {headers: NGROK_HEADERS});
      if (res.ok) {
        const data = await res.json();
        setLiveRoutes(data.routes || []);
      }
    } catch(e) {
      console.warn('Live data unavailable');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchLiveData(); }, []);
  useEffect(() => {
    const iv = setInterval(() => fetchLiveData(true), 60_000);
    return () => clearInterval(iv);
  }, []);

  // Get live data for a specific route
  const getLiveRoute = (routeId: string) =>
    liveRoutes.find(r => r.route_id === routeId);

  const savedRouteIds = Array.from(favIds);

  const crowdColor = (c: string) =>
    c === 'available' ? '#00A87C' : c === 'full' ? '#CC0000' : '#C87800';
  const crowdBg = (c: string) =>
    c === 'available' ? '#E0FBF4' : c === 'full' ? '#FFECEC' : '#FFF4E6';

  return (
    <div style={{minHeight:'calc(100vh - 4rem)',background:'#F4F8FB',padding:'1.5rem 1rem'}}>
      <div style={{maxWidth:600,margin:'0 auto'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.25rem'}}>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:'1.75rem',fontWeight:800,color:'#0F2240',letterSpacing:'-0.03em',margin:0}}>My Routes</h1>
          <button onClick={()=>fetchLiveData(true)} style={{width:34,height:34,borderRadius:9,border:'1.5px solid #EEF3F8',background:'white',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 0.2s'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor='#00C896'} onMouseLeave={e=>e.currentTarget.style.borderColor='#EEF3F8'}>
            <RefreshCw size={13} color="#4A6580" style={refreshing?{animation:'spin 1s linear infinite'}:{}}/>
          </button>
        </div>
        <p style={{color:'#7A92A8',fontSize:'0.85rem',marginBottom:'1.5rem'}}>Your saved routes with live AI predictions</p>

        {savedRouteIds.length === 0 ? (
          <div style={{background:'white',borderRadius:16,padding:'3rem 1.5rem',textAlign:'center',border:'1.5px dashed #DDE6EE'}}>
            <Star size={36} color="#DDE6EE" style={{margin:'0 auto 1rem'}}/>
            <div style={{fontWeight:700,color:'#0F2240',marginBottom:6}}>No saved routes yet</div>
            <div style={{fontSize:'0.82rem',color:'#7A92A8',marginBottom:'1.25rem'}}>
              Star a route on the Search Results page to save it here
            </div>
            <button onClick={()=>navigate('/home')}
              style={{background:'#00C896',color:'white',border:'none',borderRadius:10,padding:'0.7rem 1.5rem',fontWeight:700,cursor:'pointer',fontSize:'0.9rem',display:'flex',alignItems:'center',gap:6,margin:'0 auto'}}>
              Find a route <ArrowRight size={14}/>
            </button>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {savedRouteIds.map((routeId, i) => {
              const fromTo = ROUTE_ID_TO_FROM_TO[routeId];
              const live = getLiveRoute(routeId);
              if (!fromTo) return null;

              return (
                <div key={routeId}
                  onClick={()=>navigate('/results',{state:{from:fromTo.from,to:fromTo.to}})}
                  style={{background:'white',border:'1.5px solid #EEF3F8',borderRadius:16,padding:'1rem',cursor:'pointer',transition:'all 0.2s',boxShadow:'0 2px 8px rgba(15,34,64,0.06)',animation:`fadeIn 0.3s ${i*0.05}s ease both`}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='#00C896';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 6px 20px rgba(0,200,150,0.15)';}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='#EEF3F8';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 8px rgba(15,34,64,0.06)';}}
                >
                  {/* Route badge + AI confidence */}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:11,fontWeight:700,background:'#E0FBF4',color:'#00A87C',padding:'2px 10px',borderRadius:99}}>{routeId}</span>
                      {live && (
                        <span style={{fontSize:10,fontWeight:700,color:'#7C3AED',background:'#EDE9FE',padding:'2px 8px',borderRadius:99,display:'flex',alignItems:'center',gap:3}}>
                          <Sparkles size={9}/> AI {live.ai_confidence}%
                        </span>
                      )}
                    </div>
                    <Star size={16} color="#F59E0B" fill="#F59E0B"/>
                  </div>

                  {/* From → To */}
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                    <div style={{display:'flex',alignItems:'center',gap:5}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:'#00C896'}}/>
                      <span style={{fontSize:'0.875rem',fontWeight:600,color:'#0F2240'}}>{fromTo.from}</span>
                    </div>
                    <ArrowRight size={13} color="#7A92A8"/>
                    <div style={{display:'flex',alignItems:'center',gap:5}}>
                      <div style={{width:8,height:8,borderRadius:2,background:'#FF6B35'}}/>
                      <span style={{fontSize:'0.875rem',fontWeight:600,color:'#0F2240'}}>{fromTo.to}</span>
                    </div>
                  </div>

                  {/* Live AI predictions */}
                  {loading ? (
                    <div style={{height:12,background:'#EEF3F8',borderRadius:4,animation:'shimmer 1.5s ease infinite'}}/>
                  ) : live ? (
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,padding:'8px 0',borderTop:'1px solid #EEF3F8'}}>
                      <div style={{textAlign:'center'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:3,marginBottom:2}}>
                          <Clock size={10} color="#7A92A8"/>
                          <span style={{fontSize:9,color:'#7A92A8',fontWeight:500}}>Departs</span>
                        </div>
                        <div style={{fontSize:'0.85rem',fontWeight:700,color:'#0F2240'}}>{live.next_departure}</div>
                      </div>
                      <div style={{textAlign:'center'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:3,marginBottom:2}}>
                          <Navigation size={10} color="#7A92A8"/>
                          <span style={{fontSize:9,color:'#7A92A8',fontWeight:500}}>Arrives</span>
                        </div>
                        <div style={{fontSize:'0.85rem',fontWeight:700,color:'#0F2240'}}>{live.arrival_time}</div>
                      </div>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:9,color:'#7A92A8',fontWeight:500,marginBottom:2}}>Crowding</div>
                        <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:99,background:crowdBg(live.crowding),color:crowdColor(live.crowding)}}>
                          {live.crowding.charAt(0).toUpperCase()+live.crowding.slice(1)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{fontSize:11,color:'#7A92A8',borderTop:'1px solid #EEF3F8',paddingTop:8}}>
                      Tap to search this route
                    </div>
                  )}

                  {live?.delay_min && live.delay_min > 0 ? (
                    <div style={{marginTop:6,fontSize:11,color:'#C87800',fontWeight:600,display:'flex',alignItems:'center',gap:4}}>
                      ⚠ +{live.delay_min} min delay · {live.fare}
                    </div>
                  ) : live ? (
                    <div style={{marginTop:6,fontSize:11,color:'#7A92A8'}}>{live.fare} · {live.duration_min} min</div>
                  ) : null}
                </div>
              );
            })}

            {/* Add more routes */}
            <button onClick={()=>navigate('/home')}
              style={{width:'100%',padding:'0.875rem',borderRadius:14,border:'1.5px dashed #DDE6EE',background:'transparent',fontSize:'0.85rem',fontWeight:600,color:'#7A92A8',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,transition:'all 0.2s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#00C896';e.currentTarget.style.color='#00A87C';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='#DDE6EE';e.currentTarget.style.color='#7A92A8';}}>
              + Find more routes
            </button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}