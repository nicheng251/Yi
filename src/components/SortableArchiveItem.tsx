import { format } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { Project } from "../types";
import { formatMinutes } from "../utils/format";
import { SortableItemBase } from "./SortableItemBase";

interface SortableArchiveItemProps {
  project: Project;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SortableArchiveItem({ project, onUnarchive, onDelete }: SortableArchiveItemProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? enUS : zhCN;

  return (
    <SortableItemBase
      project={project}
      onDelete={onDelete}
      actionButtons={
        <button onClick={() => onUnarchive(project.id)} className="btn btn-primary">
          {t("components.enable")}
        </button>
      }
    >
      <div>
        <div className="text-primary">{project.name}</div>
        <div className="text-secondary">
          {t("components.archivedAt")} {format(project.updated_at * 1000, "yyyy-MM-dd", { locale })}
          {project.total_minutes !== undefined && project.total_minutes > 0 && (
            <span style={{ marginLeft: 12 }}>{t("components.accumulated")} {formatMinutes(project.total_minutes)}</span>
          )}
        </div>
      </div>
    </SortableItemBase>
  );
}
