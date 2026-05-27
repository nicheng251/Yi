import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  getDay,
  startOfDay,
  addDays,
  subDays,
} from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { ViewMode, CommandResponse, ProjectStat, DailySessionStat, DailyFocus } from "../types";
import { formatMinutes } from "../utils/format";
import { ViewModeToggle } from "../components/ViewModeToggle";
import { StatsCalendar } from "../components/StatsCalendar";
import { StatsSummary } from "../components/StatsSummary";
import { DayDetailModal } from "../components/DayDetailModal";

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
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? enUS : zhCN;
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
        end = addDays(startOfDay(base), 1);
        prevStart = subDays(start, 1);
        break;
      case "week":
        start = startOfWeek(base, { weekStartsOn: 1 });
        end = addDays(start, 7);
        prevStart = subWeeks(start, 1);
        break;
      case "month":
        start = startOfMonth(base);
        end = startOfMonth(addMonths(base, 1));
        prevStart = subMonths(start, 1);
        break;
      case "year":
        start = new Date(base.getFullYear(), 0, 1);
        end = new Date(base.getFullYear() + 1, 0, 1);
        prevStart = new Date(base.getFullYear() - 1, 0, 1);
        break;
      default:
        return;
    }

    const prevEnd = start;

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
    if (minutes === 0) return "var(--bg-tertiary)";
    if (minutes <= 30)  return "color-mix(in srgb, var(--accent) 20%, transparent)";
    if (minutes <= 60)  return "color-mix(in srgb, var(--accent) 35%, transparent)";
    if (minutes <= 120) return "color-mix(in srgb, var(--accent) 55%, transparent)";
    if (minutes <= 180) return "color-mix(in srgb, var(--accent) 75%, transparent)";
    return "var(--accent)";
  }

  function getComparisonText(): string {
    if (prevTotalMinutes === 0) return t("statistics.noPrevData");
    const diff = totalMinutes - prevTotalMinutes;
    const percent = Math.abs(Math.round((diff / prevTotalMinutes) * 100));
    if (diff > 0) return t("statistics.upFromPrev", { percent });
    if (diff < 0) return t("statistics.downFromPrev", { percent });
    return t("statistics.sameAsPrev");
  }

  function getViewPeriodText(): string {
    const date = calendarDate;
    switch (viewMode) {
      case "day":
        return format(date, t("dateFormats.fullDate"), { locale });
      case "week": {
        const start = startOfWeek(date, { weekStartsOn: 1 });
        const end = endOfWeek(date, { weekStartsOn: 1 });
        return `${format(start, t("dateFormats.monthDay"), { locale })} - ${format(end, t("dateFormats.monthDay"), { locale })}`;
      }
      case "month":
        return format(date, t("dateFormats.yearMonth"), { locale });
      case "year":
        return format(date, t("dateFormats.year"), { locale });
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
    <div className="page">
      <div className="page-header">
        <h1 className="section-title" style={{ marginBottom: 0 }}>{t("statistics.title")}</h1>
        <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      <div className="scroll-content">
        <div className="flex-column gap-24">
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

          <div className="flex-column gap-8">
            {stats.length === 0 ? (
              <div className="empty-state">
                {t("statistics.emptyState")}
              </div>
            ) : (
              stats.map((stat, index) => (
                <div
                  key={stat.project_id}
                  className="flex-between stat-card"
                >
                  <div className="flex-row gap-12" style={{ flex: 1 }}>
                    <span className={`rank-badge ${index === 0 ? 'top' : ''}`}>
                      {index + 1}
                    </span>
                    <span className="text-primary">{stat.project_name}</span>
                  </div>
                  <span className="text-secondary">{formatMinutes(stat.total_minutes)}</span>
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
