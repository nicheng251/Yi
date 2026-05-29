import { format } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { startOfWeek, endOfWeek } from "date-fns";
import { useTranslation } from "react-i18next";
import { DailyFocus } from "../types";
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
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? enUS : zhCN;
  const weekdays = [
    t("components.weekdayMon"),
    t("components.weekdayTue"),
    t("components.weekdayWed"),
    t("components.weekdayThu"),
    t("components.weekdayFri"),
    t("components.weekdaySat"),
    t("components.weekdaySun"),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="calendar-nav">
        <button className="calendar-nav-btn" onClick={onPrev}>‹</button>
        <span className="calendar-nav-title">
          {viewMode === "week"
            ? `${format(startOfWeek(calendarDate, { weekStartsOn: 1 }), t("dateFormats.monthDay"), { locale })} - ${format(endOfWeek(calendarDate, { weekStartsOn: 1 }), t("dateFormats.monthDay"), { locale })}`
            : format(calendarDate, t("dateFormats.yearMonth"), { locale })}
        </span>
        <button className="calendar-nav-btn" onClick={onNext}>›</button>
      </div>

      <div className="calendar-grid">
        {weekdays.map((day, i) => (
          <div key={i} className="weekday-header">{day}</div>
        ))}
        {calendarGrid.map((item, index) => {
          if ("isEmpty" in item) {
            return <div key={index} className="day-cell-empty" />;
          }
          const minutes = item.focus?.totalMinutes || 0;
          return (
            <div
              key={index}
              onClick={() => onDayClick(item)}
              className="day-cell"
              style={{
                backgroundColor: getDayColor(minutes),
                color: minutes > 120 ? "#fff" : undefined,
              }}
            >
              {format(item.date, "d")}
            </div>
          );
        })}
      </div>
    </div>
  );
}
