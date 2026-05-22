import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CommandResponse, ProjectStat } from "../types";

type ViewMode = "day" | "week" | "month" | "year";

export default function Statistics() {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [stats, setStats] = useState<ProjectStat[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [prevTotalMinutes, setPrevTotalMinutes] = useState(0);

  useEffect(() => {
    loadStatistics();
  }, [viewMode]);

  async function loadStatistics() {
    const now = new Date();
    let start: Date, end: Date, prevStart: Date;

    switch (viewMode) {
      case "day":
        start = startOfDay(now);
        end = endOfDay(now);
        prevStart = subDays(start, 1);
        break;
      case "week":
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        prevStart = subWeeks(start, 1);
        break;
      case "month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        prevStart = subMonths(start, 1);
        break;
      case "year":
        start = startOfYear(now);
        end = endOfYear(now);
        prevStart = subYears(start, 1);
        break;
    }

    const prevEnd = new Date(prevStart);
    prevEnd.setTime(end.getTime());

    try {
      const [currentRes, prevRes] = await Promise.all([
        invoke("get_statistics", {
          startDate: String(Math.floor(start.getTime() / 1000)),
          endDate: String(Math.floor(end.getTime() / 1000)),
        }),
        invoke("get_statistics", {
          startDate: String(Math.floor(prevStart.getTime() / 1000)),
          endDate: String(Math.floor(end.getTime() / 1000)),
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

  function formatMinutes(minutes: number): string {
    if (minutes < 60) return `${minutes} 分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours} 小时`;
    return `${hours} 小时 ${mins} 分钟`;
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
    const now = new Date();
    switch (viewMode) {
      case "day":
        return format(now, "yyyy 年 MM 月 dd 日", { locale: zhCN });
      case "week":
        return `本周`;
      case "month":
        return format(now, "yyyy 年 MM 月", { locale: zhCN });
      case "year":
        return format(now, "yyyy 年", { locale: zhCN });
    }
  }

  return (
    <div style={{ padding: 24, height: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>统计</h1>
        <div style={{ display: "flex", gap: 8 }}>
          {(["day", "week", "month", "year"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                backgroundColor: viewMode === mode ? "var(--accent)" : "var(--bg-secondary)",
                color: viewMode === mode ? "white" : "var(--text-primary)",
                fontWeight: 500,
              }}
            >
              {mode === "day" ? "日" : mode === "week" ? "周" : mode === "month" ? "月" : "年"}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          padding: 20,
          backgroundColor: "var(--bg-secondary)",
          borderRadius: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 4 }}>{getViewPeriodText()}</div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>总专注 {formatMinutes(totalMinutes)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>{getComparisonText()}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {stats.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: "var(--text-secondary)" }}>
            暂无专注数据
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stats.map((stat, index) => (
              <div
                key={stat.project_id}
                style={{
                  padding: 16,
                  backgroundColor: "var(--bg-secondary)",
                  borderRadius: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}