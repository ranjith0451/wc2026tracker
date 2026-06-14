import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { TEAMS } from "../data/squads.js";
import { GROUPS, FLAG_URL, FLAGS } from "../data/teams.js";
import { getTopScorers } from "../lib/topscorers.js";
import { getWCWins, getWCRunnerUps } from "../data/wcHistory.js";
import PlayerModal from "../components/PlayerModal.jsx";

const POSITION_ORDER = ["GK", "DF", "MF", "FW"];
const POSITION_LABEL = { GK: "Goalkeepers", DF: "Defenders", MF: "Midfielders", FW: "Forwards" };
const POS_META = {
  GK: { color: "#f7c948", bg: "rgba(247,201,72,.12)", chip: "chip-gk", dot: "#f7c948" },
  DF: { color: "#00b4ff", bg: "rgba(0,180,255,.1)",   chip: "chip-df", dot: "#00b4ff" },
  MF: { color: "#00e5d0", bg: "rgba(0,229,208,.1)",   chip: "chip-mf", dot: "#00e5d0" },
  FW: { color: "#ff4757", bg: "rgba(255,71,87,.1)",   chip: "chip-fw", dot: "#ff4757" },
};

const AVATAR_GRADS = {
  GK: ["linear-gradient(135deg,#f7c948,#ef8c1e)","linear-gradient(135deg,#ffd700,#f59e0b)"],
  DF: ["linear-gradient(135deg,#00b4ff,#0047ab)","linear-gradient(135deg,#2997ff,#1e3a8a)"],
  MF: ["linear-gradient(135deg,#00e5d0,#059669)","linear-gradient(135deg,#34d399,#065f46)"],
  FW: ["linear-gradient(135deg,#ff4757,#9b1c1c)","linear-gradient(135deg,#f87171,#7f1d1d)"],
};

let _avatarIdx = 0;
function nextGrad(pos) {
  const arr = AVATAR_GRADS[pos] || AVATAR_GRADS.MF;
  return arr[(_avatarIdx++) % arr.length];
}

function getInitials(name) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function SquadDetail({ results }) {
  const { team: teamParam } = useParams();
  const teamName = decodeURIComponent(teamParam);
  const team = TEAMS.find(t => t.name === teamName);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  let groupKey = null;
  Object.entries(GROUPS).forEach(([g, teams]) => {
    if (teams.includes(teamName)) groupKey = g;
  });

  if (!team) {
    return (
      <div>
        <Link to="/squads" className="back-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          Squads
        </Link>
        <div className="empty-state">
          <div className="es-icon">❓</div>
          <div className="es-text">Team not found</div>
        </div>
      </div>
    );
  }

  const goalsByPlayer = {};
  getTopScorers(results)
    .filter(s => s.team === teamName)
    .forEach(s => (goalsByPlayer[s.player] = s.goals));

  const byPosition = {};
  team.players.forEach(p => {
    byPosition[p.position] = byPosition[p.position] || [];
    byPosition[p.position].push(p);
  });

  _avatarIdx = 0; // reset per render

  const wcWins      = getWCWins(teamName);
  const wcRunnerUps = getWCRunnerUps(teamName);

  return (
    <div>
      <Link to="/squads" className="back-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        Squads
      </Link>

      {/* ── Team hero ── */}
      <div className="squad-detail-hero">
        {FLAGS[teamName]
          ? <img src={FLAG_URL(teamName)} alt={teamName} />
          : <div style={{ width:70,height:50,background:"#f2f2f7",borderRadius:10,flexShrink:0 }}>🏳️</div>
        }
        <div style={{ flex:1, minWidth:0 }}>
          <h2>{teamName}</h2>
          {groupKey && <div className="grp-badge">{groupKey}</div>}
          {team.manager && (
            <div className="mgr">
              Manager: <strong>{team.manager.name}</strong>
              {team.manager.tactical && <> — {team.manager.tactical}</>}
            </div>
          )}

          {/* ── WC Stars ── */}
          {wcWins.length > 0 && (
            <div className="wc-stars-row">
              <div className="wc-stars-icons">
                {wcWins.map((yr) => (
                  <svg key={yr} className="wc-star" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>
              <div className="wc-stars-label">
                {wcWins.length}× World Champion · {wcWins.join(", ")}
              </div>
            </div>
          )}

          {/* ── Runner-up strip ── */}
          {wcRunnerUps.length > 0 && (
            <div className="wc-runnerup-row">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
              Runner-up {wcRunnerUps.length > 1 ? `(×${wcRunnerUps.length})` : ""}: {wcRunnerUps.join(", ")}
            </div>
          )}
        </div>
        <div style={{ textAlign:"center", flexShrink:0 }}>
          <div style={{ fontFamily:"var(--font-display)", fontSize:28, fontWeight:800, color:"var(--blue)", letterSpacing:"-.04em", lineHeight:1 }}>{team.players.length}</div>
          <div style={{ fontSize:10, fontWeight:700, color:"var(--text-tertiary)", textTransform:"uppercase", letterSpacing:".08em", marginTop:3 }}>Players</div>
        </div>
      </div>

      {/* ── Hint ── */}
      {team.hasSquad && (
        <div className="squad-tap-hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          Tap any player to view their full profile card
        </div>
      )}

      {!team.hasSquad ? (
        <div className="no-squad">
          <div className="ns-icon">📋</div>
          <div className="ns-title">Roster not yet available</div>
          <div className="ns-sub">Squad for {teamName} will be updated once officially announced.</div>
        </div>
      ) : (
        POSITION_ORDER.filter(pos => byPosition[pos]).map((pos, sIdx) => {
          const pm = POS_META[pos];
          return (
            <div className="pos-section" key={pos} style={{ animationDelay: `${sIdx * 0.07}s` }}>
              {/* Section header */}
              <div className="pos-section-header">
                <div className="pos-badge-color" style={{ background: pm.dot }} />
                {POSITION_LABEL[pos]}
                <span className="pos-count">{byPosition[pos].length}</span>
              </div>

              {/* Player list */}
              <div className="player-list">
                {byPosition[pos].map((p, i) => {
                  const grad = nextGrad(pos);
                  const goals = goalsByPlayer[p.name];
                  return (
                    <div
                      className="player-row clickable"
                      key={p.id || p.name}
                      onClick={() => setSelectedPlayer(p)}
                      title={`View ${p.name}'s profile`}
                    >
                      {/* Avatar */}
                      <div className="player-avatar" style={{ background: grad }}>
                        <img
                          src={p.image}
                          alt={p.name}
                          onError={e => { e.currentTarget.style.display = "none"; }}
                        />
                        {getInitials(p.name)}
                      </div>

                      {/* Info */}
                      <div className="player-info">
                        <div className="player-name">{p.name}</div>
                        <div className="player-meta">
                          {p.clubs?.[0] && <span className="player-club">{p.clubs[0].name}</span>}
                          {goals && (
                            <span className="player-goals-badge">⚽ {goals} goal{goals !== 1 ? "s" : ""}</span>
                          )}
                        </div>
                      </div>

                      {/* Position chip */}
                      <span className={`player-pos-chip ${pm.chip}`}>{pos}</span>

                      {/* Chevron cue */}
                      <svg className="player-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* ── Player modal ── */}
      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          teamName={teamName}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}
