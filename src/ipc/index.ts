import { invoke } from "@tauri-apps/api/core";
import { CommandResponse, Project, Session, DailyRecord, ProjectStat, DailySessionStat } from "../types";

/** IPC 抽象层：类型安全、统一错误处理 */
export const ipc = {
  projects: {
    list: () => invoke<CommandResponse<Project[]>>("get_projects"),
    archived: () => invoke<CommandResponse<Project[]>>("get_archived_projects"),
    create: (name: string, categoryId: string | null, tags: string[]) =>
      invoke<CommandResponse<Project>>("create_project", { name, categoryId, tags }),
    update: (id: string, name: string) =>
      invoke<CommandResponse<Project>>("update_project", { id, name }),
    archive: (id: string) => invoke<CommandResponse<null>>("archive_project", { id }),
    unarchive: (id: string) => invoke<CommandResponse<null>>("unarchive_project", { id }),
    delete: (id: string) => invoke<CommandResponse<null>>("delete_project", { id }),
    reorder: (projectIds: string[]) => invoke<CommandResponse<null>>("reorder_projects", { projectIds }),
    totalMinutes: (projectId: string) =>
      invoke<CommandResponse<number>>("get_project_total_minutes", { projectId }),
  },

  sessions: {
    start: (projectId: string) => invoke<CommandResponse<Session>>("start_session", { projectId }),
    end: (sessionId: string) => invoke<CommandResponse<null>>("end_session", { sessionId }),
    active: () => invoke<CommandResponse<Session | null>>("get_active_session"),
    monthly: (year: number, month: number) =>
      invoke<CommandResponse<DailySessionStat[]>>("get_monthly_sessions", { year, month }),
  },

  records: {
    get: (date: string) => invoke<CommandResponse<DailyRecord | null>>("get_daily_record", { date }),
    save: (date: string, content: string) =>
      invoke<CommandResponse<DailyRecord>>("save_daily_record", { date, content }),
    month: (year: number, month: number) =>
      invoke<CommandResponse<DailyRecord[]>>("get_daily_records_for_month", { year, month }),
    search: (query: string) => invoke<CommandResponse<DailyRecord[]>>("search_records", { query }),
  },

  statistics: {
    range: (startDate: number, endDate: number) =>
      invoke<CommandResponse<ProjectStat[]>>("get_statistics", { startDate, endDate }),
  },

  settings: {
    get: (key: string) => invoke<CommandResponse<string | null>>("get_setting", { key }),
    set: (key: string, value: string) => invoke<CommandResponse<null>>("set_setting", { key, value }),
  },

  app: {
    version: () => invoke<string>("get_app_version"),
    dataDir: () => invoke<string>("get_app_data_dir"),
    quit: () => invoke<null>("quit_app"),
    shortcut: (shortcut: string) => invoke<CommandResponse<null>>("set_global_shortcut", { shortcut }),
  },

  data: {
    export: () => invoke<CommandResponse<string>>("export_data"),
    import: (jsonData: string) => invoke<CommandResponse<null>>("import_data", { jsonData }),
  },
};
