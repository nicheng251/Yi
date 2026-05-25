import { ViewMode } from "../pages/Statistics";
import { formatMinutes } from "../utils/format";
import "../styles/components.css";

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
    <div className="stats-summary">
      <div>
        <div className="stats-summary-title">{getViewPeriodText()}</div>
        <div className="stats-summary-value">总专注 {formatMinutes(displayMinutes)}</div>
      </div>
      <div className="stats-summary-comparison">{getComparisonText()}</div>
    </div>
  );
}