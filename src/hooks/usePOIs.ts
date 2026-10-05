import { useEffect, useState } from "react";
import { databases, DATABASE_ID, POIS_COLLECTION_ID, Query } from "../services/appwrite";
import type { IPoi } from "../interfaces";

export function usePOIs() {
  const [pois, setPois] = useState<IPoi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPOIs() {
      try {
        const res = await databases.listDocuments(
          DATABASE_ID,
          POIS_COLLECTION_ID,
          [Query.limit(100)]
        );

        const data: IPoi[] = res.documents.map((doc: any) => ({
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
          // 👇 Convert array back to object
          openHours: (doc.openHours as string[]).reduce((acc, entry) => {
            const [day, hours] = entry.split(":");
            acc[day] = hours;
            return acc;
          }, {} as Record<string, string>),
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
          tags: doc.tags as string[], // 👈 Already an array!
          imageUrl: doc.imageUrl,
          notes: doc.notes || undefined,
        }));

        setPois(data);
      } catch (err) {
        console.error("Failed to fetch POIs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPOIs();
  }, []);

  return { pois, loading };
}