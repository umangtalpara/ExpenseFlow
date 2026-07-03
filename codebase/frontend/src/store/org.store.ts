import { create } from 'zustand';
import { api } from '@/lib/api';

interface OrgState {
  currency: string;
  orgName: string;
  loaded: boolean;
  fetchOrgProfile: () => Promise<void>;
}

export const useOrgStore = create<OrgState>((set, get) => ({
  currency: 'USD',
  orgName: '',
  loaded: false,

  fetchOrgProfile: async () => {
    if (get().loaded) return; // Only fetch once per session
    try {
      const res = await api.get('/organizations/profile');
      set({
        currency: res.data.currency || 'USD',
        orgName: res.data.name || '',
        loaded: true,
      });
    } catch {
      // Silently fail — fallback to USD
      set({ loaded: true });
    }
  },
}));
