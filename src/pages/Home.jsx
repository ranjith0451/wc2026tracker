import { Link } from "react-router-dom";
import { MATCHES } from "../data/matches.js";
import MatchCard from "../components/MatchCard.jsx";
import { getMatchStatus } from "../lib/time.js";
import { getTopScorers, getTeamGoalCounts } from "../lib/topscorers.js";
import TeamFlag from "../components/TeamFlag.jsx";

const MEDALS = ["🥇","🥈","🥉"];

function SvgIcon({ d, size=13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/* Stat card with icon + color variant */
function StatCard({ num, lbl, color, icon, delay }) {
  return (
    <div className={`stat-card ${color} s${delay}`}>
      <div className="stat-card-beam" />
      <div className="stat-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <div className="stat-num">{num}</div>
      <div className="stat-lbl">{lbl}</div>
    </div>
  );
}

export default function Home({ results }) {
  const withStatus = MATCHES.map(m => ({ m, status: getMatchStatus(m, results) }));
  const live     = withStatus.filter(x => x.status === "live");
  const finished = withStatus.filter(x => x.status === "finished");
  const upcoming = withStatus
    .filter(x => x.status === "scheduled")
    .sort((a, b) => new Date(a.m.isoIST) - new Date(b.m.isoIST))
    .slice(0, 5);

  const totalGoals = Object.values(getTeamGoalCounts(results)).reduce((a, b) => a + b, 0);
  const topScorers = getTopScorers(results).slice(0, 3);

  return (
    <div>
      {/* ══════════ HERO ══════════ */}
      <div className="hero">
        <div className="hero-bg" />
        <div className="hero-ring hero-ring-1">
          <div className="hero-orbit-dot" />
        </div>
        <div className="hero-ring hero-ring-2" />

        <div className="hero-content">
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-dot" />
            Live Tracker · IST
          </div>

          <h1>
            <span className="hero-title-wc">FIFA World Cup</span>
            <span className="hero-title-year">2026</span>
          </h1>

          <p className="hero-desc">
            <strong>48 nations</strong> · 12 groups · <strong>104 matches</strong> across
            USA, Mexico &amp; Canada. Every kickoff shown in <strong>IST</strong>.
          </p>

          <div className="hero-actions">
            {live.length > 0 ? (
              <span className="live-pill">
                <span className="live-dot" />
                {live.length} match{live.length > 1 ? "es" : ""} live now
              </span>
            ) : (
              <span className="live-pill" style={{ background:"rgba(37,99,235,.1)", borderColor:"rgba(37,99,235,.3)", color:"var(--blue-bright)", boxShadow:"none", animation:"none" }}>
                <span style={{ width:6, height:6, background:"var(--blue-bright)", borderRadius:"50%", boxShadow:"0 0 6px var(--blue-bright)" }} />
                {upcoming.length > 0 ? "Next match coming up" : "Tournament ongoing"}
              </span>
            )}
            <Link to="/schedule" className="quick-link" style={{ borderRadius:999, fontSize:11, padding:"6px 16px" }}>
              <SvgIcon d="M8 2v3m8-3v3M3 8h18M5 3h14a2 2 0 012 2v15a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
              Full Schedule
            </Link>
          </div>
        </div>
      </div>

      {/* ══════════ STATS GRID ══════════ */}
      <div className="stats-grid">
        <StatCard delay={1} color="blue"  num={MATCHES.length}  lbl="Total Matches" icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        <StatCard delay={2} color="green" num={finished.length} lbl="Matches Played" icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        <StatCard delay={3} color="red"   num={live.length}     lbl="Live Now"       icon="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        <StatCard delay={4} color="gold"  num={totalGoals}      lbl="Goals Scored"  icon="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
      </div>

      {/* ══════════ LIVE NOW ══════════ */}
      {live.length > 0 && (
        <>
          <div className="sec-head">
            <span className="live-dot" style={{ flexShrink:0 }} />
            <span className="sec-title" style={{ color:"var(--red-bright)" }}>Live Now</span>
            <span className="sec-count" style={{ color:"var(--red-bright)", opacity:.7 }}>· {live.length} in progress</span>
            <div className="sec-line" style={{ background:"linear-gradient(90deg,rgba(239,68,68,.4),transparent)" }} />
          </div>
          {live.map(({ m }) => <MatchCard key={m.id} match={m} results={results} />)}
        </>
      )}

      {/* ══════════ UP NEXT ══════════ */}
      <div className="sec-head">
        <span className="sec-title">Up Next</span>
        <span className="sec-count">· next {upcoming.length} fixtures</span>
        <div className="sec-line" />
      </div>
      {upcoming.length === 0 ? (
        <div className="empty-state">
          <div className="es-icon">🏆</div>
          <div className="es-text">Tournament complete!</div>
          <div className="es-sub">All 104 matches have been played. Check the bracket for results.</div>
        </div>
      ) : (
        upcoming.map(({ m }) => <MatchCard key={m.id} match={m} results={results} />)
      )}

      {/* ══════════ GOLDEN BOOT ══════════ */}
      {topScorers.length > 0 && (
        <>
          <div className="sec-head" style={{ marginTop:36 }}>
            <span className="sec-title">Golden Boot Race</span>
            <Link to="/scorers" className="sec-count" style={{ color:"var(--gold-bright)", cursor:"pointer", fontWeight:700 }}>view all →</Link>
            <div className="sec-line" style={{ background:"linear-gradient(90deg,rgba(245,158,11,.35),transparent)" }} />
          </div>
          <div className="scorers-card">
            {topScorers.map((s, i) => (
              <div className="scorer-row" key={`${s.team}|${s.player}`}>
                <div className={`scorer-rank${i < 3 ? ` r${i+1}` : ""}`}>{MEDALS[i] ?? i+1}</div>
                <div className="scorer-info">
                  <div className="scorer-name">{s.player}</div>
                  <div className="scorer-team">
                    <TeamFlag team={s.team} />
                    {s.team} · {s.matches} match{s.matches !== 1 ? "es" : ""}
                    {s.penalties > 0 && ` · ${s.penalties} pen.`}
                  </div>
                </div>
                <div className="scorer-goals">{s.goals}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ══════════ QUICK LINKS ══════════ */}
      <div className="sec-head" style={{ marginTop:36 }}>
        <span className="sec-title">Explore</span>
        <div className="sec-line" />
      </div>
      <div className="quick-links">
        <Link to="/schedule" className="quick-link">
          <SvgIcon d="M8 2v3m8-3v3M3 8h18M5 3h14a2 2 0 012 2v15a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
          Full Schedule
        </Link>
        <Link to="/groups" className="quick-link">
          <SvgIcon d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4.13a4 4 0 11-8 0 4 4 0 018 0z" />
          Group Standings
        </Link>
        <Link to="/bracket" className="quick-link">
          <SvgIcon d="M3 6h3v4H3m0-4v10m3-6h3m0 0v-4m0 4v4m3-4h3m3 0V6m0 10v-4m-3 4h3" />
          Knockout Bracket
        </Link>
        <Link to="/squads" className="quick-link">
          <SvgIcon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          Squads &amp; Players
        </Link>
      </div>
    </div>
  );
}
