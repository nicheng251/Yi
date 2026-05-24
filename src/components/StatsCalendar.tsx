import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { startOfWeek, endOfWeek } from "date-fns";
import { DailyFocus } from "../types";
import { formatMinutes } from "../utils/format";

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 16px",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: 8,
        }}
      >
        <button
          onClick={onPrev}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 8, fontSize: 18, color: "var(--text-primary)" }}
        >
          ‹
        </button>
        <span style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)" }}>
          {viewMode === "week"
            ? `${format(startOfWeek(calendarDate, { weekStartsOn: 1 }), "M月d日")} - ${format(endOfWeek(calendarDate, { weekStartsOn: 1 }), "M月d日")}`
            : format(calendarDate, "yyyy 年 MM 月", { locale: zhCN })}
        </span>
        <button
          onClick={onNext}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 8, fontSize: 18, color: "var(--text-primary)" }}
        >
          ›
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          padding: "12px",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: 8,
        }}
      >
        {["一", "二", "三", "四", "五", "六", "日"].map((day, i) => (
          <div
            key={i}
            style={{
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-secondary)",
            }}
          >
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
              onClick={() => onDayClick(item)}
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
  );
}