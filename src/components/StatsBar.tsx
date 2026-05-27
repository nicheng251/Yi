import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { startOfDay, startOfWeek, addDays } from "date-fns";
import { CommandResponse, ProjectStat } from "../types";
import { formatMinutes } from "../utils/format";
import { useTimerStore } from "../store/timer";

interface StatsBarProps {
  currentProjectMinutes?: number;
}

export function StatsBar({ currentProjectMinutes = 0 }: StatsBarProps) {
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [weekMinutes, setWeekMinutes] = useState(0);
  const [loading, setLoading] = useState(true);
  const activeSession = useTimerStore((s) => s.activeSession);

  useEffect(() => {
    loadStats();
  }, [activeSession]);

  async function loadStats() {
    try {
      const now = new Date();
      const todayStart = Math.floor(startOfDay(now).getTime() / 1000);
      const todayEnd = Math.floor(addDays(startOfDay(now), 1).getTime() / 1000);
      const weekStart = Math.floor(startOfWeek(now, { weekStartsOn: 1 }).getTime() / 1000);
      const weekEnd = Math.floor(addDays(startOfWeek(now, { weekStartsOn: 1 }), 7).getTime() / 1000);

      const [todayRes, weekRes] = await Promise.all([
        invoke("get_statistics", {
          startDate: todayStart,
          endDate: todayEnd,
        }) as Promise<CommandResponse<ProjectStat[]>>,
        invoke("get_statistics", {
          startDate: weekStart,
          endDate: weekEnd,
        }) as Promise<CommandResponse<ProjectStat[]>>,
      ]);

      const totalToday = todayRes.data?.reduce((sum, p) => sum + p.total_minutes, 0) ?? 0;
      const totalWeek = weekRes.data?.reduce((sum, p) => sum + p.total_minutes, 0) ?? 0;

      setTodayMinutes(totalToday);
      setWeekMinutes(totalWeek);
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
