import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Project, Session } from "../types";
import { IconButton, CurrentTimer } from "./IconButton";

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

export function SortableProjectItem({
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
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
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