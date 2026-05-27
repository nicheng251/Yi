import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useTranslation, Trans } from "react-i18next";
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
import { useGlobalShortcut } from "./hooks/useGlobalShortcut";

function App() {
  const { t } = useTranslation();
  const { theme, loadSettings } = useSettingsStore();
  const { loadTimerSession, saveTimerSession } = useTimerStore();
  const [ready, setReady] = useState(false);
  const loadTimerSessionRef = useRef(loadTimerSession);
  const saveTimerSessionRef = useRef(saveTimerSession);
  const navigate = useNavigate();

  const [tauriAvailable] = useState(() => typeof (window as any).__TAURI_INTERNALS__ !== "undefined");

  useBrowserRestrictions();
  useGlobalShortcut();

  const NAV_LINKS = [
    { to: "/",        label: t("nav.home"),       hint: "Ctrl+1" },
    { to: "/results",  label: t("nav.results"),    hint: "Ctrl+2" },
    { to: "/archive",  label: t("nav.archive"),    hint: "Ctrl+3" },
    { to: "/statistics", label: t("nav.statistics"), hint: "Ctrl+4" },
    { to: "/settings", label: t("nav.settings"),   hint: "Ctrl+5" },
  ];

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

  if (!tauriAvailable) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", padding: 40, textAlign: "center", backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}>
        <h2 style={{ color: "var(--danger)", marginBottom: 16 }}>{t("error.envNotSupported")}</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
          <Trans i18nKey="error.useTauri">
            Please use <code style={{ padding: "2px 8px", backgroundColor: "var(--bg-tertiary)", borderRadius: 4 }}>npm run tauri dev</code> instead of <code style={{ padding: "2px 8px", backgroundColor: "var(--bg-tertiary)", borderRadius: 4 }}>npm run dev</code>
          </Trans>
        </p>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          {t("error.tauriRequired")}
        </p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div style={{ display: "flex", height: "100vh" }}>
          <nav className="sidebar">
            <div className="sidebar-nav">
              {NAV_LINKS.map(({ to, label, hint }) => (
                <NavLink key={to} to={to} hint={hint}>{label}</NavLink>
              ))}
            </div>
          </nav>
          <main className="main-content">
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

function NavLink({ to, children, hint }: { to: string; children: React.ReactNode; hint?: string }) {
  return (
    <Link to={to} title={hint || ""} className="nav-link">
      <span>{children}</span>
      {hint && <span className="nav-link-hint">{hint}</span>}
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
