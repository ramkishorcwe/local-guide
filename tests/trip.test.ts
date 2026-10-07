import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoute, HOTEL } from '../src/lib/planner';
import { POIS } from '../src/data/pois';
import { persistTrip } from '../src/lib/tripPersistence';
import { localPlanningDefaults, localTripStart } from '../src/lib/tripBuilder';
import { useGuideStore } from '../src/store/guide';

const startAt = Date.parse('2026-10-08T10:00:00+05:30');
const pois = POIS.slice(0, 3).map(poi => ({ ...poi, lat: HOTEL.lat, lng: HOTEL.lng, avgVisitMinutes: 30 }));
const plan = buildRoute(pois, pois.map(poi => poi.id), startAt, 180);
const code = 'LG-1234567890';

test('saving a multi-stop trip recovers a committed write after a lost response, without another record', async () => {
  const rows = new Map<string, Record<string, unknown>>();
  let creates = 0;
  const adapter = {
    create: async (id: string, data: Record<string, unknown>) => {
      creates++;
      if (rows.has(id)) throw Object.assign(new Error('Conflict'), { code: 409 });
      rows.set(id, { ...data, $createdAt: '2026-10-07T06:00:00Z' });
      throw new Error('Connection interrupted after write');
    },
    read: async (id: string) => { if (!rows.has(id)) throw new Error('Not found'); return rows.get(id)!; },
  };
  const saved = await persistTrip(plan, 'Three stops tomorrow', code, adapter);
  assert.equal(saved.stops.length, 3);
  assert.deepEqual(saved.stops.map(stop => stop.poiId), pois.map(poi => poi.id));
  assert.equal((await persistTrip(plan, 'Three stops tomorrow', code, adapter)).code, code);
  assert.equal(creates, 2);
  assert.equal(rows.size, 1);
  await assert.rejects(persistTrip(plan, 'Different trip', code, adapter), /Conflict/);
});

test('failed trip saving preserves the original permission failure rather than inventing success', async () => {
  const error = Object.assign(new Error('Permission denied'), { code: 401 });
  await assert.rejects(persistTrip(plan, '', code, { create: async () => { throw error; }, read: async () => { throw new Error('Not found'); } }), error);
});

test('local trip dates use Jaipur time, including tomorrow at midnight and invalid dates', () => {
  assert.deepEqual(localPlanningDefaults(Date.parse('2026-10-07T23:58:00+05:30')), { date: '2026-10-08', time: '00:00' });
  assert.equal(localTripStart('2026-10-08', '10:00'), startAt);
  assert.throws(() => localTripStart('2026-02-31', '10:00'), /valid trip date/);
  assert.throws(() => localTripStart('2026-10-08', '25:00'), /date and start time/);
});

test('an unchanged follow-up keeps the saved link; a changed itinerary gets a fresh save identity', () => {
  const trip = { ...plan, code, guestQuery: 'Three stops', createdAt: startAt };
  const store = useGuideStore.getState();
  store.patch({ plan, trip, tripCode: code });
  store.setItinerary(structuredClone(plan), 'Tell me more about lunch');
  assert.equal(useGuideStore.getState().trip, trip);
  assert.equal(useGuideStore.getState().tripCode, code);
  const changed = buildRoute(pois, pois.map(poi => poi.id).reverse(), startAt, 180);
  store.setItinerary(changed, 'Reverse the stops');
  assert.equal(useGuideStore.getState().trip, null);
  assert.equal(useGuideStore.getState().tripCode, null);
  assert.deepEqual(useGuideStore.getState().plan?.stops.map(stop => stop.poiId), pois.map(poi => poi.id).reverse());
  store.patch({ plan: null, trip: null, tripCode: null });
});

