import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

interface Project {
  id: string;
  name: string;
  category_id: string | null;
  created_at: number;
  updated_at: number;
  is_archived: boolean;
  sort_order: string;
  tags: string[];
}

interface ProjectState {
  projects: Project[];
  refreshProjects: () => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  refreshProjects: async () => {
    try {
      const res = (await invoke("get_projects")) as any;
      if (res.success && res.data) {
        set({ projects: res.data });
      }
    } catch (e) {
      console.error("Failed to refresh projects:", e);
    }
  },
}));