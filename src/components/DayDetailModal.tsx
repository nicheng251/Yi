import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { DailyFocus } from "../types";
import { formatMinutes } from "../utils/format";
import "../styles/components.css";

interface DayDetailModalProps {
  selectedDay: DailyFocus;
  onClose: () => void;
}

export function DayDetailModal({ selectedDay, onClose }: DayDetailModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {format(new Date(selectedDay.date), "yyyy 年 MM 月 dd 日", { locale: zhCN })}
            </div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
              {format(new Date(selectedDay.date), "EEEE", { locale: zhCN })}
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn">×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {selectedDay.projects.length === 0 ? (
            <div className="modal-empty">暂无专注数据</div>
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
          <span style={{ fontSize: 14, fontWeight: 500 }}>合计</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{formatMinutes(selectedDay.totalMinutes)}</span>
        </div>
      </div>
    </div>
  );
}
