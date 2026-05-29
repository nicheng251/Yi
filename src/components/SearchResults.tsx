import { useTranslation } from "react-i18next";
import { DailyRecord } from "../types";

interface SearchResultsProps {
  results: DailyRecord[];
  onClear: () => void;
}

export function SearchResults({ results, onClear }: SearchResultsProps) {
  const { t } = useTranslation();

  return (
    <div className="search-results">
      <div className="search-results-header">
        <span className="search-results-count">{t("components.searchResults")}: {results.length} {t("components.items")}</span>
        <button onClick={onClear} className="btn">{t("components.clearSearch")}</button>
      </div>
      <div>
        {results.map((record) => (
          <div key={record.id} className="search-result-item">
            <div className="search-result-date">{record.date}</div>
            <div className="search-result-content">{record.content || t("components.noContent")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
