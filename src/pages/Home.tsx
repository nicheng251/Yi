import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { useTimerStore } from "../store/timer";
import { CommandResponse, Project, Session } from "../types";
import { SortableProjectItem } from "../components/SortableProjectItem";
import { StatsBar } from "../components/StatsBar";
import { useToast } from "../components/Toast";
import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortableSensors } from "../hooks/useSortableSensors";
import { useDragReorder } from "../hooks/useDragReorder";
import { useShortcut } from "../hooks/useShortcut";

type SortOrder = "created" | "updated" | "name" | "minutes" | "last_active" | "custom";

export default function Home() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("created");
  const pendingSortOrder = useRef<SortOrder | null>(null);
  const [sortKey, setSortKey] = useState(0);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const { activeSession, setActiveSession, clearActiveSession } = useTimerStore();
  const { showToast } = useToast();

  const sensors = useSortableSensors();

  // 快捷键: Ctrl+N 新建项目
  useShortcut((e) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "n") {
      e.preventDefault();
      setShowNewProject(true);
    }
  });

  useEffect(() => {
    loadProjects();
    loadSortOrder();
  }, []);

  async function loadSortOrder() {
    try {
      const res = (await invoke("get_setting", { key: "sort_order" })) as CommandResponse<string | null>;
      if (res.success && res.data) {
        setSortOrder(res.data as SortOrder);
      }
    } catch (e) {
      console.error("Failed to load sort order:", e);
    }
  }

  async function saveSortOrder(order: SortOrder) {
    try {
      await invoke("set_setting", { key: "sort_order", value: order });
    } catch (e) {
      console.error("Failed to save sort order:", e);
    }
  }

  async function loadProjects() {
    try {
      const res = (await invoke("get_projects")) as CommandResponse<Project[]>;
      if (res.success && res.data) {
        setProjects(res.data);
      }
    } catch (e) {
      console.error("Failed to load projects:", e);
    }
  }

  function sortProjects(projects: Project[], order: SortOrder, _sortKey?: number): Project[] {
    const effectiveOrder = pendingSortOrder.current ?? order;
    if (effectiveOrder === "custom") {
      return [...projects].sort((a, b) => a.display_order - b.display_order);
    }
    pendingSortOrder.current = null;
    return [...projects].sort((a, b) => {
      if (effectiveOrder === "created") return b.created_at - a.created_at;
      if (effectiveOrder === "updated") return b.updated_at - a.updated_at;
      if (effectiveOrder === "minutes") return (b.total_minutes || 0) - (a.total_minutes || 0);
      if (effectiveOrder === "last_active") return b.updated_at - a.updated_at;
      return a.name.localeCompare(b.name, "zh");
    });
  }

  async function handleCreateProject() {
    if (!newProjectName.trim()) return;
    try {
      const res = (await invoke("create_project", {
        name: newProjectName.trim(),
        categoryId: null,
        tags: [],
      })) as CommandResponse<Project>;
      if (res.success && res.data) {
        setNewProjectName("");
        setShowNewProject(false);
        loadProjects();
      } else {
        console.error("Create project failed:", res.error);
        showToast(t("home.createFailed") + ": " + (res.error || t("common.unknownError")), "error");
      }
    } catch (e) {
      console.error("Failed to create project:", e);
      showToast(t("home.createFailed") + ": " + e, "error");
    }
  }

  async function handleStartTimer(projectId: string) {
    try {
      if (activeSession) {
        await handleStopTimer();
      }
      const res = (await invoke("start_session", { projectId })) as CommandResponse<Session>;
      if (res.success && res.data) {
        setActiveSession(res.data);
      }
    } catch (e) {
      console.error("Failed to start timer:", e);
      showToast(t("home.startTimerFailed"), "error");
    }
  }

  async function handleStopTimer() {
    if (!activeSession) return;
    try {
      await invoke("end_session", { sessionId: activeSession.id });
      clearActiveSession();
      loadProjects();
    } catch (e) {
      console.error("Failed to stop timer:", e);
      showToast(t("home.stopTimerFailed"), "error");
    }
  }

  async function handleArchive(projectId: string) {
    try {
      const res = (await invoke("archive_project", { id: projectId })) as CommandResponse<null>;
      if (res.success) {
        if (activeSession?.project_id === projectId) {
          clearActiveSession();
        }
        loadProjects();
        showToast(t("home.archived"), "success");
      }
    } catch (e) {
      console.error("Failed to archive project:", e);
      showToast(t("home.archiveFailed"), "error");
    }
  }

  async function handleDelete(projectId: string) {
    if (!confirm(t("home.deleteConfirm"))) return;
    try {
      const res = (await invoke("delete_project", { id: projectId })) as CommandResponse<null>;
      if (res.success) {
        loadProjects();
        showToast(t("home.deleted"), "success");
      }
    } catch (e) {
      console.error("Failed to delete project:", e);
      showToast(t("home.deleteFailed"), "error");
    }
  }

  const sortedProjects = sortProjects(projects, sortOrder, sortKey);

  const handleDragEnd = useDragReorder({
    items: sortedProjects,
    getId: (p) => p.id,
    onReorder: (newItems) => {
      const updatedProjects = newItems.map((p, idx) => ({ ...p, display_order: idx }));
      pendingSortOrder.current = "custom";
      setProjects(updatedProjects);
    },
    onSuccess: () => {
      setSortOrder("custom");
      saveSortOrder("custom");
      setSortKey((k) => k + 1);
    },
    onError: () => {
      loadProjects();
      showToast(t("home.sortSaveFailed"), "error");
    },
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="section-title" style={{ marginBottom: 0 }}>{t("home.projectList")}</h1>
        <div className="flex-row">
          <StatsBar />
          <select
            value={sortOrder}
            onChange={(e) => {
              const value = e.target.value as SortOrder;
              pendingSortOrder.current = null;
              setSortOrder(value);
              saveSortOrder(value);
            }}
            className="select"
          >
            <option value="created">{t("home.sortCreated")}</option>
            <option value="updated">{t("home.sortUpdated")}</option>
            <option value="name">{t("home.sortName")}</option>
            <option value="minutes">{t("home.sortMinutes")}</option>
            <option value="custom">{t("home.sortCustom")}</option>
          </select>
          <button onClick={() => setShowNewProject(true)} className="btn-primary">
            {t("home.newProject")}
          </button>
        </div>
      </div>

      {showNewProject && (
        <div className="card-row">
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder={t("home.inputProjectName")}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
            className="input"
            style={{ flex: 1 }}
          />
          <button onClick={handleCreateProject} className="btn-primary">
            {t("common.create")}
          </button>
          <button className="btn" onClick={() => {
              setShowNewProject(false);
              setNewProjectName("");
            }}>
            {t("common.cancel")}
          </button>
        </div>
      )}

      <div className="page-content">
        {sortedProjects.length === 0 ? (
          <div className="empty-state">
            {t("home.emptyState")}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sortedProjects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div className="list">
                {sortedProjects.map((project) => {
                  const isRunning = activeSession?.project_id === project.id;
                  return (
                    <SortableProjectItem
                      key={project.id}
                      project={project}
                      isRunning={isRunning}
                      activeSession={activeSession}
                      onStartTimer={handleStartTimer}
                      onStopTimer={handleStopTimer}
                      onArchive={handleArchive}
                      onDelete={handleDelete}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
