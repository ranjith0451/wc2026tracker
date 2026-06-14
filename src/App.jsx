import { useEffect, useRef, useState } from "react";
import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import { useResults } from "./lib/useResults.js";
import { loadOverrides, saveOverrides, mergeResults } from "./lib/overrides.js";
import Home from "./pages/Home.jsx";
import Schedule from "./pages/Schedule.jsx";
import Groups from "./pages/Groups.jsx";
import Bracket from "./pages/Bracket.jsx";
import Squads from "./pages/Squads.jsx";
import SquadDetail from "./pages/SquadDetail.jsx";
import TopScorers from "./pages/TopScorers.jsx";
import Admin from "./pages/Admin.jsx";

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
const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const BallIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" fill="#fff" stroke="#ddd" strokeWidth=".5"/>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#222"/>
    <polygon points="12,6 14,10 18,10 15,13 16,17 12,14.5 8,17 9,13 6,10 10,10" fill="#111"/>
  </svg>
);

/* ── Particle canvas ── */
function ParticleCanvas() {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W, H, particles;
    const COLORS = ["rgba(37,99,235,","rgba(6,182,212,","rgba(59,130,246,","rgba(99,102,241,","rgba(16,185,129,"];
    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
    function mkP() {
      const c = COLORS[Math.floor(Math.random() * COLORS.length)];
      return { x:Math.random()*W, y:Math.random()*H, r:Math.random()*1.4+0.3, vx:(Math.random()-.5)*.28, vy:(Math.random()-.5)*.28, a:Math.random()*.45+.08, da:(Math.random()-.5)*.003, color:c };
    }
    function init() { resize(); const N=Math.min(Math.floor((W*H)/11000),130); particles=Array.from({length:N},mkP); }
    function draw() {
      ctx.clearRect(0,0,W,H);
      for (const p of particles) {
        p.x+=p.vx; p.y+=p.vy; p.a+=p.da;
        if (p.a<=.05||p.a>=.6) p.da*=-1;
        if (p.x<-5) p.x=W+5; if (p.x>W+5) p.x=-5;
        if (p.y<-5) p.y=H+5; if (p.y>H+5) p.y=-5;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`${p.color}${p.a.toFixed(2)})`; ctx.fill();
      }
      for (let i=0;i<particles.length;i++) for (let j=i+1;j<particles.length;j++) {
        const dx=particles[i].x-particles[j].x, dy=particles[i].y-particles[j].y, d=Math.sqrt(dx*dx+dy*dy);
        if (d<90) { ctx.beginPath(); ctx.moveTo(particles[i].x,particles[i].y); ctx.lineTo(particles[j].x,particles[j].y); ctx.strokeStyle=`rgba(59,130,246,${((1-d/90)*.055).toFixed(3)})`; ctx.lineWidth=.5; ctx.stroke(); }
      }
      rafRef.current=requestAnimationFrame(draw);
    }
    init(); rafRef.current=requestAnimationFrame(draw);
    window.addEventListener("resize",init);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize",init); };
  }, []);
  return <canvas ref={canvasRef} id="particle-canvas" />;
}

const NAV_ITEMS = [
  { to: "/",        label: "Home",           Icon: HomeIcon,    end: true },
  { to: "/schedule",label: "Schedule",       Icon: CalIcon },
  { to: "/groups",  label: "Groups",         Icon: GroupIcon },
  { to: "/bracket", label: "Bracket",        Icon: BracketIcon },
  { to: "/squads",  label: "Squads",         Icon: SquadIcon },
  { to: "/scorers", label: "Top Scorers",    Icon: BootIcon },
  { to: "/admin",   label: "Update Results", Icon: EditIcon },
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

function PageWrap({ children }) {
  const { pathname } = useLocation();
  return <div key={pathname} className="page-enter">{children}</div>;
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
  const { results: fetched, lastUpdated, error } = useResults();
  const [overrides, setOverrides] = useState(() => loadOverrides());
  const results = mergeResults(fetched, overrides);

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
      {/* background — hidden in Apple light theme via CSS */}
      <div className="bg-canvas" aria-hidden="true" />

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
          <ISTClock />
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
        <PageWrap>
          <Routes>
            <Route path="/"         element={<Home results={results} />} />
            <Route path="/schedule" element={<Schedule results={results} />} />
            <Route path="/groups"   element={<Groups results={results} />} />
            <Route path="/bracket"  element={<Bracket results={results} />} />
            <Route path="/squads"   element={<Squads results={results} />} />
            <Route path="/squads/:team" element={<SquadDetail results={results} />} />
            <Route path="/scorers"  element={<TopScorers results={results} />} />
            <Route path="/admin"    element={
              <Admin results={results} overrides={overrides}
                setOverride={setOverride} clearOverride={clearOverride}
                clearAllOverrides={clearAllOverrides} />
            } />
          </Routes>
        </PageWrap>
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
