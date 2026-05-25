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

export default function Settings() {
  const { theme, setTheme, autostart, setAutostart } = useSettingsStore();
  const { clearActiveSession } = useTimerStore();
  const { showToast } = useToast();
  const [version, setVersion] = useState<string>("");
  const { updateInfo, status, progress, checkUpdate, downloadAndInstall } = useAutoUpdate();

  useEffect(() => {
    checkAutostart();
    invoke<string>("get_app_version").then(setVersion).catch(() => setVersion(""));
  }, []);

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
    <div style={{ padding: 24, maxWidth: 600 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 32 }}>设置</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>外观</h2>
          <div
            style={{
              padding: 16,
              backgroundColor: "var(--bg-secondary)",
              borderRadius: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>深色模式</span>
            <Toggle checked={theme === "dark"} onChange={(checked) => setTheme(checked ? "dark" : "light")} />
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>系统</h2>
          <div
            style={{
              padding: 16,
              backgroundColor: "var(--bg-secondary)",
              borderRadius: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>开机自启动</span>
            <Toggle checked={autostart} onChange={handleAutostartToggle} />
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>数据</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={handleExport}
              style={{
                padding: 12,
                backgroundColor: "var(--bg-secondary)",
                borderRadius: 8,
                textAlign: "left",
                color: "var(--text-primary)",
              }}
            >
              导出数据 (JSON)
            </button>
            <button
              onClick={handleImport}
              style={{
                padding: 12,
                backgroundColor: "var(--bg-secondary)",
                borderRadius: 8,
                textAlign: "left",
                color: "var(--text-primary)",
              }}
            >
              导入数据 (JSON)
            </button>
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>关于</h2>
          <div
            style={{
              padding: 16,
              backgroundColor: "var(--bg-secondary)",
              borderRadius: 8,
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontWeight: 500 }}>Yi</span>
              <span style={{ color: "var(--text-secondary)", marginLeft: 8 }}>{version ? `v${version}` : ""}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
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