import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MATCHES } from "../data/matches.js";
import { GROUPS } from "../data/teams.js";
import MatchCard from "../components/MatchCard.jsx";
import MatchDayToday from "../components/MatchDayToday.jsx";
import MyTeams from "../components/MyTeams.jsx";
import TeamFlag from "../components/TeamFlag.jsx";
import Tilt3D from "../components/Tilt3D.jsx";
import CountUp from "../components/CountUp.jsx";
import { getMatchStatus } from "../lib/time.js";
import { getTeamGoalCounts } from "../lib/topscorers.js";
import { getGroupStandings } from "../lib/standings.js";
import { useTopScorers } from "../lib/useStats.js";
import { useMatchEvents, useMatchStats } from "../lib/useStats.js";
import { staggerContainer, revealUp, revealLeft, inViewOnce } from "../lib/motion.js";
import Trophy3D from "../components/Trophy3D.jsx";

const MEDALS = ["🥇","🥈","🥉"];

function SvgIcon({ d, size=13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/* Stat card with icon + color variant + 3D tilt + count-up */
function StatCard({ num, lbl, color, icon, delay }) {
  return (
    <Tilt3D max={10} scale={1.04} className={`stat-card ${color} s${delay}`} data-tilt-3d>
      <div className="stat-card-beam" />
      <div className="stat-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <div className="stat-num number-anim"><CountUp to={Number(num) || 0} /></div>
      <div className="stat-lbl">{lbl}</div>
    </Tilt3D>
  );
}

/* Mini group standings — top 2 per group shown inline */
function GroupStandingsWidget({ results }) {
  const groupKeys = Object.keys(GROUPS).slice(0, 12);

  return (
    <div className="home-groups-grid">
      {groupKeys.map(gk => {
        const { rows } = getGroupStandings(gk, results);
        if (rows.every(r => r.played === 0)) return null;
        return (
          <Link to="/groups" key={gk} className="home-group-card">
            <div className="hgc-head">{gk}</div>
            {rows.slice(0, 4).map((r, i) => (
              <div key={r.team} className={`hgc-row${i < 2 ? " qualify" : ""}`}>
                <span className="hgc-pos">{i + 1}</span>
                <TeamFlag team={r.team} />
                <span className="hgc-name">{r.team}</span>
                <span className="hgc-pts">{r.pts}</span>
              </div>
            ))}
          </Link>
        );
      })}
    </div>
  );
}

function LiveSummaryCard({ match, result, statsMatchId }) {
  const { data: eventsData, refetch: refetchEvents, isFetching: eventsFetching } = useMatchEvents(statsMatchId, {
    live: false,
    intervalMs: false,
    enabled: false,
  });
  const { data: statsData, refetch: refetchStats, isFetching: statsFetching } = useMatchStats(statsMatchId, {
    live: false,
    intervalMs: false,
    enabled: false,
  });

  const isFetching = eventsFetching || statsFetching;

  async function refreshSummary() {
    await Promise.all([refetchEvents(), refetchStats()]);
  }

  const summary = useMemo(() => {
    const evList = eventsData?.events || eventsData?.data?.events || [];
    if (!Array.isArray(evList) || evList.length === 0) {
      return { goals: [], cards: [], subsHome: 0, subsAway: 0 };
    }
    const goals = [];
    const cards = [];
    let summarySubsHome = 0;
    let summarySubsAway = 0;
    for (const ev of evList) {
      const minute = (ev.minute || 0) + (ev.extra_time || 0);
      const name = ev.player?.name || ev.player_name || "Unknown";
      const team = ev.team?.name || ev.team_name || "";
      const pid = ev.player?.id || ev.player_id || null;
      const et = (ev.type || ev.event_type || "").toLowerCase();
      if (et === "goal" || et === "penalty_goal" || et === "own_goal") {
        goals.push({ name, team, minute, pid, penalty: et === "penalty_goal", ownGoal: et === "own_goal" });
      }
      if (et === "yellow_card" || et === "red_card" || et === "double_yellow") {
        cards.push({ name, team, minute, pid, red: et !== "yellow_card" });
      }
      if (et === "substitution" || et === "sub") {
        const t = team || "";
        if (t && t === match.home.name) summarySubsHome++;
        else if (t && t === match.away.name) summarySubsAway++;
      }
    }
    return {
      goals: goals.slice(-4).reverse(),
      cards: cards.slice(-3).reverse(),
      subsHome: summarySubsHome,
      subsAway: summarySubsAway,
    };
  }, [eventsData, match.home.name, match.away.name]);

  const statSummary = useMemo(() => {
    const s = statsData || {};
    return {
      corners: { home: s.homeCorners ?? null, away: s.awayCorners ?? null },
      goalKicks: { home: s.homeGoalKicks ?? null, away: s.awayGoalKicks ?? null },
      yellowCards: { home: s.homeYC ?? null, away: s.awayYC ?? null },
      redCards: { home: s.homeRC ?? null, away: s.awayRC ?? null },
      substitutions: {
        home: summary.subsHome ?? null,
        away: summary.subsAway ?? null,
      },
      halftime: result?.halftime
        ? `${result.halftime.home}-${result.halftime.away}`
        : "—",
      fulltime: `${result?.homeScore ?? 0}-${result?.awayScore ?? 0}`,
    };
  }, [statsData, summary, result]);

  const metricRows = [
    { key: "corners", label: "Corners", value: `${statSummary.corners.home ?? "—"} - ${statSummary.corners.away ?? "—"}`, tone: "blue" },
    { key: "goal-kicks", label: "Goal Kicks", value: `${statSummary.goalKicks.home ?? "—"} - ${statSummary.goalKicks.away ?? "—"}`, tone: "cyan" },
    { key: "subs", label: "Substitutions", value: `${statSummary.substitutions.home ?? "—"} - ${statSummary.substitutions.away ?? "—"}`, tone: "green" },
    { key: "yellow", label: "Yellow Cards", value: `${statSummary.yellowCards.home ?? "—"} - ${statSummary.yellowCards.away ?? "—"}`, tone: "yellow" },
    { key: "red", label: "Red Cards", value: `${statSummary.redCards.home ?? "—"} - ${statSummary.redCards.away ?? "—"}`, tone: "red" },
    { key: "ht", label: "Half Time", value: statSummary.halftime, tone: "purple" },
    { key: "ft", label: "Full Time / Live", value: statSummary.fulltime, tone: "orange" },
  ];

  return (
    <div className="home-live-summary-card" data-testid={`home-live-summary-${match.id}`}>
      <div className="home-live-summary-head">
        <Link
          to={`/match/${match.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="home-live-summary-title"
          data-testid={`home-live-summary-match-link-${match.id}`}
        >
          {match.home.name} {result?.homeScore ?? 0} – {result?.awayScore ?? 0} {match.away.name}
        </Link>
        <div className="home-live-summary-actions">
          <span className="home-live-summary-status">{result?.statusShort || "LIVE"}</span>
          <button
            className="home-live-refresh-btn"
            type="button"
            onClick={refreshSummary}
            disabled={isFetching}
            data-testid={`home-live-summary-refresh-${match.id}`}
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="home-live-summary-body">
        {summary.goals.length > 0 ? (
          <div className="home-live-summary-block">
            <div className="home-live-summary-label">Goals</div>
            {summary.goals.map((g, i) => (
              <div key={`g-${i}`} className="home-live-summary-row">
                <Link
                  to={`/player/${encodeURIComponent(g.team)}/${encodeURIComponent(g.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="home-live-player-link"
                  data-testid={`home-live-player-link-goal-${match.id}-${i}`}
                >
                  {g.name}
                </Link>
                <span className="home-live-summary-meta">
                  {g.minute}' {g.penalty ? "· Pen" : g.ownGoal ? "· OG" : ""}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="home-live-summary-empty">No goals yet.</div>
        )}

        {summary.cards.length > 0 && (
          <div className="home-live-summary-block">
            <div className="home-live-summary-label">Cards</div>
            {summary.cards.map((c, i) => (
              <div key={`c-${i}`} className="home-live-summary-row">
                <Link
                  to={`/player/${encodeURIComponent(c.team)}/${encodeURIComponent(c.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="home-live-player-link"
                  data-testid={`home-live-player-link-card-${match.id}-${i}`}
                >
                  {c.name}
                </Link>
                <span className="home-live-summary-meta">
                  {c.minute}' {c.red ? "· Red" : "· Yellow"}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="home-live-summary-block" data-testid={`home-live-metrics-${match.id}`}>
          <div className="home-live-summary-label">Live Match Metrics</div>
          <div className="home-live-metrics-grid">
            {metricRows.map((m) => (
              <div className={`home-live-metric-item tone-${m.tone}`} key={m.key} data-testid={`home-live-metric-${match.id}-${m.key}`}>
                <span>{m.label}</span>
                <b>{m.value}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home({ results, statsMatchIdMap = {} }) {
  const withStatus = MATCHES.map(m => ({ m, status: getMatchStatus(m, results) }));
  const live     = withStatus.filter(x => x.status === "live");
  const finished = withStatus.filter(x => x.status === "finished");
  const upcoming = withStatus
    .filter(x => x.status === "scheduled")
    .sort((a, b) => new Date(a.m.isoIST) - new Date(b.m.isoIST))
    .slice(0, 5);

  const totalGoals = withStatus.reduce((sum, x) => {
    if ((x.status === "finished" || x.status === "live") && x.m.home?.type === "team" && x.m.away?.type === "team") {
      const r = results[x.m.id];
      return sum + (Number(r?.homeScore) || 0) + (Number(r?.awayScore) || 0);
    }
    return sum;
  }, 0);
  const { data: liveScorersData } = useTopScorers();
  const topScorers = (liveScorersData?.scorers || []).slice(0, 3);

  return (
    <div>
      {/* ══════════ HERO ══════════ */}
      <div className="hero">
        <div className="hero-bg" />
        <div className="hero-ring hero-ring-1">
          <div className="hero-orbit-dot" />
        </div>
        <div className="hero-ring hero-ring-2" />

        {/* 3D Floating World Cup Trophy */}
        <div className="hero-trophy-stage" aria-hidden>
          <Trophy3D />
        </div>

        <motion.div
          className="hero-content"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={revealUp} className="hero-eyebrow">
            <span className="hero-eyebrow-dot" />
            Live Tracker · IST
          </motion.div>

          <motion.h1 variants={revealUp}>
            <span className="hero-title-wc">FIFA World Cup</span>
            <span className="hero-title-year">2026</span>
          </motion.h1>

          <motion.p variants={revealUp} className="hero-desc">
            <strong>48 nations</strong> · 12 groups · <strong>104 matches</strong> across
            USA, Mexico &amp; Canada. Every kickoff shown in <strong>IST</strong>.
          </motion.p>

          <motion.div variants={revealUp} className="hero-actions">
            {live.length > 0 ? (
              <Link to={`/match/${live[0].m.id}`} className="live-pill" style={{ textDecoration:"none", cursor:"pointer" }}>
                <span className="live-dot" />
                {live.length} match{live.length > 1 ? "es" : ""} live now
              </Link>
            ) : upcoming.length > 0 ? (
              <Link to={`/match/${upcoming[0].m.id}`} className="live-pill" style={{ background:"rgba(37,99,235,.1)", borderColor:"rgba(37,99,235,.3)", color:"var(--blue-bright)", boxShadow:"none", animation:"none", textDecoration:"none", cursor:"pointer" }}>
                <span style={{ width:6, height:6, background:"var(--blue-bright)", borderRadius:"50%", boxShadow:"0 0 6px var(--blue-bright)" }} />
                Next match coming up
              </Link>
            ) : (
              <span className="live-pill" style={{ background:"rgba(37,99,235,.1)", borderColor:"rgba(37,99,235,.3)", color:"var(--blue-bright)", boxShadow:"none", animation:"none" }}>
                <span style={{ width:6, height:6, background:"var(--blue-bright)", borderRadius:"50%", boxShadow:"0 0 6px var(--blue-bright)" }} />
                Tournament ongoing
              </span>
            )}
            <Link to="/schedule" className="quick-link" style={{ borderRadius:999, fontSize:11, padding:"6px 16px" }}>
              <SvgIcon d="M8 2v3m8-3v3M3 8h18M5 3h14a2 2 0 012 2v15a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
              Full Schedule
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* ══════════ MATCH DAY TODAY WIDGET ══════════ */}
      <MatchDayToday results={results} />

      {/* ══════════ MY TEAMS (followed) ══════════ */}
      <MyTeams results={results} />

      {/* ══════════ STATS GRID ══════════ */}
      <motion.div
        className="stats-grid"
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
      >
        <motion.div variants={revealUp}><StatCard delay={1} color="blue"  num={MATCHES.length}  lbl="Total Matches" icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></motion.div>
        <motion.div variants={revealUp}><StatCard delay={2} color="green" num={finished.length} lbl="Matches Played" icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></motion.div>
        <motion.div variants={revealUp}><StatCard delay={3} color="red"   num={live.length}     lbl="Live Now"       icon="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></motion.div>
        <motion.div variants={revealUp}><StatCard delay={4} color="gold"  num={totalGoals}      lbl="Goals Scored"  icon="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" /></motion.div>
      </motion.div>

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

          <div className="home-live-summary-grid" data-testid="home-live-summary-grid">
            {live.map(({ m }) => (
              <LiveSummaryCard
                key={`summary-${m.id}`}
                match={m}
                result={results[m.id]}
                statsMatchId={results[m.id]?.statsMatchId || statsMatchIdMap[`${m.home.name}|${m.away.name}`]}
              />
            ))}
          </div>
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
                <Link
                  to={`/scorers/${encodeURIComponent(s.team)}/${encodeURIComponent(s.player)}`}
                  className="scorer-goals"
                  data-testid={`home-scorer-goals-link-${i}`}
                  title="Open goal-by-goal breakdown"
                >
                  {s.goals}
                </Link>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ══════════ GROUP STANDINGS WIDGET ══════════ */}
      {finished.length > 0 && (
        <>
          <div className="sec-head" style={{ marginTop: 36 }}>
            <span className="sec-title">Group Standings</span>
            <Link to="/groups" className="sec-count" style={{ color: "var(--blue-bright)", cursor: "pointer", fontWeight: 700 }}>
              all groups →
            </Link>
            <div className="sec-line" />
          </div>
          <GroupStandingsWidget results={results} />
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
