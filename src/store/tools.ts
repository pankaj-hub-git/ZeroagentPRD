import { create } from 'zustand';

interface ToolStore {
  isOpen: boolean;
  activeTool: string | null;
  open: (tool: string) => void;
  close: () => void;
}

export const useToolStore = create<ToolStore>((set) => ({
  isOpen: false,
  activeTool: null,
  open: (tool) => set({ isOpen: true, activeTool: tool }),
  close: () => set({ isOpen: false, activeTool: null }),
}));
