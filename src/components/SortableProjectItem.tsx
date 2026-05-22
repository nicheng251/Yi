import { useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Project, Session } from "../types";
import { IconButton, CurrentTimer } from "./IconButton";
import "../styles/components.css";

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
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
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
            {isRunning ? (
              <span className="text-accent">
                本次 <CurrentTimer startTime={activeSession!.started_at} /> · 总计 {formatTotalMinutes(project.total_minutes || 0)}
              </span>
            ) : (
              <span>总计 {formatTotalMinutes(project.total_minutes || 0)}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex-row gap-8">
        {isRunning ? (
          <IconButton onClick={onStopTimer} color="#dc2626" icon="stop" />
        ) : (
          <IconButton onClick={() => onStartTimer(project.id)} color="#22c55e" icon="play" />
        )}
        <button
          onClick={() => onArchive(project.id)}
          className="btn"
        >
          归档
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