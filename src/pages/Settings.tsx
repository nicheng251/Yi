import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "../store/settings";
import { useTimerStore } from "../store/timer";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { save, open } from "@tauri-apps/plugin-dialog";
import { CommandResponse } from "../types";
import { useToast } from "../components/Toast";
import { Toggle } from "../components/Toggle";
import { useAutoUpdate } from "../hooks/useAutoUpdate";
import { updateGlobalShortcut } from "../hooks/useGlobalShortcut";

export default function Settings() {
  const { theme, setTheme, autostart, setAutostart } = useSettingsStore();
  const { clearActiveSession } = useTimerStore();
  const { showToast } = useToast();
  const [version, setVersion] = useState<string>("");
  const [shortcut, setShortcut] = useState("Ctrl+Shift+Y");
  const [editingShortcut, setEditingShortcut] = useState(false);
  const { updateInfo, status, progress, checkUpdate, downloadAndInstall } = useAutoUpdate();

  useEffect(() => {
    checkAutostart();
    invoke<string>("get_app_version").then(setVersion).catch(() => setVersion(""));
    loadShortcutSetting();
  }, []);

  async function loadShortcutSetting() {
    try {
      const res = (await invoke("get_setting", { key: "global_shortcut" })) as CommandResponse<string | null>;
      if (res.success && res.data) {
        setShortcut(res.data);
      }
    } catch {}
  }

  async function handleShortcutChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.trim();
    if (!val || !e.currentTarget.checkValidity()) return;
    setShortcut(val);
    setEditingShortcut(false);
    try {
      await invoke("set_setting", { key: "global_shortcut", value: val });
      updateGlobalShortcut(val);
      showToast("全局快捷键已更新", "success");
    } catch (err) {
      showToast("保存快捷键失败", "error");
    }
  }

  async function checkAutostart() {
    try {
      const enabled = await isEnabled();
      setAutostart(enabled);
    } catch (e) {
      console.error("Failed to check autostart:", e);
    }
  }

  async function handleAutostartToggle() {
    try {
      if (autostart) {
        await disable();
        setAutostart(false);
      } else {
        await enable();
        setAutostart(true);
      }
    } catch (e) {
      console.error("Failed to toggle autostart:", e);
      showToast("自动启动设置失败", "error");
    }
  }

  async function handleExport() {
    try {
      const res = (await invoke("export_data")) as CommandResponse<string>;
      if (!res.success) {
        showToast("导出失败: " + (res.error || "未知错误"), "error");
        return;
      }
      if (!res.data) {
        showToast("导出失败: 无数据", "error");
        return;
      }
      const filePath = await save({
        defaultPath: `yi-export-${new Date().toISOString().split("T")[0]}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (filePath) {
        try {
          const { writeTextFile } = await import("@tauri-apps/plugin-fs");
          await writeTextFile(filePath, res.data);
          showToast("导出成功", "success");
        } catch (writeErr) {
          console.error("Failed to write file:", writeErr);
          showToast("写入文件失败: " + writeErr, "error");
        }
      }
    } catch (e) {
      console.error("Failed to export:", e);
      showToast("导出失败: " + e, "error");
    }
  }

  async function handleImport() {
    try {
      const filePath = await open({
        filters: [{ name: "JSON", extensions: ["json"] }],
        multiple: false,
      });
      if (filePath) {
        try {
          const { readTextFile } = await import("@tauri-apps/plugin-fs");
          const content = await readTextFile(filePath);
          const res = (await invoke("import_data", { jsonData: content })) as CommandResponse<null>;
          if (res.success) {
            clearActiveSession();
            showToast("导入成功", "success");
          } else {
            showToast("导入失败: " + (res.error || "未知错误"), "error");
          }
        } catch (readErr) {
          console.error("Failed to read file:", readErr);
          showToast("读取文件失败: " + readErr, "error");
        }
      }
    } catch (e) {
      console.error("Failed to import:", e);
      showToast("导入失败: " + e, "error");
    }
  }

  return (
    <div className="settings-section">
      <h1 className="section-title">设置</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>外观</h2>
          <div className="flex-between stat-card">
            <span>深色模式</span>
            <Toggle checked={theme === "dark"} onChange={(checked) => setTheme(checked ? "dark" : "light")} />
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>系统</h2>
          <div className="flex-between stat-card">
            <span>开机自启动</span>
            <Toggle checked={autostart} onChange={handleAutostartToggle} />
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>快捷键</h2>
          <div className="stat-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
              <span style={{ flex: 1 }}>全局显示/隐藏</span>
              {editingShortcut ? (
                <input
                  type="text"
                  defaultValue={shortcut}
                  autoFocus
                  className="input"
                  style={{ width: 180, fontFamily: "monospace", textAlign: "center" }}
                  placeholder="例如: Ctrl+Shift+Y"
                  pattern="^(Ctrl\+)?(Alt\+)?(Shift\+)?[A-Za-z0-9]$"
                  onBlur={handleShortcutChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleShortcutChange(e as any);
                    if (e.key === "Escape") setEditingShortcut(false);
                  }}
                />
              ) : (
                <>
                  <code style={{
                    padding: "4px 10px",
                    backgroundColor: "var(--bg-tertiary)",
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: "monospace",
                  }}>{shortcut}</code>
                  <button className="btn" onClick={() => setEditingShortcut(true)}>修改</button>
                </>
              )}
            </div>
            <div className="text-secondary" style={{ fontSize: 12 }}>
              修改后立即生效 · 支持格式: Ctrl/Alt/Shift + 按键
            </div>
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>数据</h2>
          <div className="list">
            <button onClick={handleExport} className="list-item">
              导出数据 (JSON)
            </button>
            <button onClick={handleImport} className="list-item">
              导入数据 (JSON)
            </button>
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>关于</h2>
          <div className="stat-card" style={{ flexDirection: "column", alignItems: "flex-start" }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontWeight: 500 }}>Yi</span>
              <span style={{ color: "var(--text-secondary)", marginLeft: 8 }}>{version ? `v${version}` : ""}</span>
            </div>
            <div className="text-secondary" style={{ fontSize: 12, marginBottom: 12 }}>
              专注生产力工具
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => checkUpdate(
                  () => showToast("已是最新版本", "success"),
                  () => showToast("检查更新失败", "error")
                )}
                className="btn"
                disabled={status === 'checking' || status === 'downloading'}
              >
                {status === 'checking' ? '检查中...' : '检查更新'}
              </button>
              {status === 'available' && (
                <span style={{ color: 'var(--accent)' }}>
                  发现新版本 {updateInfo?.version}
                </span>
              )}
              {status === 'downloading' && (
                <span style={{ color: 'var(--text-secondary)' }}>
                  下载中... {progress}%
                </span>
              )}
              {status === 'available' && (
                <button onClick={downloadAndInstall} className="btn btn-primary">
                  立即更新
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}