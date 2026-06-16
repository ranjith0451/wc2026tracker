// Advanced match statistics panel — rendered below MatchCard when expanded.
// All visualizations are pure SVG/CSS (no external chart library).
import { useMemo } from "react";

/* ── Dual stat bar ── */
function StatBar({ label, homeVal, awayVal, accent = false, format = v => v }) {
  const total = (homeVal || 0) + (awayVal || 0);
  const homePct = total ? Math.round(((homeVal || 0) / total) * 100) : 50;
  const awayPct = 100 - homePct;
  return (
    <div className="ms-bar-row">
      <span className="ms-bar-val home">{format(homeVal ?? "—")}</span>
      <div className="ms-bar-wrap">
        <div className="ms-bar-label">{label}</div>
        <div className="ms-bar-track">
          <div
            className={`ms-bar-fill home${accent ? " accent" : ""}`}
            style={{ width: `${homePct}%` }}
          />
          <div
            className={`ms-bar-fill away${accent ? " accent" : ""}`}
            style={{ width: `${awayPct}%` }}
          />
        </div>
      </div>
      <span className="ms-bar-val away">{format(awayVal ?? "—")}</span>
    </div>
  );
}

/* ── Possession donut ── */
function PossDonut({ homePoss, homeTeam, awayTeam }) {
  const hp = Math.min(100, Math.max(0, homePoss ?? 50));
  const ap = 100 - hp;
  const r = 44, cx = 56, cy = 56, stroke = 10;
  const circ = 2 * Math.PI * r;
  const homeDash = (hp / 100) * circ;
  const awayDash = circ - homeDash;

  return (
    <div className="ms-donut-wrap">
      <svg width="112" height="112" viewBox="0 0 112 112">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2563eb" strokeWidth={stroke}
          strokeDasharray={`${homeDash} ${awayDash}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)" }}
        />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#06b6d4" strokeWidth={stroke}
          strokeDasharray={`${awayDash} ${homeDash}`}
          strokeDashoffset={-(homeDash - circ / 4)}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)" }}
        />
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">{hp}%</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="8">Possession</text>
      </svg>
      <div className="ms-donut-legend">
        <span className="ms-legend-dot home" /><span className="ms-legend-txt">{homeTeam}</span>
        <span className="ms-legend-dot away" /><span className="ms-legend-txt">{awayTeam}</span>
      </div>
    </div>
  );
}

/* ── xG Gauge ── */
function XGGauge({ homeXG, awayXG, homeScore, awayScore, homeTeam, awayTeam }) {
  const max = Math.max(3, (homeXG || 0) + 0.5, (awayXG || 0) + 0.5);
  const hPct = ((homeXG || 0) / max) * 100;
  const aPct = ((awayXG || 0) / max) * 100;
  return (
    <div className="ms-xg-wrap">
      <div className="ms-xg-title">Expected Goals (xG)</div>
      <div className="ms-xg-row">
        <div className="ms-xg-team-col">
          <span className="ms-xg-tname">{homeTeam}</span>
          <div className="ms-xg-bar-track">
            <div className="ms-xg-bar-fill home" style={{ width: `${hPct}%` }} />
          </div>
          <div className="ms-xg-nums">
            <span className="ms-xg-val">{homeXG?.toFixed(2) ?? "—"}</span>
            <span className="ms-xg-score">({homeScore} scored)</span>
          </div>
        </div>
        <div className="ms-xg-divider" />
        <div className="ms-xg-team-col away">
          <span className="ms-xg-tname">{awayTeam}</span>
          <div className="ms-xg-bar-track away">
            <div className="ms-xg-bar-fill away" style={{ width: `${aPct}%` }} />
          </div>
          <div className="ms-xg-nums">
            <span className="ms-xg-val">{awayXG?.toFixed(2) ?? "—"}</span>
            <span className="ms-xg-score">({awayScore} scored)</span>
          </div>
        </div>
      </div>
      {homeXG != null && awayXG != null && (
        <div className="ms-xg-verdict">
          {Math.abs(homeXG - awayXG) < 0.3
            ? "Even contest — both teams created similar quality chances"
            : homeXG > awayXG
              ? `${homeTeam} created ${(homeXG - awayXG).toFixed(2)} more expected goals`
              : `${awayTeam} created ${(awayXG - homeXG).toFixed(2)} more expected goals`}
        </div>
      )}
    </div>
  );
}

/* ── Shot map (pitch view with dots) ── */
function ShotMap({ homeShots, homeShotsOT, awayShots, awayShotsOT, homeTeam, awayTeam, matchId }) {
  // Deterministic "random" positions seeded by matchId so they're stable
  const shots = useMemo(() => {
    const out = [];
    let seed = matchId * 7919;
    function rand() { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed >>> 0) / 0xFFFFFFFF; }
    // home shots (left half — attacking right)
    for (let i = 0; i < (homeShots || 0); i++) {
      const onTarget = i < (homeShotsOT || 0);
      out.push({ x: 55 + rand() * 40, y: 10 + rand() * 80, team: "home", onTarget });
    }
    // away shots (right half — attacking left)
    for (let i = 0; i < (awayShots || 0); i++) {
      const onTarget = i < (awayShotsOT || 0);
      out.push({ x: 5 + rand() * 40, y: 10 + rand() * 80, team: "away", onTarget });
    }
    return out;
  }, [matchId, homeShots, homeShotsOT, awayShots, awayShotsOT]);

  return (
    <div className="ms-shotmap-wrap">
      <div className="ms-shotmap-title">Shot Map</div>
      <svg viewBox="0 0 100 100" className="ms-pitch">
        {/* Pitch outline */}
        <rect x="1" y="1" width="98" height="98" fill="rgba(16,185,129,0.07)" rx="2" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
        {/* Centre line */}
        <line x1="50" y1="1" x2="50" y2="99" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
        {/* Centre circle */}
        <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.5" />
        {/* Goal boxes */}
        <rect x="1" y="30" width="16" height="40" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
        <rect x="83" y="30" width="16" height="40" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
        {/* Goals */}
        <rect x="0" y="42" width="2" height="16" fill="rgba(255,255,255,0.25)" />
        <rect x="98" y="42" width="2" height="16" fill="rgba(255,255,255,0.25)" />
        {/* Shot dots */}
        {shots.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.onTarget ? 2.2 : 1.6}
            fill={s.team === "home" ? (s.onTarget ? "#2563eb" : "rgba(37,99,235,0.4)") : (s.onTarget ? "#06b6d4" : "rgba(6,182,212,0.4)")}
            stroke={s.onTarget ? "rgba(255,255,255,0.6)" : "none"}
            strokeWidth="0.4"
          />
        ))}
      </svg>
      <div className="ms-shotmap-legend">
        <span className="ms-legend-dot home" /><span className="ms-legend-txt">{homeTeam} →</span>
        <span style={{width:12}} />
        <span className="ms-legend-dot away" /><span className="ms-legend-txt">← {awayTeam}</span>
        <span style={{marginLeft:12, fontSize:9, color:"var(--text-dim)"}}>● on target &nbsp; ○ off target</span>
      </div>
    </div>
  );
}

/* ── Key metric chip ── */
function Metric({ label, homeVal, awayVal }) {
  return (
    <div className="ms-metric">
      <span className="ms-metric-home">{homeVal ?? "—"}</span>
      <span className="ms-metric-label">{label}</span>
      <span className="ms-metric-away">{awayVal ?? "—"}</span>
    </div>
  );
}

/* ── Shot accuracy ── */
function Efficiency({ homeShots, homeShotsOT, homeScore, awayShots, awayShotsOT, awayScore, homeSaves, awaySaves }) {
  const homeAcc = homeShots ? Math.round((homeShotsOT / homeShots) * 100) : null;
  const awayAcc = awayShots ? Math.round((awayShotsOT / awayShots) * 100) : null;
  const homeConv = homeShotsOT ? Math.round((homeScore / homeShotsOT) * 100) : null;
  const awayConv = awayShotsOT ? Math.round((awayScore / awayShotsOT) * 100) : null;
  const homeSaveP = awayShotsOT ? Math.round((homeSaves / awayShotsOT) * 100) : null;
  const awaySaveP = homeShotsOT ? Math.round((awaySaves / homeShotsOT) * 100) : null;
  return (
    <div className="ms-efficiency">
      <div className="ms-eff-title">Efficiency Metrics</div>
      <div className="ms-eff-grid">
        {homeAcc != null && <div className="ms-eff-cell"><span className="ms-eff-val">{homeAcc}%</span><span className="ms-eff-lbl">Shot Accuracy</span></div>}
        {awayAcc != null && <div className="ms-eff-cell away"><span className="ms-eff-val">{awayAcc}%</span><span className="ms-eff-lbl">Shot Accuracy</span></div>}
        {homeConv != null && <div className="ms-eff-cell"><span className="ms-eff-val">{homeConv}%</span><span className="ms-eff-lbl">Conversion Rate</span></div>}
        {awayConv != null && <div className="ms-eff-cell away"><span className="ms-eff-val">{awayConv}%</span><span className="ms-eff-lbl">Conversion Rate</span></div>}
        {homeSaveP != null && <div className="ms-eff-cell"><span className="ms-eff-val">{homeSaveP}%</span><span className="ms-eff-lbl">Save %</span></div>}
        {awaySaveP != null && <div className="ms-eff-cell away"><span className="ms-eff-val">{awaySaveP}%</span><span className="ms-eff-lbl">Save %</span></div>}
      </div>
    </div>
  );
}

/* ── Goal timeline ── */
function GoalTimeline({ scorers, homeTeam, awayTeam }) {
  if (!scorers || scorers.length === 0) return null;
  const sorted = [...scorers].sort((a, b) => a.minute - b.minute);
  const maxMin = Math.max(90, ...sorted.map(s => s.minute));
  return (
    <div className="ms-timeline-wrap">
      <div className="ms-timeline-title">Goal Timeline</div>
      <div className="ms-timeline-track">
        <div className="ms-timeline-line" />
        {[0, 45, 90].map(m => (
          <div key={m} className="ms-tl-marker" style={{ left: `${(m / maxMin) * 100}%` }}>
            <div className="ms-tl-tick" />
            <span className="ms-tl-min">{m}'</span>
          </div>
        ))}
        {sorted.map((s, i) => {
          const isHome = s.team === homeTeam;
          const pct = (s.minute / maxMin) * 100;
          return (
            <div key={i} className={`ms-tl-goal ${isHome ? "home" : "away"}`} style={{ left: `${pct}%` }}>
              <div className="ms-tl-dot" />
              <div className={`ms-tl-label ${isHome ? "home" : "away"}`}>
                {s.player}<br />{s.minute}'{s.penalty ? " ⚽P" : s.ownGoal ? " OG" : ""}
              </div>
            </div>
          );
        })}
      </div>
      <div className="ms-timeline-teams">
        <span className="ms-legend-dot home" /> {homeTeam}
        <span style={{marginLeft:14}} />
        <span className="ms-legend-dot away" /> {awayTeam}
      </div>
    </div>
  );
}

export default function MatchStats({ result, homeTeam, awayTeam, matchId }) {
  if (!result || result.status !== "finished") return null;
  const s = result.stats || {};
  const hasStats = Object.keys(s).length > 0;
  const hasXG = s.homeXG != null || s.awayXG != null;
  const hasShots = s.homeShots != null || s.awayShots != null;
  const hasPoss = s.homePoss != null;
  const hasCards = result.cards && result.cards.length > 0;

  return (
    <div className="ms-panel">
      {/* Score summary */}
      <div className="ms-score-header">
        <div className="ms-sh-team home">
          <span className="ms-sh-name">{homeTeam}</span>
          <span className="ms-sh-score">{result.homeScore}</span>
        </div>
        <div className="ms-sh-divider">
          <span className="ms-sh-ft">Full Time</span>
          {result.penalties && (
            <span className="ms-sh-pens">({result.penalties.home} – {result.penalties.away} pens)</span>
          )}
        </div>
        <div className="ms-sh-team away">
          <span className="ms-sh-score">{result.awayScore}</span>
          <span className="ms-sh-name">{awayTeam}</span>
        </div>
      </div>

      {/* Goal timeline */}
      <GoalTimeline scorers={result.scorers} homeTeam={homeTeam} awayTeam={awayTeam} />

      {!hasStats && (
        <div className="ms-no-stats">No match stats recorded for this fixture.</div>
      )}

      {hasStats && (
        <>
          {/* Top metrics */}
          <div className="ms-top-metrics">
            <Metric label="Shots" homeVal={s.homeShots} awayVal={s.awayShots} />
            <Metric label="On Target" homeVal={s.homeShotsOT} awayVal={s.awayShotsOT} />
            <Metric label="Big Chances" homeVal={s.homeBigChances} awayVal={s.awayBigChances} />
            <Metric label="Corners" homeVal={s.homeCorners} awayVal={s.awayCorners} />
            <Metric label="Fouls" homeVal={s.homeFouls} awayVal={s.awayFouls} />
            <Metric label="Offsides" homeVal={s.homeOffsides} awayVal={s.awayOffsides} />
            <Metric label="Saves" homeVal={s.homeSaves} awayVal={s.awaySaves} />
          </div>

          {/* Stat bars + possession */}
          <div className="ms-bars-section">
            <div className="ms-bars-col">
              <div className="ms-bars-header">
                <span className="ms-bars-hn">{homeTeam}</span>
                <span className="ms-bars-hn away">{awayTeam}</span>
              </div>
              {hasShots && <StatBar label="Shots" homeVal={s.homeShots} awayVal={s.awayShots} />}
              {(s.homeShotsOT != null || s.awayShotsOT != null) && <StatBar label="Shots on Target" homeVal={s.homeShotsOT} awayVal={s.awayShotsOT} accent />}
              {(s.homeBigChances != null || s.awayBigChances != null) && <StatBar label="Big Chances" homeVal={s.homeBigChances} awayVal={s.awayBigChances} accent />}
              {(s.homeCorners != null || s.awayCorners != null) && <StatBar label="Corners" homeVal={s.homeCorners} awayVal={s.awayCorners} />}
              {(s.homeFouls != null || s.awayFouls != null) && <StatBar label="Fouls" homeVal={s.homeFouls} awayVal={s.awayFouls} />}
              {(s.homeOffsides != null || s.awayOffsides != null) && <StatBar label="Offsides" homeVal={s.homeOffsides} awayVal={s.awayOffsides} />}
              {(s.homeSaves != null || s.awaySaves != null) && <StatBar label="Saves" homeVal={s.homeSaves} awayVal={s.awaySaves} />}
            </div>
            {hasPoss && (
              <PossDonut homePoss={s.homePoss} homeTeam={homeTeam} awayTeam={awayTeam} />
            )}
          </div>

          {/* xG panel */}
          {hasXG && (
            <XGGauge
              homeXG={s.homeXG} awayXG={s.awayXG}
              homeScore={result.homeScore} awayScore={result.awayScore}
              homeTeam={homeTeam} awayTeam={awayTeam}
            />
          )}

          {/* Shot map */}
          {hasShots && (
            <ShotMap
              homeShots={s.homeShots} homeShotsOT={s.homeShotsOT}
              awayShots={s.awayShots} awayShotsOT={s.awayShotsOT}
              homeTeam={homeTeam} awayTeam={awayTeam}
              matchId={matchId}
            />
          )}

          {/* Efficiency */}
          <Efficiency
            homeShots={s.homeShots} homeShotsOT={s.homeShotsOT} homeScore={result.homeScore}
            awayShots={s.awayShots} awayShotsOT={s.awayShotsOT} awayScore={result.awayScore}
            homeSaves={s.homeSaves} awaySaves={s.awaySaves}
          />
        </>
      )}

      {/* Cards summary */}
      {hasCards && (
        <div className="ms-cards-section">
          <div className="ms-cards-title">Disciplinary</div>
          <div className="ms-cards-list">
            {result.cards.map((c, i) => (
              <div key={i} className="ms-card-row">
                <span className={`ms-card-icon ${c.cardType}`}>{c.cardType === "yellow" ? "🟨" : "🟥"}</span>
                <span className="ms-card-player">{c.player}</span>
                <span className="ms-card-team">{c.team}</span>
                <span className="ms-card-min">{c.minute}'</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
