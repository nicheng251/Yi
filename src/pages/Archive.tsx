import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CommandResponse, Project } from "../types";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortableSensors } from "../hooks/useSortableSensors";
import { SortableArchiveItem } from "../components/SortableArchiveItem";

export default function Archive() {
  const [projects, setProjects] = useState<Project[]>([]);

  const sensors = useSortableSensors();

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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = projects.findIndex((p) => p.id === active.id);
      const newIndex = projects.findIndex((p) => p.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newProjects = arrayMove(projects, oldIndex, newIndex);
        setProjects(newProjects);

        try {
          const projectIds = newProjects.map((p) => p.id);
          await invoke("reorder_projects", { projectIds });
        } catch (e) {
          console.error("Failed to reorder projects:", e);
        }
      }
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {projects.map((project) => (
                  <SortableArchiveItem
                    key={project.id}
                    project={project}
                    onUnarchive={handleUnarchive}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}