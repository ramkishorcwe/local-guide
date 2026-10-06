import {
  databases,
  DATABASE_ID,
  POIS_COLLECTION_ID,
  ID,
  Query,
} from "./appwrite";
import type { IPoi } from "../interfaces";
import { makeNaturalKeyFromInput } from "../utility/naturalKey";

// Convert Appwrite doc → POI type
function docToPOI(doc: any): IPoi {
  return {
    id: doc.$id,
    name: doc.name,
    category: doc.category,
    subCategory: doc.subCategory,
    cuisine: doc.cuisine || undefined,
    priceLevel: doc.priceLevel || undefined,
    priceINR: doc.priceINR || undefined,
    entryFeeINR: doc.entryFeeINR || undefined,
    foreignerFeeINR: doc.foreignerFeeINR || undefined,
    rating: doc.rating,
    lat: doc.lat,
    lng: doc.lng,
    area: doc.area,
    openHours: (doc.openHours as string[]).reduce(
      (acc, entry) => {
        const [day, hours] = entry.split(":");
        acc[day] = hours;
        return acc;
      },
      {} as Record<string, string>
    ),
    kidFriendly: doc.kidFriendly,
    indoor: doc.indoor,
    pureVeg: doc.pureVeg,
    jainFoodAvailable: doc.jainFoodAvailable,
    hasRooftop: doc.hasRooftop,
    distanceFromHotelKm: doc.distanceFromHotelKm,
    avgVisitMinutes: doc.avgVisitMinutes,
    partner: doc.partner,
    commissionPct: doc.commissionPct,
    bookingUrl: doc.bookingUrl || null,
    tags: doc.tags as string[],
    imageUrl: doc.imageUrl,
    notes: doc.notes || undefined,
  };
}

// Convert POI type → Appwrite payload
export function poiToPayload(poi: Partial<POI>) {
  return {
    name: poi.name ?? "",
    category: poi.category ?? "attraction",
    subCategory: poi.subCategory ?? "",
    cuisine: poi.cuisine ?? "",
    priceLevel: poi.priceLevel ?? 0,
    priceINR: poi.priceINR ?? 0,
    entryFeeINR: poi.entryFeeINR ?? 0,
    foreignerFeeINR: poi.foreignerFeeINR ?? 0,
    rating: poi.rating ?? 0,
    lat: poi.lat ?? 0,
    lng: poi.lng ?? 0,
    area: poi.area ?? "",
    openHours: Object.entries(poi.openHours ?? {}).map(
      ([day, hours]) => `${day}:${hours}`
    ),
    kidFriendly: poi.kidFriendly ?? false,
    indoor: poi.indoor ?? false,
    pureVeg: poi.pureVeg ?? false,
    jainFoodAvailable: poi.jainFoodAvailable ?? false,
    hasRooftop: poi.hasRooftop ?? false,
    distanceFromHotelKm: poi.distanceFromHotelKm ?? 0,
    avgVisitMinutes: poi.avgVisitMinutes ?? 60,
    partner: poi.partner ?? false,
    commissionPct: poi.commissionPct ?? 0,
    bookingUrl: poi.bookingUrl ?? "",
    tags: poi.tags ?? [],
    imageUrl: poi.imageUrl ?? "",
    notes: poi.notes ?? "",
    naturalKey: makeNaturalKeyFromInput(poi.name ?? "", poi.area ?? ""),
  };
}

// LIST all POIs
export async function listPOIs(): Promise<POI[]> {
  const res = await databases.listDocuments(DATABASE_ID, POIS_COLLECTION_ID, [
    Query.limit(100),
    Query.orderAsc("name"),
  ]);
  return res.documents.map(docToPOI);
}

// CREATE
export async function createPOI(poi: Partial<POI>): Promise<POI> {
  const payload = poiToPayload(poi);
  const doc = await databases.createDocument(
    DATABASE_ID,
    POIS_COLLECTION_ID,
    ID.unique(),
    payload
  );
  return docToPOI(doc);
}

// UPDATE
export async function updatePOI(id: string, poi: Partial<POI>): Promise<POI> {
  const payload = poiToPayload(poi);
  const doc = await databases.updateDocument(
    DATABASE_ID,
    POIS_COLLECTION_ID,
    id,
    payload
  );
  return docToPOI(doc);
}

// DELETE
export async function deletePOI(id: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, POIS_COLLECTION_ID, id);
}