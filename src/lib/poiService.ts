import { databases, DATABASE_ID, POIS_COLLECTION_ID, ID, Query } from './appwrite';
import type { IPoi } from '../interfaces';
import { docToPOI, poiToPayload, type POIDocument } from './poiCodec';
import { saveUniquePOI } from './poiUniqueness';
export { poiToPayload } from './poiCodec';
export async function listPOIs(): Promise<IPoi[]> {
  const result: IPoi[] = [];
  let cursor: string | undefined;
  do {
    const page = await databases.listDocuments({ databaseId: DATABASE_ID, collectionId: POIS_COLLECTION_ID,
      queries: [Query.limit(100), Query.orderAsc('name'), ...(cursor ? [Query.cursorAfter(cursor)] : [])] });
    result.push(...page.documents.map((doc) => docToPOI(doc as unknown as POIDocument)));
    cursor = page.documents.length === 100 ? page.documents.at(-1)!.$id : undefined;
  } while (cursor);
  return result;
}
export async function createPOI(poi: Partial<IPoi>): Promise<IPoi> {
  validatePOI(poi);
  const data = poiToPayload(poi);
  const doc = await saveUniquePOI(poi, { list: listPOIs,
    write: () => databases.createDocument({ databaseId: DATABASE_ID, collectionId: POIS_COLLECTION_ID,
      documentId: ID.unique(), data }) });
  return docToPOI(doc as unknown as POIDocument);
}
export async function updatePOI(id: string, patch: Partial<IPoi>): Promise<IPoi> {
  const previous = await databases.getDocument({ databaseId: DATABASE_ID, collectionId: POIS_COLLECTION_ID, documentId: id });
  const poi = { ...docToPOI(previous as unknown as POIDocument), ...patch };
  validatePOI(poi);
  const data = poiToPayload(poi);
  const doc = await saveUniquePOI(poi, { list: listPOIs, excludeId: id,
    write: () => databases.updateDocument({ databaseId: DATABASE_ID, collectionId: POIS_COLLECTION_ID,
      documentId: id, data }) });
  return docToPOI(doc as unknown as POIDocument);
}
export async function deletePOI(id: string): Promise<void> {
  await databases.deleteDocument({ databaseId: DATABASE_ID, collectionId: POIS_COLLECTION_ID, documentId: id });
}
function validatePOI(poi: Partial<IPoi>): asserts poi is IPoi {
  if (!poi.name?.trim() || !poi.area?.trim() || !poi.subCategory?.trim() || !poi.category || !poi.imageUrl?.trim()) {
    throw new Error('Name, area, sub-category, category and image URL are required.');
  }
  if (!Number.isFinite(poi.lat) || !Number.isFinite(poi.lng) || Math.abs(poi.lat!) > 90 || Math.abs(poi.lng!) > 180
    || !Number.isFinite(poi.rating) || poi.rating! < 0 || poi.rating! > 5
    || !Number.isInteger(poi.avgVisitMinutes) || poi.avgVisitMinutes! <= 0
    || !Number.isFinite(poi.distanceFromHotelKm) || poi.distanceFromHotelKm! < 0) {
    throw new Error('Check coordinates, rating, distance and visit duration.');
  }
  if (!poi.openHours || Object.keys(poi.openHours).length !== 7 || !poi.tags
    || typeof poi.kidFriendly !== 'boolean' || typeof poi.indoor !== 'boolean' || typeof poi.partner !== 'boolean'
    || !Number.isInteger(poi.commissionPct) || poi.commissionPct! < 0 || poi.commissionPct! > 100) {
    throw new Error('Complete all weekly opening hours and partner details.');
  }
  if (Object.values(poi.openHours).some((hours) => !/^(closed|24 hours|24\/7|(?:\d{2}:\d{2}-\d{2}:\d{2})(?:,\s*\d{2}:\d{2}-\d{2}:\d{2})*)$/i.test(hours))) {
    throw new Error('Hours must be HH:mm-HH:mm, closed, or 24 hours. Separate split hours with a comma.');
  }
}
