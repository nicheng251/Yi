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
    <SortableItemBase project={project} onDelete={onDelete} actionButtons={
      <>
        {isRunning ? (
          <IconButton onClick={onStopTimer} icon="stop" />
        ) : (
          <IconButton onClick={() => onStartTimer(project.id)} icon="play" />
        )}
        <button onClick={() => onArchive(project.id)} className="btn">
          归档
        </button>
      </>
    }>
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
    </SortableItemBase>
  );
}