import { useTranslation } from "react-i18next";
import { ViewMode } from "../types";
import "../styles/components.css";

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  const { t } = useTranslation();

  const labels: Record<ViewMode, string> = {
    day: t("dateFormats.day", "日"),
    week: t("dateFormats.week", "周"),
    month: t("dateFormats.month", "月"),
    year: t("dateFormats.yearLabel", "年"),
  };

  return (
    <div className="toggle-group">
      {(["day", "week", "month", "year"] as ViewMode[]).map((mode) => (
        <button
          key={mode}
          onClick={() => onViewModeChange(mode)}
          className={`toggle-btn ${viewMode === mode ? 'active' : ''}`}
        >
          {labels[mode]}
        </button>
      ))}
    </div>
  );
}
