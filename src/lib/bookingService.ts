import type { Booking } from '../interfaces';
export async function bookPartner(tripCode: string, poiId: string, requestId: string): Promise<Booking> {
  const response = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tripCode, poiId, requestId }), signal: AbortSignal.timeout(30_000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Booking failed');
  return result;
}
