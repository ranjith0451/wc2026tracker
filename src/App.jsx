import { lazy, Suspense, useEffect, useState, Component } from "react";
import { Routes, Route, NavLink } from "react-router-dom";

class PageErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontWeight: 700, marginBottom: 8, color: "var(--text)" }}>Page failed to load</div>
        <div style={{ fontSize: 13, marginBottom: 20 }}>{this.state.error.message}</div>
        <button onClick={() => this.setState({ error: null })}
          style={{ padding: "8px 20px", background: "var(--blue)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer" }}>
          Try again
        </button>
      </div>
    );
    return this.props.children;
  }
}
import { useResults } from "./lib/useResults.js";
import { loadOverrides, saveOverrides, mergeResults } from "./lib/overrides.js";
import { useStatsMatchIdMap, useSchedule } from "./lib/useStats.js";
import ThemePicker from "./components/ThemePicker.jsx";

// Lazy-load all routes — cuts initial bundle from 550KB to ~150KB
import Home from "./pages/Home.jsx"; // home loads immediately (above-the-fold)
import PlayerProfile from "./pages/PlayerProfile.jsx";
const Schedule   = lazy(() => import("./pages/Schedule.jsx"));
const Groups     = lazy(() => import("./pages/Groups.jsx"));
const Bracket    = lazy(() => import("./pages/Bracket.jsx"));
const Squads     = lazy(() => import("./pages/Squads.jsx"));
const SquadDetail= lazy(() => import("./pages/SquadDetail.jsx"));
const TopScorers = lazy(() => import("./pages/TopScorers.jsx"));
const Admin      = lazy(() => import("./pages/Admin.jsx"));
const History    = lazy(() => import("./pages/History.jsx"));
const Women      = lazy(() => import("./pages/Women.jsx"));
const AllTimePlayers = lazy(() => import("./pages/AllTimePlayers.jsx"));
const Rankings       = lazy(() => import("./pages/Rankings.jsx"));
const Stats          = lazy(() => import("./pages/Stats.jsx"));
const Predictor      = lazy(() => import("./pages/Predictor.jsx"));
const MatchDetail    = lazy(() => import("./pages/MatchDetail.jsx"));
const Compare        = lazy(() => import("./pages/Compare.jsx"));

function PageLoader() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200, color: "var(--text-tertiary)", gap: 10 }}>
      <div className="flp-spinner" />
      <span style={{ fontSize: 14 }}>Loading…</span>
    </div>
  );
}

/* ── SVG Icons ── */
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const CalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const GroupIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);
const BracketIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
  </svg>
);
const SquadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const BootIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 8l2 4-4 2 4 2"/>
  </svg>
);
const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4M3 21v-4h4"/>
  </svg>
);
const FemaleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="5"/><line x1="12" y1="13" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/>
  </svg>
);
const StatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="3"/><line x1="8" y1="16" x2="8" y2="12"/><line x1="12" y1="16" x2="12" y2="8"/><line x1="16" y1="16" x2="16" y2="10"/>
  </svg>
);
const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const ChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
    <line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);
const PredictorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    <line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/>
    <line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>
  </svg>
);
const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const CompareIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="3" x2="12" y2="21"/>
    <path d="M5 8l-3 3 3 3"/><path d="M2 11h8"/>
    <path d="M19 16l3-3-3-3"/><path d="M14 13h8"/>
  </svg>
);
const BallIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" fill="#fff" stroke="#ddd" strokeWidth=".5"/>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#222"/>
    <polygon points="12,6 14,10 18,10 15,13 16,17 12,14.5 8,17 9,13 6,10 10,10" fill="#111"/>
  </svg>
);

const NAV_ITEMS = [
  { to: "/",        label: "Home",        Icon: HomeIcon,    end: true },
  { to: "/schedule",label: "Schedule",    Icon: CalIcon },
  { to: "/groups",  label: "Groups",      Icon: GroupIcon },
  { to: "/bracket", label: "Bracket",     Icon: BracketIcon },
  { to: "/predictor", label: "Predictor", Icon: PredictorIcon },
  { to: "/compare", label: "Compare",   Icon: CompareIcon },
  { to: "/squads",  label: "Squads",      Icon: SquadIcon },
  { to: "/scorers", label: "Top Scorers", Icon: BootIcon },
  { to: "/history", label: "History",     Icon: HistoryIcon },
  { to: "/women",   label: "Women's",     Icon: FemaleIcon },
  { to: "/all-time",label: "All-Time",    Icon: StatIcon },
  { to: "/rankings", label: "Rankings",   Icon: GlobeIcon },
  { to: "/stats",     label: "Records",   Icon: ChartIcon },
  // Admin hidden from nav — accessible only via /admin URL with PIN
];

function ISTClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false, timeZone: "Asia/Kolkata",
  });

  return (
    <div className="header-clock">
      <div className="clock-dot" />
      <div>
        <div className="clock-time">{time}</div>
        <div className="clock-label">IST Live</div>
      </div>
    </div>
  );
}

const ADMIN_PIN = "2026";

function AdminGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("admin_auth") === "ok");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);

  if (unlocked) return children;

  function attempt(e) {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      sessionStorage.setItem("admin_auth", "ok");
      setUnlocked(true);
    } else {
      setErr(true);
      setPin("");
      setTimeout(() => setErr(false), 1500);
    }
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:320, gap:16, padding:32 }}>
      <div style={{ fontSize:32, marginBottom:4 }}>🔒</div>
      <div style={{ fontFamily:"Barlow Condensed,sans-serif", fontSize:20, fontWeight:800, letterSpacing:".06em", color:"var(--text)" }}>Admin Access</div>
      <p style={{ fontSize:13, color:"var(--text-tertiary)", margin:0 }}>Enter PIN to manage match results</p>
      <form onSubmit={attempt} style={{ display:"flex", gap:8, marginTop:8 }}>
        <input
          type="password" maxLength={8} value={pin} onChange={e => setPin(e.target.value)}
          placeholder="PIN" autoFocus
          style={{
            width:120, padding:"10px 14px", background:"var(--bg-secondary)",
            border:`1.5px solid ${err ? "var(--red)" : "var(--border-medium)"}`,
            borderRadius:8, color:"var(--text)", fontSize:18, textAlign:"center",
            outline:"none", fontFamily:"monospace",
            transition:"border-color .15s", boxShadow: err ? "0 0 0 3px rgba(255,59,48,.15)" : "none",
          }}
        />
        <button type="submit" style={{
          padding:"10px 20px", background:"var(--blue)", border:"none", borderRadius:8,
          color:"#fff", fontFamily:"Barlow,sans-serif", fontSize:14, fontWeight:700, cursor:"pointer",
        }}>Unlock</button>
      </form>
      {err && <p style={{ fontSize:12, color:"var(--red-bright)", margin:0 }}>Incorrect PIN</p>}
    </div>
  );
}

// Fire-and-forget POST to server — syncs results to Vercel KV so all visitors see them.
function pushResults(data) {
  fetch('/api/results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch(() => {});
}

export default function App() {
  const { results: fetched, lastUpdated: fetchedAt, error } = useResults();
  const { data: scheduleData } = useSchedule();
  const { data: statsMatchIdMap = {} } = useStatsMatchIdMap();
  const [overrides, setOverrides] = useState(() => loadOverrides());

  const liveResults = scheduleData?.results || {};
  const liveCount = scheduleData?.liveCount || 0;
  const statsIdMap = scheduleData?.idMap || {};

  // Priority: manual overrides > cloud-synced results > TheStatsAPI results
  // Deep merge per-match so statsMatchId from liveResults is preserved
  const allIds = new Set([...Object.keys(liveResults), ...Object.keys(fetched)]);
  const baseResults = {};
  for (const id of allIds) {
    baseResults[id] = { ...liveResults[id], ...fetched[id] };
  }
  const results = mergeResults(baseResults, overrides);
  const lastUpdated = fetchedAt;

  function setOverride(id, v) {
    setOverrides(prev => {
      const next = { ...prev, [id]: v };
      saveOverrides(next);
      pushResults(mergeResults(fetched, next));
      return next;
    });
  }
  function clearOverride(id) { setOverride(id, null); }
  function clearAllOverrides() {
    setOverrides(() => {
      saveOverrides({});
      pushResults({});
      return {};
    });
  }

  return (
    <div className="app">

      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand">
            <div className="header-badge">
              <BallIcon />
            </div>
            <div className="header-text">
              <div className="header-title">FIFA World Cup 2026</div>
              <div className="header-sub">Canada · Mexico · USA</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemePicker />
            <ISTClock />
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="nav-bar">
        <div className="nav-inner">
          {NAV_ITEMS.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="main">
        <PageErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/"         element={<Home results={results} statsMatchIdMap={statsIdMap} />} />
              <Route path="/schedule" element={<Schedule results={results} statsMatchIdMap={statsIdMap} />} />
              <Route path="/groups"   element={<Groups results={results} />} />
              <Route path="/bracket"  element={<Bracket results={results} />} />
              <Route path="/squads"   element={<Squads results={results} />} />
              <Route path="/squads/:team" element={<SquadDetail results={results} />} />
              <Route path="/scorers"  element={<TopScorers results={results} />} />
              <Route path="/history"  element={<History />} />
              <Route path="/women"   element={<Women />} />
              <Route path="/all-time"  element={<AllTimePlayers />} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/stats"    element={<Stats />} />
              <Route path="/predictor" element={<Predictor results={results} />} />
              <Route path="/compare"   element={<Compare results={results} />} />
              <Route path="/player/:team/:player" element={<PlayerProfile />} />
              <Route path="/match/:id" element={<MatchDetail results={results} statsMatchIdMap={statsIdMap} />} />
              <Route path="/admin"    element={
                <AdminGate>
                  <Admin results={results} overrides={overrides}
                    setOverride={setOverride} clearOverride={clearOverride}
                    clearAllOverrides={clearAllOverrides} liveCount={liveCount} />
                </AdminGate>
              } />
            </Routes>
          </Suspense>
        </PageErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          FIFA World Cup 2026&nbsp;·&nbsp;All times in IST (UTC+5:30)
          {lastUpdated && <> · Synced {lastUpdated.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST</>}
          {error && <> · <span style={{ color: "var(--red-bright)" }}>Offline — cached data</span></>}
        </div>
      </footer>
    </div>
  );
}
