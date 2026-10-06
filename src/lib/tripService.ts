import { databases, DATABASE_ID, TRIPS_COLLECTION_ID } from './appwrite';
import type { RoutePlan, Trip } from '../types/trip';
import { docToTrip, tripToPayload } from './tripCodec';
export async function saveTrip(plan: RoutePlan, guestQuery: string): Promise<Trip> {
  const code = `LG-${crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
  const doc = await databases.createDocument({ databaseId: DATABASE_ID, collectionId: TRIPS_COLLECTION_ID, documentId: code,
    data: tripToPayload(plan, code, guestQuery) });
  return docToTrip(doc, code);
}
export async function readTrip(code: string): Promise<Trip> {
  if (!/^LG-[A-Z0-9]{10}$/.test(code)) throw new Error('This trip link is invalid.');
  const doc = await databases.getDocument({ databaseId: DATABASE_ID, collectionId: TRIPS_COLLECTION_ID, documentId: code });
  return docToTrip(doc, code);
}
