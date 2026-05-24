import { ViewMode } from "../pages/Statistics";

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
    <div style={{ display: "flex", gap: 8 }}>
      {(["day", "week", "month", "year"] as ViewMode[]).map((mode) => (
        <button
          key={mode}
          onClick={() => onViewModeChange(mode)}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            backgroundColor: viewMode === mode ? "var(--accent)" : "var(--bg-secondary)",
            color: viewMode === mode ? "white" : "var(--text-primary)",
            fontWeight: 500,
            cursor: "pointer",
            border: "none",
          }}
        >
          {labels[mode]}
        </button>
      ))}
    </div>
  );
}