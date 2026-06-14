/**
 * FIFA Match Centre — exact design match
 * Center-diverging comparison bars, grouped stat sections, tabbed navigation.
 */
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";

// ─────────────────────────────────────────────────────────────────
// FIFA-style center-diverging stat bar
// Home fills from LEFT inward, Away fills from RIGHT inward
// ─────────────────────────────────────────────────────────────────
function StatRow({ label, hv, av, pct: customPct, fmt: fmtFn }) {
  const hNum = Number(hv) || 0;
  const aNum = Number(av) || 0;
  const total = hNum + aNum;
  let hp = total > 0 ? (hNum / total) * 100 : 50;
  let ap = total > 0 ? (aNum / total) * 100 : 50;
  if (customPct) { hp = customPct.h; ap = customPct.a; }

  const display = fmtFn
    ? { h: fmtFn(hv), a: fmtFn(av) }
    : { h: hv ?? "—", a: av ?? "—" };

  return (
    <div className="fsr-row">
      <span className="fsr-val home">{display.h}</span>
      <div className="fsr-track-wrap">
        <span className="fsr-label">{label}</span>
        <div className="fsr-track">
          <div className="fsr-bar home" style={{ width: `${hp}%` }} />
          <div className="fsr-bar away" style={{ width: `${ap}%` }} />
        </div>
      </div>
      <span className="fsr-val away">{display.a}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Section group with heading
// ─────────────────────────────────────────────────────────────────
function StatSection({ title, children }) {
  return (
    <div className="fss-section">
      <h3 className="fss-title">{title}</h3>
      <div className="fss-rows">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// xG spotlight
// ─────────────────────────────────────────────────────────────────
function XGSpotlight({ hxg, axg, homeTeam, awayTeam, homeScore, awayScore }) {
  if (hxg == null && axg == null) return null;
  const total = (hxg || 0) + (axg || 0);
  const hp = total > 0 ? ((hxg || 0) / total) * 100 : 50;
  const ap = 100 - hp;
  let verdict = "";
  if (hxg != null && axg != null) {
    const diff = (hxg - axg).toFixed(2);
    if (Math.abs(diff) < 0.3) verdict = "Evenly contested — similar quality chances created";
    else if (hxg > axg) verdict = `${homeTeam} dominated chances (+${diff} xG)`;
    else verdict = `${awayTeam} dominated chances (+${Math.abs(diff)} xG)`;
  }
  return (
    <div className="fxg-wrap">
      <div className="fxg-label">Expected Goals  ·  xG</div>
      <div className="fxg-row">
        <div className="fxg-side">
          <span className="fxg-num home">{hxg?.toFixed(2) ?? "—"}</span>
          <span className="fxg-sub">{homeTeam}</span>
          <span className="fxg-goals">{homeScore} scored</span>
        </div>
        <div className="fxg-divider">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,.12)" strokeWidth="1.5"/>
            <path d="M12 2C12 2 8 6 8 12s4 10 4 10" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M12 2C12 2 16 6 16 12s-4 10-4 10" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M2 12h20" stroke="rgba(255,255,255,.2)" strokeWidth="1"/>
          </svg>
        </div>
        <div className="fxg-side right">
          <span className="fxg-num away">{axg?.toFixed(2) ?? "—"}</span>
          <span className="fxg-sub">{awayTeam}</span>
          <span className="fxg-goals">{awayScore} scored</span>
        </div>
      </div>
      <div className="fxg-bar-wrap">
        <div className="fxg-track">
          <div className="fxg-fill home" style={{ width: `${hp}%` }} />
          <div className="fxg-fill away" style={{ width: `${ap}%` }} />
        </div>
      </div>
      {verdict && <p className="fxg-verdict">{verdict}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Shot map — top-down pitch
// ─────────────────────────────────────────────────────────────────
function ShotMap({ hs, hso, as_, aso, homeTeam, awayTeam, matchId }) {
  const dots = useMemo(() => {
    let seed = (matchId || 1) * 7919;
    const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed >>> 0) / 0xFFFFFFFF; };
    const out = [];
    for (let i = 0; i < (hs || 0); i++) {
      out.push({ x: 54 + rng() * 40, y: 12 + rng() * 76, team: "home", on: i < (hso || 0) });
    }
    for (let i = 0; i < (as_ || 0); i++) {
      out.push({ x: 6 + rng() * 40, y: 12 + rng() * 76, team: "away", on: i < (aso || 0) });
    }
    return out;
  }, [matchId, hs, hso, as_, aso]);

  return (
    <div className="fsm-wrap">
      <div className="fsm-header">
        <span className="fsm-team home">{homeTeam} ▶</span>
        <span className="fsm-title">Shot Map</span>
        <span className="fsm-team away">◀ {awayTeam}</span>
      </div>
      <svg viewBox="0 0 100 100" className="fsm-pitch">
        <defs>
          <linearGradient id="pitchGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d5e2a" stopOpacity="1"/>
            <stop offset="100%" stopColor="#0a4a20" stopOpacity="1"/>
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#pitchGrad)" rx="3"/>
        {/* Pitch markings */}
        <rect x="1" y="1" width="98" height="98" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth=".5"/>
        <line x1="50" y1="1" x2="50" y2="99" stroke="rgba(255,255,255,.15)" strokeWidth=".5"/>
        <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth=".5"/>
        <circle cx="50" cy="50" r=".8" fill="rgba(255,255,255,.3)"/>
        <rect x="1" y="30" width="18" height="40" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth=".5"/>
        <rect x="81" y="30" width="18" height="40" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth=".5"/>
        <rect x="1" y="38" width="6" height="24" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth=".5"/>
        <rect x="93" y="38" width="6" height="24" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth=".5"/>
        <rect x="0" y="42" width="1.5" height="16" fill="rgba(255,255,255,.5)"/>
        <rect x="98.5" y="42" width="1.5" height="16" fill="rgba(255,255,255,.5)"/>
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y}
            r={d.on ? 2.4 : 1.8}
            fill={d.team === "home"
              ? (d.on ? "#3b82f6" : "rgba(59,130,246,.35)")
              : (d.on ? "#22d3ee" : "rgba(34,211,238,.35)")}
            stroke={d.on ? "rgba(255,255,255,.6)" : "none"}
            strokeWidth=".4"
          />
        ))}
      </svg>
      <div className="fsm-legend">
        <span className="fsm-dot home on"/><span className="fsm-lt">On target</span>
        <span className="fsm-dot home off"/><span className="fsm-lt">Off target</span>
        <span className="fsm-spacer"/>
        <span className="fsm-dot away on"/><span className="fsm-lt">On target</span>
        <span className="fsm-dot away off"/><span className="fsm-lt">Off target</span>
      </div>
    </div>
  );
}

const PlayerLink = ({ name, team }) => {
  if (!name) return null;
  if (!team) return <span className="fef-player">{name}</span>;
  const slug = encodeURIComponent(team);
  return (
    <Link to={`/squads/${slug}`} className="fef-player fef-player-link" title={`View ${team} squad`}>
      {name}
    </Link>
  );
};

// ─────────────────────────────────────────────────────────────────
// Summary — event feed
// ─────────────────────────────────────────────────────────────────
function EventFeed({ scorers, cards, subs, homeTeam, awayTeam }) {
  const events = [
    ...(scorers || []).map(e => ({ ...e, _type: "goal" })),
    ...(cards   || []).map(e => ({ ...e, _type: "card" })),
    ...(subs    || []).map(e => ({ ...e, _type: "sub" })),
  ].sort((a, b) => (Number(a.minute) || 0) - (Number(b.minute) || 0));

  if (!events.length) {
    return (
      <div className="fef-empty">
        <div className="fef-empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
            <circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/>
          </svg>
        </div>
        <p>No events recorded yet</p>
        <span>Events will appear here during and after the match</span>
      </div>
    );
  }

  return (
    <div className="fef-feed">
      {events.map((ev, i) => {
        const isHome = ev.team === homeTeam;
        const icon = ev._type === "goal"
          ? <GoalDot ownGoal={ev.ownGoal} penalty={ev.penalty}/>
          : ev._type === "card"
          ? <CardRect type={ev.cardType}/>
          : <SubArrow/>;

        return (
          <div key={i} className={`fef-row ${isHome ? "home" : "away"}`}>
            {isHome ? (
              <>
                <div className="fef-info home">
                  <PlayerLink name={ev.player || ev.playerIn} team={ev.team} />
                  {ev._type === "goal" && (ev.ownGoal ? <span className="fef-badge og">OG</span> : ev.penalty ? <span className="fef-badge pen">Pen</span> : null)}
                  {ev._type === "goal" && ev.assist && <span className="fef-assist">↗ {ev.assist}</span>}
                  {ev._type === "sub" && <span className="fef-out">↓ {ev.playerOut}</span>}
                </div>
                <div className="fef-mid">{icon}<span className="fef-min">{ev.minute}'</span></div>
                <div className="fef-spacer"/>
              </>
            ) : (
              <>
                <div className="fef-spacer"/>
                <div className="fef-mid">{icon}<span className="fef-min">{ev.minute}'</span></div>
                <div className="fef-info away">
                  <PlayerLink name={ev.player || ev.playerIn} team={ev.team} />
                  {ev._type === "goal" && (ev.ownGoal ? <span className="fef-badge og">OG</span> : ev.penalty ? <span className="fef-badge pen">Pen</span> : null)}
                  {ev._type === "goal" && ev.assist && <span className="fef-assist">↗ {ev.assist}</span>}
                  {ev._type === "sub" && <span className="fef-out">↓ {ev.playerOut}</span>}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

const GoalDot = ({ ownGoal, penalty }) => (
  <div className={`fef-icon goal${ownGoal ? " og" : penalty ? " pen" : ""}`}>
    <svg viewBox="0 0 16 16" width="14" height="14">
      <circle cx="8" cy="8" r="7" fill={ownGoal ? "#ef4444" : "#22c55e"} stroke="white" strokeWidth="1"/>
      <path d="M5 8h6M8 5v6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  </div>
);

const CardRect = ({ type }) => (
  <div className="fef-icon card">
    <svg viewBox="0 0 10 14" width="10" height="14">
      <rect width="10" height="14" rx="1.5"
        fill={type === "red" ? "#ef4444" : type === "yellow-red" ? "#f97316" : "#eab308"}/>
    </svg>
  </div>
);

const SubArrow = () => (
  <div className="fef-icon sub">
    <svg viewBox="0 0 14 14" width="13" height="13" fill="none">
      <path d="M10 2l3 3-3 3" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13 5H6M4 12l-3-3 3-3" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1 9h7" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// Statistics Tab — FIFA grouped sections
// ─────────────────────────────────────────────────────────────────
function StatisticsTab({ s, result, homeTeam, awayTeam, matchId, onRetry }) {
  if (!s || Object.keys(s).length === 0) {
    return (
      <div className="fst-premium-gate">
        <div className="fst-gate-icon">
          <svg viewBox="0 0 24 24" fill="none" width="36" height="36">
            <path d="M3 3v18h18" stroke="rgba(255,255,255,.25)" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M7 16l4-4 4 4 4-4" stroke="rgba(255,255,255,.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="19" cy="5" r="4" fill="#f59e0b"/>
            <path d="M17.5 5l1 1 2-2" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="fst-gate-title">Match Statistics</p>
        <p className="fst-gate-sub">
          Live possession, shots, xG, and 20+ stat categories are provided by our premium data tier
          and are not available on the current free plan.
        </p>
        <div className="fst-gate-pills">
          <span className="fst-gate-pill">Possession %</span>
          <span className="fst-gate-pill">xG</span>
          <span className="fst-gate-pill">Shots on Target</span>
          <span className="fst-gate-pill">Pass Accuracy</span>
          <span className="fst-gate-pill">Fouls · Cards</span>
        </div>
        {onRetry && (
          <button onClick={onRetry} className="fst-gate-retry">
            ↻ Check again
          </button>
        )}
      </div>
    );
  }

  const hasPoss = s.homePoss != null;
  const hasXG = s.homeXG != null || s.awayXG != null;
  const hasShots = s.homeShots != null || s.awayShots != null;

  return (
    <div className="fst-wrap">
      {/* xG Spotlight */}
      {hasXG && (
        <XGSpotlight hxg={s.homeXG} axg={s.awayXG}
          homeTeam={homeTeam} awayTeam={awayTeam}
          homeScore={result.homeScore} awayScore={result.awayScore}/>
      )}

      {/* Section: Attacking */}
      <StatSection title="Attacking">
        {hasPoss && (
          <StatRow label="Possession"
            hv={`${s.homePoss}%`} av={`${s.awayPoss ?? (100 - s.homePoss)}%`}
            customPct={{ h: s.homePoss, a: s.awayPoss ?? (100 - s.homePoss) }}/>
        )}
        <StatRow label="Goals" hv={result.homeScore} av={result.awayScore}/>
        {s.homeCorners != null && <StatRow label="Corner Kicks" hv={s.homeCorners} av={s.awayCorners}/>}
        {s.homeSaves   != null && <StatRow label="Goalkeeper Saves" hv={s.homeSaves} av={s.awaySaves}/>}
      </StatSection>

      {/* Section: Attempts at Goal */}
      {hasShots && (
        <StatSection title="Attempts at Goal">
          <StatRow label="Total Shots" hv={s.homeShots} av={s.awayShots}/>
          {s.homeShotsOT  != null && <StatRow label="On Target" hv={s.homeShotsOT} av={s.awayShotsOT}/>}
          {s.homeShotsOff != null && <StatRow label="Off Target" hv={s.homeShotsOff} av={s.awayShotsOff}/>}
          {s.homeShotsBlocked != null && <StatRow label="Blocked Shots" hv={s.homeShotsBlocked} av={s.awayShotsBlocked}/>}
          {s.homeShotsBox != null && <StatRow label="Inside Penalty Area" hv={s.homeShotsBox} av={s.awayShotsBox}/>}
          {s.homeShotsOut != null && <StatRow label="Outside Penalty Area" hv={s.homeShotsOut} av={s.awayShotsOut}/>}
        </StatSection>
      )}

      {/* Shot map */}
      {hasShots && (
        <ShotMap hs={s.homeShots} hso={s.homeShotsOT}
          as_={s.awayShots} aso={s.awayShotsOT}
          homeTeam={homeTeam} awayTeam={awayTeam} matchId={matchId}/>
      )}

      {/* Section: Discipline */}
      {(s.homeYC != null || s.homeFouls != null || s.homeOffsides != null) && (
        <StatSection title="Discipline">
          {s.homeYC       != null && <StatRow label="Yellow Cards" hv={s.homeYC} av={s.awayYC}/>}
          {s.homeRC       != null && <StatRow label="Red Cards" hv={s.homeRC} av={s.awayRC}/>}
          {s.homeFouls    != null && <StatRow label="Fouls Committed" hv={s.homeFouls} av={s.awayFouls}/>}
          {s.homeOffsides != null && <StatRow label="Offsides" hv={s.homeOffsides} av={s.awayOffsides}/>}
        </StatSection>
      )}

      {/* Section: Distribution */}
      {s.homePasses != null && (
        <StatSection title="Distribution">
          <StatRow label="Total Passes" hv={s.homePasses} av={s.awayPasses}/>
          {s.homePassesAcc != null && <StatRow label="Passes Completed" hv={s.homePassesAcc} av={s.awayPassesAcc}/>}
          {s.homePassAcc   != null && <StatRow label="Pass Accuracy" hv={`${s.homePassAcc}%`} av={`${s.awayPassAcc}%`} customPct={{ h: s.homePassAcc, a: s.awayPassAcc }}/>}
          {s.homeTackles   != null && <StatRow label="Tackles" hv={s.homeTackles} av={s.awayTackles}/>}
        </StatSection>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Lineups — pitch formation view
// ─────────────────────────────────────────────────────────────────
function LineupsTab({ lineups, homeTeam, awayTeam }) {
  if (!lineups?.length) {
    return (
      <div className="fef-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
        <p>Line-ups not yet available</p>
        <span>Teams are confirmed closer to kick-off</span>
      </div>
    );
  }

  return (
    <div className="flu-wrap">
      {lineups.map((side, idx) => {
        if (!side) return null;
        const isHome = idx === 0;
        const rows = (side.startXI || [])
          .filter(p => p.grid)
          .reduce((acc, p) => {
            const [row] = (p.grid || "1:1").split(":");
            if (!acc[row]) acc[row] = [];
            acc[row].push(p);
            return acc;
          }, {});
        const rowKeys = Object.keys(rows).sort((a, b) => isHome ? b - a : a - b);

        return (
          <div key={idx} className={`flu-panel ${isHome ? "home" : "away"}`}>
            <div className="flu-header">
              <div className="flu-team-row">
                {side.logo && <img src={side.logo} alt={side.team} className="flu-logo"/>}
                <div>
                  <span className="flu-name">{side.team}</span>
                  {side.formation && <span className="flu-form">{side.formation}</span>}
                </div>
              </div>
              {side.coach && <span className="flu-coach">{side.coach}</span>}
            </div>
            <div className="flu-pitch">
              {rowKeys.map(rk => (
                <div key={rk} className="flu-row">
                  {rows[rk].map((p, i) => (
                    <div key={i} className="flu-player">
                      <div className={`flu-circle ${isHome ? "home" : "away"}`}>
                        <span className="flu-num">{p.number}</span>
                      </div>
                      <span className="flu-pname">{p.name?.split(" ").slice(-1)[0]}</span>
                      <span className="flu-pos">{p.pos}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {side.substitutes?.length > 0 && (
              <div className="flu-subs">
                <div className="flu-subs-title">Substitutes</div>
                <div className="flu-subs-list">
                  {side.substitutes.map((p, i) => (
                    <div key={i} className="flu-sub-row">
                      <span className="flu-sub-num">{p.number}</span>
                      <span className="flu-sub-name">{p.name}</span>
                      <span className="flu-sub-pos">{p.pos}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main panel
// ─────────────────────────────────────────────────────────────────
export default function LiveMatchPanel({
  result, homeTeam, awayTeam, matchId, apiFixtureId,
  events, stats, lineups, loading, onRetry,
  homeLogo, awayLogo,
}) {
  const [tab, setTab] = useState("summary");
  const manualStats = result?.stats || {};
  const s = (stats && Object.keys(stats).length > 0) ? stats : manualStats;
  const ev = events || {};
  const scorers = ev.scorers || result?.scorers || [];
  const cards   = ev.cards   || result?.cards   || [];
  const subs    = ev.subs    || [];
  const isLive  = result?.status === "live";

  const TABS = [
    { id: "summary",  label: "Summary" },
    { id: "stats",    label: "Statistics" },
    { id: "lineups",  label: "Line-Ups" },
  ];

  return (
    <div className="flp-root">
      {/* Score header */}
      <div className="flp-header">
        <div className="flp-team home">
          {homeLogo && <img src={homeLogo} alt={homeTeam} className="flp-logo"/>}
          <span className="flp-tname">{homeTeam}</span>
        </div>
        <div className="flp-scores">
          <div className="flp-score-row">
            <span className="flp-score">{result.homeScore}</span>
            <div className="flp-score-mid">
              <span className={`flp-status ${isLive ? "live" : ""}`}>
                {isLive
                  ? <><span className="flp-dot"/>{result.statusShort === "HT" ? "HT" : `${result.elapsed}'`}</>
                  : result.statusShort === "AET" ? "AET" : result.statusShort === "PEN" ? "Pens" : "FT"}
              </span>
              {result.halftime && !isLive && (
                <span className="flp-ht">HT {result.halftime.home}–{result.halftime.away}</span>
              )}
              {result.penalties && (
                <span className="flp-ht">Pens {result.penalties.home}–{result.penalties.away}</span>
              )}
            </div>
            <span className="flp-score">{result.awayScore}</span>
          </div>
          {apiFixtureId && <div className="flp-api-tag">◉ Live Data</div>}
        </div>
        <div className="flp-team away">
          <span className="flp-tname">{awayTeam}</span>
          {awayLogo && <img src={awayLogo} alt={awayTeam} className="flp-logo"/>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flp-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`flp-tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flp-body">
        {loading ? (
          <div className="flp-loading">
            <div className="flp-spinner"/>
            <span>Loading match data…</span>
          </div>
        ) : (
          <>
            {tab === "summary"  && <EventFeed scorers={scorers} cards={cards} subs={subs} homeTeam={homeTeam} awayTeam={awayTeam}/>}
            {tab === "stats"    && <StatisticsTab s={s} result={result} homeTeam={homeTeam} awayTeam={awayTeam} matchId={matchId} onRetry={onRetry}/>}
            {tab === "lineups"  && <LineupsTab lineups={lineups} homeTeam={homeTeam} awayTeam={awayTeam}/>}
          </>
        )}
      </div>
    </div>
  );
}
