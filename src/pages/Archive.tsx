import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      showToast(t("archivePage.loadFailed"), "error");
    }
  }

  async function handleUnarchive(projectId: string) {
    try {
      const res = (await invoke("unarchive_project", { id: projectId })) as CommandResponse<null>;
      if (res.success) {
        loadArchivedProjects();
        showToast(t("archivePage.restored"), "success");
      }
    } catch (e) {
      console.error("Failed to unarchive project:", e);
      showToast(t("archivePage.restoreFailed"), "error");
    }
  }

  async function handleDelete(projectId: string) {
    if (!confirm(t("archivePage.deleteConfirm"))) return;
    try {
      const res = (await invoke("delete_project", { id: projectId })) as CommandResponse<null>;
      if (res.success) {
        loadArchivedProjects();
        showToast(t("archivePage.permanentlyDeleted"), "success");
      }
    } catch (e) {
      console.error("Failed to delete project:", e);
      showToast(t("archivePage.deleteFailed"), "error");
    }
  }

  const handleDragEnd = useDragReorder({
    items: projects,
    getId: (p) => p.id,
    onReorder: setProjects,
    onError: () => showToast(t("archivePage.sortSaveFailed"), "error"),
  });

  return (
    <div className="page">
      <h1 className="section-title">{t("archivePage.title")}</h1>

      <div className="page-content">
        {projects.length === 0 ? (
          <div className="empty-state">
            {t("archivePage.emptyState")}
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
