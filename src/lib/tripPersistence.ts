import type { RoutePlan, Trip } from '../types/trip';
import { docToTrip, tripToPayload } from './tripCodec.js';

export function newTripCode() {
  return `LG-${crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}

export async function persistTrip(plan: RoutePlan, guestQuery: string, code: string, adapter: {
  create: (code: string, data: ReturnType<typeof tripToPayload>) => Promise<Record<string, unknown>>;
  read: (code: string) => Promise<Record<string, unknown>>;
}): Promise<Trip> {
  const data = tripToPayload(plan, code, guestQuery);
  try { return docToTrip(await adapter.create(code, data), code); }
  catch (original) {
    // An interrupted response can conceal a successful write. Retry the same ID
    // and recover only an exactly matching snapshot, never a different trip.
    try {
      const existing = await adapter.read(code);
      if (Object.entries(data).every(([key, value]) => existing[key] === value)) return docToTrip(existing, code);
    } catch { /* Preserve the original create error if recovery cannot confirm it. */ }
    throw original;
  }
}
