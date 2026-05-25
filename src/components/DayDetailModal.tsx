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
            onClick={onClose}
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
  );
}