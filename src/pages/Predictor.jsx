import { useState, useMemo, useCallback } from "react";
import { MATCHES } from "../data/matches.js";
import { GROUPS } from "../data/teams.js";
import { getGroupStandings } from "../lib/standings.js";
import {
  loadPredictions,
  savePredictions,
  setPrediction,
  resolvePredictedMatchTeams,
  calculateAccuracy,
} from "../lib/predictor.js";
import TeamFlag from "../components/TeamFlag.jsx";
import { formatISTDate, formatISTTime } from "../lib/time.js";

/* ──────────────────────────────────────────────────────────────────
   Bracket Predictor / Challenge
   ─ Save predictions to localStorage
   ─ Cascade winner picks through knockout bracket
   ─ Compare against actual results
   ────────────────────────────────────────────────────────────────── */

const KO_STAGES = [
  "Round of 32",
  "Round of 16",
  "Quarterfinal",
  "Semifinal",
  "Third Place",
  "Final",
];

/* ────────── Team entry in group: draggable logic simplified ────── */
function GroupTeamRow({ team, position, onPosChange }) {
  return (
    <div className="pred-group-row">
      <TeamFlag team={team} />
      <span className="pred-group-name">{team}</span>
      <select
        className="pred-group-select"
        value={position}
        onChange={(e) => onPosChange(team, Number(e.target.value))}
      >
        <option value={0}>1st</option>
        <option value={1}>2nd</option>
        <option value={2}>3rd</option>
        <option value={3}>4th</option>
      </select>
    </div>
  );
}

/* ────────── Knockout match card with pick buttons ─────────────── */
function MatchPredCard({ match, preds, onPick, results, matchById }) {
  const { home, away } = resolvePredictedMatchTeams(match, preds, MATCHES);
  const pick = preds[match.id];
  const result = results[match.id];
  const isFinished = result?.status === "finished";

  // Determine if prediction was correct
  let isCorrect = false;
  if (isFinished && pick) {
    if (pick === "draw") {
      isCorrect = result.homeScore === result.awayScore;
    } else if (pick === "home") {
      isCorrect = result.homeScore > result.awayScore;
    } else if (pick === "away") {
      isCorrect = result.awayScore > result.homeScore;
    }
  }

  return (
    <div className={`pred-match-card${isFinished ? " finished" : ""}`}>
      <div className="pred-match-header">
        <span className="pred-match-stage">{match.stage}</span>
        <span className="pred-match-venue">{match.venue}</span>
      </div>
      <div className="pred-match-teams">
        {/* Home */}
        <button
          className={`pred-team-btn${pick === "home" ? " active" : ""}${isFinished && !isCorrect && pick === "home" ? " wrong" : ""}${isFinished && isCorrect && pick === "home" ? " correct" : ""}`}
          onClick={() => onPick(match.id, "home")}
          disabled={isFinished}
        >
          <TeamFlag team={!home.isPlaceholder ? home.name : ""} />
          <span className="pred-team-name">{home.name}</span>
        </button>

        {/* Draw / VS */}
        <div className="pred-vs-divider">
          {isFinished ? (
            <span className={`pred-result-badge ${isCorrect ? "correct" : pick ? "wrong" : ""}`}>
              {isCorrect ? "✓" : pick ? "✗" : ""}
            </span>
          ) : (
            <span className="pred-vs-text">VS</span>
          )}
        </div>

        {/* Away */}
        <button
          className={`pred-team-btn${pick === "away" ? " active" : ""}${isFinished && !isCorrect && pick === "away" ? " wrong" : ""}${isFinished && isCorrect && pick === "away" ? " correct" : ""}`}
          onClick={() => onPick(match.id, "away")}
          disabled={isFinished}
        >
          <TeamFlag team={!away.isPlaceholder ? away.name : ""} />
          <span className="pred-team-name">{away.name}</span>
        </button>
      </div>
      <div className="pred-match-meta">
        <span>{formatISTDate(match.isoIST)} {formatISTTime(match.isoIST)}</span>
        {isFinished && (
          <span className="pred-actual-score">
            Result: {result.homeScore} – {result.awayScore}
          </span>
        )}
      </div>
    </div>
  );
}

/* ────────── Main Predictor Page ─────────────────────────────────── */
export default function Predictor({ results }) {
  const [preds, setPreds] = useState(() => loadPredictions());
  const [activeTab, setActiveTab] = useState("knockout");

  // Group standings predictions: { groupKey: [team1, team2, team3, team4] }
  const [groupPicks, setGroupPicks] = useState(() => {
    const saved = localStorage.getItem("wc2026_group_picks");
    if (saved) return JSON.parse(saved);
    // Default: alphabetical order per group
    const initial = {};
    Object.entries(GROUPS).forEach(([g, teams]) => {
      initial[g] = [...teams];
    });
    return initial;
  });

  const handlePick = useCallback(
    (matchId, value) => {
      setPreds((prev) => {
        const next = setPrediction(prev, matchId, value);
        return next;
      });
    },
    []
  );

  const handleGroupPick = useCallback((groupKey, team, newPos) => {
    setGroupPicks((prev) => {
      const arr = [...prev[groupKey]];
      const oldIdx = arr.indexOf(team);
      if (oldIdx === -1) return prev;
      // Swap
      const swapTeam = arr[newPos];
      arr[newPos] = team;
      arr[oldIdx] = swapTeam;
      const next = { ...prev, [groupKey]: arr };
      localStorage.setItem("wc2026_group_picks", JSON.stringify(next));
      return next;
    });
  }, []);

  const accuracy = useMemo(() => calculateAccuracy(preds, results), [preds, results]);

  const hasPredictions = Object.keys(preds).length > 0;

  // Knockout matches only
  const koMatches = useMemo(
    () => MATCHES.filter((m) => m.stage !== "Group Stage"),
    []
  );

  // Per stage
  const matchesByStage = useMemo(() => {
    const grouped = {};
    koMatches.forEach((m) => {
      if (!grouped[m.stage]) grouped[m.stage] = [];
      grouped[m.stage].push(m);
    });
    return grouped;
  }, [koMatches]);

  // Build bracket pairs: each match feeds two matches (left + right children)
  // Mapping based on bracket structure:
  // R32: 73-88 (16 matches) → R16: 89-96
  // Actually we just show flat stages for MVP, full interactive bracket is v2

  return (
    <div className="pred-page">
      {/* Header */}
      <div className="pred-hero">
        <h1 className="pred-title">Bracket Predictor</h1>
        <p className="pred-subtitle">
          Pick winners for every knockout match. Your predictions cascade automatically.
        </p>
        {hasPredictions && (
          <div className="pred-accuracy-bar">
            <span className="pred-accuracy-label">Accuracy</span>
            <div className="pred-accuracy-track">
              <div
                className="pred-accuracy-fill"
                style={{ width: `${accuracy.percentage}%` }}
              />
            </div>
            <span className="pred-accuracy-value">
              {accuracy.correct} / {accuracy.total} ({accuracy.percentage}%)
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="pred-tabs">
        <button
          className={`pred-tab${activeTab === "groups" ? " active" : ""}`}
          onClick={() => setActiveTab("groups")}
        >
          Group Standings
        </button>
        <button
          className={`pred-tab${activeTab === "knockout" ? " active" : ""}`}
          onClick={() => setActiveTab("knockout")}
        >
          Knockout Bracket
        </button>
      </div>

      {/* Actions */}
      {hasPredictions && activeTab === "knockout" && (
        <div className="pred-actions">
          <button
            className="pred-reset-btn"
            onClick={() => {
              if (confirm("Clear all predictions?")) {
                localStorage.removeItem("wc2026_predictions");
                setPreds({});
              }
            }}
          >
            Reset All
          </button>
        </div>
      )}

      {/* ── GROUP STAGE ── */}
      {activeTab === "groups" && (
        <div className="pred-groups">
          {Object.keys(GROUPS).map((g) => (
            <div className="pred-group-card" key={g}>
              <div className="pred-group-head">{g}</div>
              <div className="pred-group-teams">
                {GROUPS[g].map((team) => (
                  <GroupTeamRow
                    key={team}
                    team={team}
                    position={groupPicks[g]?.indexOf(team) ?? 0}
                    onPosChange={(t, pos) => handleGroupPick(g, t, pos)}
                  />
                ))}
              </div>
              {/* Show qualifying positions */}
              <div className="pred-group-summary">
                <div className="pred-qualifier">
                  <span className="pred-qual-dot q1">1</span>
                  <TeamFlag team={groupPicks[g]?.[0] || ""} />
                  {groupPicks[g]?.[0] || "—"}
                </div>
                <div className="pred-qualifier">
                  <span className="pred-qual-dot q2">2</span>
                  <TeamFlag team={groupPicks[g]?.[1] || ""} />
                  {groupPicks[g]?.[1] || "—"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── KNOCKOUT ── */}
      {activeTab === "knockout" && (
        <div className="pred-knockout">
          {KO_STAGES.map((stage) => {
            const matches = matchesByStage[stage];
            if (!matches || matches.length === 0) return null;
            return (
              <div className="pred-stage" key={stage}>
                <div className="pred-stage-head">
                  <span className="pred-stage-title">{stage}</span>
                  <span className="pred-stage-count">{matches.length} matches</span>
                </div>
                <div className="pred-stage-matches">
                  {matches.map((m) => (
                    <MatchPredCard
                      key={m.id}
                      match={m}
                      preds={preds}
                      onPick={handlePick}
                      results={results}
                      matchById={MATCHES}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
