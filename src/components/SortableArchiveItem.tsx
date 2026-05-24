import { useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Project } from "../types";
import { formatMinutes } from "../utils/format";
import "../styles/components.css";

interface SortableArchiveItemProps {
  project: Project;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SortableArchiveItem({ project, onUnarchive, onDelete }: SortableArchiveItemProps) {
  const [deleteState, setDeleteState] = useState<'idle' | 'confirm'>('idle');

  useEffect(() => {
    if (deleteState === 'confirm') {
      const timer = setTimeout(() => setDeleteState('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [deleteState]);

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

  const handleDeleteClick = () => {
    if (deleteState === 'confirm') {
      onDelete(project.id);
      setDeleteState('idle');
    } else {
      setDeleteState('confirm');
    }
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
            {project.total_minutes !== undefined && project.total_minutes > 0 && (
              <span style={{ marginLeft: 12 }}>累计 {formatMinutes(project.total_minutes)}</span>
            )}
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
          onClick={handleDeleteClick}
          className={deleteState === 'confirm' ? 'btn btn-danger' : 'btn btn-danger'}
          style={deleteState === 'confirm' ? { fontWeight: 'bold' } : {}}
        >
          {deleteState === 'confirm' ? '确认删除?' : '删除'}
        </button>
      </div>
    </div>
  );
}