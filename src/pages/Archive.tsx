import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
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
}

interface CommandResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export default function Archive() {
  const [projects, setProjects] = useState<Project[]>([]);

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

interface SortableArchiveItemProps {
  project: Project;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
}

function SortableArchiveItem({ project, onUnarchive, onDelete }: SortableArchiveItemProps) {
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
            归档于 {format(project.updated_at * 1000, "yyyy-MM-dd", { locale: zhCN })}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => onUnarchive(project.id)}
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
          onClick={() => onDelete(project.id)}
          style={{ padding: "8px 12px", backgroundColor: "var(--bg-tertiary)", color: "var(--danger)", borderRadius: 6 }}
        >
          删除
        </button>
      </div>
    </div>
  );
}