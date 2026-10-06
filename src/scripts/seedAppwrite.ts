// import { databases, DATABASE_ID, POIS_COLLECTION_ID, ID } from "../services/appwrite";
// import { POIS } from "../data/pois";

// export async function seedPOIs() {
//   console.log(`Seeding ${POIS.length} POIs...`);

//   for (const poi of POIS) {
//     try {
//       await databases.createDocument(
//         DATABASE_ID,
//         POIS_COLLECTION_ID,
        
//         ID.unique(),
//         {
//           name: poi.name,
//           category: poi.category,
//           subCategory: poi.subCategory,
//           cuisine: poi.cuisine ?? "",
//           priceLevel: poi.priceLevel ?? 0,
//           priceINR: poi.priceINR ?? 0,
//           entryFeeINR: poi.entryFeeINR ?? 0,
//           foreignerFeeINR: poi.foreignerFeeINR ?? 0,
//           rating: poi.rating,
//           lat: poi.lat,
//           lng: poi.lng,
//           area: poi.area,
//           openHours: JSON.stringify(poi.openHours),
//           kidFriendly: poi.kidFriendly,
//           indoor: poi.indoor,
//           pureVeg: poi.pureVeg ?? false,
//           jainFoodAvailable: poi.jainFoodAvailable ?? false,
//           hasRooftop: poi.hasRooftop ?? false,
//           distanceFromHotelKm: poi.distanceFromHotelKm,
//           avgVisitMinutes: poi.avgVisitMinutes,
//           partner: poi.partner,
//           commissionPct: poi.commissionPct,
//           bookingUrl: poi.bookingUrl ?? "",
//           tags: poi.tags.join(","),
//           imageUrl: poi.imageUrl,
//           notes: poi.notes ?? "",
//         }
//       );
//       console.log(`✅ ${poi.name}`);
//     } catch (err) {
//       console.error(`❌ Failed: ${poi.name}`, err);
//     }
//   }

//   console.log("🎉 Seed complete");
// }

// src/scripts/seedAppwrite.ts
import { listPOIs, createPOI, updatePOI } from "../services/poiService"
import { POIS } from "../data/pois";
import { makeNaturalKeyFromInput } from "../utility/naturalKey";

export async function seedPOIs() {
  const existing = await listPOIs();
  const existingKeys = new Map(
    existing.map((p) => [makeNaturalKeyFromInput(p.name, p.area), p.id])
  );

  for (const poi of POIS) {
    const key = makeNaturalKeyFromInput(poi.name, poi.area);
    const existingId = existingKeys.get(key);

    try {
      if (existingId) {
        await updatePOI(existingId, poi);
        console.log(`🔄 Updated: ${poi.name}`);
      } else {
        await createPOI(poi);
        console.log(`✅ Created: ${poi.name}`);
      }
    } catch (err) {
      console.error(`❌ Failed: ${poi.name}`, err);
    }
  }
  console.log("🎉 Seed complete");
}

