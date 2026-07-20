// src/data/routes.ts
 
export interface RouteStop {
  name: string;
  lat: number;
  lng: number;
}
 
export interface TransitRoute {
  id: string;
  name: string;
  from: string;
  to: string;
  color: string;
  stops: RouteStop[];
  eta: string;
  duration: string;
  fare: string;
  crowding: 'available' | 'moderate' | 'full';
}
 
export const ROUTES: TransitRoute[] = [
  {
    id: 'AM503',
    name: 'AM503',
    from: 'Sweileh',
    to: 'Jordan University Hospital',
    color: '#00C896',
    fare: '0.35 JD',
    eta: '5 min',
    duration: '22 min',
    crowding: 'available',
    stops: [
      { name: 'Sweileh Terminal',           lat: 31.9968, lng: 35.8606 },
      { name: 'Sweileh Circle',             lat: 31.9950, lng: 35.8650 },
      { name: 'University Street',          lat: 31.9900, lng: 35.8720 },
      { name: 'Jordan University Gate 1',   lat: 31.9820, lng: 35.8880 },
      { name: 'Jordan University Hospital', lat: 31.9790, lng: 35.8940 },
    ],
  },
  {
    id: 'AM504',
    name: 'AM504',
    from: 'Wadi Seer',
    to: 'Sweileh',
    color: '#3B9EFF',
    fare: '0.35 JD',
    eta: '8 min',
    duration: '28 min',
    crowding: 'moderate',
    stops: [
      { name: 'Wadi Seer Terminal',   lat: 31.9481, lng: 35.8402 },
      { name: 'Wadi Seer Circle',     lat: 31.9530, lng: 35.8450 },
      { name: 'Jubaiha',              lat: 31.9720, lng: 35.8600 },
      { name: 'University of Jordan', lat: 31.9820, lng: 35.8710 },
      { name: 'Sweileh Terminal',     lat: 31.9968, lng: 35.8606 },
    ],
  },
  {
    id: 'AM505',
    name: 'AM505',
    from: 'Al-Muhajereen',
    to: 'Wadi Seer',
    color: '#FF6B35',
    fare: '0.40 JD',
    eta: '3 min',
    duration: '35 min',
    crowding: 'full',
    stops: [
      { name: 'Al-Muhajereen',      lat: 31.9680, lng: 35.9200 },
      { name: '4th Circle',         lat: 31.9600, lng: 35.9060 },
      { name: '3rd Circle',         lat: 31.9560, lng: 35.8970 },
      { name: 'Interior Ministry',  lat: 31.9520, lng: 35.8900 },
      { name: 'Sports City',        lat: 31.9480, lng: 35.8720 },
      { name: 'Wadi Seer Terminal', lat: 31.9481, lng: 35.8402 },
    ],
  },
];
 
/** Fuzzy-match a route from user-typed from/to strings */
export function findRoute(from: string, to: string): TransitRoute | undefined {
  const f = from.toLowerCase().trim();
  const t = to.toLowerCase().trim();
  return ROUTES.find(r => {
    const rFrom = r.from.toLowerCase();
    const rTo   = r.to.toLowerCase();
    const fromMatch =
      rFrom.includes(f) || f.includes(rFrom) ||
      r.stops.some(s => s.name.toLowerCase().includes(f) || f.includes(s.name.toLowerCase()));
    const toMatch =
      rTo.includes(t) || t.includes(rTo) ||
      r.stops.some(s => s.name.toLowerCase().includes(t) || t.includes(s.name.toLowerCase()));
    return fromMatch && toMatch;
  });
}
 
/** Find lat/lng for any typed location string by scanning all stops */
export function findCoords(query: string): { lat: number; lng: number } | null {
  const q = query.toLowerCase().trim();
  for (const route of ROUTES) {
    for (const stop of route.stops) {
      if (stop.name.toLowerCase().includes(q) || q.includes(stop.name.toLowerCase())) {
        return { lat: stop.lat, lng: stop.lng };
      }
    }
  }
  return null;
}