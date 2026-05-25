import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { format, subDays, addDays } from "date-fns";
import { CommandResponse, DailyRecord } from "../types";
import { useTimerStore } from "../store/timer";
import { ResultsCalendar } from "../components/ResultsCalendar";
import { DayEditor } from "../components/DayEditor";
import { SearchResults } from "../components/SearchResults";

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

  const recordsRef = useRef(records);
  recordsRef.current = records;

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
            const newRecords = new Map(recordsRef.current);
            newRecords.set(dateStr, res.data);
            setRecords(newRecords);
          }
        }
      } catch (e) {
        console.error("Auto-save failed:", e);
      }
    };
  }, [isDirty, currentDate, editingContent, viewMode]);

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
        <SearchResults results={searchResults} onClear={() => { setSearchResults([]); setSearchQuery(""); }} />
      ) : viewMode === 'month' ? (
        <ResultsCalendar
          currentMonth={currentMonth}
          records={records}
          currentDate={currentDate}
          onMonthChange={setCurrentMonth}
          onDateClick={handleDateClick}
        />
      ) : (
        <DayEditor
          currentDate={currentDate}
          editingContent={editingContent}
          onContentChange={setEditingContent}
          onDateNavigate={(dir) => autoSaveRecord().then(() => setCurrentDate(d => dir === "prev" ? subDays(d, 1) : addDays(d, 1)))}
          onGoToToday={handleGoToToday}
          onCtrlS={() => autoSaveRef.current()}
        />
      )}
    </div>
  );
}