import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  return (
    <SortableItemBase project={project} onDelete={onDelete} actionButtons={
      <>
        {isRunning ? (
          <IconButton onClick={onStopTimer} icon="stop" />
        ) : (
          <IconButton onClick={() => onStartTimer(project.id)} icon="play" />
        )}
        <button onClick={() => onArchive(project.id)} className="btn">
          {t("home.archive")}
        </button>
      </>
    }>
      <div>
        <div className="text-primary">{project.name}</div>
        <div className="text-secondary">
          {isRunning && activeSession ? (
            <span className="text-accent">
              {t("home.thisSession")} <CurrentTimer startTime={activeSession.started_at} /> · {t("home.total")} {formatMinutes(project.total_minutes || 0)}
            </span>
          ) : (
            <span>{t("home.total")} {formatMinutes(project.total_minutes || 0)}</span>
          )}
        </div>
      </div>
    </SortableItemBase>
  );
}
