import { Link, useParams } from "react-router-dom";
import TeamFlag from "../components/TeamFlag.jsx";
import { useScorerGoalDetails } from "../lib/useStats.js";

function formatDate(utcDate) {
  if (!utcDate) return "—";
  return new Date(utcDate).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

export default function ScorerGoalDetails() {
  const { team, player } = useParams();
  const teamName = decodeURIComponent(team || "");
  const playerName = decodeURIComponent(player || "");
  const { data, isLoading, error } = useScorerGoalDetails(playerName, teamName);

  const goals = data?.goals || [];

  return (
    <div data-testid="scorer-goals-page">
      <div className="sec-head">
        <span className="sec-title">Goal Breakdown</span>
        <span className="sec-count">· {playerName}</span>
        <div className="sec-line" />
      </div>

      <div className="compare-honour-card" style={{ marginBottom: 16 }} data-testid="scorer-goals-summary-card">
        <div className="compare-honour-row">
          <span className="compare-honour-key">Player</span>
          <span className="compare-honour-val">{playerName}</span>
        </div>
        <div className="compare-honour-row">
          <span className="compare-honour-key">Team</span>
          <span className="compare-honour-val"><TeamFlag team={teamName} /> {teamName}</span>
        </div>
        <div className="compare-honour-row">
          <span className="compare-honour-key">Total Goals</span>
          <span className="compare-honour-val">{data?.totalGoals ?? 0}</span>
        </div>
        <div className="compare-honour-row">
          <span className="compare-honour-key">Back</span>
          <span className="compare-honour-val"><Link to="/scorers" data-testid="scorer-goals-back-link">Top Scorers</Link></span>
        </div>
      </div>

      {error ? (
        <div className="empty-state" data-testid="scorer-goals-error">
          <div className="es-icon">⚽</div>
          <div className="es-text">Couldn't load goal details</div>
          <div className="es-sub">{error.message || "Try again shortly."}</div>
        </div>
      ) : isLoading ? (
        <div className="flp-loading" data-testid="scorer-goals-loading"><div className="flp-spinner"/><span>Loading goal details…</span></div>
      ) : goals.length === 0 ? (
        <div className="empty-state" data-testid="scorer-goals-empty">
          <div className="es-icon">⚽</div>
          <div className="es-text">No goal events found</div>
          <div className="es-sub">This scorer currently has no mapped goal timeline entries.</div>
        </div>
      ) : (
        <div className="scorers-card" data-testid="scorer-goals-list">
          {goals.map((g, i) => (
            <div className="scorer-row" key={`${g.matchId}-${g.minute}-${i}`} data-testid={`scorer-goal-row-${i}`}>
              <div className="scorer-rank">{i + 1}</div>
              <div className="scorer-info">
                <div className="scorer-name">vs {g.opponent || "Unknown"}</div>
                <div className="scorer-team">
                  Minute {g.minute}' · {g.goalType} · {formatDate(g.matchDate)}
                </div>
              </div>
              <div className="scorer-goals">{g.minute}'</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
