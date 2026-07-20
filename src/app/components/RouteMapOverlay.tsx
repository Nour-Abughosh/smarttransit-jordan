// src/components/RouteMapOverlay.tsx
// Place INSIDE your <Map> tag on any page.
// Draws polylines + terminal pins + intermediate stop dots + user label bubbles.

import { useEffect, useRef } from 'react';
import { useMapsLibrary, useMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import { TransitRoute, ROUTES, findCoords } from '../../lib/routes_data';


// ─── Polyline (imperative) ───────────────────────────────────────────────────
function RouteLine({ route, faded }: { route: TransitRoute; faded: boolean }) {
  const map     = useMap();
  const mapsLib = useMapsLibrary('maps');
  const lineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !mapsLib) return;
    lineRef.current = new mapsLib.Polyline({
      path:          route.stops.map(s => ({ lat: s.lat, lng: s.lng })),
      geodesic:      true,
      strokeColor:   route.color,
      strokeOpacity: faded ? 0.18 : 0.88,
      strokeWeight:  faded ? 3 : 5,
      map,
    });
    return () => { lineRef.current?.setMap(null); };
  }, [map, mapsLib, route, faded]);

  return null;
}

// ─── FROM terminal pin ───────────────────────────────────────────────────────
function FromPin({ stop, color, faded }: { stop: { name: string; lat: number; lng: number }; color: string; faded: boolean }) {
  return (
    <AdvancedMarker position={{ lat: stop.lat, lng: stop.lng }} title={stop.name}>
      <div style={{
        width: 14, height: 14, borderRadius: '50%',
        background: faded ? '#ccc' : color,
        border: '3px solid white',
        boxShadow: faded ? 'none' : `0 2px 8px ${color}66`,
        transition: 'all 0.3s',
      }} />
    </AdvancedMarker>
  );
}

// ─── TO terminal pin (label bubble + caret) ──────────────────────────────────
function ToPin({ stop, color, faded }: { stop: { name: string; lat: number; lng: number }; color: string; faded: boolean }) {
  const bg = faded ? '#ccc' : color;
  return (
    <AdvancedMarker position={{ lat: stop.lat, lng: stop.lng }} title={stop.name}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          background: bg, color: 'white',
          fontSize: 10, fontWeight: 700,
          padding: '3px 8px', borderRadius: 8,
          whiteSpace: 'nowrap',
          boxShadow: faded ? 'none' : `0 2px 10px ${color}55`,
          border: '2px solid white',
          transition: 'all 0.3s',
        }}>
          {stop.name}
        </div>
        <div style={{
          width: 0, height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: `6px solid ${bg}`,
        }} />
      </div>
    </AdvancedMarker>
  );
}

// ─── Intermediate stop dot ───────────────────────────────────────────────────
function StopDot({ stop, color, faded }: { stop: { name: string; lat: number; lng: number }; color: string; faded: boolean }) {
  return (
    <AdvancedMarker position={{ lat: stop.lat, lng: stop.lng }} title={stop.name}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: faded ? '#ccc' : color,
        border: '2px solid white',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        transition: 'all 0.3s',
      }} />
    </AdvancedMarker>
  );
}

// ─── Floating user label bubble ──────────────────────────────────────────────
function LabelPin({ label, coords, bg }: { label: string; coords: { lat: number; lng: number }; bg: string }) {
  return (
    <AdvancedMarker position={coords} title={label}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          background: bg, color: 'white',
          padding: '5px 12px', borderRadius: 20,
          fontSize: 12, fontWeight: 700,
          boxShadow: `0 4px 14px ${bg}55`,
          border: '2px solid white',
          whiteSpace: 'nowrap',
        }}>
          {label}
        </div>
        <div style={{
          width: 0, height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: `8px solid ${bg}`,
        }} />
      </div>
    </AdvancedMarker>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
interface RouteMapOverlayProps {
  from: string;
  to: string;
  selectedRoute: TransitRoute | null; // null = show all routes
}

export function RouteMapOverlay({ from, to, selectedRoute }: RouteMapOverlayProps) {
  const map = useMap();

  // Zoom map to fit selected route
  useEffect(() => {
    if (!map || !selectedRoute) return;
    const bounds = new google.maps.LatLngBounds();
    selectedRoute.stops.forEach(s => bounds.extend({ lat: s.lat, lng: s.lng }));
    map.fitBounds(bounds, { top: 80, right: 60, bottom: 80, left: 60 });
  }, [map, selectedRoute]);

  const fromCoords = from ? findCoords(from) : null;
  const toCoords   = to   ? findCoords(to)   : null;

  return (
    <>
      {/* Polylines */}
      {ROUTES.map(route => (
        <RouteLine
          key={route.id}
          route={route}
          faded={!!selectedRoute && selectedRoute.id !== route.id}
        />
      ))}

      {/* Intermediate stop dots */}
      {ROUTES.map(route =>
        route.stops.slice(1, -1).map((stop, i) => (
          <StopDot
            key={`${route.id}-dot-${i}`}
            stop={stop}
            color={route.color}
            faded={!!selectedRoute && selectedRoute.id !== route.id}
          />
        ))
      )}

      {/* FROM terminal pins */}
      {ROUTES.map(route => (
        <FromPin
          key={`${route.id}-from`}
          stop={route.stops[0]}
          color={route.color}
          faded={!!selectedRoute && selectedRoute.id !== route.id}
        />
      ))}

      {/* TO terminal pins */}
      {ROUTES.map(route => (
        <ToPin
          key={`${route.id}-to`}
          stop={route.stops[route.stops.length - 1]}
          color={route.color}
          faded={!!selectedRoute && selectedRoute.id !== route.id}
        />
      ))}

      {/* User-typed floating label pins */}
      {fromCoords && from && (
        <LabelPin label={`📍 ${from}`} coords={fromCoords} bg="#00C896" />
      )}
      {toCoords && to && (
        <LabelPin label={`🏁 ${to}`} coords={toCoords} bg="#FF6B35" />
      )}
    </>
  );
}