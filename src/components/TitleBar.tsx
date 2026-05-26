declare global {
  interface Window {
    __TAURI__?: {
      window: {
        getCurrentWindow: () => {
          minimize: () => Promise<void>;
          toggleMaximize: () => Promise<void>;
          close: () => Promise<void>;
        };
      };
    };
  }
}

function getWin() {
  try {
    if (window.__TAURI__?.window) {
      return window.__TAURI__.window.getCurrentWindow();
    }
    return null;
  } catch (e) {
    console.error("[TitleBar] getCurrentWindow failed:", e);
    return null;
  }
}

const win = getWin();
console.log("[TitleBar] init:", win ? "OK" : "FAIL");

export function TitleBar() {
  const handleMinimize = () => {
    if (!win) return console.error("[TitleBar] minimize: window not available");
    win.minimize().catch((e) => console.error("[TitleBar] minimize failed:", e));
  };

  const handleMaximize = () => {
    if (!win) return console.error("[TitleBar] maximize: window not available");
    win.toggleMaximize().catch((e) => console.error("[TitleBar] maximize failed:", e));
  };

  const handleClose = () => {
    if (!win) return console.error("[TitleBar] close: window not available");
    win.close().catch((e) => console.error("[TitleBar] close failed:", e));
  };

  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <span className="titlebar-appname">Yi</span>
      </div>
      <div className="titlebar-controls">
        <button type="button" className="titlebar-btn" onClick={handleMinimize} title="最小化">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect y="5" width="12" height="2" fill="currentColor" />
          </svg>
        </button>
        <button type="button" className="titlebar-btn" onClick={handleMaximize} title="最大化/还原">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="1" width="10" height="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </button>
        <button type="button" className="titlebar-btn titlebar-close" onClick={handleClose} title="关闭">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
