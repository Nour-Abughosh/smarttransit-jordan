import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapPreviewProps {
  height?: string;
  center?: [number, number];
  zoom?: number;
  markers?: Array<{ position: [number, number]; label: string }>;
  route?: Array<[number, number]>;
}

export function MapPreview({
  height = '100%',
  center = [31.9539, 35.9106],
  zoom = 12,
  markers = [],
  route = [],
}: MapPreviewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { center, zoom, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    mapInstanceRef.current = map;
    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.eachLayer(layer => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline)
        mapInstanceRef.current?.removeLayer(layer);
    });
    markers.forEach(({ position, label }) => {
      L.marker(position).addTo(mapInstanceRef.current!).bindPopup(label);
    });
    if (route.length > 0) {
      L.polyline(route, { color: '#00C896', weight: 4, opacity: 0.8 }).addTo(mapInstanceRef.current);
      mapInstanceRef.current.fitBounds(L.latLngBounds(route), { padding: [50, 50] });
    } else if (markers.length > 0) {
      mapInstanceRef.current.fitBounds(
        L.latLngBounds(markers.map(m => m.position)),
        { padding: [50, 50] }
      );
    } else {
      mapInstanceRef.current.setView(center, zoom);
    }
  }, [markers, route, center, zoom]);

  return (
    <div ref={mapRef} style={{ height, width: '100%' }} className="rounded-lg overflow-hidden" />
  );
}
