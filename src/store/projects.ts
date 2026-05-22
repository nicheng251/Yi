import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { CommandResponse, Project } from "../types";

interface ProjectState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  refreshProjects: () => Promise<void>;
  createProject: (name: string, categoryId?: string | null, tags?: string[]) => Promise<Project | null>;
  updateProject: (id: string, name: string, categoryId?: string | null, tags?: string[]) => Promise<boolean>;
  archiveProject: (id: string) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,
  error: null,

  refreshProjects: async () => {
    set({ loading: true, error: null });
    try {
      const res = (await invoke("get_projects")) as CommandResponse<Project[]>;
      if (res.success && res.data) {
        set({ projects: res.data, loading: false });
      } else {
        set({ error: res.error || "Failed to load projects", loading: false });
      }
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  createProject: async (name, categoryId = null, tags = []) => {
    try {
      const res = (await invoke("create_project", { name, categoryId, tags })) as CommandResponse<Project>;
      if (res.success && res.data) {
        set({ projects: [...get().projects, res.data] });
        return res.data;
      }
      return null;
    } catch (e) {
      console.error("Failed to create project:", e);
      return null;
    }
  },

  updateProject: async (id, name, categoryId = null, tags = []) => {
    try {
      const res = (await invoke("update_project", { id, name, categoryId, tags })) as CommandResponse<null>;
      if (res.success) {
        set({
          projects: get().projects.map((p) =>
            p.id === id ? { ...p, name, category_id: categoryId, tags } : p
          ),
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to update project:", e);
      return false;
    }
  },

  archiveProject: async (id) => {
    try {
      const res = (await invoke("archive_project", { id })) as CommandResponse<null>;
      if (res.success) {
        set({
          projects: get().projects.filter((p) => p.id !== id),
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to archive project:", e);
      return false;
    }
  },

  deleteProject: async (id) => {
    try {
      const res = (await invoke("delete_project", { id })) as CommandResponse<null>;
      if (res.success) {
        set({
          projects: get().projects.filter((p) => p.id !== id),
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to delete project:", e);
      return false;
    }
  },
}));