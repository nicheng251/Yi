import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, getDaysInMonth } from "date-fns";
import { zhCN } from "date-fns/locale";

interface DailyRecord {
  id: string;
  date: string;
  content: string | null;
  created_at: number;
  updated_at: number;
}

interface CommandResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export default function Results() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [records, setRecords] = useState<Map<string, DailyRecord>>(new Map());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DailyRecord[]>([]);

  useEffect(() => {
    loadMonthRecords();
  }, [currentMonth]);

  async function loadMonthRecords() {
    try {
      const daysInMonth = getDaysInMonth(currentMonth);
      const newRecords = new Map<string, DailyRecord>();

      for (let d = 1; d <= daysInMonth; d++) {
        const date = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d), "yyyy-MM-dd");
        try {
          const res = (await invoke("get_daily_record", { date })) as CommandResponse<DailyRecord | null>;
          if (res.success && res.data) {
            newRecords.set(date, res.data);
          }
        } catch (e) {
          console.error(`Failed to load record for ${date}:`, e);
        }
      }

      setRecords(newRecords);
    } catch (e) {
      console.error("Failed to load records:", e);
    }
  }

  async function handleSaveRecord() {
    if (!selectedDate) return;
    try {
      const res = (await invoke("save_daily_record", {
        date: selectedDate,
        content: editingContent,
      })) as CommandResponse<DailyRecord>;
      if (res.success && res.data) {
        const newRecords = new Map(records);
        newRecords.set(selectedDate, res.data);
        setRecords(newRecords);
        setSelectedDate(null);
        setEditingContent("");
      } else {
        console.error("Save failed:", res.error);
        alert("保存失败: " + res.error);
      }
    } catch (e) {
      console.error("Failed to save record:", e);
      alert("保存失败: " + e);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    try {
      const res = (await invoke("search_records", { query: searchQuery })) as CommandResponse<DailyRecord[]>;
      if (res.success && res.data) {
        setSearchResults(res.data);
      }
    } catch (e) {
      console.error("Failed to search:", e);
    }
  }

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const firstDayOfWeek = startOfMonth(currentMonth).getDay();

  return (
    <div style={{ padding: 24, height: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>成果记录</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="搜索成果..."
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              width: 200,
            }}
          />
          <button onClick={handleSearch} style={{ padding: "8px 16px", backgroundColor: "var(--accent)", color: "white", borderRadius: 6 }}>
            搜索
          </button>
        </div>
      </div>

      {searchResults.length > 0 ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-secondary)" }}>搜索结果: {searchResults.length} 条</span>
            <button onClick={() => { setSearchResults([]); setSearchQuery(""); }} style={{ padding: "4px 12px", backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)", borderRadius: 4 }}>
              清除搜索
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {searchResults.map((record) => (
              <div key={record.id} style={{ padding: 16, backgroundColor: "var(--bg-secondary)", borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
                  {record.date}
                </div>
                <div style={{ whiteSpace: "pre-wrap" }}>{record.content || "(无内容)"}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} style={{ padding: "8px 12px", backgroundColor: "var(--bg-secondary)", borderRadius: 6 }}>
              ←
            </button>
            <span style={{ fontWeight: 500, fontSize: 18 }}>
              {format(currentMonth, "yyyy 年 MM 月", { locale: zhCN })}
            </span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} style={{ padding: "8px 12px", backgroundColor: "var(--bg-secondary)", borderRadius: 6 }}>
              →
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
              backgroundColor: "var(--bg-secondary)",
              padding: 16,
              borderRadius: 8,
            }}
          >
            {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
              <div key={day} style={{ textAlign: "center", padding: 8, fontWeight: 500, color: "var(--text-secondary)" }}>
                {day}
              </div>
            ))}
            {Array(firstDayOfWeek).fill(null).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const record = records.get(dateStr);
              const hasContent = !!record?.content;
              const isSelected = selectedDate === dateStr;
              const isPast = day < new Date() && !isToday(day);

              return (
                <button
                  key={dateStr}
                  onClick={() => {
                    setSelectedDate(dateStr);
                    setEditingContent(record?.content || "");
                  }}
                  style={{
                    padding: 8,
                    minHeight: 60,
                    borderRadius: 4,
                    backgroundColor: isSelected ? "var(--accent)" : hasContent ? "var(--bg-tertiary)" : "var(--bg-primary)",
                    color: isSelected ? "white" : isPast ? "var(--text-primary)" : "var(--text-secondary)",
                    border: hasContent && !isSelected ? "2px solid var(--accent)" : "1px solid var(--border)",
                    textAlign: "center",
                    fontSize: 14,
                  }}
                >
                  <div style={{ fontWeight: isToday(day) ? 700 : 400 }}>{format(day, "d")}</div>
                  {hasContent && <div style={{ fontSize: 10, marginTop: 4, color: isSelected ? "rgba(255,255,255,0.8)" : "var(--accent)" }}>●</div>}
                </button>
              );
            })}
          </div>
        </>
      )}

      {selectedDate && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => setSelectedDate(null)}
        >
          <div
            style={{
              backgroundColor: "var(--bg-primary)",
              padding: 24,
              borderRadius: 12,
              width: 500,
              maxHeight: "80vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 16 }}>{selectedDate} 成果记录</h3>
            <textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              placeholder="记录今天的成果..."
              style={{
                width: "100%",
                height: 200,
                padding: 12,
                borderRadius: 8,
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-primary)",
                resize: "vertical",
                fontSize: 14,
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button
                onClick={() => setSelectedDate(null)}
                style={{ padding: "8px 16px", backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)", borderRadius: 6 }}
              >
                取消
              </button>
              <button
                onClick={handleSaveRecord}
                style={{ padding: "8px 16px", backgroundColor: "var(--accent)", color: "white", borderRadius: 6 }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}