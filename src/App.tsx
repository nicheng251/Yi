import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Home from "./pages/Home";
import Results from "./pages/Results";
import Archive from "./pages/Archive";
import Statistics from "./pages/Statistics";
import Settings from "./pages/Settings";
import { useSettingsStore } from "./store/settings";

function App() {
  const { theme, loadSettings } = useSettingsStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadSettings();
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  if (!ready) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  return (
    <BrowserRouter>
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
          <NavLink to="/">首页</NavLink>
          <NavLink to="/results">成果记录</NavLink>
          <NavLink to="/archive">归档</NavLink>
          <NavLink to="/statistics">统计</NavLink>
          <NavLink to="/settings" style={{ marginTop: "auto" }}>设置</NavLink>
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
    </BrowserRouter>
  );
}

function NavLink({ to, children, style }: { to: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <Link
      to={to}
      style={{
        padding: "10px 12px",
        borderRadius: 6,
        color: "var(--text-secondary)",
        transition: "all 0.15s",
        textDecoration: "none",
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
      {children}
    </Link>
  );
}

export default App;