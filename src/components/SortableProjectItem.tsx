import { Project, Session } from "../types";
import { IconButton, CurrentTimer } from "./IconButton";
import { formatMinutes } from "../utils/format";
import { SortableItemBase } from "./SortableItemBase";

interface SortableProjectItemProps {
  project: Project;
  isRunning: boolean;
  activeSession: Session | null;
  onStartTimer: (id: string) => void;
  onStopTimer: () => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SortableProjectItem({
  project,
  isRunning,
  activeSession,
  onStartTimer,
  onStopTimer,
  onArchive,
  onDelete,
}: SortableProjectItemProps) {
  return (
    <SortableItemBase project={project} onDelete={onDelete}>
      <div>
        <div className="text-primary">{project.name}</div>
        <div className="text-secondary">
          {isRunning && activeSession ? (
            <span className="text-accent">
              本次 <CurrentTimer startTime={activeSession.started_at} /> · 总计 {formatMinutes(project.total_minutes || 0)}
            </span>
          ) : (
            <span>总计 {formatMinutes(project.total_minutes || 0)}</span>
          )}
        </div>
      </div>
      <div className="flex-row gap-8">
        {isRunning ? (
          <IconButton onClick={onStopTimer} color="#dc2626" icon="stop" />
        ) : (
          <IconButton onClick={() => onStartTimer(project.id)} color="#22c55e" icon="play" />
        )}
        <button onClick={() => onArchive(project.id)} className="btn">
          归档
        </button>
      </div>
    </SortableItemBase>
  );
}