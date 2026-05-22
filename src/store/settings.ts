import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { CommandResponse } from "../types";

interface SettingsState {
  theme: "light" | "dark";
  autostart: boolean;
  lastBackupDate: string | null;
  setTheme: (theme: "light" | "dark") => void;
  setAutostart: (enabled: boolean) => void;
  setLastBackupDate: (date: string) => void;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: "light",
  autostart: false,
  lastBackupDate: null,

  setTheme: async (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
    try {
      await invoke("set_setting", { key: "theme", value: theme });
    } catch (e) {
      console.error("Failed to save theme:", e);
    }
  },

  setAutostart: async (enabled) => {
    set({ autostart: enabled });
    try {
      await invoke("set_setting", { key: "autostart", value: String(enabled) });
    } catch (e) {
      console.error("Failed to save autostart:", e);
    }
  },

  setLastBackupDate: async (date) => {
    set({ lastBackupDate: date });
    try {
      await invoke("set_setting", { key: "last_backup_date", value: date });
    } catch (e) {
      console.error("Failed to save backup date:", e);
    }
  },

  loadSettings: async () => {
    try {
      const [themeRes, autostartRes, backupDateRes] = await Promise.all([
        invoke("get_setting", { key: "theme" }),
        invoke("get_setting", { key: "autostart" }),
        invoke("get_setting", { key: "last_backup_date" }),
      ]);

      const rawTheme = (themeRes as CommandResponse<string>).data;
      const theme: "light" | "dark" = rawTheme === "dark" ? "dark" : "light";
      const autostart = (autostartRes as CommandResponse<string>).data === "true";
      const lastBackupDate = (backupDateRes as CommandResponse<string>).data || null;

      set({ theme, autostart, lastBackupDate });
      document.documentElement.setAttribute("data-theme", theme);
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  },
}));