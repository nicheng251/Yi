import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Project } from "../types";
import "../styles/components.css";

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
      className="card"
      style={style}
    >
      <div className="flex-row">
        <div
          {...attributes}
          {...listeners}
          className="drag-handle"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="2" y="3" width="12" height="2" rx="1" />
            <rect x="2" y="7" width="12" height="2" rx="1" />
            <rect x="2" y="11" width="12" height="2" rx="1" />
          </svg>
        </div>
        <div>
          <div className="text-primary">{project.name}</div>
          <div className="text-secondary">
            归档于 {format(project.updated_at * 1000, "yyyy-MM-dd", { locale: zhCN })}
          </div>
        </div>
      </div>
      <div className="flex-row gap-8">
        <button
          onClick={() => onUnarchive(project.id)}
          className="btn btn-primary"
        >
          重新启用
        </button>
        <button
          onClick={() => onDelete(project.id)}
          className="btn btn-danger"
        >
          删除
        </button>
      </div>
    </div>
  );
}