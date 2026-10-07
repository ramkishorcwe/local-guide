import { useGuideStore } from '../store/guide';
import { saveTrip } from '../lib/tripService';
import { newTripCode } from '../lib/tripPersistence';
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
    const code = state.tripCode || newTripCode();
    state.patch({ tripCode: code });
    const promise = saveTrip(plan, state.guestQuery, code).then((saved) => {
      if (useGuideStore.getState().tripCode === code) useGuideStore.getState().patch({ trip: saved });
      return saved;
    }).finally(() => { if (pending?.promise === promise) pending = undefined; });
    pending = { plan, promise };
    return promise;
  };
  return { trip, ensureTrip };
}
