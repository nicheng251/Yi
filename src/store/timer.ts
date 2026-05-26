import { create } from "zustand";
import { Session } from "../types";
import { ipc } from "../ipc";

interface TimerState {
  activeSession: Session | null;
  loading: boolean;
  error: string | null;
  setActiveSession: (session: Session | null) => void;
  clearActiveSession: () => void;
  startTimer: (projectId: string) => Promise<boolean>;
  stopTimer: () => Promise<boolean>;
  saveTimerSession: () => Promise<void>;
  loadTimerSession: () => Promise<void>;
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
      const res = await ipc.sessions.start(projectId);
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
      const res = await ipc.sessions.end(session.id);
      if (res.success) {
        set({ activeSession: null, loading: false });
        localStorage.setItem("timer_session_changed", Date.now().toString());
        return true;
      }
      set({ error: res.error || "Failed to stop timer", loading: false });
      return false;
    } catch (e) {
      set({ error: String(e), loading: false });
      return false;
    }
  },

  saveTimerSession: async () => {
    const session = get().activeSession;
    if (!session) return;
    try {
      await Promise.all([
        ipc.settings.set("active_session_id", session.id),
        ipc.settings.set("active_session_project", session.project_id),
        ipc.settings.set("active_session_start", String(session.started_at)),
      ]);
    } catch (e) {
      console.error("Failed to save timer session:", e);
    }
  },

  loadTimerSession: async () => {
    try {
      const [idRes, projectRes, startRes] = await Promise.all([
        ipc.settings.get("active_session_id"),
        ipc.settings.get("active_session_project"),
        ipc.settings.get("active_session_start"),
      ]);

      if (idRes.success && idRes.data && projectRes.success && projectRes.data && startRes.success && startRes.data) {
        const activeRes = await ipc.sessions.active();
        if (activeRes.success && activeRes.data && activeRes.data.id === idRes.data) {
          set({ activeSession: activeRes.data });
        } else {
          await Promise.all([
            ipc.settings.set("active_session_id", ""),
            ipc.settings.set("active_session_project", ""),
            ipc.settings.set("active_session_start", ""),
          ]);
          set({ activeSession: null });
        }
      }
    } catch (e) {
      console.error("Failed to load timer session:", e);
      set({ activeSession: null });
    }
  },
}));
