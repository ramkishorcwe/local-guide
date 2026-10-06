import test from 'node:test';
import assert from 'node:assert/strict';
import { POIS } from '../src/data/pois';
import { poiToPayload, docToPOI } from '../src/lib/poiCodec';
import { tripToPayload, docToTrip, deserializeStops } from '../src/lib/tripCodec';
import { docToBooking } from '../src/lib/bookingCodec';
import { buildRoute, HOTEL } from '../src/lib/planner';

const createdAt = '2026-10-06T06:30:00.000+00:00';
const code = 'LG-1234567890';
const poi = { ...POIS[0], lat: HOTEL.lat, lng: HOTEL.lng, openHours: { tue: '24 hours' } };
const plan = buildRoute([poi], [poi.id], Date.parse(createdAt), 720);

test('POI payload matches text hours, text foreigner fee, URL null and array tags without rounding ratings', () => {
  const original = { ...poi, rating: 4.7, foreignerFeeINR: 500, bookingUrl: null };
  const payload = poiToPayload(original);
  assert.equal(typeof payload.openHours, 'string');
  assert.equal(payload.foreignerFeeINR, '500');
  assert.equal(payload.rating, 4.7);
  assert.equal(payload.bookingUrl, null);
  assert.deepEqual(payload.tags, original.tags);
  const decoded = docToPOI({ ...payload, $id: original.id });
  assert.deepEqual(decoded.openHours, original.openHours);
  assert.equal(decoded.foreignerFeeINR, 500);
  assert.equal(decoded.bookingUrl, null);
  assert.equal(docToPOI({ ...payload, $id: poi.id, foreignerFeeINR: '0' }).foreignerFeeINR, 0);
  assert.throws(() => docToPOI({ ...payload, $id: poi.id, foreignerFeeINR: 'ask at venue' }), /Invalid foreigner fee/);
});

test('POI decoder reads legacy colon arrays and rejects non-string hours', () => {
  const payload = poiToPayload(poi);
  const decoded = docToPOI({ ...payload, $id: poi.id, openHours: ['mon:09:30-18:45', 'tue:closed'], foreignerFeeINR: 0 });
  assert.deepEqual(decoded.openHours, { mon: '09:30-18:45', tue: 'closed' });
  assert.throws(() => docToPOI({ ...payload, $id: poi.id, openHours: '{"tue":42}' }), /Invalid opening-hours/);
});

test('trip longtext snapshots roundtrip with built-in timestamps and no custom timestamp attribute', () => {
  const longPlan = { ...plan, stops: [{ ...plan.stops[0], name: 'Palace '.repeat(100) }] };
  const payload = tripToPayload(longPlan, code, 'Family day');
  assert.deepEqual(Object.keys(payload).sort(), ['code', 'guestQuery', 'totalMinutes', 'totalDistanceKm', 'stops'].sort());
  assert.equal(typeof payload.stops, 'string');
  const trip = docToTrip({ ...payload, $createdAt: createdAt }, code);
  assert.deepEqual(trip.stops, longPlan.stops);
  assert.equal(trip.createdAt, Date.parse(createdAt));
  const legacy = docToTrip({ ...payload, stops: longPlan.stops.map(stop => JSON.stringify(stop)), createdAt: 123 }, code);
  assert.deepEqual(legacy.stops, longPlan.stops);
  assert.equal(legacy.createdAt, 123);
  assert.throws(() => docToTrip({ ...payload, $createdAt: 'invalid' }, code), /timestamp/);
  assert.throws(() => docToTrip({ ...payload, $createdAt: createdAt }, 'LG-0000000000'), /invalid trip/);
  assert.throws(() => deserializeStops('[]'), /invalid stops/);
  assert.throws(() => deserializeStops(JSON.stringify([{ ...plan.stops[0], lat: 100 }])), /invalid stop/);
});

test('booking reads creation metadata, including retries and older custom timestamps', () => {
  const payload = { $id: 'booking-1', tripCode: code, poiId: poi.id, poiName: poi.name, amountINR: 1000,
    commissionPct: 15, commissionINR: 150 };
  assert.equal(docToBooking({ ...payload, $createdAt: createdAt }).bookedAt, Date.parse(createdAt));
  assert.equal(docToBooking({ ...payload, bookedAt: 123 }).bookedAt, 123);
  assert.equal(docToBooking({ ...payload, $createdAt: createdAt, bookedAt: 123 }).bookedAt, Date.parse(createdAt));
  assert.throws(() => docToBooking(payload), /timestamp/);
});
