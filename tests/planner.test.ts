import test from 'node:test';
import assert from 'node:assert/strict';
import { POIS } from '../src/data/pois';
import { docToPOI, poiToPayload } from '../src/lib/poiCodec';
import { buildRoute, checkHours, HOTEL, searchPOIs } from '../src/lib/planner';
import { createToolExecutor, parseStartISO } from '../src/lib/gemini';
import { haversineKm } from '../src/utils/distance';
import { whatsappURL } from '../src/lib/whatsapp';
import { deserializeStops, serializeStops } from '../src/lib/tripCodec';
const startAt = Date.parse('2026-10-06T12:00:00+05:30');
const poi = { ...POIS[0], id: 'verified', lat: HOTEL.lat, lng: HOTEL.lng, avgVisitMinutes: 60,
  openHours: { mon: '10:00-18:00', tue: '10:00-18:00', wed: '10:00-18:00', thu: '10:00-18:00', fri: '10:00-18:00', sat: '10:00-18:00', sun: 'closed' } };

test('POI roundtrip preserves minutes, zero entry fees and boolean preferences', () => {
  for (const original of POIS) {
    const payload = poiToPayload(original);
    const roundtrip = docToPOI({ ...payload, $id: original.id });
    assert.deepEqual(roundtrip.openHours, original.openHours);
    assert.equal(roundtrip.entryFeeINR, original.entryFeeINR ?? 0);
    assert.equal(roundtrip.kidFriendly, original.kidFriendly);
  }
});
test('hours use IST weekday and validate the whole visit, including closing boundary', () => {
  assert.equal(checkHours(poi, startAt, 60).open, true);
  assert.equal(checkHours(poi, Date.parse('2026-10-06T17:00:00+05:30'), 60).open, true);
  assert.equal(checkHours(poi, Date.parse('2026-10-06T17:30:00+05:30'), 60).open, false);
  assert.equal(checkHours(poi, Date.parse('2026-10-11T12:00:00+05:30'), 60).open, false);
  assert.equal(checkHours({ ...poi, openHours: {} }, startAt, 30).open, false);
});
test('overnight, split hours and 24-hour schedules handle midnight correctly', () => {
  const overnight = { ...poi, openHours: { mon: '22:00-02:00', tue: 'closed' } };
  assert.equal(checkHours(overnight, Date.parse('2026-10-06T01:00:00+05:30'), 30).open, true);
  assert.equal(checkHours(overnight, Date.parse('2026-10-06T01:50:00+05:30'), 30).open, false);
  assert.equal(checkHours({ ...poi, openHours: { tue: '10:00-12:00,14:00-18:00' } }, Date.parse('2026-10-06T11:30:00+05:30'), 60).open, false);
  assert.equal(checkHours({ ...poi, openHours: { tue: '24 hours', wed: '24 hours' } }, Date.parse('2026-10-06T23:30:00+05:30'), 60).open, true);
});
test('diet filters are strict and unknown prices are not treated as free', () => {
  const results = searchPOIs(POIS, { pureVeg: true, kidFriendly: true });
  assert.ok(results.length);
  assert.ok(results.every((item) => item.kidFriendly && (!['restaurant', 'cafe'].includes(item.category) || item.pureVeg)));
  assert.equal(searchPOIs([{ ...poi, priceINR: undefined, entryFeeINR: undefined }], { maxPriceINR: 100 }).length, 0);
});
test('route rejects unknown IDs, duplicate stops, overlong days, and closure after travel', () => {
  const plan = buildRoute([poi], [poi.id], startAt, 120);
  assert.equal(plan.totalMinutes, 65);
  assert.equal(plan.stops[0].startAt, startAt + 5 * 60_000);
  assert.throws(() => buildRoute([poi], ['invented'], startAt, 120), /Unknown POI/);
  assert.throws(() => buildRoute([poi], [poi.id, poi.id], startAt, 120), /distinct/);
  assert.throws(() => buildRoute([poi], [poi.id], startAt, 30), /exceeds/);
  assert.throws(() => buildRoute([poi], [poi.id], Date.parse('2026-10-06T17:00:00+05:30'), 120), /closed/);
  for (const original of POIS) {
    const safe = { ...original, lat: HOTEL.lat, lng: HOTEL.lng, openHours: Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => [day, '24 hours'])) };
    const route = buildRoute([safe], [safe.id], startAt, 720);
    assert.deepEqual(deserializeStops(serializeStops(route.stops)), route.stops);
  }
});
test('tool executor enforces searched IDs, accumulated candidates, hard preferences and actual arrival validation', async () => {
  const executor = createToolExecutor([poi]);
  await assert.rejects(executor.execute('checkHours', { poiId: poi.id, startISO: '2026-10-06T12:00:00+05:30', durationMinutes: 60 }), /returned by searchPOIs/);
  await executor.execute('searchPOIs', {});
  const routeArgs = { poiIds: [poi.id], startISO: '2026-10-06T12:00:00+05:30', availableMinutes: 120 };
  await executor.execute('buildRoute', routeArgs);
  await executor.execute('checkHours', { poiId: poi.id, startISO: routeArgs.startISO, durationMinutes: 60 });
  await executor.execute('buildRoute', routeArgs);
  assert.equal(executor.plan?.stops[0].poiId, poi.id);
  await assert.rejects(executor.execute('buildRoute', { ...routeArgs, startISO: '2026-10-06T17:00:00+05:30' }), /closed/);
  assert.equal(executor.plan, undefined);
  await executor.execute('searchPOIs', { query: 'no such place' });
  await executor.execute('getPartnerDeal', { poiId: poi.id });
  await executor.execute('searchPOIs', { indoor: !poi.indoor });
  await assert.rejects(executor.execute('getPartnerDeal', { poiId: poi.id }), /returned by searchPOIs/);
});

test('mixed heritage and veg food searches retain all candidates while excluding unsafe food', async () => {
  const monument = { ...poi, id: 'monument', name: 'Fictional Courtyard', category: 'attraction' as const, cuisine: '', pureVeg: false };
  const nonVeg = { ...poi, id: 'nonveg', name: 'Fictional Grill', pureVeg: false };
  const executor = createToolExecutor([poi, monument, nonVeg]);
  await executor.execute('searchPOIs', { category: 'attraction', pureVeg: true });
  await executor.execute('searchPOIs', { category: 'restaurant' });
  await assert.rejects(executor.execute('buildRoute', { poiIds: [monument.id, nonVeg.id], startISO: '2026-10-06T12:00:00+05:30', availableMinutes: 240 }), /returned by searchPOIs/);
  await executor.execute('buildRoute', { poiIds: [monument.id, poi.id], startISO: '2026-10-06T12:00:00+05:30', availableMinutes: 240 });
  assert.deepEqual(executor.plan?.stops.map(stop => stop.poiId), [monument.id, poi.id]);
  assert.equal(executor.plan?.totalMinutes, 130);
  const samePlace = { ...poi, id: 'duplicate', name: `  ${poi.name.toUpperCase()}  ` };
  assert.throws(() => buildRoute([poi, samePlace], [poi.id, samePlace.id], startAt, 240), /same place/);
});
test('timestamps require timezone and Haversine distance is symmetric', () => {
  assert.throws(() => parseStartISO('2026-10-06T12:00:00'), /timezone/);
  assert.equal(parseStartISO('2026-10-06T12:00:00+05:30'), startAt);
  assert.equal(haversineKm(0, 0, 0, 0), 0);
  assert.ok(Math.abs(haversineKm(26, 75, 27, 76) - haversineKm(27, 76, 26, 75)) < .00001);
});
test('WhatsApp encodes one public trip link and the time-blocked itinerary', () => {
  const trip = { ...buildRoute([poi], [poi.id], startAt, 120), code: 'LG-1234567890', guestQuery: 'kids & food', createdAt: startAt };
  const url = new URL(whatsappURL(trip, 'https://localguide.example'));
  assert.equal(url.origin, 'https://wa.me');
  const text = url.searchParams.get('text')!;
  assert.ok(text.includes('https://localguide.example/trip/LG-1234567890'));
  assert.ok(text.includes(poi.name));
  assert.ok(text.includes('12:05'));
});
