import type { IPoi } from '../interfaces';
import { makeNaturalKey, normalizePOIText } from '../utility/naturalKey.js';

export type POIDocument = Omit<IPoi, 'id' | 'openHours' | 'bookingUrl' | 'foreignerFeeINR'> & {
  $id: string; openHours: string | string[]; bookingUrl?: string | null; foreignerFeeINR?: string | number | null;
};
export function docToPOI(doc: POIDocument): IPoi {
  const { $id, openHours, foreignerFeeINR, ...fields } = doc;
  // Read the original string-array representation as well as the current text column.
  const hours: unknown = typeof openHours === 'string' ? JSON.parse(openHours) :
    Object.fromEntries(openHours.map((entry) => {
      const separator = entry.indexOf(':');
      if (separator < 1) throw new Error('Invalid opening-hours document');
      return [entry.slice(0, separator), entry.slice(separator + 1)];
    }));
  if (!hours || typeof hours !== 'object' || Array.isArray(hours)
    || !Object.values(hours).every((value) => typeof value === 'string')) throw new Error('Invalid opening-hours document');
  const fee = foreignerFeeINR == null || foreignerFeeINR === '' ? undefined : Number(foreignerFeeINR);
  if (fee !== undefined && (!Number.isFinite(fee) || fee < 0)) throw new Error('Invalid foreigner fee in POI document');
  return { ...fields, id: $id, bookingUrl: doc.bookingUrl || null, foreignerFeeINR: fee,
    openHours: hours as Record<string, string>,
  };
}
export function poiToPayload(poi: IPoi | Omit<IPoi, 'id'>) {
  return {
    name: normalizePOIText(poi.name), category: poi.category, subCategory: poi.subCategory,
    cuisine: poi.cuisine ?? '', priceLevel: poi.priceLevel ?? 0,
    priceINR: poi.priceINR ?? 0, entryFeeINR: poi.entryFeeINR ?? 0,
    foreignerFeeINR: String(poi.foreignerFeeINR ?? 0), rating: poi.rating,
    lat: poi.lat, lng: poi.lng, area: normalizePOIText(poi.area),
    openHours: JSON.stringify(poi.openHours),
    kidFriendly: poi.kidFriendly, indoor: poi.indoor,
    pureVeg: poi.pureVeg ?? false, jainFoodAvailable: poi.jainFoodAvailable ?? false,
    hasRooftop: poi.hasRooftop ?? false, distanceFromHotelKm: poi.distanceFromHotelKm,
    avgVisitMinutes: poi.avgVisitMinutes, partner: poi.partner,
    commissionPct: poi.commissionPct, bookingUrl: poi.bookingUrl || null,
    tags: poi.tags, imageUrl: poi.imageUrl, notes: poi.notes ?? '',
    naturalKey: makeNaturalKey(poi),
  };
}
