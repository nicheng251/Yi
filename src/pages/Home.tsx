import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTimerStore } from "../store/timer";
import { useProjectStore } from "../store/projects";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Project {
  id: string;
  name: string;
  category_id: string | null;
  created_at: number;
  updated_at: number;
  is_archived: boolean;
  sort_order: string;
  tags: string[];
  display_order: number;
  total_minutes?: number;
}

interface Session {
  id: string;
  project_id: string;
  started_at: number;
}

interface CommandResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

type SortOrder = "created" | "updated" | "name" | "custom";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("created");
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const { activeSession, setActiveSession, clearActiveSession } = useTimerStore();
  const { refreshProjects } = useProjectStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadProjects();
  }, []);

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

  function sortProjects(projects: Project[], order: SortOrder): Project[] {
    if (order === "custom") {
      return [...projects].sort((a, b) => a.display_order - b.display_order);
    }
    return [...projects].sort((a, b) => {
      if (order === "created") return b.created_at - a.created_at;
      if (order === "updated") return b.updated_at - a.updated_at;
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
      const oldIndex = projects.findIndex((p) => p.id === active.id);
      const newIndex = projects.findIndex((p) => p.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newProjects = arrayMove(projects, oldIndex, newIndex);
        setProjects(newProjects);
        setSortOrder("custom");

        try {
          const projectIds = newProjects.map((p) => p.id);
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

  const sortedProjects = sortProjects(projects, sortOrder);

  return (
    <div style={{ padding: 24, height: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>项目列表</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
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

interface SortableProjectItemProps {
  project: Project;
  isRunning: boolean;
  activeSession: Session | null;
  onStartTimer: (id: string) => void;
  onStopTimer: () => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  formatTotalMinutes: (minutes: number) => string;
}

function SortableProjectItem({
  project,
  isRunning,
  activeSession,
  onStartTimer,
  onStopTimer,
  onArchive,
  onDelete,
  formatTotalMinutes,
}: SortableProjectItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: 16,
        backgroundColor: "var(--bg-secondary)",
        borderRadius: 8,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: "grab",
            padding: 4,
            display: "flex",
            alignItems: "center",
            color: "var(--text-secondary)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="2" y="3" width="12" height="2" rx="1" />
            <rect x="2" y="7" width="12" height="2" rx="1" />
            <rect x="2" y="11" width="12" height="2" rx="1" />
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 500, fontSize: 16 }}>{project.name}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
            {isRunning ? (
              <span style={{ color: "var(--accent)" }}>
                本次 <CurrentTimer startTime={activeSession!.started_at} /> · 总计 {formatTotalMinutes(project.total_minutes || 0)}
              </span>
            ) : (
              <span>总计 {formatTotalMinutes(project.total_minutes || 0)}</span>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {isRunning ? (
          <IconButton onClick={onStopTimer} color="#dc2626" icon="stop" />
        ) : (
          <IconButton onClick={() => onStartTimer(project.id)} color="#22c55e" icon="play" />
        )}
        <button
          onClick={() => onArchive(project.id)}
          style={{ padding: "8px 12px", backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)", borderRadius: 6 }}
        >
          归档
        </button>
        <button
          onClick={() => onDelete(project.id)}
          style={{ padding: "8px 12px", backgroundColor: "var(--bg-tertiary)", color: "var(--danger)", borderRadius: 6 }}
        >
          删除
        </button>
      </div>
    </div>
  );
}

function CurrentTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = Math.floor((Date.now() - startTime * 1000) / 60000);
      setElapsed(diff);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <span>{elapsed} 分钟</span>;
}

function IconButton({ onClick, color, icon }: { onClick: () => void; color: string; icon: "play" | "stop" }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        backgroundColor: color,
        border: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: 0,
      }}
    >
      {icon === "play" ? (
        <svg width="16" height="18" viewBox="0 0 16 18" fill="white">
          <path d="M0 0L16 9L0 18V0Z" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
          <rect x="0" y="0" width="14" height="14" />
        </svg>
      )}
    </button>
  );
}