import type { IPoi } from '../interfaces';
// Immutable snapshots are serialized together in Appwrite's stops longtext column.
export type TripStop = {
  poiId: string; name: string; category: IPoi['category']; area: string;
  lat: number; lng: number; startAt: number; endAt: number;
  travelMinutes: number; distanceKm: number; priceINR: number;
  partner: boolean; commissionPct: number;
};
export type RoutePlan = { stops: TripStop[]; totalMinutes: number; totalDistanceKm: number; startAt?: number; availableMinutes?: number; routeNote?: string };
export type PlanningContext = { poiIds: string[]; startISO: string; availableMinutes: number };
export type Trip = RoutePlan & { code: string; guestQuery: string; createdAt: number };
export type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string; outcome?: 'pending' | 'complete' | 'failed' | 'cancelled'; error?: string };
export type ChatEvent =
  | { type: 'status'; message: string }
  | { type: 'text'; delta: string }
  | { type: 'itinerary'; plan: RoutePlan }
  | { type: 'error'; message: string }
  | { type: 'done' };
