import { create } from 'zustand';

export interface TrackedAsset {
  id: string;
  projectName: string;
  community: string;
  developer: string;
  addedAt: string;
}

interface PortfolioStore {
  assets: TrackedAsset[];
  addAsset: (a: TrackedAsset) => void;
  removeAsset: (id: string) => void;
}

export const usePortfolioStore = create<PortfolioStore>((set) => ({
  assets: [],
  addAsset: (a) => set((s) => ({ assets: [...s.assets, a] })),
  removeAsset: (id) => set((s) => ({ assets: s.assets.filter((x) => x.id !== id) })),
}));
