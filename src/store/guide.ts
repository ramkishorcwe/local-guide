import { create } from 'zustand';
import type { ChatMessage, RoutePlan, Trip } from '../types/trip';
type GuideState = {
  messages: ChatMessage[]; plan: RoutePlan | null; trip: Trip | null;
  guestQuery: string; busy: boolean; status: string; error: string; selectedId: string | null; draft: string; focusInput: boolean;
  patch: (patch: Partial<Omit<GuideState, 'patch'>>) => void;
};
export const useGuideStore = create<GuideState>((set) => ({
  messages: [], plan: null, trip: null, guestQuery: '', busy: false, status: '', error: '', selectedId: null, draft: '', focusInput: false,
  patch: (patch) => set(patch),
}));
