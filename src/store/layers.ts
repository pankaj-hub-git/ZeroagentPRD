import { create } from 'zustand';

interface LayerStore {
  capitalMatrix: boolean;
  developerTruth: boolean;
  livabilityXray: boolean;
  macroExposure: boolean;
  listingIntegrity: boolean;
  blockingEngine: boolean;
  phaseIntelligence: boolean;
  serviceCharges: boolean;
  amenityPolygons: boolean;
  toggle: (layer: keyof Omit<LayerStore, 'toggle'>) => void;
}

export const useLayerStore = create<LayerStore>((set) => ({
  capitalMatrix: false,
  developerTruth: false,
  livabilityXray: false,
  macroExposure: false,
  listingIntegrity: false,
  blockingEngine: false,
  phaseIntelligence: false,
  serviceCharges: false,
  amenityPolygons: false,
  toggle: (layer) => set((s) => ({ [layer]: !s[layer] } as Partial<LayerStore>)),
}));
