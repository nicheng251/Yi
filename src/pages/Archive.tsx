import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CommandResponse, Project } from "../types";
import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortableSensors } from "../hooks/useSortableSensors";
import { SortableArchiveItem } from "../components/SortableArchiveItem";
import { useToast } from "../components/Toast";
import { useDragReorder } from "../hooks/useDragReorder";

export default function Archive() {
  const [projects, setProjects] = useState<Project[]>([]);
  const { showToast } = useToast();

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
      showToast("加载归档项目失败", "error");
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
      showToast("恢复项目失败", "error");
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
      showToast("删除项目失败", "error");
    }
  }

  const handleDragEnd = useDragReorder({
    items: projects,
    getId: (p) => p.id,
    onReorder: setProjects,
    onError: () => showToast("排序保存失败", "error"),
  });

  return (
    <div className="page">
      <h1 className="section-title">归档</h1>

      <div className="page-content">
        {projects.length === 0 ? (
          <div className="empty-state">
            暂无归档的项目
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div className="list">
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