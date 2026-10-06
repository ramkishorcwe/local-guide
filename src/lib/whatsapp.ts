import type { Trip } from '../types/trip';
import { time, tripDate } from '../utils/format';
export function tripURL(code: string, origin = window.location.origin) { return `${origin}/trip/${encodeURIComponent(code)}`; }
export function whatsappURL(trip: Trip, origin?: string) {
  const text = `Our Jaipur plan · ${tripDate(trip.stops[0].startAt)}\n${trip.stops.map((stop, index) => `${index + 1}. ${time(stop.startAt)}–${time(stop.endAt)}: ${stop.name}`).join('\n')}\n\n${tripURL(trip.code, origin)}\nMade with Local Guide × Hotel Pearl Palace`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
