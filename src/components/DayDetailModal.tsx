import { format } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { DailyFocus } from "../types";
import { formatMinutes } from "../utils/format";
import "../styles/components.css";

interface DayDetailModalProps {
  selectedDay: DailyFocus;
  onClose: () => void;
}

export function DayDetailModal({ selectedDay, onClose }: DayDetailModalProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? enUS : zhCN;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {format(new Date(selectedDay.date), t("dateFormats.fullDate"), { locale })}
            </div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
              {format(new Date(selectedDay.date), "EEEE", { locale })}
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn">×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {selectedDay.projects.length === 0 ? (
            <div className="modal-empty">{t("components.noFocusData")}</div>
          ) : (
            selectedDay.projects
              .sort((a, b) => b.minutes - a.minutes)
              .map((project, index) => (
                <div key={index} className="modal-project-item">
                  <span style={{ fontSize: 14 }}>{project.name}</span>
                  <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                    {formatMinutes(project.minutes)}
                  </span>
                </div>
              ))
          )}
        </div>

        <div className="modal-total">
          <span style={{ fontSize: 14, fontWeight: 500 }}>{t("components.total")}</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{formatMinutes(selectedDay.totalMinutes)}</span>
        </div>
      </div>
    </div>
  );
}
