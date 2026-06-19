import { Link, useParams } from "react-router-dom";
import { TEAMS } from "../data/squads.js";
import { FLAG_URL, FLAGS } from "../data/teams.js";

export default function PlayerProfile() {
  const { team, player } = useParams();
  const teamName = decodeURIComponent(team || "");
  const playerName = decodeURIComponent(player || "");

  const teamData = TEAMS.find(t => t.name === teamName);
  const playerData = teamData?.players?.find(p => p.name.toLowerCase() === playerName.toLowerCase());

  if (!teamData || !playerData) {
    return (
      <div className="empty-state" data-testid="player-profile-not-found">
        <div className="es-icon">⚽</div>
        <div className="es-text">Player profile not found</div>
        <div className="es-sub">The selected player is not available in the current squad dataset.</div>
      </div>
    );
  }

  return (
    <div className="pm-page" data-testid="player-profile-page">
      <Link to={`/squads/${encodeURIComponent(teamName)}`} className="back-btn" data-testid="player-profile-back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        Back to {teamName} Squad
      </Link>

      <div className="squad-detail-hero" data-testid="player-profile-hero">
        {FLAGS[teamName] ? (
          <img src={FLAG_URL(teamName)} alt={teamName} data-testid="player-profile-team-flag" />
        ) : (
          <div style={{ width:70,height:50,background:"#f2f2f7",borderRadius:10,flexShrink:0 }}>🏳️</div>
        )}
        <div style={{ flex:1, minWidth:0 }}>
          <h2 data-testid="player-profile-name">{playerData.name}</h2>
          <div className="mgr" data-testid="player-profile-team">{teamName}</div>
          <div className="mgr" data-testid="player-profile-position">
            Position: <strong>{playerData.position}</strong>
          </div>
          {playerData.tactical && <div className="mgr" data-testid="player-profile-tactical">{playerData.tactical}</div>}
        </div>
      </div>

      <div className="compare-honours" data-testid="player-profile-details">
        <h2 className="compare-section-title">Career Snapshot</h2>
        <div className="compare-honour-card" style={{ maxWidth: "920px", margin: "0 auto" }}>
          <div className="compare-honour-row">
            <span className="compare-honour-key">Current Club</span>
            <span className="compare-honour-val">{playerData.clubs?.[0]?.name || "—"}</span>
          </div>
          <div className="compare-honour-row">
            <span className="compare-honour-key">Years</span>
            <span className="compare-honour-val">{playerData.clubs?.[0]?.years || "—"}</span>
          </div>
          <div className="compare-honour-row">
            <span className="compare-honour-key">Achievements</span>
            <span className="compare-honour-val" style={{ fontFamily: "var(--font-text)", fontSize: 14 }}>
              {(playerData.achievements || []).join(" · ") || "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
