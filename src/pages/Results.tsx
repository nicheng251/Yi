import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { format, subDays, addDays } from "date-fns";
import { CommandResponse, DailyRecord } from "../types";
import { useTimerStore } from "../store/timer";
import { ResultsCalendar } from "../components/ResultsCalendar";
import { DayEditor } from "../components/DayEditor";
import { SearchResults } from "../components/SearchResults";
import { useToast } from "../components/Toast";

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
  const { showToast } = useToast();

  const autoSave = useCallback(async () => {
    if (!isDirty) return;
    const dateStr = format(currentDate, "yyyy-MM-dd");
    try {
      const res = (await invoke("save_daily_record", {
        date: dateStr,
        content: editingContent,
      })) as CommandResponse<DailyRecord>;
      if (res.success && res.data) {
        const savedRecord: DailyRecord = res.data;
        setOriginalContent(editingContent);
        setIsDirty(false);
        if (viewMode === 'month') {
          setRecords((prev) => {
            const next = new Map(prev);
            next.set(dateStr, savedRecord);
            return next;
          });
        }
      }
    } catch (e) {
      console.error("Auto-save failed:", e);
    }
  }, [isDirty, currentDate, editingContent, viewMode]);

  useEffect(() => {
    if (viewMode === 'day') {
      loadDayRecord(currentDate);
    }
  }, [viewMode, currentDate]);

  useEffect(() => {
    if (editingContent !== originalContent) {
      setIsDirty(true);
    }
  }, [editingContent, originalContent]);

  // Auto-save before unmount
  useEffect(() => {
    return () => {
      autoSave();
    };
  }, [autoSave]);

  // Auto-save on quit
  useEffect(() => {
    const handleQuit = async () => {
      try {
        await Promise.all([autoSave(), saveTimerSession()]);
      } catch (e) {
        console.error("Save failed on quit:", e);
      }
      invoke("quit_app");
    };
    window.addEventListener("tauri-quit", handleQuit);
    return () => window.removeEventListener("tauri-quit", handleQuit);
  }, [autoSave, saveTimerSession]);

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
      showToast("加载记录失败", "error");
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
      showToast("加载记录失败", "error");
    }
  }

  function resetEditorState() {
    setEditingContent("");
    setOriginalContent("");
    setIsDirty(false);
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
      showToast("搜索失败", "error");
    }
  }

  const handleDateClick = (day: Date) => {
    autoSave().then(() => {
      resetEditorState();
      setCurrentDate(day);
      setViewMode('day');
    });
  };

  const handleGoToToday = () => {
    autoSave().then(() => {
      resetEditorState();
      setCurrentDate(new Date());
      setViewMode('day');
    });
  };

  const handleSetViewMode = (mode: 'month' | 'day') => {
    autoSave().then(() => {
      resetEditorState();
      setViewMode(mode);
    });
  };

  const handleDateNavigate = (dir: "prev" | "next") => {
    autoSave().then(() => {
      resetEditorState();
      setCurrentDate(d => dir === "prev" ? subDays(d, 1) : addDays(d, 1));
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="section-title" style={{ marginBottom: 0 }}>成果记录</h1>
        <div className="flex-row" style={{ gap: 8 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="搜索成果..."
            className="input"
            style={{ width: 200 }}
          />
          <button onClick={handleSearch} className="btn-primary">
            搜索
          </button>
          <div className="v-divider" />
          <button
            onClick={() => handleSetViewMode('day')}
            className={viewMode === 'day' ? 'toggle-btn active' : 'toggle-btn'}
          >
            日视图
          </button>
          <button
            onClick={() => handleSetViewMode('month')}
            className={viewMode === 'month' ? 'toggle-btn active' : 'toggle-btn'}
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
          onDateNavigate={handleDateNavigate}
          onGoToToday={handleGoToToday}
          onCtrlS={() => autoSave()}
        />
      )}
    </div>
  );
}