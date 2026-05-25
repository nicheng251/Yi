import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { startOfWeek, endOfWeek } from "date-fns";
import { DailyFocus } from "../types";
import { formatMinutes } from "../utils/format";
import "../styles/components.css";

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  focus: DailyFocus | null;
}

interface EmptyDay {
  isEmpty: true;
}

type CalendarItem = CalendarDay | EmptyDay;

interface StatsCalendarProps {
  viewMode: "week" | "month";
  calendarDate: Date;
  calendarGrid: CalendarItem[];
  onPrev: () => void;
  onNext: () => void;
  onDayClick: (item: CalendarItem) => void;
  getDayColor: (minutes: number) => string;
}

export function StatsCalendar({
  viewMode,
  calendarDate,
  calendarGrid,
  onPrev,
  onNext,
  onDayClick,
  getDayColor,
}: StatsCalendarProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="calendar-nav">
        <button className="calendar-nav-btn" onClick={onPrev}>‹</button>
        <span className="calendar-nav-title">
          {viewMode === "week"
            ? `${format(startOfWeek(calendarDate, { weekStartsOn: 1 }), "M月d日")} - ${format(endOfWeek(calendarDate, { weekStartsOn: 1 }), "M月d日")}`
            : format(calendarDate, "yyyy 年 MM 月", { locale: zhCN })}
        </span>
        <button className="calendar-nav-btn" onClick={onNext}>›</button>
      </div>

      <div className="calendar-grid">
        {["一", "二", "三", "四", "五", "六", "日"].map((day, i) => (
          <div key={i} className="weekday-header">{day}</div>
        ))}
        {calendarGrid.map((item, index) => {
          if ("isEmpty" in item) {
            return <div key={index} className="day-cell-empty" />;
          }
          const minutes = item.focus?.totalMinutes || 0;
          const minutesDisplay = minutes > 0 ? formatMinutes(minutes) : "";
          return (
            <div
              key={index}
              onClick={() => onDayClick(item)}
              className="day-cell"
              style={{
                backgroundColor: minutes === 0 ? "var(--bg-tertiary)" : getDayColor(minutes),
              }}
            >
              <span>{format(item.date, "d")}</span>
              {minutesDisplay && (
                <span className="day-cell-label">{minutesDisplay}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}