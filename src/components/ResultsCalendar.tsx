import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, isSameDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { DailyRecord } from "../types";

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

  const firstDayOfWeek = startOfMonth(currentMonth).getDay();

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          style={{ padding: "8px 12px", backgroundColor: "var(--bg-secondary)", borderRadius: 6 }}
        >
          ←
        </button>
        <span style={{ fontWeight: 500, fontSize: 18 }}>
          {format(currentMonth, "yyyy 年 MM 月", { locale: zhCN })}
        </span>
        <button
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          style={{ padding: "8px 12px", backgroundColor: "var(--bg-secondary)", borderRadius: 6 }}
        >
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
          <div
            key={day}
            style={{ textAlign: "center", padding: 8, fontWeight: 500, color: "var(--text-secondary)" }}
          >
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
              onClick={() => onDateClick(day)}
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