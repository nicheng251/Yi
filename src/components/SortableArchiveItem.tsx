import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Project } from "../types";

interface SortableArchiveItemProps {
  project: Project;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SortableArchiveItem({ project, onUnarchive, onDelete }: SortableArchiveItemProps) {
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