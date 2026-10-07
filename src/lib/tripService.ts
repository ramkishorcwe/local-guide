import { databases, DATABASE_ID, TRIPS_COLLECTION_ID } from './appwrite';
import type { RoutePlan, Trip } from '../types/trip';
import { docToTrip } from './tripCodec';
import { newTripCode, persistTrip } from './tripPersistence';
export async function saveTrip(plan: RoutePlan, guestQuery: string, code = newTripCode()): Promise<Trip> {
  return persistTrip(plan, guestQuery, code, {
    create: (documentId, data) => databases.createDocument({ databaseId: DATABASE_ID, collectionId: TRIPS_COLLECTION_ID, documentId, data }),
    read: documentId => databases.getDocument({ databaseId: DATABASE_ID, collectionId: TRIPS_COLLECTION_ID, documentId }),
  });
}
export async function readTrip(code: string): Promise<Trip> {
  if (!/^LG-[A-Z0-9]{10}$/.test(code)) throw new Error('This trip link is invalid.');
  const doc = await databases.getDocument({ databaseId: DATABASE_ID, collectionId: TRIPS_COLLECTION_ID, documentId: code });
  return docToTrip(doc, code);
}
