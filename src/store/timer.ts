import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { CommandResponse, Session } from "../types";

interface TimerState {
  activeSession: Session | null;
  loading: boolean;
  error: string | null;
  setActiveSession: (session: Session | null) => void;
  clearActiveSession: () => void;
  startTimer: (projectId: string) => Promise<boolean>;
  stopTimer: () => Promise<boolean>;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  activeSession: null,
  loading: false,
  error: null,

  setActiveSession: (session) => set({ activeSession: session }),
  clearActiveSession: () => set({ activeSession: null, error: null }),

  startTimer: async (projectId) => {
    set({ loading: true, error: null });
    try {
      if (get().activeSession) {
        await get().stopTimer();
      }
      const res = (await invoke("start_session", { projectId })) as CommandResponse<Session>;
      if (res.success && res.data) {
        set({ activeSession: res.data, loading: false });
        return true;
      }
      set({ error: res.error || "Failed to start timer", loading: false });
      return false;
    } catch (e) {
      set({ error: String(e), loading: false });
      return false;
    }
  },

  stopTimer: async () => {
    const session = get().activeSession;
    if (!session) return false;

    set({ loading: true, error: null });
    try {
      const res = (await invoke("end_session", { sessionId: session.id })) as CommandResponse<null>;
      if (res.success) {
        set({ activeSession: null, loading: false });
        return true;
      }
      set({ error: res.error || "Failed to stop timer", loading: false });
      return false;
    } catch (e) {
      set({ error: String(e), loading: false });
      return false;
    }
  },
}));