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
  end_time?: number | null;
  duration_minutes?: number;
  created_at?: number;
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
  created_at: number;
}

export interface ProjectStat {
  project_id: string;
  project_name: string;
  total_minutes: number;
}