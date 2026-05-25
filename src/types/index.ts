export interface CommandResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface Project {
  id: string;
  name: string;
  category_id: string | null;
  display_order: number;
  is_archived: boolean;
  created_at: number;
  updated_at: number;
  sort_order: string;
  tags: string[];
  total_minutes?: number;
}

export interface Session {
  id: string;
  project_id: string;
  started_at: number;
  ended_at?: number | null;
  minutes?: number | null;
}

export interface DailyRecord {
  id: string;
  date: string;
  content: string | null;
  created_at: number;
  updated_at: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface ProjectStat {
  project_id: string;
  project_name: string;
  total_minutes: number;
}

export interface DailySessionStat {
  date: string;
  project_name: string;
  minutes: number;
}

export interface DailyFocus {
  date: string;
  totalMinutes: number;
  projects: { name: string; minutes: number }[];
}

export type ViewMode = "day" | "week" | "month" | "year";