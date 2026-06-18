import { useTopScorers } from "../lib/useStats.js";
import TeamFlag from "../components/TeamFlag.jsx";

const MEDALS = ["🥇", "🥈", "🥉"];

function SkeletonRow() {
  return (
    <div className="scorer-row" style={{ opacity: 0.4 }}>
      <div className="scorer-rank" style={{ width: 28, height: 28, background: "var(--border)", borderRadius: 8 }} />
      <div className="scorer-info">
        <div style={{ height: 14, width: 140, background: "var(--border)", borderRadius: 6, marginBottom: 6 }} />
        <div style={{ height: 11, width: 90, background: "var(--border)", borderRadius: 4 }} />
      </div>
      <div style={{ width: 28, height: 28, background: "var(--border)", borderRadius: 6 }} />
    </div>
  );
}

export default function TopScorers() {
  const { data: scorers = [], isLoading, error } = useTopScorers();

  return (
    <div>
      <div className="sec-head">
        <span className="sec-title">Golden Boot</span>
        <span className="sec-count">· top scorers · live from API</span>
        <div className="sec-line" />
      </div>

      {error ? (
        <div className="empty-state">
          <div className="es-icon">⚽</div>
          <div className="es-text">Couldn't load scorers</div>
          <div className="es-sub">{error.message || "API error — check back shortly."}</div>
        </div>
      ) : isLoading ? (
        <div className="scorers-card">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : scorers.length === 0 ? (
        <div className="empty-state">
          <div className="es-icon">⚽</div>
          <div className="es-text">No goals yet</div>
          <div className="es-sub">Scorers will appear here once matches begin.</div>
        </div>
      ) : (
        <div className="scorers-card">
          {scorers.map((s, i) => (
            <div className="scorer-row" key={`${s.team}|${s.player}|${i}`}>
              <div className={`scorer-rank${i < 3 ? ` r${i + 1}` : ""}`}>
                {i < 3 ? MEDALS[i] : i + 1}
              </div>
              <div className="scorer-info">
                <div className="scorer-name">{s.player}</div>
                <div className="scorer-team">
                  <TeamFlag team={s.team} />
                  {s.team}
                  {s.matches > 0 && ` · ${s.matches} match${s.matches !== 1 ? "es" : ""}`}
                  {s.penalties > 0 && ` · ${s.penalties} pen.`}
                  {s.assists > 0 && ` · ${s.assists} ast.`}
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
