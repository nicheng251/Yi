import { register } from "@tauri-apps/plugin-global-shortcut";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useCallback } from "react";
import { CommandResponse } from "../types";

const DEFAULT_SHORTCUT = "Ctrl+Shift+Y";
const UPDATE_EVENT = "global-shortcut-update";

export function useGlobalShortcut() {
  const shortcutRef = useRef<string>(DEFAULT_SHORTCUT);

  const registerShortcut = useCallback(async (shortcut: string) => {
    try {
      await unregisterAll();
      await register(shortcut, async (event) => {
        if (event.state === "Pressed") {
          const win = getCurrentWindow();
          const visible = await win.isVisible();
          if (visible) {
            await win.hide();
          } else {
            await win.show();
            await win.setFocus();
          }
        }
      });
      shortcutRef.current = shortcut;
    } catch (e) {
      console.error("Failed to register shortcut:", e);
    }
  }, []);

  // 从设置加载快捷键
  const loadShortcut = useCallback(async (): Promise<string> => {
    try {
      const res = (await invoke("get_setting", { key: "global_shortcut" })) as CommandResponse<string | null>;
      if (res.success && res.data) {
        return res.data;
      }
    } catch {}
    return DEFAULT_SHORTCUT;
  }, []);

  // 初始化
  useEffect(() => {
    loadShortcut().then(registerShortcut);

    // 监听设置页发起的快捷键变更事件
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail as string;
      registerShortcut(detail);
    };
    window.addEventListener(UPDATE_EVENT, onUpdate);
    return () => {
      unregisterAll();
      window.removeEventListener(UPDATE_EVENT, onUpdate);
    };
  }, [loadShortcut, registerShortcut]);
}

export function updateGlobalShortcut(newShortcut: string) {
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: newShortcut }));
}

async function unregisterAll() {
  try {
    const { unregisterAll } = await import("@tauri-apps/plugin-global-shortcut");
    await unregisterAll();
  } catch {}
}
