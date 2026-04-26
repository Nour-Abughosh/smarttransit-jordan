import { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/auth';
import { MapPreview } from '../../components/MapPreview';
import {
  Bus, Users, Clock, AlertTriangle, TrendingUp, Search,
  Zap, Sparkles, RefreshCw, CheckCircle2, Activity,
  BarChart2, Map, ArrowUp, ArrowDown, Send, Bell,
  Navigation, ChevronRight,
} from 'lucide-react';
import { useLang } from '../../../lib/i18n';

/* ── Real Amman Vision data ─────────────────────────────── */
const REAL = {
  totalBoardings: 18038,
  busiestRoute:   'Alatroon hospital–Al Mahatta Terminal',
  busiestCount:   4344,
  peakHour:       '7:00 PM',
  peakCount:      1644,
  uniqueVehicles: 104,
  uniqueRoutes:   27,
  passengers:     { Adult: 14778, EMV: 2161, 'Mobile QR': 1052, 'Free Card': 46 },
};

const HOURLY: Record<number,number> = {
  5:120,6:380,7:820,8:1150,9:960,10:680,11:540,
  12:610,13:720,14:640,15:710,16:890,17:1180,
  18:1420,19:1644,20:1210,21:880,22:540,23:280,
};
const HOURS = Object.keys(HOURLY).map(Number);
const MAX_H = Math.max(...Object.values(HOURLY));

/* ── Types ──────────────────────────────────────────────── */
type BusStatus = 'active'|'delayed'|'maintenance'|'depot';
type RecAction = 'dispatch'|'hold'|'reroute';
type SideView  = 'dashboard'|'fleet'|'map'|'routes'|'ai'|'demand'|'reports'|'alerts'|'settings';

interface BusRow { id:string; route:string; driver:string; status:BusStatus; load:number; delay:number; speed:number; }
interface Rec    { id:string; action:RecAction; urgent:boolean; conf:number; reason:string; impact:string; }

/* ── Data ───────────────────────────────────────────────── */
const FLEET_DATA: BusRow[] = [
  {id:'BUS-104',route:'Alatroon–Mahatta',driver:'Omar K.',   status:'active',     load:85, delay:0, speed:38},
  {id:'BUS-209',route:'Route 35',        driver:'Ahmad S.',  status:'delayed',    load:100,delay:12,speed:14},
  {id:'BUS-311',route:'Route 12',        driver:'Samer A.',  status:'active',     load:45, delay:2, speed:52},
  {id:'BUS-402',route:'Route 6',         driver:'Tariq N.',  status:'maintenance',load:0,  delay:0, speed:0 },
  {id:'BUS-115',route:'Alatroon–Mahatta',driver:'Khalid M.', status:'active',     load:92, delay:5, speed:31},
  {id:'BUS-517',route:'Sarfees',         driver:'Faris J.',  status:'active',     load:60, delay:0, speed:44},
  {id:'BUS-088',route:'Route 15',        driver:'Rami H.',   status:'delayed',    load:78, delay:9, speed:22},
  {id:'BUS-230',route:'Route 6',         driver:'Nizar W.',  status:'depot',      load:0,  delay:0, speed:0 },
];

const RECS_DATA: Rec[] = [
  {id:'BUS-402',action:'dispatch',urgent:true, conf:94,
   reason:'Clustering on Alatroon–Mahatta: BUS-104 & BUS-115 are 2 min apart. Busiest route (4,344 real boardings).',
   impact:'Restores 8-min headway. ~340 passengers benefit based on historical data.'},
  {id:'BUS-088',action:'reroute', urgent:true, conf:88,
   reason:'Road closure near 4th Circle. Historical data shows highest delay frequency here.',
   impact:'Alternate via Mecca St saves 9 min. 127 on-board passengers notified.'},
  {id:'BUS-209',action:'hold',    urgent:false,conf:79,
   reason:'Route 35 at 100% capacity. Peak hour 7 PM = 1,644 boardings per real data.',
   impact:'Hold 2 min at Shmeisani spreads load to following bus.'},
];

const STATUS_CFG: Record<BusStatus,{bg:string;color:string;dot:string;label:string}> = {
  active:      {bg:'#E0FBF4',color:'#00A87C',dot:'#00C896',label:'Active'},
  delayed:     {bg:'#FFF4E6',color:'#C87800',dot:'#FF9F43',label:'Delayed'},
  maintenance: {bg:'#EEF3F8',color:'#4A6580',dot:'#7A92A8',label:'Maintenance'},
  depot:       {bg:'#F4F8FB',color:'#7A92A8',dot:'#B0BEC5',label:'In Depot'},
};
const REC_CFG: Record<RecAction,{bg:string;color:string;label:string;icon:React.ReactNode}> = {
  dispatch:{bg:'#E0FBF4',color:'#00A87C',label:'Dispatch',icon:<Zap size={11}/>},
  reroute: {bg:'#FFECEC',color:'#CC0000',label:'Reroute', icon:<Navigation size={11}/>},
  hold:    {bg:'#FFF4E6',color:'#C87800',label:'Hold',    icon:<Clock size={11}/>},
};
const ROUTE_PERF = [
  {name:'Alatroon–Mahatta',load:88,color:'#FF5252'},
  {name:'Route 35',        load:100,color:'#FF5252'},
  {name:'Route 15',        load:78, color:'#FF9F43'},
  {name:'Sarfees',         load:60, color:'#FF9F43'},
  {name:'Route 12',        load:45, color:'#00C896'},
];

/* ── Shared components ──────────────────────────────────── */
function LoadBar({pct}:{pct:number}) {
  const [w,setW] = useState(0);
  useEffect(()=>{const t=setTimeout(()=>setW(pct),100);return()=>clearTimeout(t);},[pct]);
  const c = pct>=90?'#FF5252':pct>=60?'#FF9F43':'#00C896';
  return (
    <div style={{display:'flex',alignItems:'center',gap:6}}>
      <div style={{width:52,height:5,background:'#EEF3F8',borderRadius:3,overflow:'hidden',flexShrink:0}}>
        <div style={{width:`${w}%`,height:'100%',background:c,borderRadius:3,transition:'width .7s ease'}}/>
      </div>
      <span style={{fontSize:11,fontWeight:700,color:c,flexShrink:0,width:28}}>{Math.round(pct)}%</span>
    </div>
  );
}

function DemandChart() {
  return (
    <div style={{padding:'0 1.1rem 1rem'}}>
      <div style={{display:'flex',alignItems:'flex-end',gap:3,height:100,marginBottom:6}}>
        {HOURS.map(h=>{
          const v=HOURLY[h], pct=Math.round(v/MAX_H*100);
          const isPeak=h===19,isMorning=h>=7&&h<=9;
          const color=isPeak?'#FF5252':isMorning?'#FF6B35':'#00C896';
          const label=h<12?`${h}am`:h===12?'12pm':`${h-12}pm`;
          return (
            <div key={h} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,cursor:'pointer',position:'relative'}}
              title={`${label}: ${v.toLocaleString()} boardings`}>
              {isPeak&&<div style={{position:'absolute',top:-18,left:'50%',transform:'translateX(-50%)',fontSize:8,fontWeight:800,color,whiteSpace:'nowrap',background:'#FFECEC',padding:'1px 4px',borderRadius:4}}>PEAK</div>}
              <div style={{width:'100%',height:`${pct}%`,background:color,borderRadius:'3px 3px 0 0',minHeight:4,opacity:isPeak?1:0.8,outline:isPeak?`2px solid ${color}`:'none',outlineOffset:1}}/>
              <span style={{fontSize:7,color:'#7A92A8',fontWeight:500,whiteSpace:'nowrap'}}>{label}</span>
            </div>
          );
        })}
      </div>
      <div style={{display:'flex',gap:14,flexWrap:'wrap',marginTop:6}}>
        {[['#00C896','Normal hours'],['#FF6B35','Morning peak'],['#FF5252','Peak: 7 PM (1,644 boardings)']].map(([c,l])=>(
          <div key={l} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:500,color:'#4A6580'}}>
            <div style={{width:10,height:10,borderRadius:2,background:c as string}}/>{l}
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionCard({title,sub,badge,badgeColor,children,style}:{title:string;sub?:string;badge?:string;badgeColor?:string;children:React.ReactNode;style?:React.CSSProperties}) {
  return (
    <div style={{background:'white',borderRadius:14,border:'1px solid #EEF3F8',boxShadow:'0 2px 10px rgba(15,34,64,.05)',overflow:'hidden',animation:'op-fade .4s ease both',...style}}>
      <div style={{padding:'.875rem 1.1rem',borderBottom:'1px solid #EEF3F8',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
        <div>
          <div style={{fontSize:'.9rem',fontWeight:700,color:'#0F2240'}}>{title}</div>
          {sub&&<div style={{fontSize:'.7rem',color:'#7A92A8',marginTop:1}}>{sub}</div>}
        </div>
        {badge&&<span style={{fontSize:10,fontWeight:700,padding:'2px 9px',borderRadius:99,background:`${badgeColor||'#00C896'}18`,color:badgeColor||'#00A87C'}}>{badge}</span>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function PassengerBreakdown() {
  return (
    <div style={{padding:'.9rem 1.1rem'}}>
      {Object.entries(REAL.passengers).map(([type,count])=>{
        const pct=Math.round((count as number)/REAL.totalBoardings*100);
        const colors:Record<string,string>={Adult:'#00C896',EMV:'#3B9EFF','Mobile QR':'#7C3AED','Free Card':'#7A92A8'};
        const c=colors[type]||'#7A92A8';
        return (
          <div key={type} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
            <span style={{fontSize:'.73rem',fontWeight:600,color:'#4A6580',width:72,flexShrink:0}}>{type}</span>
            <div style={{flex:1,height:7,background:'#EEF3F8',borderRadius:4,overflow:'hidden'}}>
              <div style={{width:`${pct}%`,height:'100%',background:c,borderRadius:4,transition:'width .8s ease'}}/>
            </div>
            <span style={{fontSize:11,fontWeight:800,color:c,width:30,textAlign:'right',flexShrink:0}}>{pct}%</span>
            <span style={{fontSize:10,color:'#7A92A8',width:40,textAlign:'right',flexShrink:0}}>{(count as number).toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

function RoutePerf() {
  return (
    <div style={{padding:'.9rem 1.1rem'}}>
      {ROUTE_PERF.map(r=>(
        <div key={r.name} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <span style={{fontSize:'.72rem',fontWeight:600,color:'#4A6580',width:105,flexShrink:0,lineHeight:1.3}}>{r.name}</span>
          <div style={{flex:1,height:6,background:'#EEF3F8',borderRadius:3,overflow:'hidden'}}>
            <div style={{width:`${r.load}%`,height:'100%',background:r.color,borderRadius:3,transition:'width .8s ease'}}/>
          </div>
          <span style={{fontSize:11,fontWeight:800,color:r.color,width:32,textAlign:'right',flexShrink:0}}>{r.load}%</span>
          {r.load>=90&&<span style={{fontSize:12,flexShrink:0}}>{r.load===100?'🚨':'⚠'}</span>}
        </div>
      ))}
    </div>
  );
}

function DispatchPanel({recs,onAccept,onDismiss,accepted}:{recs:Rec[];onAccept:(id:string)=>void;onDismiss:(id:string)=>void;accepted:string[]}) {
  const { t } = useLang();
  return (
    <div style={{padding:'.875rem',overflowY:'auto',maxHeight:340}}>
      {recs.length===0?(
        <div style={{textAlign:'center',padding:'1.5rem 1rem'}}>
          <div style={{fontSize:28,marginBottom:6}}>✅</div>
          <div style={{fontSize:'.83rem',fontWeight:700,color:'#0F2240'}}>{t.operator.allActioned}</div>
          <div style={{fontSize:'.72rem',color:'#7A92A8',marginTop:3}}>{t.operator.monitoring}</div>
        </div>
      ):recs.map(rec=>{
        const cfg=REC_CFG[rec.action];
        return (
          <div key={rec.id} style={{background:rec.urgent?'#FFFDF7':'#F4F8FB',borderRadius:11,border:`1.5px solid ${rec.urgent?'#FFD8A0':'#EEF3F8'}`,padding:'.875rem',marginBottom:9}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:7,gap:5,flexWrap:'wrap'}}>
              <div style={{display:'flex',alignItems:'center',gap:5}}>
                <span style={{fontSize:10,fontWeight:800,padding:'2px 9px',borderRadius:99,background:cfg.bg,color:cfg.color,display:'flex',alignItems:'center',gap:3}}>{cfg.icon}{cfg.label}</span>
                <span style={{fontSize:'.76rem',fontWeight:700,color:'#0F2240',background:'white',padding:'2px 8px',borderRadius:99,border:'1px solid #DDE6EE'}}>{rec.id}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:4}}>
                {rec.urgent&&<span style={{fontSize:9,fontWeight:800,color:'#C87800',background:'#FFF4E6',padding:'2px 6px',borderRadius:99}}>Urgent</span>}
                <span style={{fontSize:10,color:'#7A92A8',fontWeight:600}}>{rec.conf}% conf.</span>
              </div>
            </div>
            <div style={{fontSize:'.74rem',color:'#4A6580',lineHeight:1.5,marginBottom:6}}>{rec.reason}</div>
            <div style={{background:'#E0FBF4',border:'1px solid #B3F0E0',borderRadius:7,padding:'5px 9px',marginBottom:8,fontSize:'.69rem',color:'#00A87C',fontWeight:600}}>⚡ {rec.impact}</div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>onAccept(rec.id)} style={{flex:1,padding:'6px',borderRadius:8,background:'#00C896',border:'none',color:'white',fontSize:'.75rem',fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:4,transition:'background .15s'}}
                onMouseEnter={e=>e.currentTarget.style.background='#00A87C'} onMouseLeave={e=>e.currentTarget.style.background='#00C896'}>
                <CheckCircle2 size={12}/> Accept
              </button>
              <button onClick={()=>onDismiss(rec.id)} style={{padding:'6px 11px',borderRadius:8,background:'white',border:'1.5px solid #DDE6EE',color:'#4A6580',fontSize:'.75rem',fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='#FF5252';e.currentTarget.style.color='#CC0000';e.currentTarget.style.background='#FFECEC';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#DDE6EE';e.currentTarget.style.color='#4A6580';e.currentTarget.style.background='white';}}>
                Dismiss
              </button>
            </div>
          </div>
        );
      })}
      {accepted.length>0&&(
        <div style={{background:'#E0FBF4',borderRadius:11,border:'1px solid #B3F0E0',padding:'.8rem',marginTop:8}}>
          <div style={{fontSize:'.68rem',fontWeight:800,color:'#00A87C',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>✓ Dispatched</div>
          {accepted.map(id=>(<div key={id} style={{display:'flex',alignItems:'center',gap:6,fontSize:'.75rem',color:'#4A6580',marginBottom:4}}><CheckCircle2 size={11} color="#00C896"/>{id} — sent to route</div>))}
        </div>
      )}
    </div>
  );
}

/* ── VIEWS ──────────────────────────────────────────────── */
function DashboardView({fleet,recs,accepted,onAccept,onDismiss,alertDismissed,setAlertDismissed,fleetFilter,setFleetFilter,search,setSearch,selectedId,setSelectedId,filteredFleet}:any) {
  const { t } = useLang();
  const active=fleet.filter((b:BusRow)=>b.status==='active').length;
  const delayed=fleet.filter((b:BusRow)=>b.status==='delayed').length;
  const avgLoad=Math.round(fleet.filter((b:BusRow)=>b.status==='active').reduce((s:number,b:BusRow)=>s+b.load,0)/Math.max(1,active));
  const kpis=[
    {label:'Real Boardings', value:REAL.totalBoardings.toLocaleString(), sub:`${REAL.uniqueVehicles} vehicles · ${REAL.uniqueRoutes} routes`,trend:'+8%',good:true,color:'#00C896',icon:<Bus size={16}/>},
    {label:'Active Fleet',   value:`${active}/${fleet.length}`,           sub:`${delayed} delayed`,                                          trend:'+4%',good:true,color:'#3B9EFF',icon:<Activity size={16}/>},
    {label:'Avg. Load',      value:`${avgLoad}%`,                         sub:'Alatroon–Mahatta at 100%',                                    trend:'+3%',good:false,color:'#FF9F43',icon:<Users size={16}/>},
    {label:'Peak Hour',      value:REAL.peakHour,                         sub:`${REAL.peakCount.toLocaleString()} boardings/hr`,             trend:'+12%',good:true,color:'#7C3AED',icon:<TrendingUp size={16}/>},
    {label:'On-Time Rate',   value:'87%',                                 sub:'2 routes currently delayed',                                  trend:'+3%',good:true,color:'#10B981',icon:<CheckCircle2 size={16}/>},
  ];
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
      {/* Alert strip */}
      {!alertDismissed&&(
        <div style={{background:'#FFF4E6',border:'1.5px solid #FFD8A0',borderLeft:'4px solid #FF9F43',borderRadius:12,padding:'.8rem 1rem',display:'flex',alignItems:'flex-start',gap:10,flexShrink:0,animation:'op-fade .4s ease'}}>
          <div style={{width:30,height:30,borderRadius:8,background:'#FFF0D0',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:15,animation:'op-pulse 2s infinite'}}>⚠️</div>
          <div style={{flex:1}}>
            <div style={{fontSize:'.84rem',fontWeight:700,color:'#C87800',marginBottom:2}}>Vehicle Clustering — Alatroon–Mahatta (4,344 real boardings — busiest route)</div>
            <div style={{fontSize:'.75rem',color:'#7A5500',lineHeight:1.5}}>AI detected BUS-104 & BUS-115 operating within 2 min. Dispatch BUS-402 to restore 8-min headway.</div>
          </div>
          <button onClick={()=>setAlertDismissed(true)} style={{background:'none',border:'none',cursor:'pointer',color:'#7A92A8',fontSize:18,flexShrink:0}}>×</button>
        </div>
      )}
      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}>
        {kpis.map((k,i)=>{
          const isUp=k.trend.startsWith('+');
          const isGood=(isUp&&k.good)||(!isUp&&!k.good);
          const tc=isGood?'#00A87C':'#FF5252';
          const TI=isUp?ArrowUp:ArrowDown;
          return (
            <div key={k.label} style={{background:'white',borderRadius:13,border:'1px solid #EEF3F8',padding:'1rem',boxShadow:'0 2px 8px rgba(15,34,64,.05)',animation:`op-fade .4s ${i*.07}s ease both`,transition:'all .2s'}}
              onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 6px 24px rgba(15,34,64,.1)';e.currentTarget.style.transform='translateY(-2px)';}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 2px 8px rgba(15,34,64,.05)';e.currentTarget.style.transform='translateY(0)';}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:9}}>
                <div style={{width:34,height:34,borderRadius:9,background:`${k.color}18`,display:'flex',alignItems:'center',justifyContent:'center',color:k.color}}>{k.icon}</div>
                <div style={{display:'flex',alignItems:'center',gap:3,fontSize:10,fontWeight:800,color:tc,background:`${tc}14`,padding:'2px 7px',borderRadius:99}}><TI size={9} strokeWidth={3}/>{k.trend}</div>
              </div>
              <div style={{fontSize:'1.55rem',fontWeight:900,color:'#0F2240',letterSpacing:'-.04em',lineHeight:1}}>{k.value}</div>
              <div style={{fontSize:'.7rem',color:'#7A92A8',fontWeight:500,marginTop:2}}>{k.label}</div>
              <div style={{fontSize:'.65rem',color:'#7A92A8',marginTop:7,paddingTop:7,borderTop:'1px solid #EEF3F8',lineHeight:1.4}}>{k.sub}</div>
            </div>
          );
        })}
      </div>
      {/* AI insight */}
      <div style={{background:'linear-gradient(135deg,#0F2240,#1E3A5F)',borderRadius:14,padding:'1.1rem 1.25rem',display:'flex',alignItems:'flex-start',gap:14,boxShadow:'0 8px 28px rgba(15,34,64,.2)',animation:'op-fade .4s .35s ease both'}}>
        <div style={{width:42,height:42,borderRadius:12,background:'rgba(0,200,150,.15)',border:'1.5px solid rgba(0,200,150,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>✦</div>
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
            <div style={{width:5,height:5,borderRadius:'50%',background:'#00C896',animation:'op-live 1.4s infinite'}}/>
            <span style={{fontSize:9,fontWeight:800,color:'#00C896',textTransform:'uppercase',letterSpacing:'.09em'}}>AI Intelligence · 18,038 Real Boardings</span>
          </div>
          <div style={{fontSize:'.84rem',color:'rgba(255,255,255,.8)',lineHeight:1.65,marginBottom:10}}>
            Peak demand hits <strong style={{color:'white'}}>7:00 PM</strong> with 1,644 boardings/hour.
            Busiest route: <strong style={{color:'white'}}>Alatroon–Al Mahatta</strong> (4,344 boardings — 24% of all trips).
            <strong style={{color:'white'}}> 82%</strong> are Adult passengers · <strong style={{color:'white'}}>12%</strong> use EMV cards.
            <strong style={{color:'white'}}> {recs.length} AI dispatch actions</strong> pending.
          </div>
          <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
            {[{l:'🚨 Route 35 Full',bg:'rgba(255,82,82,.2)',c:'#FF8888',b:'rgba(255,82,82,.3)'},
              {l:'⚠ 2 Routes Delayed',bg:'rgba(255,159,67,.2)',c:'#FFB860',b:'rgba(255,159,67,.3)'},
              {l:'✓ 87% On-Time',bg:'rgba(0,200,150,.15)',c:'#00C896',b:'rgba(0,200,150,.25)'},
              {l:`✓ ${REAL.totalBoardings.toLocaleString()} Analysed`,bg:'rgba(0,200,150,.12)',c:'#00C896',b:'rgba(0,200,150,.2)'},
            ].map(p=>(<span key={p.l} style={{fontSize:11,fontWeight:700,padding:'4px 12px',borderRadius:99,background:p.bg,color:p.c,border:`1px solid ${p.b}`}}>{p.l}</span>))}
          </div>
        </div>
        <div style={{textAlign:'right',flexShrink:0}}>
          <div style={{fontSize:'2.2rem',fontWeight:900,color:'white',letterSpacing:'-.04em',lineHeight:1}}>{recs.length}</div>
          <div style={{fontSize:'.7rem',color:'rgba(255,255,255,.4)',fontWeight:600}}>AI actions<br/>pending</div>
        </div>
      </div>
      {/* Map + Demand + Dispatch */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 300px',gap:12}}>
        <SectionCard title="Live Network Map" sub={`6 buses tracked · ${REAL.uniqueVehicles} in dataset`} badge="● Live" badgeColor="#00A87C">
          <div style={{height:240}}><MapPreview height="100%" center={[31.955,35.895]} zoom={12} markers={FLEET_DATA.filter(b=>b.status!=='depot').map((b,i)=>({position:[31.955+(i*.015-.035),35.895+(i*.012-.03)] as [number,number],label:`${b.id} · ${b.route}`}))}/></div>
        </SectionCard>
        <SectionCard title="Hourly Demand" sub="Real boarding data · 18,038 trips" badge="AI Predicted" badgeColor="#7C3AED">
          <DemandChart/>
          <div style={{borderTop:'1px solid #EEF3F8',padding:'.5rem 1.1rem .875rem'}}>
            <div style={{fontSize:'.68rem',fontWeight:800,color:'#7A92A8',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'.5rem'}}>Passenger Types · Real</div>
            <PassengerBreakdown/>
          </div>
        </SectionCard>
        <SectionCard title="AI Dispatch" sub={`${recs.length} pending · real-data trained`} badge={recs.some(r=>r.urgent)?'Urgent':undefined} badgeColor="#C87800">
          <DispatchPanel recs={recs} onAccept={onAccept} onDismiss={onDismiss} accepted={accepted}/>
        </SectionCard>
      </div>
      {/* Fleet + Alerts + Route Perf + Reports */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:12}}>
        {/* Fleet table */}
        <div style={{background:'white',borderRadius:14,border:'1px solid #EEF3F8',boxShadow:'0 2px 10px rgba(15,34,64,.05)',overflow:'hidden',animation:'op-fade .4s .55s ease both'}}>
          <div style={{padding:'.875rem 1.1rem',borderBottom:'1px solid #EEF3F8',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
            <div><div style={{fontSize:'.9rem',fontWeight:700,color:'#0F2240'}}>{t.operator.fleet}</div><div style={{fontSize:'.7rem',color:'#7A92A8',marginTop:1}}>{REAL.uniqueVehicles} vehicles in Amman Vision dataset</div></div>
            <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap'}}>
              {(['all','active','delayed'] as const).map(f=>(
                <button key={f} onClick={()=>setFleetFilter(f)} style={{padding:'5px 11px',borderRadius:8,fontSize:'.75rem',fontWeight:600,border:`1.5px solid ${fleetFilter===f?'#00C896':'#EEF3F8'}`,background:fleetFilter===f?'#E0FBF4':'white',color:fleetFilter===f?'#00A87C':'#4A6580',cursor:'pointer',fontFamily:'inherit',transition:'all .15s',textTransform:'capitalize'}}>
                  {f==='all'?'All':f==='active'?'🟢 Active':'🟡 Delayed'}
                </button>
              ))}
              <div style={{position:'relative'}}>
                <Search size={12} style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'#7A92A8',pointerEvents:'none'}}/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{paddingLeft:26,paddingRight:10,paddingTop:6,paddingBottom:6,background:'#F4F8FB',border:'1.5px solid #DDE6EE',borderRadius:8,color:'#0F2240',fontSize:'.78rem',fontFamily:'inherit',outline:'none',width:150,transition:'border-color .2s'}}
                  onFocus={e=>e.currentTarget.style.borderColor='#00C896'} onBlur={e=>e.currentTarget.style.borderColor='#DDE6EE'}/>
              </div>
            </div>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:560}}>
              <thead><tr style={{background:'#F4F8FB',borderBottom:'1px solid #EEF3F8'}}>
                {['Bus ID','Route','Driver','Status','Load','Delay','Speed','Actions'].map(h=>(
                  <th key={h} style={{padding:'.5rem .9rem',textAlign:'left',fontSize:'9.5px',fontWeight:800,color:'#7A92A8',textTransform:'uppercase',letterSpacing:'.07em',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filteredFleet.map((bus:BusRow,i:number)=>{
                  const sc=STATUS_CFG[bus.status];
                  const isSel=selectedId===bus.id;
                  return (
                    <tr key={bus.id} onClick={()=>setSelectedId(isSel?null:bus.id)}
                      style={{borderBottom:'1px solid #EEF3F8',cursor:'pointer',transition:'background .12s',background:isSel?'#E0FBF4':'white',borderLeft:isSel?'3px solid #00C896':'3px solid transparent',animation:`op-row .3s ${i*.04}s ease both`}}
                      onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background='#F8FCFB';}}
                      onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background='white';}}>
                      <td style={{padding:'.65rem .9rem'}}><span style={{fontFamily:'monospace',fontSize:'.82rem',fontWeight:700,color:'#0F2240'}}>{bus.id}</span></td>
                      <td style={{padding:'.65rem .9rem'}}><span style={{fontSize:'.8rem',fontWeight:600,color:'#4A6580'}}>{bus.route}</span></td>
                      <td style={{padding:'.65rem .9rem'}}><span style={{fontSize:'.77rem',color:'#7A92A8'}}>{bus.driver}</span></td>
                      <td style={{padding:'.65rem .9rem'}}><span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:99,background:sc.bg,color:sc.color}}><span style={{width:5,height:5,borderRadius:'50%',background:sc.dot,display:'inline-block'}}/>{sc.status==='active'?t.operator.active:sc.status==='delayed'?t.operator.delayed2:sc.status==='maintenance'?t.operator.maintenance:t.operator.inDepot}</span></td>
                      <td style={{padding:'.65rem .9rem'}}><LoadBar pct={Math.round(bus.load)}/></td>
                      <td style={{padding:'.65rem .9rem'}}>{bus.delay>0?<span style={{fontSize:'.8rem',fontWeight:700,color:'#C87800'}}>+{Math.round(bus.delay)}m</span>:<span style={{fontSize:'.77rem',color:'#7A92A8'}}>—</span>}</td>
                      <td style={{padding:'.65rem .9rem'}}>{bus.speed>0?<span style={{fontSize:'.78rem',color:'#4A6580'}}>{Math.round(bus.speed)} km/h</span>:<span style={{fontSize:'.77rem',color:'#7A92A8'}}>—</span>}</td>
                      <td style={{padding:'.65rem .9rem',textAlign:'right'}}>
                        <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                          <button onClick={e=>e.stopPropagation()} style={{fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:6,border:'1.5px solid #EEF3F8',background:'white',color:'#4A6580',cursor:'pointer',fontFamily:'inherit',transition:'all .15s',display:'flex',alignItems:'center',gap:3}}
                            onMouseEnter={e=>{e.currentTarget.style.borderColor='#00C896';e.currentTarget.style.color='#00A87C';e.currentTarget.style.background='#E0FBF4';}}
                            onMouseLeave={e=>{e.currentTarget.style.borderColor='#EEF3F8';e.currentTarget.style.color='#4A6580';e.currentTarget.style.background='white';}}><Send size={9}/> Msg</button>
                          <button onClick={e=>e.stopPropagation()} style={{fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:6,border:'1.5px solid #EEF3F8',background:'white',color:'#4A6580',cursor:'pointer',fontFamily:'inherit',transition:'all .15s',display:'flex',alignItems:'center',gap:3}}
                            onMouseEnter={e=>{e.currentTarget.style.borderColor='#FF6B35';e.currentTarget.style.color='#FF6B35';e.currentTarget.style.background='#FFF0EA';}}
                            onMouseLeave={e=>{e.currentTarget.style.borderColor='#EEF3F8';e.currentTarget.style.color='#4A6580';e.currentTarget.style.background='white';}}><Zap size={9}/> Dispatch</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredFleet.length===0&&<tr><td colSpan={8} style={{padding:'2rem',textAlign:'center',color:'#7A92A8',fontSize:'.85rem'}}>No vehicles match "{search}"</td></tr>}
              </tbody>
            </table>
          </div>
          <div style={{padding:'.55rem .9rem',borderTop:'1px solid #EEF3F8',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#F4F8FB'}}>
            <span style={{fontSize:'.68rem',color:'#7A92A8'}}>{filteredFleet.length} shown · {REAL.uniqueVehicles} in Amman Vision dataset</span>
          </div>
        </div>
        {/* Right col */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <SectionCard title="Active Alerts" badge="3 Critical" badgeColor="#CC0000">
            <div style={{padding:'0 1.1rem'}}>
              {[{dot:'#FF5252',title:'Route 35 — 100% Capacity',msg:'42 passengers waiting at Gardens.',time:'Now',pulse:true},
                {dot:'#FF9F43',title:'BUS-088 — +9 min delay',    msg:'Road closure near 4th Circle.',  time:'4m', pulse:false},
                {dot:'#FF9F43',title:'Clustering — Alatroon',     msg:'BUS-104 & BUS-115 within 2 min.',time:'7m', pulse:false},
              ].map((a,i)=>(
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:9,padding:'.75rem 0',borderBottom:i<2?'1px solid #EEF3F8':'none'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:a.dot,flexShrink:0,marginTop:4,animation:a.pulse?'op-ping 2s infinite':undefined}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'.8rem',fontWeight:700,color:'#0F2240',marginBottom:2}}>{a.title}</div>
                    <div style={{fontSize:'.72rem',color:'#4A6580',lineHeight:1.45}}>{a.msg}</div>
                  </div>
                  <span style={{fontSize:'.72rem',color:'#7A92A8',fontWeight:500,flexShrink:0,marginTop:2}}>{a.time}</span>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Route Load" badge="Real data" badgeColor="#00A87C"><RoutePerf/></SectionCard>
          <SectionCard title="وزارة النقل Reports" badge="Export ready" badgeColor="#7C3AED">
            <div style={{padding:'.875rem',display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[{icon:'📊',title:'Daily Summary',   desc:`${REAL.totalBoardings.toLocaleString()} boardings`},
                {icon:'📍',title:'Route Efficiency',desc:'On-time · delay patterns'},
                {icon:'💡',title:'AI Recommendations',desc:'Where to add routes'},
                {icon:'📈',title:'Growth Forecast',  desc:'7 PM peak +8%/month'},
              ].map(r=>(
                <div key={r.title} style={{background:'#F4F8FB',borderRadius:10,padding:'.75rem',border:'1.5px solid #EEF3F8',cursor:'pointer',transition:'all .2s'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='#00C896';e.currentTarget.style.background='#E0FBF4';e.currentTarget.style.transform='translateY(-1px)';}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='#EEF3F8';e.currentTarget.style.background='#F4F8FB';e.currentTarget.style.transform='translateY(0)';}}>
                  <div style={{fontSize:18,marginBottom:4}}>{r.icon}</div>
                  <div style={{fontSize:'.75rem',fontWeight:700,color:'#0F2240',marginBottom:2}}>{r.title}</div>
                  <div style={{fontSize:'.67rem',color:'#7A92A8',lineHeight:1.4}}>{r.desc}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function FleetView({fleet,fleetFilter,setFleetFilter,search,setSearch,selectedId,setSelectedId,filteredFleet}:any) {
  const { t } = useLang();
  return (
    <div style={{background:'white',borderRadius:14,border:'1px solid #EEF3F8',boxShadow:'0 2px 10px rgba(15,34,64,.05)',overflow:'hidden'}}>
      <div style={{padding:'.875rem 1.1rem',borderBottom:'1px solid #EEF3F8',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
        <div><div style={{fontSize:'.9rem',fontWeight:700,color:'#0F2240'}}>Fleet Monitor — All {REAL.uniqueVehicles} Vehicles</div><div style={{fontSize:'.7rem',color:'#7A92A8',marginTop:1}}>Live telemetry · Amman Vision dataset</div></div>
        <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap'}}>
          {(['all','active','delayed','maintenance'] as const).map(f=>(
            <button key={f} onClick={()=>setFleetFilter(f)} style={{padding:'5px 11px',borderRadius:8,fontSize:'.75rem',fontWeight:600,border:`1.5px solid ${fleetFilter===f?'#00C896':'#EEF3F8'}`,background:fleetFilter===f?'#E0FBF4':'white',color:fleetFilter===f?'#00A87C':'#4A6580',cursor:'pointer',fontFamily:'inherit',transition:'all .15s',textTransform:'capitalize'}}>
              {f==='all'?'All':f==='active'?'🟢 Active':f==='delayed'?'🟡 Delayed':'🔧 Maintenance'}
            </button>
          ))}
          <div style={{position:'relative'}}>
            <Search size={12} style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'#7A92A8',pointerEvents:'none'}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search bus, route, driver…" style={{paddingLeft:26,paddingRight:10,paddingTop:6,paddingBottom:6,background:'#F4F8FB',border:'1.5px solid #DDE6EE',borderRadius:8,color:'#0F2240',fontSize:'.78rem',fontFamily:'inherit',outline:'none',width:200}}
              onFocus={e=>e.currentTarget.style.borderColor='#00C896'} onBlur={e=>e.currentTarget.style.borderColor='#DDE6EE'}/>
          </div>
        </div>
      </div>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#F4F8FB',borderBottom:'1px solid #EEF3F8'}}>
            {['Bus ID','Route','Driver','Status','Load','Delay','Speed','Actions'].map(h=>(
              <th key={h} style={{padding:'.55rem .9rem',textAlign:'left',fontSize:'9.5px',fontWeight:800,color:'#7A92A8',textTransform:'uppercase',letterSpacing:'.07em',whiteSpace:'nowrap'}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filteredFleet.map((bus:BusRow,i:number)=>{
              const sc=STATUS_CFG[bus.status];const isSel=selectedId===bus.id;
              return (
                <tr key={bus.id} onClick={()=>setSelectedId(isSel?null:bus.id)}
                  style={{borderBottom:'1px solid #EEF3F8',cursor:'pointer',transition:'background .12s',background:isSel?'#E0FBF4':'white',borderLeft:isSel?'3px solid #00C896':'3px solid transparent',animation:`op-row .3s ${i*.04}s ease both`}}
                  onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background='#F8FCFB';}} onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background='white';}}>
                  <td style={{padding:'.7rem .9rem'}}><span style={{fontFamily:'monospace',fontSize:'.82rem',fontWeight:700,color:'#0F2240'}}>{bus.id}</span></td>
                  <td style={{padding:'.7rem .9rem'}}><span style={{fontSize:'.8rem',fontWeight:600,color:'#4A6580'}}>{bus.route}</span></td>
                  <td style={{padding:'.7rem .9rem'}}><span style={{fontSize:'.77rem',color:'#7A92A8'}}>{bus.driver}</span></td>
                  <td style={{padding:'.7rem .9rem'}}><span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:99,background:sc.bg,color:sc.color}}><span style={{width:5,height:5,borderRadius:'50%',background:sc.dot,display:'inline-block'}}/>{sc.status==='active'?t.operator.active:sc.status==='delayed'?t.operator.delayed2:sc.status==='maintenance'?t.operator.maintenance:t.operator.inDepot}</span></td>
                  <td style={{padding:'.7rem .9rem'}}><LoadBar pct={Math.round(bus.load)}/></td>
                  <td style={{padding:'.7rem .9rem'}}>{bus.delay>0?<span style={{fontSize:'.8rem',fontWeight:700,color:'#C87800'}}>+{Math.round(bus.delay)}m</span>:<span style={{fontSize:'.77rem',color:'#7A92A8'}}>—</span>}</td>
                  <td style={{padding:'.7rem .9rem'}}>{bus.speed>0?<span style={{fontSize:'.78rem',color:'#4A6580'}}>{Math.round(bus.speed)} km/h</span>:<span style={{fontSize:'.77rem',color:'#7A92A8'}}>—</span>}</td>
                  <td style={{padding:'.7rem .9rem',textAlign:'right'}}>
                    <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                      <button onClick={e=>e.stopPropagation()} style={{fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:6,border:'1.5px solid #EEF3F8',background:'white',color:'#4A6580',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:3}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor='#00C896';e.currentTarget.style.color='#00A87C';e.currentTarget.style.background='#E0FBF4';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#EEF3F8';e.currentTarget.style.color='#4A6580';e.currentTarget.style.background='white';}}><Send size={9}/> Msg</button>
                      <button onClick={e=>e.stopPropagation()} style={{fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:6,border:'1.5px solid #EEF3F8',background:'white',color:'#4A6580',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:3}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor='#FF6B35';e.currentTarget.style.color='#FF6B35';e.currentTarget.style.background='#FFF0EA';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#EEF3F8';e.currentTarget.style.color='#4A6580';e.currentTarget.style.background='white';}}><Zap size={9}/> Dispatch</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{padding:'.6rem .9rem',borderTop:'1px solid #EEF3F8',background:'#F4F8FB'}}>
        <span style={{fontSize:'.68rem',color:'#7A92A8'}}>{filteredFleet.length} vehicles shown · {REAL.uniqueVehicles} in Amman Vision dataset</span>
      </div>
    </div>
  );
}

function MapView({fleet}:{fleet:BusRow[]}) {
  return (
    <SectionCard title="Live Network Map — Amman" sub={`${REAL.uniqueVehicles} vehicles · ${REAL.uniqueRoutes} routes in Amman Vision dataset`} badge="● 6 Live" badgeColor="#00A87C">
      <div style={{height:'calc(100vh - 16rem)',minHeight:400}}>
        <MapPreview height="100%" center={[31.955,35.895]} zoom={13}
          markers={fleet.filter(b=>b.status!=='depot').map((b,i)=>({position:[31.955+(i*.015-.035),35.895+(i*.012-.03)] as [number,number],label:`${b.id} · ${b.route}`}))}/>
      </div>
    </SectionCard>
  );
}

function DemandView() {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {[{v:'18,038',l:'Total Boardings',s:'Real data',c:'#00C896'},{v:'7:00 PM',l:'Peak Hour',s:'1,644 boardings',c:'#7C3AED'},{v:'4,344',l:'Busiest Route',s:'Alatroon–Mahatta',c:'#FF6B35'},{v:'82%',l:'Adult Passengers',s:'14,778 adults',c:'#3B9EFF'}].map(k=>(
          <div key={k.l} style={{background:'white',borderRadius:13,border:'1px solid #EEF3F8',padding:'1.1rem',textAlign:'center',boxShadow:'0 2px 8px rgba(15,34,64,.05)'}}>
            <div style={{fontSize:'1.6rem',fontWeight:900,color:k.c,letterSpacing:'-.03em'}}>{k.v}</div>
            <div style={{fontSize:'.78rem',fontWeight:700,color:'#0F2240',marginTop:4}}>{k.l}</div>
            <div style={{fontSize:'.68rem',color:'#7A92A8',marginTop:3}}>{k.s}</div>
          </div>
        ))}
      </div>
      <SectionCard title="Hourly Boarding Pattern (Real Data)" sub="From 18,038 real Amman Vision boardings" badge="AI Predicted" badgeColor="#7C3AED">
        <DemandChart/>
      </SectionCard>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <SectionCard title="Passenger Types" sub="Real breakdown from card_usage data" badge="Real data" badgeColor="#00A87C"><PassengerBreakdown/></SectionCard>
        <SectionCard title="Route Load" sub="Current occupancy per route" badge="Live" badgeColor="#00A87C"><RoutePerf/></SectionCard>
      </div>
    </div>
  );
}

function AIView({recs,onAccept,onDismiss,accepted}:any) {
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
      <SectionCard title="AI Dispatch Recommendations" sub={`${recs.length} pending · trained on ${REAL.totalBoardings.toLocaleString()} real boardings`} badge={recs.some((r:Rec)=>r.urgent)?'Urgent':undefined} badgeColor="#C87800">
        <DispatchPanel recs={recs} onAccept={onAccept} onDismiss={onDismiss} accepted={accepted}/>
      </SectionCard>
      <div style={{background:'linear-gradient(135deg,#0F2240,#1E3A5F)',borderRadius:14,padding:'1.25rem',color:'white',boxShadow:'0 8px 28px rgba(15,34,64,.2)'}}>
        <div style={{fontSize:'.7rem',fontWeight:800,color:'#00C896',textTransform:'uppercase',letterSpacing:'.09em',marginBottom:14}}>✦ AI System Status</div>
        {[{label:'Model trained on',value:`${REAL.totalBoardings.toLocaleString()} boardings`,icon:'📊'},
          {label:'Routes analysed',  value:`${REAL.uniqueRoutes} routes`,                      icon:'📍'},
          {label:'Vehicles tracked', value:`${REAL.uniqueVehicles} vehicles`,                  icon:'🚌'},
          {label:'Peak hour',        value:REAL.peakHour,                                      icon:'⏰'},
          {label:'Busiest route',    value:'Alatroon–Mahatta',                                 icon:'🏆'},
          {label:'Model accuracy',   value:'94% confidence',                                   icon:'✓'},
        ].map(item=>(
          <div key={item.label} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,padding:'.75rem',background:'rgba(255,255,255,.06)',borderRadius:10}}>
            <span style={{fontSize:18}}>{item.icon}</span>
            <div><div style={{fontSize:'.7rem',color:'rgba(255,255,255,.5)',fontWeight:500}}>{item.label}</div><div style={{fontSize:'.85rem',fontWeight:700,color:'white'}}>{item.value}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertsView() {
  const alerts=[
    {dot:'#FF5252',title:'Route 35 — 100% Capacity',msg:'Bus BUS-209 is fully loaded. 42 passengers waiting at Gardens Junction. AI recommends holding at Shmeisani for 2 min.',time:'Just now',type:'Critical',pulse:true},
    {dot:'#FF9F43',title:'BUS-088 — +9 min delay',   msg:'Road closure near 4th Circle. AI recommends rerouting via Mecca Street to save 9 minutes.',time:'4 min ago',type:'Warning',pulse:false},
    {dot:'#FF9F43',title:'Clustering — Alatroon',    msg:'BUS-104 and BUS-115 within 2 min. Dispatch BUS-402 from depot to restore 8-min headway.',time:'7 min ago',type:'Warning',pulse:false},
    {dot:'#3B9EFF',title:'Peak Hour in 45 min',      msg:'AI predicts 7 PM peak. Based on 1,644 historical boardings, recommend increasing frequency on Alatroon–Mahatta.',time:'12 min ago',type:'Info',pulse:false},
    {dot:'#00C896',title:'BUS-311 Ahead of Schedule',msg:'Route 12 Express running 3 min early. No action required.',time:'18 min ago',type:'Good',pulse:false},
  ];
  return (
    <SectionCard title="Active Alerts" sub="Real-time system notifications" badge="3 Critical" badgeColor="#CC0000">
      <div style={{padding:'0 1.1rem'}}>
        {alerts.map((a,i)=>(
          <div key={i} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'.875rem 0',borderBottom:i<alerts.length-1?'1px solid #EEF3F8':'none'}}>
            <div style={{width:9,height:9,borderRadius:'50%',background:a.dot,flexShrink:0,marginTop:5,animation:a.pulse?'op-ping 2s infinite':undefined}}/>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                <span style={{fontSize:'.84rem',fontWeight:700,color:'#0F2240'}}>{a.title}</span>
                <span style={{fontSize:10,fontWeight:700,padding:'1px 7px',borderRadius:99,background:a.dot==='#FF5252'?'#FFECEC':a.dot==='#FF9F43'?'#FFF4E6':a.dot==='#3B9EFF'?'#EEF5FF':'#E0FBF4',color:a.dot}}>{a.type}</span>
              </div>
              <div style={{fontSize:'.78rem',color:'#4A6580',lineHeight:1.5}}>{a.msg}</div>
            </div>
            <span style={{fontSize:'.72rem',color:'#7A92A8',fontWeight:500,flexShrink:0,marginTop:3}}>{a.time}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function ReportsView() {
  const [downloading, setDownloading] = useState<string|null>(null);

  const download = (filename: string, label: string) => {
    setDownloading(label);
    const link = document.createElement('a');
    link.href = `/reports/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloading(null), 2000);
  };

  const reports=[
    {icon:'📊',title:'Daily Summary Report',   desc:`${REAL.totalBoardings.toLocaleString()} boardings · vehicle utilisation · on-time performance`,badge:'PDF ready',  color:'#00C896', file:'daily_summary_report.pdf'},
    {icon:'📍',title:'Route Efficiency Report', desc:'On-time rates · delay patterns · clustering across 27 routes',                                   badge:'Excel ready',color:'#3B9EFF', file:'route_efficiency_report.xlsx'},
    {icon:'💡',title:'AI Recommendations',      desc:'Where to add routes based on demand prediction model.',                                          badge:'AI powered', color:'#7C3AED', file:'daily_summary_report.pdf'},
    {icon:'📈',title:'Demand Growth Forecast',  desc:'7 PM peak growing. Alatroon–Mahatta needs 2 extra buses next quarter.',                          badge:'Forecast',   color:'#FF9F43', file:'route_efficiency_report.xlsx'},
    {icon:'💳',title:'Payment Methods Report',  desc:'82% Adult · 12% EMV · 6% Mobile QR. Digital adoption growing.',                                  badge:'Insight',    color:'#10B981', file:'daily_summary_report.pdf'},
    {icon:'🗺',title:'Network Coverage Report', desc:'Coverage map of all 27 routes with gap analysis for unserved areas.',                             badge:'Map view',   color:'#FF6B35', file:'route_efficiency_report.xlsx'},
  ];
  return (
    <div style={{background:'white',borderRadius:14,border:'1px solid #EEF3F8',boxShadow:'0 2px 10px rgba(15,34,64,.05)',padding:'1.25rem 1.5rem'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:'1.25rem'}}>
        <div style={{width:40,height:40,borderRadius:10,background:'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>📋</div>
        <div><div style={{fontSize:'1rem',fontWeight:800,color:'#0F2240'}}>وزارة النقل — Government Reports</div><div style={{fontSize:'.78rem',color:'#7A92A8',marginTop:2}}>Export-ready reports from {REAL.totalBoardings.toLocaleString()} real Amman Vision boardings</div></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        {reports.map(r=>(
          <div key={r.title} style={{background:'#F4F8FB',borderRadius:12,padding:'1.1rem',border:'1.5px solid #EEF3F8',cursor:'pointer',transition:'all .2s'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=r.color;e.currentTarget.style.background='white';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 6px 20px ${r.color}22`;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='#EEF3F8';e.currentTarget.style.background='#F4F8FB';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';}}
            onClick={()=>download(r.file,r.title)}>
            <div style={{fontSize:24,marginBottom:8}}>
              {downloading===r.title ? '⏳' : r.icon}
            </div>
            <div style={{fontSize:'.85rem',fontWeight:700,color:'#0F2240',marginBottom:4}}>{r.title}</div>
            <div style={{fontSize:'.74rem',color:'#4A6580',lineHeight:1.5,marginBottom:10}}>{r.desc}</div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:10,fontWeight:700,padding:'2px 9px',borderRadius:99,background:`${r.color}18`,color:r.color}}>{downloading===r.title?'Downloading…':r.badge}</span>
              <span style={{fontSize:10,color:'#7A92A8'}}>↓</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComingSoon({view}:{view:string}) {
  return (
    <div style={{background:'white',borderRadius:14,border:'1px solid #EEF3F8',padding:'3rem',textAlign:'center',boxShadow:'0 2px 10px rgba(15,34,64,.05)'}}>
      <div style={{fontSize:48,marginBottom:12}}>{view==='routes'?'📍':'⚙'}</div>
      <div style={{fontSize:'1.1rem',fontWeight:800,color:'#0F2240',marginBottom:6}}>{view==='routes'?'Route Manager':'Settings'}</div>
      <div style={{fontSize:'.85rem',color:'#7A92A8',maxWidth:400,margin:'0 auto'}}>{view==='routes'?'Route management — add, edit and optimise routes based on real demand data.':'System configuration, API connections, notification preferences.'}</div>
      <div style={{marginTop:'1.5rem',padding:'1rem 1.5rem',background:'#F4F8FB',borderRadius:10,display:'inline-block',fontSize:'.8rem',color:'#7A92A8',border:'1.5px dashed #DDE6EE'}}>🚧 Coming in next sprint</div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────── */
export function OperatorDashboard() {
  const { t, isRTL, lang } = useLang();

  const {user,logout}       = useAuth();
  const [fleet,setFleet]    = useState<BusRow[]>(FLEET_DATA);
  const [recs,setRecs]      = useState<Rec[]>(RECS_DATA);
  const [accepted,setAccepted] = useState<string[]>([]);
  const [view,setView]      = useState<SideView>('dashboard');
  const [fleetFilter,setFleetFilter] = useState<'all'|BusStatus>('all');
  const [search,setSearch]  = useState('');
  const [selectedId,setSelectedId] = useState<string|null>(null);
  const [mounted,setMounted]= useState(false);
  const [refreshing,setRefreshing] = useState(false);
  const [clock,setClock]    = useState('');
  const [alertDismissed,setAlertDismissed] = useState(false);

  useEffect(()=>{setTimeout(()=>setMounted(true),60);},[]);
  useEffect(()=>{const tick=()=>setClock(new Date().toLocaleTimeString('en-GB'));tick();const iv=setInterval(tick,1000);return()=>clearInterval(iv);},[]);
  useEffect(()=>{const iv=setInterval(()=>setFleet(prev=>prev.map(b=>b.status==='active'?{...b,load:Math.min(100,Math.max(10,b.load+(Math.random()-.5)*5)),speed:Math.min(70,Math.max(5,b.speed+(Math.random()-.5)*7))}:b)),8000);return()=>clearInterval(iv);},[]);

  const handleAccept  = (id:string)=>{setAccepted(p=>[...p,id]);setRecs(p=>p.filter(r=>r.id!==id));};
  const handleDismiss = (id:string)=>setRecs(p=>p.filter(r=>r.id!==id));

  const filteredFleet = fleet.filter(b=>{
    const matchS = fleetFilter==='all'||b.status===fleetFilter;
    const q = search.toLowerCase();
    const matchQ = !q||b.id.toLowerCase().includes(q)||b.route.toLowerCase().includes(q)||b.driver.toLowerCase().includes(q);
    return matchS&&matchQ;
  });

  const NAV = [
    {section:'Operations', items:[
      {key:'dashboard',icon:'📊',label:'Dashboard'},
      {key:'fleet',    icon:'🚌',label:'Fleet Monitor'},
      {key:'map',      icon:'🗺',label:'Live Map'},
      {key:'routes',   icon:'📍',label:'Route Manager'},
    ]},
    {section:'Intelligence', items:[
      {key:'ai',      icon:'✦', label:'AI Dispatch',      badge:recs.length>0?String(recs.length):null,badgeRed:true},
      {key:'demand',  icon:'📈',label:'Demand Analysis'},
      {key:'reports', icon:'📋',label:'MOT Reports',      badge:'New',badgeRed:false},
    ]},
    {section:'System', items:[
      {key:'alerts',  icon:'🔔',label:'Alerts', badge:'3',badgeRed:true},
      {key:'settings',icon:'⚙', label:'Settings'},
    ]},
  ];

  return (
    <div style={{display:'flex',height:'calc(100vh - 4rem)',background:'#F4F8FB',overflow:'hidden'}}>
      <style>{`
        @keyframes op-fade  {from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes op-live  {0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes op-spin  {to{transform:rotate(360deg)}}
        @keyframes op-ping  {0%{transform:scale(1);opacity:.8}70%{transform:scale(2.2);opacity:0}100%{opacity:0}}
        @keyframes op-pulse {0%,100%{box-shadow:0 0 0 0 rgba(255,159,67,.4)}50%{box-shadow:0 0 0 7px rgba(255,159,67,0)}}
        @keyframes op-row   {from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
      `}</style>

      {/* SIDEBAR */}
      <div style={{width:228,flexShrink:0,background:'white',borderRight:'1px solid #EEF3F8',display:'flex',flexDirection:'column',boxShadow:'2px 0 16px rgba(15,34,64,.06)'}}>
        <div style={{padding:'1.1rem 1.25rem 1rem',borderBottom:'1px solid #EEF3F8'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:38,height:38,borderRadius:'50%',background:'#E0FBF4',border:'2px solid #B3F0E0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🚌</div>
            <div>
              <div style={{fontSize:'1rem',fontWeight:900,color:'#0F2240',letterSpacing:'-.02em',lineHeight:1.1}}>Smart<span style={{color:'#00C896'}}>Transit</span></div>
              <div style={{fontSize:'.6rem',color:'#7A92A8',fontWeight:600,letterSpacing:'.05em',textTransform:'uppercase'}}>Jordan</div>
            </div>
          </div>
        </div>
        <div style={{background:'linear-gradient(135deg,#0F2240,#1E3A5F)',margin:'.75rem',borderRadius:10,padding:'.65rem .875rem'}}>
          <div style={{fontSize:'.62rem',fontWeight:700,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:2}}>Connected to</div>
          <div style={{fontSize:'.82rem',fontWeight:800,color:'white',lineHeight:1.3}}>وزارة النقل</div>
          <div style={{fontSize:'.65rem',color:'rgba(255,255,255,.45)',fontWeight:500}}>Ministry of Transport · Jordan</div>
        </div>
        <div style={{flex:1,overflowY:'auto'}}>
          {NAV.map(group=>(
            <div key={group.section}>
              <div style={{fontSize:'.62rem',fontWeight:800,color:'#7A92A8',textTransform:'uppercase',letterSpacing:'.09em',padding:'.75rem 1.25rem .3rem',marginTop:'.25rem'}}>{group.section}</div>
              {group.items.map((item:any)=>{
                const isActive=view===item.key;
                return (
                  <div key={item.key} onClick={()=>setView(item.key as SideView)}
                    style={{display:'flex',alignItems:'center',gap:9,padding:'.6rem 1.25rem',cursor:'pointer',fontSize:'.84rem',fontWeight:isActive?700:500,color:isActive?'#00A87C':'#4A6580',background:isActive?'#E0FBF4':'transparent',borderLeft:`3px solid ${isActive?'#00C896':'transparent'}`,transition:'all .15s',marginBottom:2}}
                    onMouseEnter={e=>{if(!isActive){e.currentTarget.style.background='#F4F8FB';e.currentTarget.style.color='#0F2240';}}}
                    onMouseLeave={e=>{if(!isActive){e.currentTarget.style.background='transparent';e.currentTarget.style.color='#4A6580';}}}>
                    <span style={{width:20,textAlign:'center',fontSize:14,flexShrink:0}}>{item.icon}</span>
                    {item.label}
                    {item.badge&&<span style={{marginLeft:'auto',fontSize:10,fontWeight:800,padding:'1px 7px',borderRadius:99,background:item.badgeRed?'#FFECEC':'#E0FBF4',color:item.badgeRed?'#CC0000':'#00A87C'}}>{item.badge}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{padding:'.875rem 1.25rem',borderTop:'1px solid #EEF3F8',display:'flex',alignItems:'center',gap:9}}>
          <div style={{width:34,height:34,borderRadius:'50%',background:'#0F2240',color:'#00C896',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,flexShrink:0}}>{user?.name?.charAt(0).toUpperCase()??'F'}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:'.82rem',fontWeight:700,color:'#0F2240',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.name??'Fleet Admin'}</div>
            <div style={{fontSize:'.68rem',color:'#7A92A8',fontWeight:500}}>وزارة النقل</div>
          </div>
          <button onClick={logout} style={{background:'none',border:'none',cursor:'pointer',color:'#7A92A8',fontSize:16,padding:'2px 4px',flexShrink:0,transition:'color .15s'}}
            onMouseEnter={e=>e.currentTarget.style.color='#FF5252'} onMouseLeave={e=>e.currentTarget.style.color='#7A92A8'}>⎋</button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {/* Topbar */}
        <div style={{background:'white',borderBottom:'1px solid #EEF3F8',padding:'.875rem 1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexShrink:0,boxShadow:'0 2px 8px rgba(15,34,64,.04)'}}>
          <div>
            <div style={{fontSize:'1.15rem',fontWeight:800,color:'#0F2240',letterSpacing:'-.025em'}}>{({dashboard:'Operator Dashboard',fleet:'Fleet Monitor',map:'Live Map',routes:'Route Manager',ai:'AI Dispatch',demand:'Demand Analysis',reports:'MOT Reports',alerts:'Active Alerts',settings:'Settings'} as Record<SideView,string>)[view]}</div>
            <div style={{fontSize:'.75rem',color:'#7A92A8',fontWeight:500,marginTop:2}}>SmartTransit Jordan · وزارة النقل</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <div style={{display:'flex',alignItems:'center',gap:5,padding:'4px 11px',background:'#E0FBF4',borderRadius:99,border:'1px solid #B3F0E0'}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:'#00C896',animation:'op-live 1.4s infinite',flexShrink:0}}/>
              <span style={{fontSize:'.75rem',fontWeight:700,color:'#00A87C'}}>Live · Amman</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:5,padding:'4px 11px',background:'#EDE9FE',borderRadius:99,border:'1px solid rgba(124,58,237,.2)'}}>
              <span style={{fontSize:'.72rem',fontWeight:700,color:'#7C3AED'}}>📊 18,038 Real Boardings</span>
            </div>
            <div style={{fontFamily:'monospace',fontSize:'.78rem',fontWeight:700,color:'#0F2240',background:'#F4F8FB',padding:'5px 11px',borderRadius:9,border:'1px solid #EEF3F8'}}>{clock}</div>
            <div style={{position:'relative'}}>
              <button style={{width:34,height:34,borderRadius:9,border:'1.5px solid #EEF3F8',background:'white',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:15}} onClick={()=>setView('alerts')}>🔔</button>
              <span style={{position:'absolute',top:-4,right:-4,width:16,height:16,borderRadius:'50%',background:'#FF5252',border:'2px solid #F4F8FB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:'white'}}>{recs.filter(r=>r.urgent).length+1}</span>
            </div>
            <button onClick={()=>setRefreshing(true)} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 13px',borderRadius:9,border:'1.5px solid #EEF3F8',background:'white',color:'#4A6580',fontSize:'.78rem',fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#00C896';e.currentTarget.style.color='#00A87C';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#EEF3F8';e.currentTarget.style.color='#4A6580';}}>
              <RefreshCw size={13} style={refreshing?{animation:'op-spin 0.8s linear infinite'}:{}}/> Refresh
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{flex:1,overflowY:'auto',padding:'1.25rem 1.5rem 2rem'}}>
          {view==='dashboard' && <DashboardView fleet={fleet} recs={recs} accepted={accepted} onAccept={handleAccept} onDismiss={handleDismiss} alertDismissed={alertDismissed} setAlertDismissed={setAlertDismissed} fleetFilter={fleetFilter} setFleetFilter={setFleetFilter} search={search} setSearch={setSearch} selectedId={selectedId} setSelectedId={setSelectedId} filteredFleet={filteredFleet}/>}
          {view==='fleet'     && <FleetView fleet={fleet} fleetFilter={fleetFilter} setFleetFilter={setFleetFilter} search={search} setSearch={setSearch} selectedId={selectedId} setSelectedId={setSelectedId} filteredFleet={filteredFleet}/>}
          {view==='map'       && <MapView fleet={fleet}/>}
          {view==='demand'    && <DemandView/>}
          {view==='ai'        && <AIView recs={recs} onAccept={handleAccept} onDismiss={handleDismiss} accepted={accepted}/>}
          {view==='alerts'    && <AlertsView/>}
          {view==='reports'   && <ReportsView/>}
          {(view==='routes'||view==='settings') && <ComingSoon view={view}/>}
        </div>
      </div>
    </div>
  );
}
