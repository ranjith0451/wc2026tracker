import { useTopScorers } from "../lib/useStats.js";
import TeamFlag from "../components/TeamFlag.jsx";
import { Link } from "react-router-dom";

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
  const { data, isLoading } = useTopScorers();
  const scorers = data?.scorers || [];
  const isStale = Boolean(data?.stale);
  const fetchedAt = data?.fetchedAt ? new Date(data.fetchedAt) : null;

  return (
    <div>
      <div className="sec-head">
        <span className="sec-title">Golden Boot</span>
        <span className="sec-count">· top scorers · live from API</span>
        <div className="sec-line" />
      </div>

      {isStale && (
        <div className="sec-count" style={{ marginBottom: 10, display: 'block' }} data-testid="scorers-stale-indicator">
          Showing last successful scorer snapshot
          {fetchedAt ? ` · ${fetchedAt.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST` : ''}
        </div>
      )}

      {isLoading ? (
        <div className="scorers-card">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : scorers.length === 0 ? (
        <div className="empty-state">
          <div className="es-icon">⚽</div>
          <div className="es-text">Scorer feed temporarily unavailable</div>
          <div className="es-sub">Live scorer service is retrying. Please refresh shortly.</div>
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
              <Link
                className="scorer-goals"
                to={`/scorers/${encodeURIComponent(s.team)}/${encodeURIComponent(s.player)}`}
                data-testid={`scorer-goals-link-${i}`}
                title="Open goal-by-goal breakdown"
              >
                {s.goals}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
