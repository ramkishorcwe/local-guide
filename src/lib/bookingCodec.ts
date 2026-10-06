import type { Booking } from '../interfaces';
import { documentCreatedAt } from './documentTimestamp.js';

export function docToBooking(doc: Record<string, unknown>): Booking {
  if (typeof doc.$id !== 'string' || typeof doc.tripCode !== 'string' || typeof doc.poiId !== 'string'
    || typeof doc.poiName !== 'string' || !Number.isInteger(doc.amountINR) || Number(doc.amountINR) < 0
    || !Number.isInteger(doc.commissionPct) || Number(doc.commissionPct) < 0 || Number(doc.commissionPct) > 100
    || !Number.isInteger(doc.commissionINR) || Number(doc.commissionINR) < 0) throw new Error('Invalid booking document');
  return { id: doc.$id, tripCode: doc.tripCode, poiId: doc.poiId, poiName: doc.poiName,
    amountINR: doc.amountINR as number, commissionPct: doc.commissionPct as number,
    commissionINR: doc.commissionINR as number, bookedAt: documentCreatedAt(doc, 'bookedAt') };
}
