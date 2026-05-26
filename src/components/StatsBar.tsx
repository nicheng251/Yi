import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { CommandResponse, ProjectStat } from "../types";
import { formatMinutes } from "../utils/format";

interface StatsBarProps {
  currentProjectMinutes?: number;
}

export function StatsBar({ currentProjectMinutes = 0 }: StatsBarProps) {
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [weekMinutes, setWeekMinutes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const now = new Date();
      const todayStart = Math.floor(startOfDay(now).getTime() / 1000);
      const todayEnd = Math.floor(endOfDay(now).getTime() / 1000);
      const weekStart = Math.floor(startOfWeek(now, { weekStartsOn: 1 }).getTime() / 1000);
      const weekEnd = Math.floor(endOfWeek(now, { weekStartsOn: 1 }).getTime() / 1000);

      const todayRes = (await invoke("get_statistics", {
        startDate: todayStart,
        endDate: todayEnd,
      })) as CommandResponse<ProjectStat[]>;

      const weekRes = (await invoke("get_statistics", {
        startDate: weekStart,
        endDate: weekEnd,
      })) as CommandResponse<ProjectStat[]>;

      if (todayRes.success && todayRes.data) {
        const total = todayRes.data.reduce((sum, p) => sum + p.total_minutes, 0);
        setTodayMinutes(total);
      }

      if (weekRes.success && weekRes.data) {
        const total = weekRes.data.reduce((sum, p) => sum + p.total_minutes, 0);
        setWeekMinutes(total);
      }
    } catch (e) {
      console.error("Failed to load stats:", e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="stats-bar">
        <span className="loading">加载中...</span>
      </div>
    );
  }

  return (
    <div className="stats-bar">
      <div>
        <span className="text-secondary">今日 </span>
        <span className="text-primary">{formatMinutes(todayMinutes)}</span>
      </div>
      <div>
        <span className="text-secondary">本周 </span>
        <span className="text-primary">{formatMinutes(weekMinutes)}</span>
      </div>
      {currentProjectMinutes > 0 && (
        <div>
          <span className="text-secondary">本次 </span>
          <span className="text-accent" style={{ fontWeight: 600 }}>{formatMinutes(currentProjectMinutes)}</span>
        </div>
      )}
    </div>
  );
}