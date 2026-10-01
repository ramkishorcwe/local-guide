export interface IPoi{
    id: string;
    name: string;
    category: "restaurant" | "attraction" | "experience" | "shopping" | "cafe" | "wellness" | "park" | "transport";
    subCategory: string;
    cuisine?: string;
    priceLevel?: number;
    priceINR?: number;
    entryFeeINR?: number;
    foreignerFeeINR?: number;
    rating: number;
    lat: number;
    lng: number;
    area: string;
    openHours: Record<string, string>;
    kidFriendly: boolean;
    indoor: boolean;
    pureVeg?: boolean;
    jainFoodAvailable?: boolean;
    hasRooftop?: boolean;
    distanceFromHotelKm: number;
    avgVisitMinutes: number;
    partner: boolean;
    commissionPct: number;
    bookingUrl: string | null;
    tags: string[];
    imageUrl: string;
    notes?: string;
};

export type Booking = {
  id: string;
  tripCode: string;
  poiId: string;
  poiName: string;
  amountINR: number;
  commissionPct: number;
  commissionINR: number;
  bookedAt: number;
};

