import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import Home from "./pages/Home";
import Results from "./pages/Results";
import Archive from "./pages/Archive";
import Statistics from "./pages/Statistics";
import Settings from "./pages/Settings";
import { useSettingsStore } from "./store/settings";
import { useTimerStore } from "./store/timer";
import { ToastProvider } from "./components/Toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useBrowserRestrictions } from "./hooks/useBrowserRestrictions";
import { useShortcut } from "./hooks/useShortcut";

const NAV_LINKS = [
  { to: "/",        label: "首页",     hint: "Ctrl+1" },
  { to: "/results",  label: "成果记录", hint: "Ctrl+2" },
  { to: "/archive",  label: "归档",     hint: "Ctrl+3" },
  { to: "/statistics", label: "统计",   hint: "Ctrl+4" },
  { to: "/settings", label: "设置",     hint: "Ctrl+5" },
];

function App() {
  const { theme, loadSettings } = useSettingsStore();
  const { loadTimerSession, saveTimerSession } = useTimerStore();
  const [ready, setReady] = useState(false);
  const loadTimerSessionRef = useRef(loadTimerSession);
  const saveTimerSessionRef = useRef(saveTimerSession);
  const navigate = useNavigate();

  useBrowserRestrictions();

  // Ctrl+1~5 导航快捷键
  useShortcut((e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl || e.shiftKey || e.altKey) return;
    const map: Record<string, string> = { "1": "/", "2": "/results", "3": "/archive", "4": "/statistics", "5": "/settings" };
    const target = map[e.key];
    if (target) {
      e.preventDefault();
      navigate(target);
    }
  });

  useEffect(() => {
    loadTimerSessionRef.current = loadTimerSession;
    saveTimerSessionRef.current = saveTimerSession;
  }, [loadTimerSession, saveTimerSession]);

  useEffect(() => {
    loadSettings();
    loadTimerSession();
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "timer_session_changed") {
        loadTimerSessionRef.current();
      }
      if (e.key === "projects_changed") {
        window.dispatchEvent(new CustomEvent("projects-changed"));
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveTimerSessionRef.current();
      localStorage.setItem("timer_session_changed", Date.now().toString());
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  if (!ready) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div style={{ display: "flex", height: "100vh" }}>
          <nav style={{
            width: 200,
            borderRight: "1px solid var(--border)",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            backgroundColor: "var(--bg-secondary)"
          }}>
            {NAV_LINKS.map(({ to, label, hint }) => (
              <NavLink key={to} to={to} hint={hint}>{label}</NavLink>
            ))}
          </nav>
          <main style={{ flex: 1, overflow: "auto" }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/results" element={<Results />} />
              <Route path="/archive" element={<Archive />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}

function NavLink({ to, children, hint, style }: { to: string; children: React.ReactNode; hint?: string; style?: React.CSSProperties }) {
  return (
    <Link
      to={to}
      title={hint || ""}
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        color: "var(--text-secondary)",
        transition: "all 0.15s",
        textDecoration: "none",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
        e.currentTarget.style.color = "var(--text-primary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
        e.currentTarget.style.color = "var(--text-secondary)";
      }}
    >
      <span>{children}</span>
      {hint && <span style={{ fontSize: 11, color: "var(--text-secondary)", opacity: 0.6 }}>{hint}</span>}
    </Link>
  );
}

function AppShell() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

export default AppShell;
