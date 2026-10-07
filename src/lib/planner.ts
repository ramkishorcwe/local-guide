import type { IPoi } from '../interfaces';
import type { RoutePlan, TripStop } from '../types/trip';
import { haversineKm } from '../utils/distance.js';
import { makeNaturalKey } from '../utility/naturalKey.js';
export const HOTEL = { name: 'Hotel Pearl Palace', lat: 26.9165, lng: 75.7918 };
const minute = 60_000;
const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export type SearchFilters = { query?: string; category?: IPoi['category']; kidFriendly?: boolean;
  categories?: IPoi['category'][]; pureVeg?: boolean; jainFoodAvailable?: boolean; indoor?: boolean; maxPriceINR?: number; includeUnknownPrices?: boolean };
export function normalizeSearch(text: string) {
  return text.normalize('NFKC').toLowerCase().replace(/panna\s+(?:mina|mena|meena)/g, 'panna meena')
    .replace(/raj(?:a)?sthani/g, 'rajasthani').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
export function searchPOIs(pois: IPoi[], filters: SearchFilters) {
  // Meal times and generic request words aren't catalogue attributes.
  const generic = new Set(['food', 'dinner', 'lunch', 'breakfast', 'meal', 'dining', 'restaurant', 'restaurants', 'cafe', 'cafes', 'pure', 'veg', 'vegetarian', 'jain', 'ka', 'ki', 'ke', 'visit', 'please']);
  const words = normalizeSearch(filters.query || '').split(/\s+/).filter(word => word && !generic.has(word));
  return pois.filter((poi) => {
    const text = normalizeSearch(`${poi.name} ${poi.area} ${poi.category} ${poi.subCategory} ${poi.cuisine || ''} ${poi.tags.join(' ')}`);
    const servesFood = ['restaurant', 'cafe'].includes(poi.category) || !!poi.cuisine?.trim();
    return (!words.length || words.every((word) => text.includes(word)))
      && (!filters.category || poi.category === filters.category)
      && (!filters.categories?.length || filters.categories.includes(poi.category))
      && (filters.kidFriendly === undefined || poi.kidFriendly === filters.kidFriendly)
      && (filters.indoor === undefined || poi.indoor === filters.indoor)
      && (!servesFood || !filters.pureVeg || poi.pureVeg === true)
      && (!servesFood || !filters.jainFoodAvailable || poi.jainFoodAvailable === true)
      && (filters.maxPriceINR === undefined || (price(poi) === undefined ? !!filters.includeUnknownPrices : price(poi)! <= filters.maxPriceINR));
  }).sort((a, b) => b.rating - a.rating).slice(0, 30);
}

function estimateOrder(places: IPoi[]) {
  let current = HOTEL;
  let minutes = 0;
  let distance = 0;
  for (const poi of places) {
    const km = haversineKm(current.lat, current.lng, poi.lat, poi.lng);
    distance += km;
    minutes += Math.max(5, Math.ceil(km * 1.3 / 18 * 60) + 5);
    current = { ...HOTEL, lat: poi.lat, lng: poi.lng };
  }
  return { minutes, distance };
}

// At most 6! orders. Compare actual hours-valid schedules, keeping every stop.
export function optimizeRoute(pois: IPoi[], ids: string[], startAt: number, availableMinutes: number, keepOrder = false): RoutePlan {
  const originalPlaces = ids.map(id => {
    const poi = pois.find(item => item.id === id);
    if (!poi) throw new Error(`Unknown POI: ${id}`);
    return poi;
  });
  if (!ids.length || ids.length > 6 || new Set(ids).size !== ids.length) throw new Error('Choose 1–6 distinct places');
  let best: RoutePlan | undefined;
  let originalError = '';
  try { best = buildRoute(pois, ids, startAt, availableMinutes); }
  catch (error) { originalError = error instanceof Error ? error.message : 'This order cannot be scheduled'; if (keepOrder) throw error; }
  const visit = (prefix: string[], remaining: string[]) => {
    if (!remaining.length) {
      try {
        const candidate = buildRoute(pois, prefix, startAt, availableMinutes);
        if (!best || candidate.totalMinutes < best.totalMinutes || (candidate.totalMinutes === best.totalMinutes && candidate.totalDistanceKm < best.totalDistanceKm)) best = candidate;
      } catch { /* Infeasible orders never become itinerary cards. */ }
      return;
    }
    for (const id of remaining) visit([...prefix, id], remaining.filter(other => other !== id));
  };
  if (!keepOrder && ids.length > 1) visit([], ids);
  if (!best) {
    const individualConflicts = originalPlaces.flatMap(poi => {
      try { buildRoute(pois, [poi.id], startAt, 720); return []; }
      catch (error) { return [error instanceof Error ? error.message : `${poi.name} cannot be scheduled`]; }
    });
    const reason = individualConflicts.join('; ') || originalError;
    throw new Error(`I couldn’t fit all requested stops at this start time. ${reason}. ${reason.includes('closed') ? 'Try an earlier start or another day; extra time cannot extend a place’s opening hours.' : 'Allow more time or choose fewer stops.'}`);
  }
  const comparison = estimateOrder(originalPlaces);
  const transfers = best.stops.reduce((sum, stop) => sum + stop.travelMinutes, 0);
  const saved = comparison.minutes - transfers;
  best.routeNote = keepOrder ? 'Your chosen stop order is kept, and every full visit fits the catalogue opening hours.'
    : saved > 0 ? `This order saves about ${saved} minutes of estimated travel compared with the order listed. It reduces travelling back and forth, and every full visit fits the catalogue opening hours.${originalError.includes('closed') ? ' Earlier-closing places are visited in time.' : ''}`
    : originalError ? 'I changed the stop order so each place can be visited before it closes. All requested places are included.'
    : ids.length > 1 ? 'I compared the possible stop orders. This is one of the quickest that fits every full visit and the catalogue opening hours.'
    : 'The full visit fits the catalogue opening hours.';
  return best;
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
