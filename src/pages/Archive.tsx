import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

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

interface CommandResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export default function Archive() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    loadArchivedProjects();
  }, []);

  async function loadArchivedProjects() {
    try {
      const res = (await invoke("get_archived_projects")) as CommandResponse<Project[]>;
      if (res.success && res.data) {
        setProjects(res.data);
      }
    } catch (e) {
      console.error("Failed to load archived projects:", e);
    }
  }

  async function handleUnarchive(projectId: string) {
    try {
      const res = (await invoke("unarchive_project", { id: projectId })) as CommandResponse<null>;
      if (res.success) {
        loadArchivedProjects();
      }
    } catch (e) {
      console.error("Failed to unarchive project:", e);
    }
  }

  async function handleDelete(projectId: string) {
    if (!confirm("确定要永久删除这个项目吗？所有相关数据将被删除，此操作不可撤销。")) return;
    try {
      const res = (await invoke("delete_project", { id: projectId })) as CommandResponse<null>;
      if (res.success) {
        loadArchivedProjects();
      }
    } catch (e) {
      console.error("Failed to delete project:", e);
    }
  }

  return (
    <div style={{ padding: 24, height: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>归档</h1>

      <div style={{ flex: 1, overflow: "auto" }}>
        {projects.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: "var(--text-secondary)" }}>
            暂无归档的项目
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {projects.map((project) => (
              <div
                key={project.id}
                style={{
                  padding: 16,
                  backgroundColor: "var(--bg-secondary)",
                  borderRadius: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: 16 }}>{project.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                    归档于 {format(project.updated_at * 1000, "yyyy-MM-dd", { locale: zhCN })}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleUnarchive(project.id)}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "var(--accent)",
                      color: "white",
                      borderRadius: 6,
                      fontWeight: 500,
                    }}
                  >
                    重新启用
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    style={{ padding: "8px 12px", backgroundColor: "var(--bg-tertiary)", color: "var(--danger)", borderRadius: 6 }}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}