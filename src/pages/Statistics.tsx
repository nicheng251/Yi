import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  getDay,
  startOfDay,
  endOfDay,
  subDays,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { CommandResponse, ProjectStat, DailySessionStat, DailyFocus } from "../types";
import { formatMinutes } from "../utils/format";

type ViewMode = "day" | "week" | "month" | "year";

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  focus: DailyFocus | null;
}

interface EmptyDay {
  isEmpty: true;
}

export default function Statistics() {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [stats, setStats] = useState<ProjectStat[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [prevTotalMinutes, setPrevTotalMinutes] = useState(0);

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState<DailySessionStat[]>([]);
  const [selectedDay, setSelectedDay] = useState<DailyFocus | null>(null);

  const isCalendarView = viewMode === "week" || viewMode === "month";

  useEffect(() => {
    loadStatistics();
  }, [viewMode, calendarDate]);

  useEffect(() => {
    if (isCalendarView) {
      loadMonthlyData(calendarDate.getFullYear(), calendarDate.getMonth() + 1);
    }
  }, [viewMode, calendarDate, isCalendarView]);

  async function loadStatistics() {
    const now = new Date();
    let start: Date, end: Date, prevStart: Date;

    switch (viewMode) {
      case "day":
        start = startOfDay(now);
        end = endOfDay(now);
        prevStart = subDays(start, 1);
        break;
      case "week":
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        prevStart = subWeeks(start, 1);
        break;
      case "month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        prevStart = subMonths(start, 1);
        break;
      case "year":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        prevStart = new Date(now.getFullYear() - 1, 0, 1);
        break;
      default:
        return;
    }

    const prevEnd = new Date(prevStart);
    prevEnd.setTime(end.getTime());

    try {
      const [currentRes, prevRes] = await Promise.all([
        invoke("get_statistics", {
          startDate: String(Math.floor(start.getTime() / 1000)),
          endDate: String(Math.floor(end.getTime() / 1000)),
        }),
        invoke("get_statistics", {
          startDate: String(Math.floor(prevStart.getTime() / 1000)),
          endDate: String(Math.floor(prevEnd.getTime() / 1000)),
        }),
      ]);

      const currentData = (currentRes as CommandResponse<ProjectStat[]>).data || [];
      const prevData = (prevRes as CommandResponse<ProjectStat[]>).data || [];

      setStats(currentData);
      const currentTotal = currentData.reduce((sum, s) => sum + s.total_minutes, 0);
      const prevTotal = prevData.reduce((sum, s) => sum + s.total_minutes, 0);
      setTotalMinutes(currentTotal);
      setPrevTotalMinutes(prevTotal);
    } catch (e) {
      console.error("Failed to load statistics:", e);
    }
  }

  async function loadMonthlyData(year: number, month: number) {
    try {
      const res = await invoke("get_monthly_sessions", { year, month }) as CommandResponse<DailySessionStat[]>;
      setMonthlyData(res.data || []);
    } catch (e) {
      console.error("Failed to load monthly data:", e);
      setMonthlyData([]);
    }
  }

  const dailyFocusMap = useMemo(() => {
    const map = new Map<string, DailyFocus>();
    for (const stat of monthlyData) {
      const existing = map.get(stat.date);
      if (existing) {
        existing.totalMinutes += stat.minutes;
        existing.projects.push({ name: stat.project_name, minutes: stat.minutes });
      } else {
        map.set(stat.date, {
          date: stat.date,
          totalMinutes: stat.minutes,
          projects: [{ name: stat.project_name, minutes: stat.minutes }],
        });
      }
    }
    return map;
  }, [monthlyData]);

  const calendarGrid = useMemo(() => {
    type CalendarItem = CalendarDay | EmptyDay;

    if (viewMode === "week") {
      const start = startOfWeek(calendarDate, { weekStartsOn: 1 });
      const items: CalendarItem[] = [];
      for (let i = 0; i < 7; i++) {
        const current = new Date(start);
        current.setDate(start.getDate() + i);
        const dateStr = format(current, "yyyy-MM-dd");
        const focus = dailyFocusMap.get(dateStr) || null;
        items.push({
          date: current,
          isCurrentMonth: true,
          isToday: false,
          focus,
        });
      }
      return items;
    }

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const firstWeekday = getDay(firstDay);
    const offset = firstWeekday === 0 ? 6 : firstWeekday - 1;

    const items: CalendarItem[] = [];

    for (let i = 0; i < offset; i++) {
      items.push({ isEmpty: true } as EmptyDay);
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const current = new Date(year, month, d);
      const dateStr = format(current, "yyyy-MM-dd");
      const focus = dailyFocusMap.get(dateStr) || null;
      items.push({
        date: current,
        isCurrentMonth: true,
        isToday: false,
        focus,
      });
    }

    return items;
  }, [viewMode, calendarDate, dailyFocusMap]);

  const monthTotalMinutes = useMemo(() => {
    return monthlyData.reduce((sum, stat) => sum + stat.minutes, 0);
  }, [monthlyData]);

  function getDayColor(minutes: number): string {
    if (minutes === 0) return "transparent";
    if (minutes <= 30) return "rgba(var(--accent-rgb, 66, 135, 245), 0.15)";
    if (minutes <= 60) return "rgba(var(--accent-rgb, 66, 135, 245), 0.30)";
    if (minutes <= 120) return "rgba(var(--accent-rgb, 66, 135, 245), 0.50)";
    if (minutes <= 180) return "rgba(var(--accent-rgb, 66, 135, 245), 0.70)";
    return "rgba(var(--accent-rgb, 66, 135, 245), 0.90)";
  }

  function getComparisonText(): string {
    if (prevTotalMinutes === 0) return "（无上期数据）";
    const diff = totalMinutes - prevTotalMinutes;
    const percent = Math.abs(Math.round((diff / prevTotalMinutes) * 100));
    if (diff > 0) return `↑ 比上期多 ${percent}%`;
    if (diff < 0) return `↓ 比上期少 ${percent}%`;
    return "与上期持平";
  }

  function getViewPeriodText(): string {
    const now = new Date();
    switch (viewMode) {
      case "day":
        return format(now, "yyyy 年 MM 月 dd 日", { locale: zhCN });
      case "week": {
        const start = startOfWeek(now, { weekStartsOn: 1 });
        const end = endOfWeek(now, { weekStartsOn: 1 });
        return `${format(start, "M月d日")} - ${format(end, "M月d日")}`;
      }
      case "month":
        return format(calendarDate, "yyyy 年 MM 月", { locale: zhCN });
      case "year":
        return format(now, "yyyy 年", { locale: zhCN });
    }
  }

  function handlePrev() {
    if (viewMode === "week") {
      setCalendarDate(prev => subWeeks(prev, 1));
    } else {
      setCalendarDate(prev => subMonths(prev, 1));
    }
  }

  function handleNext() {
    if (viewMode === "week") {
      setCalendarDate(prev => addWeeks(prev, 1));
    } else {
      setCalendarDate(prev => addMonths(prev, 1));
    }
  }

  function handleDayClick(item: CalendarDay | EmptyDay) {
    if ("isEmpty" in item) return;
    const focus = item.focus;
    if (focus) {
      setSelectedDay(focus);
    } else {
      setSelectedDay({
        date: format(item.date, "yyyy-MM-dd"),
        totalMinutes: 0,
        projects: [],
      });
    }
  }

  function closeModal() {
    setSelectedDay(null);
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>统计</h1>
        <div style={{ display: "flex", gap: 8 }}>
          {(["day", "week", "month", "year"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                backgroundColor: viewMode === mode ? "var(--accent)" : "var(--bg-secondary)",
                color: viewMode === mode ? "white" : "var(--text-primary)",
                fontWeight: 500,
                cursor: "pointer",
                border: "none",
              }}
            >
              {mode === "day" ? "日" : mode === "week" ? "周" : mode === "month" ? "月" : "年"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "0 24px 24px 24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
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
              <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 4 }}>{getViewPeriodText()}</div>
              <div style={{ fontSize: 28, fontWeight: 600 }}>
                总专注 {formatMinutes(viewMode === "month" || viewMode === "week" ? monthTotalMinutes : totalMinutes)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>{getComparisonText()}</div>
            </div>
          </div>

          {isCalendarView && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", backgroundColor: "var(--bg-secondary)", borderRadius: 8 }}>
                <button
                  onClick={handlePrev}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 8, fontSize: 18, color: "var(--text-primary)" }}
                >
                  ‹
                </button>
                <span style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)" }}>
                  {viewMode === "week"
                    ? `${format(startOfWeek(calendarDate, { weekStartsOn: 1 }), "M月d日")} - ${format(endOfWeek(calendarDate, { weekStartsOn: 1 }), "M月d日")}`
                    : format(calendarDate, "yyyy 年 MM 月", { locale: zhCN })
                  }
                </span>
                <button
                  onClick={handleNext}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 8, fontSize: 18, color: "var(--text-primary)" }}
                >
                  ›
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, padding: "12px", backgroundColor: "var(--bg-secondary)", borderRadius: 8 }}>
                {["一", "二", "三", "四", "五", "六", "日"].map((day, i) => (
                  <div key={i} style={{
                    height: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                  }}>
                    {day}
                  </div>
                ))}
                {calendarGrid.map((item, index) => {
                  if ("isEmpty" in item) {
                    return <div key={index} style={{ width: 36, height: 36 }} />;
                  }
                  const minutes = item.focus?.totalMinutes || 0;
                  const minutesDisplay = minutes > 0 ? formatMinutes(minutes) : "";
                  return (
                    <div
                      key={index}
                      onClick={() => handleDayClick(item)}
                      style={{
                        width: 36,
                        height: 36,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto",
                        borderRadius: "50%",
                        cursor: "pointer",
                        backgroundColor: minutes === 0 ? "var(--bg-tertiary)" : getDayColor(minutes),
                        color: "var(--text-primary)",
                        fontSize: 12,
                        fontWeight: 400,
                        boxSizing: "border-box",
                        transition: "background-color 0.15s",
                      }}
                    >
                      <span>{format(item.date, "d")}</span>
                      {minutesDisplay && (
                        <span style={{ fontSize: 8, color: "var(--text-secondary)" }}>
                          {minutesDisplay}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stats.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, color: "var(--text-secondary)" }}>
                暂无专注数据
              </div>
            ) : (
              stats.map((stat, index) => (
                <div
                  key={stat.project_id}
                  style={{
                    padding: 16,
                    backgroundColor: "var(--bg-secondary)",
                    borderRadius: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        backgroundColor: index === 0 ? "var(--accent)" : "var(--bg-tertiary)",
                        color: index === 0 ? "white" : "var(--text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {index + 1}
                    </span>
                    <span style={{ fontWeight: 500 }}>{stat.project_name}</span>
                  </div>
                  <span style={{ color: "var(--text-secondary)" }}>{formatMinutes(stat.total_minutes)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selectedDay && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--bg-primary)",
              borderRadius: 12,
              padding: 24,
              minWidth: 300,
              maxWidth: 400,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {format(new Date(selectedDay.date), "yyyy 年 MM 月 dd 日", { locale: zhCN })}
                </div>
                <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
                  {format(new Date(selectedDay.date), "EEEE", { locale: zhCN })}
                </div>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 24,
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  padding: 4,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selectedDay.projects.length === 0 ? (
                <div style={{ textAlign: "center", padding: 16, color: "var(--text-secondary)" }}>
                  暂无专注数据
                </div>
              ) : (
                selectedDay.projects
                  .sort((a, b) => b.minutes - a.minutes)
                  .map((project, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        backgroundColor: "var(--bg-secondary)",
                        borderRadius: 6,
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{project.name}</span>
                      <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                        {formatMinutes(project.minutes)}
                      </span>
                    </div>
                  ))
              )}
            </div>

            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 500 }}>合计</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{formatMinutes(selectedDay.totalMinutes)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}