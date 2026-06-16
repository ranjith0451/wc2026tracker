import { getTopScorers } from "../lib/topscorers.js";
import TeamFlag from "../components/TeamFlag.jsx";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function TopScorers({ results }) {
  const scorers = getTopScorers(results);

  return (
    <div>
      <div className="sec-head">
        <span className="sec-title">Golden Boot</span>
        <span className="sec-count">· top scorers · from live API events</span>
        <div className="sec-line" />
      </div>

      {scorers.length === 0 ? (
        <div className="empty-state">
          <div className="es-icon">⚽</div>
          <div className="es-text">No goals yet</div>
          <div className="es-sub">Scorers appear here as match results come in.</div>
        </div>
      ) : (
        <div className="scorers-card">
          {scorers.map((s, i) => (
            <div className="scorer-row" key={`${s.team}|${s.player}`}>
              <div className={`scorer-rank${i < 3 ? ` r${i+1}` : ""}`}>
                {i < 3 ? MEDALS[i] : i + 1}
              </div>
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
      )}
    </div>
  );
}
