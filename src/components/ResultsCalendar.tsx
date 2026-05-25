import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, isSameDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { DailyRecord } from "../types";
import "../styles/components.css";

interface ResultsCalendarProps {
  currentMonth: Date;
  records: Map<string, DailyRecord>;
  currentDate: Date;
  onMonthChange: (month: Date) => void;
  onDateClick: (day: Date) => void;
}

export function ResultsCalendar({
  currentMonth,
  records,
  currentDate,
  onMonthChange,
  onDateClick,
}: ResultsCalendarProps) {
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const firstDayOffset = (startOfMonth(currentMonth).getDay() + 6) % 7;

  return (
    <>
      <div className="calendar-nav">
        <button className="calendar-nav-btn" onClick={() => onMonthChange(subMonths(currentMonth, 1))}>←</button>
        <span className="calendar-nav-title">{format(currentMonth, "yyyy 年 MM 月", { locale: zhCN })}</span>
        <button className="calendar-nav-btn" onClick={() => onMonthChange(addMonths(currentMonth, 1))}>→</button>
      </div>

      <div className="calendar-grid">
        {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
          <div key={day} className="calendar-header">{day}</div>
        ))}
        {Array(firstDayOffset).fill(null).map((_, i) => (
          <div key={`empty-${i}`} className="calendar-day empty" />
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
              onClick={() => onDateClick(day)}
              className={`calendar-day ${isSelected ? 'selected' : ''} ${hasContent && !isSelected ? 'has-content' : ''} ${isToday(day) ? 'today' : ''}`}
              style={{
                color: isSelected ? "white" : isPast ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              <div style={{ fontWeight: isToday(day) ? 700 : 400 }}>{format(day, "d")}</div>
              {hasContent && (
                <div style={{ fontSize: 10, marginTop: 4, color: isSelected ? "rgba(255,255,255,0.8)" : "var(--accent)" }}>
                  ●
                </div>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}