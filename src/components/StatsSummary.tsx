import { useTranslation } from "react-i18next";
import { ViewMode } from "../types";
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
  const { t } = useTranslation();
  const displayMinutes = viewMode === "month" ? monthTotalMinutes : totalMinutes;

  return (
    <div className="stats-summary">
      <div>
        <div className="stats-summary-title">{getViewPeriodText()}</div>
        <div className="stats-summary-value">{t("statistics.totalFocus")} {formatMinutes(displayMinutes)}</div>
      </div>
      <div className="stats-summary-comparison">{getComparisonText()}</div>
    </div>
  );
}
