import { useRef, useCallback } from "react";

export function TitleBar() {
  const winRef = useRef<Awaited<ReturnType<typeof import("@tauri-apps/api/window")["getCurrentWindow"]>> | null>(null);

  const getWin = useCallback(async () => {
    if (!winRef.current) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      winRef.current = getCurrentWindow();
    }
    return winRef.current;
  }, []);

  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <svg className="titlebar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="var(--accent)" strokeWidth="2.5" />
          <path d="M8 12L11 15L16 9" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="titlebar-appname">Yi</span>
      </div>
      <div className="titlebar-controls">
        <button className="titlebar-btn" onClick={() => getWin().then(w => w.minimize())} title="最小化">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect y="5" width="12" height="2" fill="currentColor" />
          </svg>
        </button>
        <button className="titlebar-btn" onClick={() => getWin().then(w => w.toggleMaximize())} title="最大化/还原">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="1" width="10" height="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </button>
        <button className="titlebar-btn titlebar-close" onClick={() => getWin().then(w => w.close())} title="关闭">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
