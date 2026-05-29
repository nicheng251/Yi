import { invoke } from "@tauri-apps/api/core";
import i18n from "i18next";
import { CommandResponse } from "../types";

/** Rust 端在 setup 阶段自动注册快捷键，前端仅负责设置变更 */
export function useGlobalShortcut() {}

/** 前端设置快捷键：通知 Rust 端注销旧快捷键并注册新快捷键 */
export async function updateGlobalShortcut(shortcut: string) {
  const res = (await invoke("set_global_shortcut", { shortcut })) as CommandResponse<null>;
  if (!res.success) {
    throw new Error(res.error || i18n.t("settings.shortcutFailed"));
  }
}
