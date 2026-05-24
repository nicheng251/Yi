import { ViewMode } from "../pages/Statistics";
import { formatMinutes } from "../utils/format";

interface StatsSummaryProps {
  viewMode: ViewMode;
  totalMinutes: number;
  monthTotalMinutes: number;
  getViewPeriodText: () => string;
  getComparisonText: () => string;
}

export function StatsSummary({
  viewMode,
  totalMinutes,
  monthTotalMinutes,
  getViewPeriodText,
  getComparisonText,
}: StatsSummaryProps) {
  const displayMinutes = viewMode === "month" || viewMode === "week" ? monthTotalMinutes : totalMinutes;

  return (
    <div
      style={{
        padding: 20,
        backgroundColor: "var(--bg-secondary)",
        borderRadius: 8,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 4 }}>
          {getViewPeriodText()}
        </div>
        <div style={{ fontSize: 28, fontWeight: 600 }}>
          总专注 {formatMinutes(displayMinutes)}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          {getComparisonText()}
        </div>
      </div>
    </div>
  );
}