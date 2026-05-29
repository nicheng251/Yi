import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../store/settings";
import { useTimerStore } from "../store/timer";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { save, open } from "@tauri-apps/plugin-dialog";
import { CommandResponse } from "../types";
import { useToast } from "../components/Toast";
import { Toggle } from "../components/Toggle";
import { useAutoUpdate } from "../hooks/useAutoUpdate";
import { updateGlobalShortcut } from "../hooks/useGlobalShortcut";

function CaptureBox({ onCapture, onCancel }: { onCapture: (e: React.KeyboardEvent) => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div
      ref={ref}
      tabIndex={0}
      onKeyDown={onCapture}
      onBlur={onCancel}
      style={{
        width: 180,
        padding: "6px 12px",
        backgroundColor: "var(--accent)",
        color: "white",
        borderRadius: 8,
        textAlign: "center",
        fontFamily: "monospace",
        fontSize: 13,
        outline: "2px solid var(--accent-hover)",
        outlineOffset: 2,
        cursor: "default",
      }}
    >
      {t("settings.captureKey")}
    </div>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const { theme, setTheme, autostart, setAutostart, language, setLanguage } = useSettingsStore();
  const { clearActiveSession } = useTimerStore();
  const { showToast } = useToast();
  const [version, setVersion] = useState<string>("");
  const [shortcut, setShortcut] = useState("Ctrl+Shift+Y");
  const [capturing, setCapturing] = useState(false);
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

  function eventToShortcut(e: React.KeyboardEvent): string {
    const parts: string[] = [];
    if ((e.metaKey || e.ctrlKey) && e.key !== "Control" && e.key !== "Meta") parts.push("Ctrl");
    if (e.altKey && e.key !== "Alt") parts.push("Alt");
    if (e.shiftKey && e.key !== "Shift") parts.push("Shift");
    if (["Control", "Meta", "Alt", "Shift"].includes(e.key)) return "";
    const keyMap: Record<string, string> = {
      " ": "Space", "ArrowUp": "Up", "ArrowDown": "Down",
      "ArrowLeft": "Left", "ArrowRight": "Right",
    };
    const key = keyMap[e.key] || e.key.toUpperCase();
    parts.push(key);
    return parts.join("+");
  }

  function startCapture() {
    setCapturing(true);
  }

  async function handleCaptureKey(e: React.KeyboardEvent) {
    e.preventDefault();
    e.stopPropagation();
    const shortcutStr = eventToShortcut(e);
    if (!shortcutStr) return;
    setShortcut(shortcutStr);
    setCapturing(false);
    try {
      await invoke("set_setting", { key: "global_shortcut", value: shortcutStr });
      await updateGlobalShortcut(shortcutStr);
      showToast(t("settings.shortcutUpdated"), "success");
    } catch (err) {
      showToast(t("settings.shortcutFailed") + ": " + String(err), "error");
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
      showToast(t("settings.autostartFailed"), "error");
    }
  }

  async function handleExport() {
    try {
      const res = (await invoke("export_data")) as CommandResponse<string>;
      if (!res.success) {
        showToast(t("settings.exportFailed") + ": " + (res.error || t("common.unknownError")), "error");
        return;
      }
      if (!res.data) {
        showToast(t("settings.exportNoData"), "error");
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
          showToast(t("settings.exportSuccess"), "success");
        } catch (writeErr) {
          console.error("Failed to write file:", writeErr);
          showToast(t("settings.writeFailed") + ": " + writeErr, "error");
        }
      }
    } catch (e) {
      console.error("Failed to export:", e);
      showToast(t("settings.exportFailed") + ": " + e, "error");
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
            showToast(t("settings.importSuccess"), "success");
          } else {
            showToast(t("settings.importFailed") + ": " + (res.error || t("common.unknownError")), "error");
          }
        } catch (readErr) {
          console.error("Failed to read file:", readErr);
          showToast(t("settings.readFailed") + ": " + readErr, "error");
        }
      }
    } catch (e) {
      console.error("Failed to import:", e);
      showToast(t("settings.importFailed") + ": " + e, "error");
    }
  }

  return (
    <div className="settings-section">
      <h1 className="section-title">{t("settings.title")}</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <h2 className="settings-group-title">{t("settings.appearance")}</h2>
          <div className="flex-between stat-card">
            <span>{t("settings.darkMode")}</span>
            <Toggle checked={theme === "dark"} onChange={(checked) => setTheme(checked ? "dark" : "light")} />
          </div>
          <div className="flex-between stat-card">
            <span>{t("settings.language")}</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "zh" | "en")}
              className="select"
            >
              <option value="zh">{t("settings.chinese")}</option>
              <option value="en">{t("settings.english")}</option>
            </select>
          </div>
        </div>

        <div>
          <h2 className="settings-group-title">{t("settings.system")}</h2>
          <div className="flex-between stat-card">
            <span>{t("settings.autostart")}</span>
            <Toggle checked={autostart} onChange={handleAutostartToggle} />
          </div>
        </div>

        <div>
          <h2 className="settings-group-title">{t("settings.shortcut")}</h2>
          <div className="stat-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
              <span style={{ flex: 1 }}>{t("settings.globalShowHide")}</span>
              {capturing ? (
                <CaptureBox onCapture={handleCaptureKey} onCancel={() => setCapturing(false)} />
              ) : (
                <>
                  <code style={{
                    padding: "4px 10px",
                    backgroundColor: "var(--bg-tertiary)",
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: "monospace",
                  }}>{shortcut}</code>
                  <button className="btn" onClick={startCapture}>{t("settings.change")}</button>
                </>
              )}
            </div>
            <div className="text-secondary" style={{ fontSize: 12 }}>
              {t("settings.shortcutHint")}
            </div>
          </div>
        </div>

        <div>
          <h2 className="settings-group-title">{t("settings.data")}</h2>
          <div className="list">
            <button onClick={handleExport} className="list-item">
              {t("settings.exportData")}
            </button>
            <button onClick={handleImport} className="list-item">
              {t("settings.importData")}
            </button>
          </div>
        </div>

        <div>
          <h2 className="settings-group-title">{t("settings.about")}</h2>
          <div className="stat-card" style={{ flexDirection: "column", alignItems: "flex-start" }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontWeight: 500 }}>Yi</span>
              <span style={{ color: "var(--text-secondary)", marginLeft: 8 }}>{version ? `v${version}` : ""}</span>
            </div>
            <div className="text-secondary" style={{ fontSize: 12, marginBottom: 12 }}>
              {t("settings.appDescription")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => checkUpdate(
                  () => showToast(t("settings.upToDate"), "success"),
                  () => showToast(t("settings.checkUpdateFailed"), "error")
                )}
                className="btn"
                disabled={status === 'checking' || status === 'downloading'}
              >
                {status === 'checking' ? t("settings.checking") : t("settings.checkUpdate")}
              </button>
              {status === 'available' && (
                <span style={{ color: 'var(--accent)' }}>
                  {t("settings.newVersion")} {updateInfo?.version}
                </span>
              )}
              {status === 'downloading' && (
                <span style={{ color: 'var(--text-secondary)' }}>
                  {t("settings.downloading")} {progress}%
                </span>
              )}
              {status === 'available' && (
                <button onClick={downloadAndInstall} className="btn btn-primary">
                  {t("settings.updateNow")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
