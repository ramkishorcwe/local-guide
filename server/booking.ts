import { createHash } from 'node:crypto';
import { appwriteRequest, collectionId, HttpError } from './appwrite.js';
import { docToPOI, type POIDocument } from '../src/lib/poiCodec.js';
import { price } from '../src/lib/planner.js';
import type { Booking } from '../src/interfaces';
import { docToBooking } from '../src/lib/bookingCodec.js';
import { deserializeStops } from '../src/lib/tripCodec.js';

export async function handleBooking(body: unknown): Promise<Booking> {
  const { tripCode, poiId, requestId } = (body || {}) as Record<string, unknown>;
  if (typeof tripCode !== 'string' || !/^LG-[A-Z0-9]{10}$/.test(tripCode) || typeof poiId !== 'string'
    || !/^[a-zA-Z0-9._-]{1,36}$/.test(poiId) || typeof requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(requestId)) {
    throw new HttpError(400, 'Invalid booking request');
  }
  const id = createHash('sha256').update(`${tripCode}:${poiId}:${requestId}`).digest('hex').slice(0, 32);
  // Stable ID makes retries safe even when a successful response is lost.
  try {
    const saved = await appwriteRequest<Record<string, unknown>>(collectionId('bookings'), `/${id}`);
    return docToBooking(saved);
  } catch (error) { if (!(error instanceof HttpError) || error.status !== 404) throw error; }
  const trip = await appwriteRequest<{ stops: unknown }>(collectionId('trips'), `/${encodeURIComponent(tripCode)}`);
  if (!deserializeStops(trip.stops).some((stop) => stop.poiId === poiId)) throw new HttpError(400, 'This place is not in the shared trip');
  const doc = await appwriteRequest<POIDocument>(collectionId('pois'), `/${encodeURIComponent(poiId)}`);
  const poi = docToPOI(doc);
  const amountINR = price(poi);
  if (!poi.partner || !amountINR || !Number.isInteger(amountINR) || !Number.isInteger(poi.commissionPct)
    || poi.commissionPct < 0 || poi.commissionPct > 100) throw new HttpError(400, 'This partner does not have a bookable price');
  const data = { tripCode, poiId, poiName: poi.name, amountINR, commissionPct: poi.commissionPct,
    commissionINR: Math.round(amountINR * poi.commissionPct / 100) };
  try {
    const saved = await appwriteRequest<Record<string, unknown>>(collectionId('bookings'), '', {
      method: 'POST', body: JSON.stringify({ documentId: id, data }),
    });
    return docToBooking(saved);
  } catch (error) {
    if (!(error instanceof HttpError) || error.status !== 409) throw error;
    const saved = await appwriteRequest<Record<string, unknown>>(collectionId('bookings'), `/${id}`);
    return docToBooking(saved);
  }
}
