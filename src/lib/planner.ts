import type { IPoi } from '../interfaces';
import type { RoutePlan, TripStop } from '../types/trip';
import { haversineKm } from '../utils/distance.js';
import { makeNaturalKey } from '../utility/naturalKey.js';
export const HOTEL = { name: 'Hotel Pearl Palace', lat: 26.9165, lng: 75.7918 };
const minute = 60_000;
const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export type SearchFilters = { query?: string; category?: IPoi['category']; kidFriendly?: boolean;
  categories?: IPoi['category'][]; pureVeg?: boolean; jainFoodAvailable?: boolean; indoor?: boolean; maxPriceINR?: number };
export function searchPOIs(pois: IPoi[], filters: SearchFilters) {
  const words = (filters.query || '').toLowerCase().split(/\s+/).filter(Boolean);
  return pois.filter((poi) => {
    const text = `${poi.name} ${poi.area} ${poi.category} ${poi.subCategory} ${poi.cuisine || ''} ${poi.tags.join(' ')}`.toLowerCase();
    const servesFood = ['restaurant', 'cafe'].includes(poi.category) || !!poi.cuisine?.trim();
    return (!words.length || words.every((word) => text.includes(word)))
      && (!filters.category || poi.category === filters.category)
      && (!filters.categories?.length || filters.categories.includes(poi.category))
      && (filters.kidFriendly === undefined || poi.kidFriendly === filters.kidFriendly)
      && (filters.indoor === undefined || poi.indoor === filters.indoor)
      && (!servesFood || !filters.pureVeg || poi.pureVeg === true)
      && (!servesFood || !filters.jainFoodAvailable || poi.jainFoodAvailable === true)
      && (filters.maxPriceINR === undefined || (price(poi) !== undefined && price(poi)! <= filters.maxPriceINR));
  }).sort((a, b) => b.rating - a.rating).slice(0, 30);
}
export function price(poi: IPoi): number | undefined {
  // Missing restaurant/experience prices are unknown, not free.
  if (poi.priceINR && poi.priceINR > 0) return poi.priceINR;
  if (poi.entryFeeINR !== undefined && (!['restaurant', 'cafe', 'experience', 'wellness', 'transport'].includes(poi.category) || poi.entryFeeINR > 0)) return poi.entryFeeINR;
  if (poi.priceINR === 0 && ['park', 'attraction', 'shopping'].includes(poi.category)) return 0;
  return undefined;
}
function localParts(timestamp: number) {
  const local = new Date(timestamp + 330 * minute);
  return { day: local.getUTCDay(),
    midnight: Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - 330 * minute };
}
function intervals(poi: IPoi, day: number): [number, number][] {
  const hours = poi.openHours[days[day]]?.trim().toLowerCase();
  if (!hours || hours === 'closed') return [];
  if (['24 hours', '24/7', '00:00-23:59'].includes(hours)) return [[0, 1440]];
  return hours.split(',').flatMap((range) => {
    const match = range.trim().match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/);
    if (!match) return [];
    const [, sh, sm, eh, em] = match.map(Number);
    if (sh > 23 || sm > 59 || eh > 24 || em > 59 || (eh === 24 && em !== 0)) return [];
    const start = sh * 60 + sm;
    let end = eh * 60 + em;
    if (end <= start) end += 1440;
    return [[start, end] as [number, number]];
  });
}
export function checkHours(poi: IPoi, startAt: number, durationMinutes: number) {
  if (!Number.isFinite(startAt) || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 720) throw new Error('Invalid visit date or duration');
  const { day, midnight } = localParts(startAt);
  const endAt = startAt + durationMinutes * minute;
  const ranges = [
    ...intervals(poi, day).map(([a, b]) => [midnight + a * minute, midnight + b * minute]),
    ...intervals(poi, (day + 6) % 7).map(([a, b]) => [midnight + (a - 1440) * minute, midnight + (b - 1440) * minute]),
    ...intervals(poi, (day + 1) % 7).map(([a, b]) => [midnight + (a + 1440) * minute, midnight + (b + 1440) * minute]),
  ];
  const merged: number[][] = [];
  for (const range of ranges.sort((a, b) => a[0] - b[0])) {
    const previous = merged.at(-1);
    if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]);
    else merged.push([...range]);
  }
  return { poiId: poi.id, name: poi.name, open: merged.some(([a, b]) => startAt >= a && endAt <= b),
    hours: poi.openHours[days[day]] || 'Unknown', startAt, endAt, timezone: 'Asia/Kolkata',
    source: 'Hotel POI catalogue; hours may change on holidays' };
}
export function buildRoute(pois: IPoi[], ids: string[], startAt: number, availableMinutes: number): RoutePlan {
  if (!ids.length || ids.length > 6 || new Set(ids).size !== ids.length) throw new Error('Choose 1–6 distinct places');
  if (!Number.isFinite(startAt) || !Number.isInteger(availableMinutes) || availableMinutes < 15 || availableMinutes > 720) throw new Error('Use a valid start time and 15–720 available minutes');
  const places = ids.map(id => {
    const poi = pois.find(item => item.id === id);
    if (!poi) throw new Error(`Unknown POI: ${id}`);
    return poi;
  });
  if (new Set(places.map(makeNaturalKey)).size !== places.length) throw new Error('The same place appears twice. Choose distinct places for your outing.');
  let current = HOTEL;
  let now = startAt;
  let totalDistanceKm = 0;
  const stops: TripStop[] = places.map((poi) => {
    const distanceKm = haversineKm(current.lat, current.lng, poi.lat, poi.lng);
    // Straight-line distance × 1.3 estimates roads; 18 km/h + 5 minute buffer.
    const travelMinutes = Math.max(5, Math.ceil(distanceKm * 1.3 / 18 * 60) + 5);
    const arrival = now + travelMinutes * minute;
    const hours = checkHours(poi, arrival, poi.avgVisitMinutes);
    if (!hours.open) throw new Error(`${poi.name} is closed during the planned visit (${hours.hours})`);
    now = hours.endAt;
    if ((now - startAt) / minute > availableMinutes) throw new Error('Route exceeds available time; choose fewer stops');
    totalDistanceKm += distanceKm;
    current = { ...HOTEL, lat: poi.lat, lng: poi.lng };
    return { poiId: poi.id, name: poi.name, category: poi.category, area: poi.area,
      lat: poi.lat, lng: poi.lng, startAt: arrival, endAt: now, travelMinutes,
      distanceKm: Math.round(distanceKm * 10) / 10, priceINR: price(poi) ?? -1,
      partner: poi.partner, commissionPct: poi.commissionPct };
  });
  return { stops, totalMinutes: Math.ceil((now - startAt) / minute), totalDistanceKm: Math.round(totalDistanceKm * 10) / 10, startAt, availableMinutes };
}
