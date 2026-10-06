import { useEffect } from 'react';
import { divIcon, latLngBounds } from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { HOTEL } from '../lib/planner';
import type { TripStop } from '../types/trip';
import { time } from '../utils/format';
import 'leaflet/dist/leaflet.css';
const hotelIcon = divIcon({ className: 'guide-marker', html: '<span class="hotel-pin">⌂</span>', iconSize: [30, 30], iconAnchor: [15, 15] });
const stopIcon = (number: number, active: boolean) => divIcon({ className: 'guide-marker', html: `<span class="stop-pin ${active ? 'active' : ''}">${number}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] });
function FitMap({ stops, selectedId }: { stops: TripStop[]; selectedId?: string | null }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(latLngBounds([[HOTEL.lat, HOTEL.lng], ...stops.map((stop) => [stop.lat, stop.lng] as [number, number])]), { padding: [40, 40], maxZoom: 14 });
  }, [map, stops]);
  useEffect(() => {
    const stop = stops.find((item) => item.poiId === selectedId);
    if (stop) map.flyTo([stop.lat, stop.lng], 15, { duration: 0.6 });
  }, [map, stops, selectedId]);
  useEffect(() => { const observer = new ResizeObserver(() => map.invalidateSize()); observer.observe(map.getContainer()); return () => observer.disconnect(); }, [map]);
  return null;
}
export default function MapView({ stops, selectedId, onSelect }: { stops: TripStop[]; selectedId?: string | null; onSelect?: (id: string) => void }) {
  const positions: [number, number][] = [[HOTEL.lat, HOTEL.lng], ...stops.map((stop) => [stop.lat, stop.lng] as [number, number])];
  return <div className="map-wrap h-[300px] overflow-hidden rounded-xl border border-white/10" aria-label="Jaipur itinerary map">
    <MapContainer center={[HOTEL.lat, HOTEL.lng]} zoom={13} scrollWheelZoom={false} className="h-full w-full" attributionControl>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
      <Marker position={[HOTEL.lat, HOTEL.lng]} icon={hotelIcon}><Popup><strong>{HOTEL.name}</strong><br />Your starting point</Popup></Marker>
      {stops.map((stop, index) => <Marker key={stop.poiId} position={[stop.lat, stop.lng]} icon={stopIcon(index + 1, selectedId === stop.poiId)} eventHandlers={{ click: () => onSelect?.(stop.poiId) }}>
        <Popup><strong>{stop.name}</strong><br />{time(stop.startAt)} – {time(stop.endAt)}<br />{stop.area}</Popup>
      </Marker>)}
      {stops.length > 0 && <Polyline positions={positions} pathOptions={{ color: '#D4AF37', weight: 3, dashArray: '6 8', opacity: .85 }} />}
      <FitMap stops={stops} selectedId={selectedId} />
    </MapContainer>
  </div>;
}
