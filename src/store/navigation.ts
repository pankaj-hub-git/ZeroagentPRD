import { create } from 'zustand';

interface NavStore {
  zoomLevel: 1 | 2 | 3 | 4 | 5;
  activeArea: string | null;
  activeCommunity: string | null;
  activeTower: string | null;
  activeFloor: number;
  activeTab: string;
  setZoomLevel: (z: 1 | 2 | 3 | 4 | 5) => void;
  setActiveArea: (a: string | null) => void;
  setActiveCommunity: (c: string | null) => void;
  setActiveTower: (t: string | null) => void;
  setActiveFloor: (f: number) => void;
  setActiveTab: (t: string) => void;
}

export const useNavStore = create<NavStore>((set) => ({
  zoomLevel: 1,
  activeArea: null,
  activeCommunity: null,
  activeTower: null,
  activeFloor: 1,
  activeTab: 'overview',
  setZoomLevel: (z) => set({ zoomLevel: z }),
  setActiveArea: (a) => set({ activeArea: a }),
  setActiveCommunity: (c) => set({ activeCommunity: c }),
  setActiveTower: (t) => set({ activeTower: t }),
  setActiveFloor: (f) => set({ activeFloor: f }),
  setActiveTab: (t) => set({ activeTab: t }),
}));
