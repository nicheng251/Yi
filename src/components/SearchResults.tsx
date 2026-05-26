import { DailyRecord } from "../types";

interface SearchResultsProps {
  results: DailyRecord[];
  onClear: () => void;
}

export function SearchResults({ results, onClear }: SearchResultsProps) {
  return (
    <div className="search-results">
      <div className="search-results-header">
        <span className="search-results-count">搜索结果: {results.length} 条</span>
        <button onClick={onClear} className="btn">清除搜索</button>
      </div>
      <div>
        {results.map((record) => (
          <div key={record.id} className="search-result-item">
            <div className="search-result-date">{record.date}</div>
            <div className="search-result-content">{record.content || "(无内容)"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
