import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, subDays, addDays, isSameDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CommandResponse, DailyRecord } from "../types";
import { useTimerStore } from "../store/timer";

export default function Results() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [records, setRecords] = useState<Map<string, DailyRecord>>(new Map());
  const [viewMode, setViewMode] = useState<'month' | 'day'>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingContent, setEditingContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DailyRecord[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const { saveTimerSession } = useTimerStore();

const autoSaveRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    autoSaveRef.current = async () => {
      if (!isDirty) return;
      const dateStr = format(currentDate, "yyyy-MM-dd");
      try {
        const res = (await invoke("save_daily_record", {
          date: dateStr,
          content: editingContent,
        })) as CommandResponse<DailyRecord>;
        if (res.success && res.data) {
          setOriginalContent(editingContent);
          setIsDirty(false);
          if (viewMode === 'month') {
            const newRecords = new Map(records);
            newRecords.set(dateStr, res.data);
            setRecords(newRecords);
          }
        }
      } catch (e) {
        console.error("Auto-save failed:", e);
      }
    };
  }, [isDirty, currentDate, editingContent, viewMode, records]);

  useEffect(() => {
    if (viewMode === 'day') {
      loadDayRecord(currentDate);
    }
  }, [viewMode, currentDate]);

  useEffect(() => {
    if (viewMode === 'month' && isDirty) {
      autoSaveRef.current();
    }
  }, [viewMode, isDirty]);

  useEffect(() => {
    if (editingContent !== originalContent) {
      setIsDirty(true);
    }
  }, [editingContent, originalContent]);

  useEffect(() => {
    return () => {
      autoSaveRef.current();
    };
  }, []);

  useEffect(() => {
    const handleQuit = async () => {
      try {
        await Promise.all([
          autoSaveRef.current(),
          saveTimerSession(),
        ]);
      } catch (e) {
        console.error("Save failed on quit:", e);
      }
      invoke("quit_app");
    };
    window.addEventListener("tauri-quit", handleQuit);
    return () => {
      window.removeEventListener("tauri-quit", handleQuit);
    };
  }, []);

  useEffect(() => {
    const handleCtrlS = () => {
      console.log('ctrl-s-pressed event received, viewMode:', viewMode);
      if (viewMode === 'day') {
        console.log('Calling autoSaveRef.current()');
        autoSaveRef.current();
      }
    };
    window.addEventListener('ctrl-s-pressed', handleCtrlS);
    return () => window.removeEventListener('ctrl-s-pressed', handleCtrlS);
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'month') {
      loadMonthRecords();
    }
  }, [viewMode, currentMonth]);

  async function loadMonthRecords() {
    try {
      const res = (await invoke("get_daily_records_for_month", {
        year: currentMonth.getFullYear(),
        month: currentMonth.getMonth() + 1,
      })) as CommandResponse<DailyRecord[]>;

      const newRecords = new Map<string, DailyRecord>();
      if (res.success && res.data) {
        for (const record of res.data) {
          newRecords.set(record.date, record);
        }
      }
      setRecords(newRecords);
    } catch (e) {
      console.error("Failed to load records:", e);
    }
  }

  async function loadDayRecord(date: Date) {
    const dateStr = format(date, "yyyy-MM-dd");
    try {
      const res = (await invoke("get_daily_record", { date: dateStr })) as CommandResponse<DailyRecord | null>;
      if (res.success && res.data) {
        setEditingContent(res.data.content || "");
        setOriginalContent(res.data.content || "");
      } else {
        setEditingContent("");
        setOriginalContent("");
      }
      setIsDirty(false);
    } catch (e) {
      console.error("Failed to load record:", e);
    }
  }

  async function autoSaveRecord() {
    if (!isDirty) return;
    const dateStr = format(currentDate, "yyyy-MM-dd");
    try {
      const res = (await invoke("save_daily_record", {
        date: dateStr,
        content: editingContent,
      })) as CommandResponse<DailyRecord>;
      if (res.success && res.data) {
        setOriginalContent(editingContent);
        setIsDirty(false);
        if (viewMode === 'month') {
          const newRecords = new Map(records);
          newRecords.set(dateStr, res.data);
          setRecords(newRecords);
        }
      }
    } catch (e) {
      console.error("Auto-save failed:", e);
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

  const handleDateClick = (day: Date) => {
    autoSaveRecord().then(() => {
      setCurrentDate(day);
      setViewMode('day');
    });
  };

  const handleGoToToday = () => {
    autoSaveRecord().then(() => {
      setCurrentDate(new Date());
      setViewMode('day');
    });
  };

  const handleSetViewMode = (mode: 'month' | 'day') => {
    autoSaveRecord().then(() => {
      setViewMode(mode);
    });
  };

  return (
    <div style={{ padding: 24, height: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>成果记录</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
          <div style={{ width: 1, height: 24, backgroundColor: "var(--border)", margin: "0 8px" }} />
          <button
            onClick={() => handleSetViewMode('day')}
            style={{
              padding: "8px 16px",
              backgroundColor: viewMode === 'day' ? "var(--accent)" : "var(--bg-secondary)",
              color: viewMode === 'day' ? "white" : "var(--text-primary)",
              borderRadius: 6,
            }}
          >
            日视图
          </button>
          <button
            onClick={() => handleSetViewMode('month')}
            style={{
              padding: "8px 16px",
              backgroundColor: viewMode === 'month' ? "var(--accent)" : "var(--bg-secondary)",
              color: viewMode === 'month' ? "white" : "var(--text-primary)",
              borderRadius: 6,
            }}
          >
            月视图
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
      ) : viewMode === 'month' ? (
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
              const isSelected = isSameDay(day, currentDate);
              const isPast = day < new Date() && !isToday(day);

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDateClick(day)}
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
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16 }}>
            <button onClick={() => autoSaveRecord().then(() => setCurrentDate(d => subDays(d, 1)))} style={{ padding: "8px 12px", backgroundColor: "var(--bg-secondary)", borderRadius: 6 }}>
              ←
            </button>
            <span style={{ fontWeight: 500, fontSize: 18, minWidth: 200, textAlign: "center" }}>
              {format(currentDate, "yyyy 年 MM 月 dd 日 EEE", { locale: zhCN })}
            </span>
            <button onClick={() => autoSaveRecord().then(() => setCurrentDate(d => addDays(d, 1)))} style={{ padding: "8px 12px", backgroundColor: "var(--bg-secondary)", borderRadius: 6 }}>
              →
            </button>
            <button onClick={handleGoToToday} style={{ padding: "8px 16px", backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)", borderRadius: 6 }}>
              今天
            </button>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
            <textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              onKeyDown={(e) => {
                console.log('textarea keydown:', e.key, 'ctrl:', e.ctrlKey);
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                  e.preventDefault();
                  console.log('textarea Ctrl+S save triggered');
                  autoSaveRef.current().then(() => console.log('autoSave completed'));
                }
              }}
              placeholder="记录今天的成果..."
              style={{
                flex: 1,
                minHeight: 300,
                padding: 16,
                borderRadius: 8,
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-primary)",
                resize: "vertical",
                fontSize: 14,
                fontFamily: "inherit",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}