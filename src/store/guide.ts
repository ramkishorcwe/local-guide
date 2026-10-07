import { create } from 'zustand';
import type { ChatMessage, RoutePlan, Trip } from '../types/trip';
type GuideState = {
  messages: ChatMessage[]; plan: RoutePlan | null; trip: Trip | null; tripCode: string | null;
  guestQuery: string; busy: boolean; status: string; error: string; selectedId: string | null; draft: string; focusInput: boolean;
  patch: (patch: Partial<Omit<GuideState, 'patch' | 'setItinerary'>>) => void;
  setItinerary: (plan: RoutePlan, guestQuery: string) => void;
};
export const useGuideStore = create<GuideState>((set) => ({
  messages: [], plan: null, trip: null, tripCode: null, guestQuery: '', busy: false, status: '', error: '', selectedId: null, draft: '', focusInput: false,
  patch: (patch) => set(patch),
  setItinerary: (plan, guestQuery) => set(state => {
    const unchanged = state.plan && JSON.stringify(state.plan.stops) === JSON.stringify(plan.stops)
      && state.plan.totalMinutes === plan.totalMinutes && state.plan.totalDistanceKm === plan.totalDistanceKm;
    return { plan, guestQuery, selectedId: null, ...(unchanged ? {} : { trip: null, tripCode: null }) };
  }),
}));
