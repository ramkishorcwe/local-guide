import test from 'node:test';
import assert from 'node:assert/strict';
import { handleBooking } from '../server/booking';
import { POIS } from '../src/data/pois';
import { poiToPayload } from '../src/lib/poiCodec';
import { buildRoute, HOTEL } from '../src/lib/planner';
import { serializeStops } from '../src/lib/tripCodec';
test('booking uses catalogue price, validates trip membership, and deduplicates retries', async (context) => {
  process.env.APPWRITE_PROJECT_ID = 'test-project';
  const poi = { ...POIS[4], id: 'poi-partner' };
  const stops = buildRoute([{ ...poi, lat: HOTEL.lat, lng: HOTEL.lng,
    openHours: { tue: '24 hours' } }], [poi.id], Date.parse('2026-10-06T12:00:00+05:30'), 720).stops;
  const createdAt = '2026-10-06T06:30:00.000+00:00';
  const records = new Map<string, object>();
  let creates = 0;
  context.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
    const path = new URL(url).pathname;
    const id = path.split('/').at(-1)!;
    if (path.includes('/bookings/documents')) {
      if (init?.method === 'POST') {
        creates++; const body = JSON.parse(init.body as string);
        assert.deepEqual(Object.keys(body.data).sort(), ['tripCode', 'poiId', 'poiName', 'amountINR', 'commissionPct', 'commissionINR'].sort());
        const doc = { ...body.data, $id: body.documentId, $createdAt: createdAt };
        records.set(body.documentId, doc); return Response.json(doc);
      }
      return records.has(id) ? Response.json(records.get(id)) : Response.json({ message: 'Not found' }, { status: 404 });
    }
    if (path.includes('/trips/documents')) return Response.json({ stops: serializeStops(stops) });
    return Response.json({ ...poiToPayload(poi), $id: poi.id });
  });
  const request = { tripCode: 'LG-1234567890', poiId: poi.id, requestId: '01234567-0123-4567-8901-012345678901', amountINR: 1, commissionPct: 100 };
  const first = await handleBooking(request);
  const second = await handleBooking(request);
  assert.equal(first.amountINR, 1100);
  assert.equal(first.commissionINR, 165);
  assert.equal(first.id, second.id);
  assert.equal(first.bookedAt, Date.parse(createdAt));
  assert.deepEqual(first, second);
  assert.equal(creates, 1);
  await assert.rejects(handleBooking({ ...request, poiId: 'not-in-trip', requestId: 'abcdef01-0123-4567-8901-012345678901' }), /not in the shared trip/);
});
