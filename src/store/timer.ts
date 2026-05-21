import { create } from "zustand";

interface Session {
  id: string;
  project_id: string;
  started_at: number;
}

interface TimerState {
  activeSession: Session | null;
  setActiveSession: (session: Session | null) => void;
  clearActiveSession: () => void;
}

export const useTimerStore = create<TimerState>((set) => ({
  activeSession: null,
  setActiveSession: (session) => set({ activeSession: session }),
  clearActiveSession: () => set({ activeSession: null }),
}));