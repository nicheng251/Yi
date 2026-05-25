import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Project } from "../types";
import { formatMinutes } from "../utils/format";
import { SortableItemBase } from "./SortableItemBase";

interface SortableArchiveItemProps {
  project: Project;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SortableArchiveItem({ project, onUnarchive, onDelete }: SortableArchiveItemProps) {
  return (
    <SortableItemBase project={project} onDelete={onDelete}>
      <div>
        <div className="text-primary">{project.name}</div>
        <div className="text-secondary">
          归档于 {format(project.updated_at * 1000, "yyyy-MM-dd", { locale: zhCN })}
          {project.total_minutes !== undefined && project.total_minutes > 0 && (
            <span style={{ marginLeft: 12 }}>累计 {formatMinutes(project.total_minutes)}</span>
          )}
        </div>
      </div>
      <div className="flex-row gap-8">
        <button onClick={() => onUnarchive(project.id)} className="btn btn-primary">
          重新启用
        </button>
      </div>
    </SortableItemBase>
  );
}