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
import { ViewModeToggle } from "../components/ViewModeToggle";
import { StatsCalendar } from "../components/StatsCalendar";
import { StatsSummary } from "../components/StatsSummary";
import { DayDetailModal } from "../components/DayDetailModal";

export type ViewMode = "day" | "week" | "month" | "year";

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
    const base = isCalendarView ? calendarDate : new Date();
    let start: Date, end: Date, prevStart: Date;

    switch (viewMode) {
      case "day":
        start = startOfDay(base);
        end = endOfDay(base);
        prevStart = subDays(start, 1);
        break;
      case "week":
        start = startOfWeek(base, { weekStartsOn: 1 });
        end = endOfWeek(base, { weekStartsOn: 1 });
        prevStart = subWeeks(start, 1);
        break;
      case "month":
        start = startOfMonth(base);
        end = endOfMonth(base);
        prevStart = subMonths(start, 1);
        break;
      case "year":
        start = new Date(base.getFullYear(), 0, 1);
        end = new Date(base.getFullYear(), 11, 31);
        prevStart = new Date(base.getFullYear() - 1, 0, 1);
        break;
      default:
        return;
    }

    const prevEnd = new Date(prevStart);
    prevEnd.setTime(end.getTime());

    try {
      const [currentRes, prevRes] = await Promise.all([
        invoke("get_statistics", {
          startDate: Math.floor(start.getTime() / 1000),
          endDate: Math.floor(end.getTime() / 1000),
        }),
        invoke("get_statistics", {
          startDate: Math.floor(prevStart.getTime() / 1000),
          endDate: Math.floor(prevEnd.getTime() / 1000),
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
    const date = calendarDate;
    switch (viewMode) {
      case "day":
        return format(date, "yyyy 年 MM 月 dd 日", { locale: zhCN });
      case "week": {
        const start = startOfWeek(date, { weekStartsOn: 1 });
        const end = endOfWeek(date, { weekStartsOn: 1 });
        return `${format(start, "M月d日")} - ${format(end, "M月d日")}`;
      }
      case "month":
        return format(date, "yyyy 年 MM 月", { locale: zhCN });
      case "year":
        return format(date, "yyyy 年", { locale: zhCN });
      default:
        return "";
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
      <div className="page-header" style={{ padding: 24 }}>
        <h1 className="section-title" style={{ marginBottom: 0 }}>统计</h1>
        <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "0 24px 24px 24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <StatsSummary
            viewMode={viewMode}
            totalMinutes={totalMinutes}
            monthTotalMinutes={monthTotalMinutes}
            getViewPeriodText={getViewPeriodText}
            getComparisonText={getComparisonText}
          />

          {isCalendarView && (
            <StatsCalendar
              viewMode={viewMode === "week" ? "week" : "month"}
              calendarDate={calendarDate}
              calendarGrid={calendarGrid}
              onPrev={handlePrev}
              onNext={handleNext}
              onDayClick={handleDayClick}
              getDayColor={getDayColor}
            />
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stats.length === 0 ? (
              <div className="empty-state">
                暂无专注数据
              </div>
            ) : (
              stats.map((stat, index) => (
                <div
                  key={stat.project_id}
                  className="flex-between stat-card"
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
        <DayDetailModal selectedDay={selectedDay} onClose={closeModal} />
      )}
    </div>
  );
}