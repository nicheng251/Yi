import { useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Project } from "../types";
import "../styles/components.css";

interface SortableItemBaseProps {
  project: Project;
  onDelete: (id: string) => void;
  children: React.ReactNode;
}

export function SortableItemBase({ project, onDelete, children }: SortableItemBaseProps) {
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
        {children}
      </div>
      <div className="flex-row gap-8">
        <button
          onClick={handleDeleteClick}
          className="btn btn-danger"
          style={deleteState === 'confirm' ? { fontWeight: 'bold' } : {}}
        >
          {deleteState === 'confirm' ? '确认删除?' : '删除'}
        </button>
      </div>
    </div>
  );
}