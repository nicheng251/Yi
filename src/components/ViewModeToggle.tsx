import { ViewMode } from "../types";
import "../styles/components.css";

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const labels: Record<ViewMode, string> = {
  day: "日",
  week: "周",
  month: "月",
  year: "年",
};

export function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
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