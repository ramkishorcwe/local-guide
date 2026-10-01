import type {Booking} from '../interfaces'
export const MOCK_BOOKINGS: Booking[] = [
  {
    id: "bk_001",
    tripCode: "SAATHI-4821",
    poiId: "poi_005",
    poiName: "Chokhi Dhani Village Experience",
    amountINR: 1100,
    commissionPct: 15,
    commissionINR: 165,
    bookedAt: Date.now(),
  },
];