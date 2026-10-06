import { useEffect } from 'react';
import { create } from 'zustand';
import type { Models } from 'appwrite';
import { account, appwriteConfigured } from '../lib/appwrite';
type AuthState = { user: Models.User<Models.Preferences> | null; loading: boolean; initialized: boolean;
  initialize: () => Promise<void>; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void> };
const useAuthStore = create<AuthState>((set, get) => ({
  user: null, loading: true, initialized: false,
  initialize: async () => {
    if (get().initialized) return;
    set({ initialized: true });
    try { set({ user: appwriteConfigured ? await account.get() : null }); }
    catch { set({ user: null }); }
    finally { set({ loading: false }); }
  },
  login: async (email, password) => {
    await account.createEmailPasswordSession({ email, password });
    set({ user: await account.get(), loading: false });
  },
  logout: async () => { await account.deleteSession({ sessionId: 'current' }); set({ user: null }); },
}));
export function useAdminAuth() {
  const state = useAuthStore();
  const initialize = state.initialize;
  useEffect(() => { void initialize(); }, [initialize]);
  return state;
}
