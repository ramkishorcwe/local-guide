import { useGuideStore } from '../store/guide';
import { saveTrip } from '../lib/tripService';
import type { RoutePlan, Trip } from '../types/trip';
let pending: { plan: RoutePlan; promise: Promise<Trip> } | undefined;
export function useTrip() {
  const trip = useGuideStore((state) => state.trip);
  const ensureTrip = async () => {
    const state = useGuideStore.getState();
    if (state.trip) return state.trip;
    if (!state.plan) throw new Error('Make an itinerary first.');
    if (pending?.plan === state.plan) return pending.promise;
    const plan = state.plan;
    const promise = saveTrip(plan, state.guestQuery).then((saved) => {
      if (useGuideStore.getState().plan === plan) useGuideStore.getState().patch({ trip: saved });
      return saved;
    }).finally(() => { if (pending?.promise === promise) pending = undefined; });
    pending = { plan, promise };
    return promise;
  };
  return { trip, ensureTrip };
}
