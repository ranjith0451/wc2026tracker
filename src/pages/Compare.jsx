import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { GROUPS, FLAGS, FLAG_URL } from "../data/teams.js";
import { TEAMS as SQUAD_TEAMS } from "../data/squads.js";
import { WC_FINALS, WC_FINALS_DISPLAY, getWCWins, getWCRunnerUps } from "../data/wcHistory.js";
import { MATCHES } from "../data/matches.js";
import { getGroupStandings } from "../lib/standings.js";
import RadarChart from "../components/RadarChart.jsx";
import Tilt3D from "../components/Tilt3D.jsx";
import FavoriteButton from "../components/FavoriteButton.jsx";
import { staggerContainer, revealUp, revealLeft, revealRight, inViewOnce } from "../lib/motion.js";

const ALL_TEAMS = Object.values(GROUPS).flat().sort();

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function getGroupOfTeam(team) {
  for (const [g, list] of Object.entries(GROUPS)) {
    if (list.includes(team)) return g;
  }
  return null;
}

function getSquad(team) {
  const t = SQUAD_TEAMS.find(x => x.name === team);
  return t?.players || [];
}

function squadStats(players) {
  if (!players?.length) return { size: 0, gks: 0, defs: 0, mids: 0, fwds: 0 };
  const pos = (p) => (p.position || "").toUpperCase();
  return {
    size: players.length,
    gks: players.filter(p => pos(p) === "GK").length,
    defs: players.filter(p => pos(p) === "DF" || pos(p) === "DEF").length,
    mids: players.filter(p => pos(p) === "MF" || pos(p) === "MID").length,
    fwds: players.filter(p => pos(p) === "FW" || pos(p) === "FWD" || pos(p) === "ST").length,
  };
}

function countWCAppearances(team) {
  // Count distinct years team appeared in any final OR runner-up
  const years = new Set();
  WC_FINALS.forEach(f => {
    if (f.winner === team || f.runnerUp === team) years.add(f.year);
  });
  return years.size;
}

/* Compute team's record across last 5 WC tournaments (2006, 2010, 2014, 2018, 2022).
   Returns { w, d, l, goals, played, lastFiveCups } */
const LAST_FIVE_WCS = [2006, 2010, 2014, 2018, 2022];

function recentForm(team, enrichedMatches) {
  if (!team || !enrichedMatches) return null;
  let w = 0, d = 0, l = 0, gf = 0, ga = 0, played = 0;
  const cupsAppeared = new Set();
  for (const m of Object.values(enrichedMatches)) {
    if (!LAST_FIVE_WCS.includes(m.year)) continue;
    if (m.home !== team && m.away !== team) continue;
    played++;
    cupsAppeared.add(m.year);
    const isHome = m.home === team;
    const myScore = isHome ? m.homeScore : m.awayScore;
    const oppScore = isHome ? m.awayScore : m.homeScore;
    gf += myScore || 0;
    ga += oppScore || 0;
    // For knockouts decided on penalties, use penalty result
    if (m.homePenalty != null && m.awayPenalty != null) {
      const myPen = isHome ? m.homePenalty : m.awayPenalty;
      const oppPen = isHome ? m.awayPenalty : m.homePenalty;
      if (myPen > oppPen) w++; else if (myPen < oppPen) l++; else d++;
    } else {
      if (myScore > oppScore) w++; else if (myScore < oppScore) l++; else d++;
    }
  }
  return { w, d, l, gf, ga, played, cupsAppeared: cupsAppeared.size };
}

/* Head-to-head from WC history: filter enriched matches for {teamA, teamB} */
function loadH2H(teamA, teamB, enrichedMatches) {
  if (!teamA || !teamB || !enrichedMatches) return [];
  const out = [];
  for (const m of Object.values(enrichedMatches)) {
    if ((m.home === teamA && m.away === teamB) || (m.home === teamB && m.away === teamA)) {
      out.push(m);
    }
  }
  return out.sort((a, b) => (b.year || 0) - (a.year || 0));
}

function h2hSummary(matches, teamA, teamB) {
  let aw = 0, dr = 0, bw = 0, agf = 0, bgf = 0;
  matches.forEach(m => {
    const aIsHome = m.home === teamA;
    const aScore = aIsHome ? m.homeScore : m.awayScore;
    const bScore = aIsHome ? m.awayScore : m.homeScore;
    agf += aScore || 0;
    bgf += bScore || 0;
    if (aScore > bScore) aw++;
    else if (aScore < bScore) bw++;
    else dr++;
  });
  return { matches: matches.length, aw, dr, bw, agf, bgf };
}

function currentTournamentStats(team, results) {
  const group = getGroupOfTeam(team);
  if (!group) return null;
  const table = getGroupStandings(group, results || {});
  const row = table.rows.find(r => r.team === team);
  if (!row) return null;
  return { ...row, group };
}

/* ── Stat row with bar comparison ──────────────────────────────────────────── */
function StatRow({ label, a, b, format = (v) => v, fmtSuffix = "", invert = false, idx = 0 }) {
  const av = Number(a) || 0;
  const bv = Number(b) || 0;
  const total = av + bv;
  const aPct = total > 0 ? (av / total) * 100 : 50;
  const bPct = total > 0 ? (bv / total) * 100 : 50;
  // who is "winner" (highlighted)? higher value wins by default
  const aWin = invert ? av < bv && av !== bv : av > bv;
  const bWin = invert ? bv < av && av !== bv : bv > av;
  const tie = av === bv;

  return (
    <div className="compare-stat-card" style={{ animationDelay: `${idx * 40}ms` }} data-testid={`compare-stat-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
      <div className="compare-stat-label">{label}</div>
      <div className="compare-stat-row">
        <div className={`compare-stat-val ${aWin && !tie ? "winner" : ""}`}>{format(av)}{fmtSuffix}</div>
        <div className="compare-stat-bar">
          <div className="compare-stat-bar-fill left" style={{ width: `${aPct / 2}%` }} />
          <div className="compare-stat-bar-fill right" style={{ width: `${bPct / 2}%` }} />
          <div className="compare-stat-bar-center" />
        </div>
        <div className={`compare-stat-val ${bWin && !tie ? "winner" : ""}`}>{format(bv)}{fmtSuffix}</div>
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────────── */
export default function Compare({ results = {} }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [teamA, setTeamA] = useState(searchParams.get("a") || "");
  const [teamB, setTeamB] = useState(searchParams.get("b") || "");
  const [enrichedMatches, setEnrichedMatches] = useState(null);
  const [rankings, setRankings] = useState(null);

  // Load enriched WC history + rankings lazily
  useEffect(() => {
    fetch("/data/matches-enriched.json")
      .then(r => r.json())
      .then(d => setEnrichedMatches(d?.matches || {}))
      .catch(() => setEnrichedMatches({}));
    fetch("/data/rankings.json")
      .then(r => r.json())
      .then(d => {
        const map = {};
        (d?.men || []).forEach(t => { map[t.team] = t; });
        setRankings(map);
      })
      .catch(() => setRankings({}));
  }, []);

  // Persist team selection to URL (shareable)
  useEffect(() => {
    const p = {};
    if (teamA) p.a = teamA;
    if (teamB) p.b = teamB;
    setSearchParams(p, { replace: true });
  }, [teamA, teamB, setSearchParams]);

  const dataA = useMemo(() => teamA ? {
    name: teamA,
    flag: FLAG_URL(teamA),
    group: getGroupOfTeam(teamA),
    squad: getSquad(teamA),
    wins: getWCWins(teamA),
    runnerUps: getWCRunnerUps(teamA),
    appearances: countWCAppearances(teamA),
    rank: rankings?.[teamA] || null,
    current: currentTournamentStats(teamA, results),
    form: recentForm(teamA, enrichedMatches),
  } : null, [teamA, rankings, results, enrichedMatches]);

  const dataB = useMemo(() => teamB ? {
    name: teamB,
    flag: FLAG_URL(teamB),
    group: getGroupOfTeam(teamB),
    squad: getSquad(teamB),
    wins: getWCWins(teamB),
    runnerUps: getWCRunnerUps(teamB),
    appearances: countWCAppearances(teamB),
    rank: rankings?.[teamB] || null,
    current: currentTournamentStats(teamB, results),
    form: recentForm(teamB, enrichedMatches),
  } : null, [teamB, rankings, results, enrichedMatches]);

  const h2hMatches = useMemo(
    () => loadH2H(teamA, teamB, enrichedMatches),
    [teamA, teamB, enrichedMatches]
  );
  const h2h = useMemo(() => h2hSummary(h2hMatches, teamA, teamB), [h2hMatches, teamA, teamB]);

  const swap = () => { setTeamA(teamB); setTeamB(teamA); };

  const bothSelected = !!dataA && !!dataB && teamA !== teamB;

  return (
    <div className="compare-page" data-testid="compare-page">
      <div className="compare-hero">
        <div className="compare-hero-eyebrow">Head to Head</div>
        <h1 className="compare-hero-title">Compare Teams</h1>
        <p className="compare-hero-sub">
          Pit any two World Cup nations against each other — FIFA ranking, squad, group form, honours & full match history.
        </p>
      </div>

      {/* Selectors */}
      <motion.div
        className="compare-selectors"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={revealLeft}>
        <Tilt3D max={8} scale={1.02} className={`compare-pick ${dataA ? "filled" : ""}`} data-testid="compare-pick-a" data-tilt-3d>
          {dataA ? (
            <img className="compare-pick-flag" src={dataA.flag} alt={teamA}
              onError={(e) => { e.currentTarget.style.display = "none"; }} />
          ) : (
            <div className="compare-pick-flag placeholder">?</div>
          )}
          <select
            data-testid="compare-select-a"
            value={teamA}
            onChange={(e) => setTeamA(e.target.value)}
          >
            <option value="">Select Team A</option>
            {ALL_TEAMS.map(t => (
              <option key={t} value={t} disabled={t === teamB}>{t}</option>
            ))}
          </select>
          {dataA && (
            <div className="compare-pick-meta">
              {dataA.group} {dataA.rank?.rank ? `· FIFA #${dataA.rank.rank}` : ""}
            </div>
          )}
          {teamA && <FavoriteButton team={teamA} variant="chip" />}
        </Tilt3D>
        </motion.div>

        <motion.button
          variants={revealUp}
          data-testid="compare-swap"
          className="compare-vs"
          onClick={swap}
          whileHover={{ rotate: 180, scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          style={{ cursor: bothSelected ? "pointer" : "default", border: "none", background: "transparent" }}
          title="Swap teams"
        >
          ⇄
        </motion.button>

        <motion.div variants={revealRight}>
        <Tilt3D max={8} scale={1.02} className={`compare-pick ${dataB ? "filled" : ""}`} data-testid="compare-pick-b" data-tilt-3d>
          {dataB ? (
            <img className="compare-pick-flag" src={dataB.flag} alt={teamB}
              onError={(e) => { e.currentTarget.style.display = "none"; }} />
          ) : (
            <div className="compare-pick-flag placeholder">?</div>
          )}
          <select
            data-testid="compare-select-b"
            value={teamB}
            onChange={(e) => setTeamB(e.target.value)}
          >
            <option value="">Select Team B</option>
            {ALL_TEAMS.map(t => (
              <option key={t} value={t} disabled={t === teamA}>{t}</option>
            ))}
          </select>
          {dataB && (
            <div className="compare-pick-meta">
              {dataB.group} {dataB.rank?.rank ? `· FIFA #${dataB.rank.rank}` : ""}
            </div>
          )}
          {teamB && <FavoriteButton team={teamB} variant="chip" />}
        </Tilt3D>
        </motion.div>
      </motion.div>

      {!bothSelected && (
        <div className="compare-empty" data-testid="compare-empty">
          <div className="compare-empty-icon">⚖</div>
          <div>Select two teams above to start comparing.</div>
        </div>
      )}

      {bothSelected && (
        <>
          {/* FIFA Stats — uses --blue/accent ad bars */}
          <div className="compare-stats" data-testid="compare-stats">
            {(() => {
              const sa = squadStats(dataA.squad);
              const sb = squadStats(dataB.squad);
              const ca = dataA.current || {};
              const cb = dataB.current || {};
              const ra = dataA.rank?.points || 0;
              const rb = dataB.rank?.points || 0;
              const rankA = dataA.rank?.rank || 999;
              const rankB = dataB.rank?.rank || 999;
              return (
                <>
                  {(rankA !== 999 || rankB !== 999) && (
                    <StatRow label="FIFA World Rank" a={rankA === 999 ? 0 : rankA} b={rankB === 999 ? 0 : rankB} invert idx={0} />
                  )}
                  {(ra || rb) > 0 && (
                    <StatRow label="FIFA Points" a={ra} b={rb} format={(v) => Math.round(v)} idx={1} />
                  )}
                  <StatRow label="World Cup Titles" a={dataA.wins.length} b={dataB.wins.length} idx={2} />
                  <StatRow label="Final Appearances" a={dataA.appearances} b={dataB.appearances} idx={3} />
                  {(sa.size > 0 || sb.size > 0) && (
                    <>
                      <StatRow label="Squad Size" a={sa.size} b={sb.size} idx={4} />
                      <StatRow label="Forwards" a={sa.fwds} b={sb.fwds} idx={5} />
                      <StatRow label="Midfielders" a={sa.mids} b={sb.mids} idx={6} />
                      <StatRow label="Defenders" a={sa.defs} b={sb.defs} idx={7} />
                    </>
                  )}
                  {/* Current tournament — only if both have played at least 1 group game */}
                  {((ca.played || 0) > 0 || (cb.played || 0) > 0) && (
                    <>
                      <StatRow label="WC 2026 Points" a={ca.pts || 0} b={cb.pts || 0} idx={8} />
                      <StatRow label="WC 2026 Goals For" a={ca.gf || 0} b={cb.gf || 0} idx={9} />
                      <StatRow label="WC 2026 Goal Diff" a={ca.gd || 0} b={cb.gd || 0} idx={10} />
                    </>
                  )}
                </>
              );
            })()}
          </div>

          {/* Radar visual comparison */}
          {(() => {
            const sa = squadStats(dataA.squad);
            const sb = squadStats(dataB.squad);
            const fa = dataA.form || { w:0, d:0, l:0, gf:0, played:0 };
            const fb = dataB.form || { w:0, d:0, l:0, gf:0, played:0 };
            const formScoreA = fa.played > 0 ? Math.round(((fa.w * 3 + fa.d) / (fa.played * 3)) * 100) : 0;
            const formScoreB = fb.played > 0 ? Math.round(((fb.w * 3 + fb.d) / (fb.played * 3)) * 100) : 0;
            const axes = [
              { key: "fifa",     label: "FIFA Pts",  max: 2000 },
              { key: "titles",   label: "Titles",    max: 5 },
              { key: "finals",   label: "Finals",    max: 10 },
              { key: "form",     label: "Form (last 5 WCs)", max: 100 },
              { key: "goals",    label: "WC Goals",  max: Math.max(fa.gf, fb.gf, 5) },
              { key: "squad",    label: "Squad FW",  max: Math.max(sa.fwds, sb.fwds, 5) },
            ];
            const accentA = "var(--accent, #2563eb)";
            const accentB = "#fb7185"; // contrast pink
            return (
              <section className="compare-radar-wrap" data-testid="compare-radar-section">
                <h2 className="compare-section-title">Visual Snapshot</h2>
                <div className="compare-radar-card">
                  <RadarChart
                    axes={axes}
                    teamA={{
                      name: teamA, color: accentA,
                      values: {
                        fifa: dataA.rank?.points || 0,
                        titles: dataA.wins.length,
                        finals: dataA.appearances,
                        form: formScoreA,
                        goals: fa.gf,
                        squad: sa.fwds,
                      },
                    }}
                    teamB={{
                      name: teamB, color: accentB,
                      values: {
                        fifa: dataB.rank?.points || 0,
                        titles: dataB.wins.length,
                        finals: dataB.appearances,
                        form: formScoreB,
                        goals: fb.gf,
                        squad: sb.fwds,
                      },
                    }}
                  />
                </div>
              </section>
            );
          })()}

          {/* Recent form (last 5 WCs) */}
          {(dataA.form?.played > 0 || dataB.form?.played > 0) && (
            <section className="compare-form" data-testid="compare-recent-form">
              <h2 className="compare-section-title">Recent Form · Last 5 World Cups</h2>
              <div className="compare-form-grid">
                {[dataA, dataB].map((d, idx) => {
                  const f = d.form || { w:0, d:0, l:0, gf:0, ga:0, played:0, cupsAppeared:0 };
                  const pts = f.w * 3 + f.d;
                  const total = Math.max(1, (f.w + f.d + f.l) * 3);
                  return (
                    <div key={idx} className="compare-form-card" data-testid={`compare-form-${idx === 0 ? "a" : "b"}`}>
                      <div className="compare-honour-team">
                        <img src={d.flag} alt={d.name} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                        <div className="compare-honour-team-name">{d.name}</div>
                      </div>
                      <div className="compare-form-stats">
                        <div className="cfs-cell w"><b>{f.w}</b><i>Wins</i></div>
                        <div className="cfs-cell d"><b>{f.d}</b><i>Draws</i></div>
                        <div className="cfs-cell l"><b>{f.l}</b><i>Losses</i></div>
                      </div>
                      <div className="compare-form-meta">
                        <span><b>{f.gf}</b> Goals For</span>
                        <span><b>{f.ga}</b> Goals Against</span>
                        <span><b>{f.cupsAppeared}/5</b> Cups</span>
                      </div>
                      <div className="compare-form-bar">
                        <div className="cfb-fill" style={{ width: `${Math.round((pts / total) * 100)}%` }} />
                      </div>
                      <div className="compare-form-pts">{pts} pts · {f.played} matches</div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Honours */}
          <section className="compare-honours" data-testid="compare-honours">
            <h2 className="compare-section-title">Honours</h2>
            <div className="compare-honours-grid">
              {[dataA, dataB].map((d, i) => (
                <div key={i} className="compare-honour-card" data-testid={`compare-honour-${i === 0 ? "a" : "b"}`}>
                  <div className="compare-honour-team">
                    <img src={d.flag} alt={d.name} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    <div className="compare-honour-team-name">{d.name}</div>
                  </div>
                  <div className="compare-honour-row">
                    <span className="compare-honour-key">Titles</span>
                    <span className="compare-honour-val">{d.wins.length || "—"}</span>
                  </div>
                  <div className="compare-honour-row">
                    <span className="compare-honour-key">Won in</span>
                    <span className="compare-honour-val" style={{ fontSize: 13, fontFamily: "var(--font-text)" }}>
                      {d.wins.length ? d.wins.join(", ") : "—"}
                    </span>
                  </div>
                  <div className="compare-honour-row">
                    <span className="compare-honour-key">Runner-ups</span>
                    <span className="compare-honour-val">{d.runnerUps.length || "—"}</span>
                  </div>
                  <div className="compare-honour-row">
                    <span className="compare-honour-key">Final years</span>
                    <span className="compare-honour-val" style={{ fontSize: 13, fontFamily: "var(--font-text)" }}>
                      {d.runnerUps.length ? d.runnerUps.join(", ") : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Head-to-Head */}
          <section className="compare-h2h" data-testid="compare-h2h">
            <h2 className="compare-section-title">Head-to-Head (World Cup history)</h2>

            {h2hMatches.length === 0 ? (
              <div className="compare-empty">
                <div className="compare-empty-icon">🤝</div>
                <div>{teamA} and {teamB} have never met in the FIFA World Cup.</div>
              </div>
            ) : (
              <>
                <div className="compare-h2h-summary">
                  <div className="compare-h2h-stat">
                    <div className="compare-h2h-stat-num">{h2h.aw}</div>
                    <div className="compare-h2h-stat-label">{teamA} wins</div>
                  </div>
                  <div className="compare-h2h-stat">
                    <div className="compare-h2h-stat-num">{h2h.dr}</div>
                    <div className="compare-h2h-stat-label">Draws</div>
                  </div>
                  <div className="compare-h2h-stat">
                    <div className="compare-h2h-stat-num">{h2h.bw}</div>
                    <div className="compare-h2h-stat-label">{teamB} wins</div>
                  </div>
                </div>

                <div className="compare-h2h-list">
                  {h2hMatches.map((m, i) => {
                    const aIsHome = m.home === teamA;
                    const aScore = aIsHome ? m.homeScore : m.awayScore;
                    const bScore = aIsHome ? m.awayScore : m.homeScore;
                    const aWin = aScore > bScore;
                    const bWin = bScore > aScore;
                    return (
                      <div key={i} className="compare-h2h-match" data-testid={`compare-h2h-match-${i}`}>
                        <div className="compare-h2h-year">{m.year}</div>
                        <div className={`compare-h2h-team ${aWin ? "winner" : ""}`}>{teamA}</div>
                        <div className="compare-h2h-score">{aScore}–{bScore}</div>
                        <div className={`compare-h2h-team right ${bWin ? "winner" : ""}`}>{teamB}</div>
                        <div className="compare-h2h-round">{m.round || ""}{m.aet ? " · AET" : ""}{m.homePenalty != null ? ` · Pen ${m.homePenalty}–${m.awayPenalty}` : ""}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
