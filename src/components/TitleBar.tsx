import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

export function TitleBar() {
  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <span className="titlebar-icon">⏳</span>
        <span className="titlebar-appname">Yi</span>
      </div>
      <div className="titlebar-controls">
        <button className="titlebar-btn" onClick={() => appWindow.minimize()} title="最小化">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect y="5" width="12" height="2" fill="currentColor" />
          </svg>
        </button>
        <button className="titlebar-btn" onClick={() => appWindow.toggleMaximize()} title="最大化/还原">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="1" width="10" height="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </button>
        <button className="titlebar-btn titlebar-close" onClick={() => appWindow.close()} title="关闭">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
