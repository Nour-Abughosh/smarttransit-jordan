"""
extract_routes.py
─────────────────────────────────────────────────────────────────
Reads KML route files + Excel stop data from the Amman Vision
dataset and generates  src/lib/routes_data.ts  automatically.
 
Run from project root:
    python extract_routes.py
 
Requirements:
    pip install fastkml lxml openpyxl
 
Output:
    src/lib/routes_data.ts   ← import this in Home.tsx
─────────────────────────────────────────────────────────────────
"""
 
import json
import os
import re
from pathlib import Path
 
# ── Try to import optional dependencies ──────────────────────
try:
    from fastkml import kml
    HAS_KML = True
except ImportError:
    HAS_KML = False
    print("⚠  fastkml not installed — KML parsing skipped.")
    print("   Run: pip install fastkml lxml")
 
try:
    import openpyxl
    HAS_XLSX = True
except ImportError:
    HAS_XLSX = False
    print("⚠  openpyxl not installed — Excel parsing skipped.")
    print("   Run: pip install openpyxl")
 
 
# ── Configuration — adjust paths to match your project ───────
KML_DIR   = Path("public/routes")          # folder with *.kml files
EXCEL_DIR = Path("data")                   # folder with *.xlsx files
OUT_FILE  = Path("src/lib/routes_data.ts") # generated TypeScript file
 
# ── Route color mapping ───────────────────────────────────────
ROUTE_COLORS = {
    "Route 27": "#00C896",
    "Route 12": "#3B9EFF",
    "Route 35": "#00C896",
    "Sarfees":  "#FF6B35",
    "Coaster":  "#3B9EFF",
}
 
# ── Fallback: hardcoded stops (used when Excel is unavailable) ─
FALLBACK_STOPS: dict[str, dict] = {
    "Sweileh":              {"lat": 31.9998, "lng": 35.8720},
    "Tabarbour":            {"lat": 31.9979, "lng": 35.9297},
    "Abdali":               {"lat": 31.9744, "lng": 35.9167},
    "Downtown":             {"lat": 31.9497, "lng": 35.9350},
    "Downtown Amman":       {"lat": 31.9497, "lng": 35.9350},
    "Mecca Mall":           {"lat": 31.9339, "lng": 35.8456},
    "University of Jordan": {"lat": 31.9745, "lng": 35.8988},
    "Gardens":              {"lat": 31.9560, "lng": 35.8830},
    "Sport City":           {"lat": 31.9783, "lng": 35.9067},
    "Wadi Seer":            {"lat": 31.9390, "lng": 35.8350},
    "Rainbow St":           {"lat": 31.9510, "lng": 35.9220},
    "Rainbow Street":       {"lat": 31.9510, "lng": 35.9220},
    "Shmeisani":            {"lat": 31.9720, "lng": 35.9003},
    "Jabal Amman":          {"lat": 31.9530, "lng": 35.9270},
    "Ras Al Ain":           {"lat": 31.9450, "lng": 35.9290},
    "Zarqa Bridge":         {"lat": 31.9900, "lng": 35.9800},
    "Airport":              {"lat": 31.7228, "lng": 35.9932},
    "Sahab":                {"lat": 31.8750, "lng": 35.9920},
    "Marj Al Hamam":        {"lat": 31.9250, "lng": 35.8650},
}
 
# ── Fallback: hardcoded routes ────────────────────────────────
FALLBACK_ROUTES = [
    {
        "id": 1, "from": "Sweileh", "to": "University of Jordan",
        "route": "Route 27", "eta": "8 min", "duration": "24 min",
        "crowding": "available", "delay": 0, "fare": "0.35 JD",
        "path": [
            {"lat": 31.9998, "lng": 35.8720}, {"lat": 31.9940, "lng": 35.8755},
            {"lat": 31.9880, "lng": 35.8810}, {"lat": 31.9820, "lng": 35.8870},
            {"lat": 31.9780, "lng": 35.8930}, {"lat": 31.9745, "lng": 35.8988},
        ],
    },
    {
        "id": 2, "from": "Tabarbour", "to": "Downtown Amman",
        "route": "Route 12", "eta": "3 min", "duration": "31 min",
        "crowding": "moderate", "delay": 4, "fare": "0.35 JD",
        "path": [
            {"lat": 31.9979, "lng": 35.9297}, {"lat": 31.9870, "lng": 35.9308},
            {"lat": 31.9750, "lng": 35.9320}, {"lat": 31.9630, "lng": 35.9335},
            {"lat": 31.9497, "lng": 35.9350},
        ],
    },
    {
        "id": 3, "from": "Abdali", "to": "Mecca Mall",
        "route": "Sarfees", "eta": "2 min", "duration": "18 min",
        "crowding": "full", "delay": 0, "fare": "0.50 JD",
        "path": [
            {"lat": 31.9744, "lng": 35.9167}, {"lat": 31.9700, "lng": 35.9060},
            {"lat": 31.9650, "lng": 35.8950}, {"lat": 31.9600, "lng": 35.8820},
            {"lat": 31.9530, "lng": 35.8700}, {"lat": 31.9450, "lng": 35.8590},
            {"lat": 31.9339, "lng": 35.8456},
        ],
    },
    {
        "id": 4, "from": "Gardens", "to": "Rainbow St",
        "route": "Route 35", "eta": "11 min", "duration": "14 min",
        "crowding": "available", "delay": 0, "fare": "0.35 JD",
        "path": [
            {"lat": 31.9560, "lng": 35.8830}, {"lat": 31.9555, "lng": 35.8950},
            {"lat": 31.9540, "lng": 35.9060}, {"lat": 31.9520, "lng": 35.9150},
            {"lat": 31.9510, "lng": 35.9220},
        ],
    },
    {
        "id": 5, "from": "Wadi Seer", "to": "Sport City",
        "route": "Coaster", "eta": "6 min", "duration": "22 min",
        "crowding": "moderate", "delay": 2, "fare": "0.40 JD",
        "path": [
            {"lat": 31.9390, "lng": 35.8350}, {"lat": 31.9450, "lng": 35.8480},
            {"lat": 31.9520, "lng": 35.8640}, {"lat": 31.9600, "lng": 35.8800},
            {"lat": 31.9680, "lng": 35.8930}, {"lat": 31.9740, "lng": 35.9010},
            {"lat": 31.9783, "lng": 35.9067},
        ],
    },
]
 
 
# ── KML parser: extracts LineString coordinates from a .kml ──
def parse_kml_path(kml_path: Path) -> list[dict]:
    """Return list of {lat, lng} dicts from the first LineString in a KML file."""
    if not HAS_KML:
        return []
    try:
        with open(kml_path, "rb") as f:
            k = kml.KML()
            k.from_string(f.read())
        # Walk the KML feature tree
        for feature in k.features():
            for placemark in feature.features():
                geom = placemark.geometry
                if geom and geom.geom_type == "LineString":
                    return [{"lat": round(lat, 6), "lng": round(lng, 6)}
                            for lng, lat, *_ in geom.coords]
    except Exception as e:
        print(f"  ⚠  Could not parse {kml_path.name}: {e}")
    return []
 
 
# ── Excel parser: extracts stop name → lat/lng from .xlsx ────
def parse_excel_stops(excel_dir: Path) -> dict[str, dict]:
    """
    Scan all .xlsx files in excel_dir for columns named
    'stop_name' (or 'name') and 'lat'/'lng' (or 'latitude'/'longitude').
    Returns a dict: stop_name → {lat, lng}
    """
    if not HAS_XLSX:
        return {}
    stops: dict[str, dict] = {}
    for xlsx in excel_dir.glob("*.xlsx"):
        try:
            wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)
            for ws in wb.worksheets:
                headers = [str(c.value).lower().strip() if c.value else ""
                           for c in next(ws.iter_rows(min_row=1, max_row=1))]
                # Find relevant columns
                name_col = next((i for i, h in enumerate(headers) if h in ("stop_name", "name", "station")), None)
                lat_col  = next((i for i, h in enumerate(headers) if h in ("lat", "latitude")), None)
                lng_col  = next((i for i, h in enumerate(headers) if h in ("lng", "lon", "longitude")), None)
                if name_col is None or lat_col is None or lng_col is None:
                    continue
                for row in ws.iter_rows(min_row=2, values_only=True):
                    try:
                        name = str(row[name_col]).strip()
                        lat  = float(row[lat_col])
                        lng  = float(row[lng_col])
                        if name and -90 <= lat <= 90 and -180 <= lng <= 180:
                            stops[name] = {"lat": round(lat, 6), "lng": round(lng, 6)}
                    except (TypeError, ValueError):
                        pass
            wb.close()
        except Exception as e:
            print(f"  ⚠  Could not parse {xlsx.name}: {e}")
    return stops
 
 
# ── TypeScript code generator ─────────────────────────────────
def latlng_ts(ll: dict) -> str:
    return f'{{ lat: {ll["lat"]}, lng: {ll["lng"]} }}'
 
def path_ts(path: list[dict], indent: int = 6) -> str:
    pad = " " * indent
    inner = ",\n".join(f'{pad}  {latlng_ts(p)}' for p in path)
    return f'[\n{inner},\n{pad}]'
 
def generate_ts(stops: dict[str, dict], routes: list[dict]) -> str:
    stops_lines = "\n".join(
        f"  {json.dumps(k)}: {latlng_ts(v)},"
        for k, v in sorted(stops.items())
    )
 
    routes_lines = []
    for r in routes:
        from_c = stops.get(r["from"], r.get("fromCoords", {"lat": 0, "lng": 0}))
        to_c   = stops.get(r["to"],   r.get("toCoords",   {"lat": 0, "lng": 0}))
        color  = ROUTE_COLORS.get(r["route"], "#00C896")
        path   = r.get("path", [from_c, to_c])
 
        routes_lines.append(f"""  {{
    id: {r["id"]},
    from: {json.dumps(r["from"])},
    to:   {json.dumps(r["to"])},
    fromCoords: {latlng_ts(from_c)},
    toCoords:   {latlng_ts(to_c)},
    path: {path_ts(path)},
    route: {json.dumps(r["route"])},
    eta: {json.dumps(r["eta"])},
    duration: {json.dumps(r["duration"])},
    crowding: {json.dumps(r["crowding"])},
    delay: {r["delay"]},
    fare: {json.dumps(r["fare"])},
    color: {json.dumps(color)},
  }}""")
 
    routes_block = ",\n".join(routes_lines)
 
    return f"""\
/**
 * routes_data.ts — AUTO-GENERATED by extract_routes.py
 * Do not edit manually; run the script to regenerate.
 * Place at: src/lib/routes_data.ts
 */
 
export type LatLng   = {{ lat: number; lng: number }};
export type Crowding = 'available' | 'moderate' | 'full';
 
export interface RouteEntry {{
  id:         number;
  from:       string;
  to:         string;
  fromCoords: LatLng;
  toCoords:   LatLng;
  path:       LatLng[];
  route:      string;
  eta:        string;
  duration:   string;
  crowding:   Crowding;
  delay:      number;
  fare:       string;
  color:      string;
}}
 
export const AMMAN_COORDS: Record<string, LatLng> = {{
{stops_lines}
}};
 
export const POPULAR_ROUTES: RouteEntry[] = [
{routes_block},
];
 
export const AMMAN_CENTER: LatLng = {{ lat: 31.9539, lng: 35.9106 }};
"""
 
 
# ── Main ──────────────────────────────────────────────────────
def main():
    print("🗺  extract_routes.py — SmartTransit Jordan\n")
 
    # 1. Parse stop coordinates from Excel files
    print(f"📊 Reading Excel stops from {EXCEL_DIR} …")
    stops = parse_excel_stops(EXCEL_DIR) if EXCEL_DIR.exists() else {}
    if stops:
        print(f"   ✅ Found {len(stops)} stops from Excel")
    else:
        print("   ⚠  No Excel stops found — using fallback coordinates")
        stops = FALLBACK_STOPS.copy()
 
    # 2. Parse route paths from KML files
    routes = []
    if KML_DIR.exists() and HAS_KML:
        print(f"\n🗂  Reading KML routes from {KML_DIR} …")
        kml_files = sorted(KML_DIR.glob("*.kml"))
        for kml_file in kml_files:
            path = parse_kml_path(kml_file)
            if path:
                # Try to match KML filename to a fallback route
                stem = kml_file.stem.lower()
                match = next(
                    (r for r in FALLBACK_ROUTES if r["route"].lower().replace(" ", "_") in stem or stem in r["route"].lower()),
                    None,
                )
                if match:
                    entry = {**match, "path": path}
                    routes.append(entry)
                    print(f"   ✅ {kml_file.name} → {match['route']} ({len(path)} waypoints)")
                else:
                    print(f"   ⚠  {kml_file.name} — no matching route found, skipping")
 
    if not routes:
        print("\n   ℹ  Using hardcoded fallback routes")
        routes = FALLBACK_ROUTES.copy()
 
    # 3. Generate TypeScript
    ts_code = generate_ts(stops, routes)
 
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(ts_code, encoding="utf-8")
    print(f"\n✅ Written → {OUT_FILE}  ({len(routes)} routes, {len(stops)} stops)")
    print("   Import in Home.tsx:  import {{ POPULAR_ROUTES, AMMAN_COORDS }} from '../../lib/routes_data';")
 
 
if __name__ == "__main__":
    main()