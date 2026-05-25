import { DailyRecord } from "../types";

interface SearchResultsProps {
  results: DailyRecord[];
  onClear: () => void;
}

export function SearchResults({ results, onClear }: SearchResultsProps) {
  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "var(--text-secondary)" }}>搜索结果: {results.length} 条</span>
        <button
          onClick={onClear}
          style={{ padding: "4px 12px", backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)", borderRadius: 4 }}
        >
          清除搜索
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {results.map((record) => (
          <div
            key={record.id}
            style={{ padding: 16, backgroundColor: "var(--bg-secondary)", borderRadius: 8 }}
          >
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
              {record.date}
            </div>
            <div style={{ whiteSpace: "pre-wrap" }}>{record.content || "(无内容)"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}