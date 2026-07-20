"""
SmartTransit Jordan — Mock Data Layer
Phase 1: Hardcoded data from real Amman Vision stats
Phase 2: Replace with real DB queries
"""

import random
import numpy as np
from datetime import datetime, timedelta
from typing import List, Optional

random.seed(42)
np.random.seed(42)

REAL_STATS = {
    "total_boardings":  18038,
    "unique_vehicles":  104,
    "unique_routes":    27,
    "peak_hour":        19,
    "peak_hour_label":  "7:00 PM",
    "peak_count":       1644,
    "on_time_rate":     0.87,
    "busiest_route":    "Alatroon–Al Mahatta Terminal",
    "busiest_count":    4344,
    "passengers": {
        "Adult":     14778,
        "EMV":       2161,
        "Mobile QR": 1052,
        "Free Card": 46,
    }
}

HOURLY_DEMAND = {
    5:120,  6:380,  7:820,  8:1150, 9:960,
    10:680, 11:540, 12:610, 13:720, 14:640,
    15:710, 16:890, 17:1180,18:1420,19:1644,
    20:1210,21:880, 22:540, 23:280,
}

ROUTES_DATA = [
    {"route_id":"R01","route_name":"Alatroon–Al Mahatta","code":"ALA-MAH","type":"Coaster","boardings":4344,"stops":18,"distance":12.5,"duration":45,"vehicles":8,"color":"#00C896"},
    {"route_id":"R02","route_name":"Sarfees Direct",     "code":"SAR-DIR","type":"Sarfees","boardings":3102,"stops":12,"distance":8.2, "duration":30,"vehicles":6,"color":"#3B9EFF"},
    {"route_id":"R03","route_name":"Route 35",           "code":"RT-35",  "type":"Coaster","boardings":2891,"stops":22,"distance":15.1,"duration":55,"vehicles":7,"color":"#FF6B35"},
    {"route_id":"R04","route_name":"Route 12 Express",   "code":"RT-12X", "type":"Express","boardings":2340,"stops":8, "distance":10.3,"duration":25,"vehicles":5,"color":"#A78BFA"},
    {"route_id":"R05","route_name":"Route 15",           "code":"RT-15",  "type":"Coaster","boardings":1876,"stops":19,"distance":13.7,"duration":50,"vehicles":5,"color":"#FF9F43"},
    {"route_id":"R06","route_name":"Route 6",            "code":"RT-06",  "type":"Sarfees","boardings":1654,"stops":14,"distance":9.4, "duration":35,"vehicles":4,"color":"#10B981"},
    {"route_id":"R07","route_name":"Route 27",           "code":"RT-27",  "type":"Coaster","boardings":1831,"stops":16,"distance":11.2,"duration":40,"vehicles":5,"color":"#FF5252"},
]

DRIVERS = ["Omar K.","Ahmad S.","Samer A.","Tariq N.","Khalid M.",
           "Faris J.","Rami H.","Nizar W.","Bassam T.","Walid F."]

EDGE_IDS = ["156738306#2","-156738299#1","149881366#2",
            "-149881316#15","688438635#0","-156725033#0",
            "149813592#2","-150957664#1","-150948580#12"]

CONGESTION_THRESHOLDS = {
    "speed_gridlock": 1.0,
    "speed_high":     10.0,
    "speed_moderate": 25.0,
    "density_high":   100.0,
    "waiting_high":   300.0,
    "flow_high":      100.0,
}

def rule_based_congestion(speed, density, waiting_time, flow, hour, is_peak):
    t = CONGESTION_THRESHOLDS
    if speed <= t["speed_gridlock"] and waiting_time > t["waiting_high"]:
        level = "High"; conf = 0.94
        probs = {"Low":0.01,"Medium":0.05,"High":0.94}
    elif speed <= t["speed_high"] or density >= t["density_high"]:
        level = "High"; conf = 0.88
        probs = {"Low":0.05,"Medium":0.10,"High":0.85}
    elif is_peak and flow >= t["flow_high"] and speed <= t["speed_moderate"]:
        level = "High"; conf = 0.78
        probs = {"Low":0.10,"Medium":0.15,"High":0.75}
    elif speed <= t["speed_moderate"] or (is_peak and density > 20):
        level = "Medium"; conf = 0.75
        probs = {"Low":0.15,"Medium":0.70,"High":0.15}
    else:
        level = "Low"; conf = 0.91
        probs = {"Low":0.90,"Medium":0.08,"High":0.02}

    colors = {"Low":"#00C896","Medium":"#FF9F43","High":"#FF5252"}
    advice = {
        "Low":    "Traffic flowing freely.",
        "Medium": "Moderate congestion. Allow extra 5–10 minutes.",
        "High":   "Heavy congestion. Consider rerouting.",
    }
    return {"level":level,"confidence":conf,"probabilities":probs,
            "color":colors[level],"advice":advice[level],"model_type":"rule-based"}

def rule_based_crowding(route_id, hour, day, speed=None, density=None):
    demand      = HOURLY_DEMAND.get(hour, 500)
    max_demand  = max(HOURLY_DEMAND.values())
    demand_ratio= demand / max_demand
    route_mult  = {"R01":1.45,"R02":1.20,"R03":1.25,"R04":0.90,
                   "R05":0.95,"R06":0.85,"R07":1.00}.get(route_id, 1.0)
    weekend_mult= 0.75 if day >= 4 else 1.0
    load        = demand_ratio * route_mult * weekend_mult

    if load >= 0.90:
        level="Full";   prob=min(0.98,load); color="#FF5252"; emoji="🔴"
        advice="Bus likely full. Take the next departure."
        probs={"Low":0.01,"Moderate":0.04,"High":0.10,"Full":round(prob,2)}
    elif load >= 0.70:
        level="High";   prob=round(load*0.85,2); color="#FF6B35"; emoji="🟠"
        advice="Crowded. Consider the next bus."
        probs={"Low":0.05,"Moderate":0.15,"High":round(prob,2),"Full":0.10}
    elif load >= 0.40:
        level="Moderate";prob=round(0.55+load*0.2,2); color="#FF9F43"; emoji="🟡"
        advice="Some standing. Comfortable for short trips."
        probs={"Low":0.15,"Moderate":round(prob,2),"High":0.20,"Full":0.05}
    else:
        level="Low";    prob=round(0.85-load*0.3,2); color="#00C896"; emoji="🟢"
        advice="Comfortable — plenty of seats."
        probs={"Low":round(prob,2),"Moderate":0.20,"High":0.05,"Full":0.01}

    total = sum(probs.values())
    probs = {k: round(v/total,3) for k,v in probs.items()}
    return {"level":level,"probability":prob,"confidence":"High" if prob>0.75 else "Medium",
            "color":color,"emoji":emoji,"advice":advice,"probabilities":probs,
            "model_type":"rule-based","model_accuracy":None}

def get_fleet():
    statuses = ["active"]*6+["delayed"]*2+["maintenance"]+["depot"]
    hour     = datetime.now().hour
    is_peak  = hour in [7,8,9,17,18,19,20]
    vehicles = []
    for i, route in enumerate(ROUTES_DATA[:8]):
        status = statuses[i]
        load   = round(random.uniform(60,100),1) if status=="active" and is_peak else round(random.uniform(20,70),1) if status=="active" else 0
        delay  = round(random.uniform(5,15),1) if status=="delayed" else 0
        speed  = round(random.uniform(15,55),1) if status=="active" else 0
        vehicles.append({
            "vehicle_id": f"BUS-{100+i*111}",
            "route_id":   route["route_id"],
            "route_name": route["route_name"],
            "driver":     DRIVERS[i % len(DRIVERS)],
            "status":     status, "load_pct":load, "delay_min":delay, "speed_kmh":speed,
            "position":   {"lat":round(31.9539+random.uniform(-0.05,0.05),4),
                           "lon":round(35.9106+random.uniform(-0.05,0.05),4)},
            "last_stop":  random.choice(["Sweileh","Gardens","Shmeisani","Abdali"]),
            "next_stop":  random.choice(["Al Mahatta","Tabarbour","University St"]),
            "passengers": int(load/100*28), "capacity":28,
        })
    return vehicles

def get_fleet_summary():
    fleet   = get_fleet()
    active  = sum(1 for v in fleet if v["status"]=="active")
    delayed = sum(1 for v in fleet if v["status"]=="delayed")
    maint   = sum(1 for v in fleet if v["status"]=="maintenance")
    depot   = sum(1 for v in fleet if v["status"]=="depot")
    loads   = [v["load_pct"] for v in fleet if v["status"]=="active"]
    return {"total_vehicles":len(fleet),"active":active,"delayed":delayed,
            "maintenance":maint,"in_depot":depot,
            "avg_load_pct":round(sum(loads)/len(loads),1) if loads else 0,
            "avg_delay_min":round(sum(v["delay_min"] for v in fleet)/len(fleet),1),
            "timestamp":datetime.now().isoformat()}

def get_all_routes():
    return ROUTES_DATA

def get_route_detail(route_id):
    route = next((r for r in ROUTES_DATA if r["route_id"]==route_id), None)
    if not route: return None
    stops = [{"stop_id":f"S{route_id}{j:02d}","stop_name":name,
               "lat":round(31.95+j*0.008,4),"lon":round(35.90+j*0.006,4),"sequence":j}
              for j,name in enumerate(["Sweileh","Sports City","University","Gardens",
              "Shmeisani","Abdali","Downtown","Al Mahatta"][:route["stops"]],1)]
    return {**route,"stops":stops,
            "hourly_demand":{str(h):v for h,v in HOURLY_DEMAND.items()},
            "on_time_rate":round(random.uniform(0.78,0.94),2)}

def get_departures(route_id, hour):
    now    = datetime.now()
    h      = hour or now.hour
    routes = [r for r in ROUTES_DATA if not route_id or r["route_id"]==route_id]
    deps   = []
    for i,route in enumerate(routes[:6]):
        depart = now.replace(minute=0,second=0)+timedelta(minutes=i*12+random.randint(0,5))
        arrive = depart+timedelta(minutes=route["duration"])
        crowd  = rule_based_crowding(route["route_id"],h,now.weekday())
        deps.append({"route_id":route["route_id"],"route_name":route["route_name"],
                     "departs_at":depart.strftime("%I:%M %p"),
                     "arrives_at":arrive.strftime("%I:%M %p"),
                     "duration_min":route["duration"],
                     "fare_jd":0.35 if route["type"]!="Express" else 0.50,
                     "crowding":crowd["level"],"vehicle_type":route["type"],
                     "platform":random.choice(["A","B","C"]),
                     "status":"On time" if random.random()>0.2 else f"Delayed +{random.randint(3,12)}m",
                     "delay_min":0 if random.random()>0.2 else random.randint(3,12)})
    return deps

def get_active_alerts():
    now = datetime.now().isoformat()
    return [
        {"alert_id":1,"severity":"Critical","title":"Route 35 — 100% Capacity",
         "message":"BUS-209 fully loaded. 42 passengers waiting at Gardens Junction.",
         "route_id":"R03","edge_id":None,"created_at":now,"is_active":True,"ai_generated":True},
        {"alert_id":2,"severity":"Warning","title":"BUS-088 — +9 min delay",
         "message":"Road closure near 4th Circle. Reroute via Mecca Street saves 9 min.",
         "route_id":"R05","edge_id":"-149881316#15","created_at":now,"is_active":True,"ai_generated":True},
        {"alert_id":3,"severity":"Warning","title":"Vehicle Clustering — Alatroon",
         "message":"BUS-104 and BUS-115 within 2 min. Dispatch BUS-402.",
         "route_id":"R01","edge_id":None,"created_at":now,"is_active":True,"ai_generated":True},
    ]

def get_ai_recommendations():
    now = datetime.now().isoformat()
    return [
        {"rec_id":1,"vehicle_id":"BUS-402","action":"dispatch","urgent":True,
         "reason":"Clustering on Alatroon–Mahatta: BUS-104 & BUS-115 are 2 min apart.",
         "impact":"Restores 8-min headway. ~340 passengers benefit.","confidence":0.94,"created_at":now},
        {"rec_id":2,"vehicle_id":"BUS-088","action":"reroute","urgent":True,
         "reason":"Road closure near 4th Circle.","confidence":0.88,
         "impact":"Alternate via Mecca St saves 9 min. 127 on-board passengers.","created_at":now},
    ]

def get_dashboard_kpis():
    summary = get_fleet_summary()
    return {"total_boardings":REAL_STATS["total_boardings"],
            "active_fleet":f"{summary['active']}/{summary['total_vehicles']}",
            "avg_load":f"{summary['avg_load_pct']}%",
            "peak_hour":REAL_STATS["peak_hour_label"],
            "peak_count":REAL_STATS["peak_count"],
            "on_time_rate":f"{int(REAL_STATS['on_time_rate']*100)}%",
            "unique_vehicles":REAL_STATS["unique_vehicles"],
            "unique_routes":REAL_STATS["unique_routes"],
            "timestamp":datetime.now().isoformat()}

def get_hourly_demand_data():
    max_d = max(HOURLY_DEMAND.values())
    return [{"hour":h,"label":f"{h}am" if h<12 else "12pm" if h==12 else f"{h-12}pm",
             "boardings":v,"forecast":int(v*1.08),"is_peak":h in [7,8,9,17,18,19,20]}
            for h,v in HOURLY_DEMAND.items()]

def get_daily_report():
    return {"date":datetime.now().strftime("%Y-%m-%d"),
            "total_boardings":REAL_STATS["total_boardings"],
            "unique_vehicles":REAL_STATS["unique_vehicles"],
            "unique_routes":REAL_STATS["unique_routes"],
            "peak_hour":REAL_STATS["peak_hour_label"],
            "peak_boardings":REAL_STATS["peak_count"],
            "on_time_rate":REAL_STATS["on_time_rate"],
            "avg_load_pct":72.0,"delayed_routes":2,
            "ai_recommendations":["Deploy extra vehicle on Alatroon during 6:30–8 PM",
                                   "Increase Route 35 frequency","Promote Mobile QR payment"],
            "passenger_breakdown":REAL_STATS["passengers"],
            "route_performance":[{"route":r["route_name"],"boardings":r["boardings"],
                                  "load_pct":random.randint(45,100),
                                  "on_time":round(random.uniform(0.74,0.95),2)}
                                 for r in ROUTES_DATA]}
