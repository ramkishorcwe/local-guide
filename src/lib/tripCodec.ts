import type { RoutePlan, Trip, TripStop } from '../types/trip';
import { documentCreatedAt } from './documentTimestamp';

const categories = ['restaurant', 'attraction', 'experience', 'shopping', 'cafe', 'wellness', 'park', 'transport'];
function validateStop(value: unknown): TripStop {
  const stop = value as TripStop | null;
  if (!stop || typeof stop.poiId !== 'string' || !stop.poiId || typeof stop.name !== 'string' || !stop.name
    || typeof stop.area !== 'string' || !categories.includes(stop.category)
    || !Number.isFinite(stop.startAt) || !Number.isFinite(stop.endAt) || stop.endAt <= stop.startAt
    || !Number.isFinite(stop.lat) || Math.abs(stop.lat) > 90 || !Number.isFinite(stop.lng) || Math.abs(stop.lng) > 180
    || !Number.isFinite(stop.travelMinutes) || stop.travelMinutes < 0 || !Number.isFinite(stop.distanceKm) || stop.distanceKm < 0
    || !Number.isFinite(stop.priceINR) || stop.priceINR < -1 || typeof stop.partner !== 'boolean'
    || !Number.isInteger(stop.commissionPct) || stop.commissionPct < 0 || stop.commissionPct > 100) {
    throw new Error('This shared itinerary contains invalid stop data.');
  }
  return stop;
}
export function deserializeStops(value: unknown): TripStop[] {
  const stops: unknown = typeof value === 'string' ? JSON.parse(value) : value;
  if (!Array.isArray(stops) || stops.length < 1 || stops.length > 6) throw new Error('This shared itinerary has invalid stops.');
  // Older documents contained one JSON string per stop.
  return stops.map((stop: unknown) => validateStop(typeof stop === 'string' ? JSON.parse(stop) : stop));
}
export function serializeStops(stops: TripStop[]): string {
  return JSON.stringify(deserializeStops(stops));
}
export function tripToPayload(plan: RoutePlan, code: string, guestQuery: string) {
  return { code, guestQuery: guestQuery.slice(0, 1000), totalMinutes: plan.totalMinutes,
    totalDistanceKm: plan.totalDistanceKm, stops: serializeStops(plan.stops) };
}
export function docToTrip(doc: Record<string, unknown>, expectedCode?: string): Trip {
  if (typeof doc.code !== 'string' || !/^LG-[A-Z0-9]{10}$/.test(doc.code) || (expectedCode && doc.code !== expectedCode)
    || typeof doc.guestQuery !== 'string' || !Number.isInteger(doc.totalMinutes) || Number(doc.totalMinutes) <= 0
    || typeof doc.totalDistanceKm !== 'number' || !Number.isFinite(doc.totalDistanceKm) || doc.totalDistanceKm < 0) {
    throw new Error('This shared itinerary has invalid trip data.');
  }
  return { code: doc.code, guestQuery: doc.guestQuery, stops: deserializeStops(doc.stops),
    totalMinutes: doc.totalMinutes as number, totalDistanceKm: doc.totalDistanceKm,
    createdAt: documentCreatedAt(doc, 'createdAt') };
}
