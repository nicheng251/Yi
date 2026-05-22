import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTimerStore } from "../store/timer";
import { useProjectStore } from "../store/projects";
import { CommandResponse, Project, Session } from "../types";
import { SortableProjectItem } from "../components/SortableProjectItem";
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

type SortOrder = "created" | "updated" | "name" | "custom";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("created");
  const pendingSortOrder = useRef<SortOrder | null>(null);
  const [sortKey, setSortKey] = useState(0);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const { activeSession, setActiveSession, clearActiveSession } = useTimerStore();
  const { refreshProjects } = useProjectStore();

  const sensors = useSortableSensors();

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
        const projectsWithTotal = await Promise.all(
          res.data.map(async (p) => {
            const minutesRes = (await invoke("get_project_total_minutes", { projectId: p.id })) as CommandResponse<number>;
            return {
              ...p,
              total_minutes: minutesRes.success ? minutesRes.data ?? 0 : 0,
            };
          })
        );
        setProjects(projectsWithTotal);
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
        refreshProjects();
      } else {
        console.error("Create project failed:", res.error);
        alert("创建失败: " + (res.error || "未知错误"));
      }
    } catch (e) {
      console.error("Failed to create project:", e);
      alert("创建失败: " + e);
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
    }
  }

  async function handleArchive(projectId: string) {
    try {
      const res = (await invoke("archive_project", { id: projectId })) as CommandResponse<null>;
      if (res.success) {
        loadProjects();
        refreshProjects();
      }
    } catch (e) {
      console.error("Failed to archive project:", e);
    }
  }

  async function handleDelete(projectId: string) {
    if (!confirm("确定要删除这个项目吗？此操作不可撤销。")) return;
    try {
      const res = (await invoke("delete_project", { id: projectId })) as CommandResponse<null>;
      if (res.success) {
        loadProjects();
        refreshProjects();
      }
    } catch (e) {
      console.error("Failed to delete project:", e);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedProjects.findIndex((p) => p.id === active.id);
      const newIndex = sortedProjects.findIndex((p) => p.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newSortedProjects = arrayMove(sortedProjects, oldIndex, newIndex);

        const updatedProjects = newSortedProjects.map((p, idx) => ({
          ...p,
          display_order: idx,
        }));

        pendingSortOrder.current = "custom";
        setProjects(updatedProjects);
        setSortOrder("custom");
        saveSortOrder("custom");
        setSortKey(k => k + 1);

        try {
          const projectIds = newSortedProjects.map((p) => p.id);
          await invoke("reorder_projects", { projectIds });
        } catch (e) {
          console.error("Failed to reorder projects:", e);
        }
      }
    }
  }

  function formatTotalMinutes(minutes: number): string {
    if (minutes === 0) return "0 分钟";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} 分钟`;
    if (mins === 0) return `${hours} 小时`;
    return `${hours} 小时 ${mins} 分钟`;
  }

  const sortedProjects = sortProjects(projects, sortOrder, sortKey);

  return (
    <div style={{ padding: 24, height: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>项目列表</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <select
            value={sortOrder}
            onChange={(e) => {
              const value = e.target.value as SortOrder;
              pendingSortOrder.current = null;
              setSortOrder(value);
              saveSortOrder(value);
            }}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
            }}
          >
            <option value="created">创建时间</option>
            <option value="updated">最近活动时间</option>
            <option value="name">名称</option>
            <option value="custom">自定义</option>
          </select>
          <button
            onClick={() => setShowNewProject(true)}
            style={{
              padding: "8px 16px",
              backgroundColor: "var(--accent)",
              color: "white",
              borderRadius: 6,
              fontWeight: 500,
            }}
          >
            新建项目
          </button>
        </div>
      </div>

      {showNewProject && (
        <div
          style={{
            padding: 16,
            backgroundColor: "var(--bg-secondary)",
            borderRadius: 8,
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="输入项目名称"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
            }}
          />
          <button onClick={handleCreateProject} style={{ padding: "8px 16px", backgroundColor: "var(--accent)", color: "white", borderRadius: 6 }}>
            创建
          </button>
          <button
            onClick={() => {
              setShowNewProject(false);
              setNewProjectName("");
            }}
            style={{ padding: "8px 16px", backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)", borderRadius: 6 }}
          >
            取消
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflow: "auto" }}>
        {sortedProjects.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: "var(--text-secondary)" }}>
            暂无项目，点击"新建项目"开始
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sortedProjects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                      formatTotalMinutes={formatTotalMinutes}
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