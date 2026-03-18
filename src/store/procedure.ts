import { create } from 'zustand';
import type { ProcedureSubTab, AudienceFilter } from '@/types/procedure';

interface ProcedureStore {
  activeGuideType: string | null;
  activeSubTab: ProcedureSubTab;
  activeStepNumber: number;
  audienceFilter: AudienceFilter;
  calculatorPropertyValue: number;
  setActiveGuideType: (type: string | null) => void;
  setActiveSubTab: (tab: ProcedureSubTab) => void;
  setActiveStepNumber: (step: number) => void;
  setAudienceFilter: (filter: AudienceFilter) => void;
  setCalculatorPropertyValue: (value: number) => void;
}

export const useProcedureStore = create<ProcedureStore>((set) => ({
  activeGuideType: null,
  activeSubTab: 'steps',
  activeStepNumber: 1,
  audienceFilter: 'all',
  calculatorPropertyValue: 2_000_000,
  setActiveGuideType: (type) => set({ activeGuideType: type }),
  setActiveSubTab: (tab) => set({ activeSubTab: tab }),
  setActiveStepNumber: (step) => set({ activeStepNumber: step }),
  setAudienceFilter: (filter) => set({ audienceFilter: filter }),
  setCalculatorPropertyValue: (value) => set({ calculatorPropertyValue: value }),
}));
