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
import {
  loadScorePredictions,
  saveScorePredictions,
  setScorePrediction,
  calculateScoreAccuracy,
} from "../lib/scorePredictor.js";
import TeamFlag from "../components/TeamFlag.jsx";
import ScorePredictorCard from "../components/ScorePredictorCard.jsx";
import { formatISTDate, formatISTTime, getMatchStatus } from "../lib/time.js";

/* ──────────────────────────────────────────────────────────────────
   Bracket Predictor / Challenge
   ─ Save predictions to localStorage
   ─ Cascade winner picks through knockout bracket
   ─ Compare against actual results
   ─ Score Predictions for all scheduled matches
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
          {pick === "home" && !isFinished && <span className="pred-pick-dot" />}
          {isFinished && pick === "home" && (
            <span className={`pred-result-badge ${isCorrect ? "correct" : "wrong"}`}>
              {isCorrect ? "✓" : "✗"}
            </span>
          )}
        </button>

        {/* VS divider */}
        <div className="pred-vs-divider">
          <span className="pred-vs-text">
            {isFinished && result ? `${result.homeScore} – ${result.awayScore}` : "VS"}
          </span>
        </div>

        {/* Away */}
        <button
          className={`pred-team-btn${pick === "away" ? " active" : ""}${isFinished && !isCorrect && pick === "away" ? " wrong" : ""}${isFinished && isCorrect && pick === "away" ? " correct" : ""}`}
          onClick={() => onPick(match.id, "away")}
          disabled={isFinished}
        >
          <TeamFlag team={!away.isPlaceholder ? away.name : ""} />
          <span className="pred-team-name">{away.name}</span>
          {pick === "away" && !isFinished && <span className="pred-pick-dot" />}
          {isFinished && pick === "away" && (
            <span className={`pred-result-badge ${isCorrect ? "correct" : "wrong"}`}>
              {isCorrect ? "✓" : "✗"}
            </span>
          )}
        </button>
      </div>
      <div className="pred-match-meta">
        <span>{formatISTDate(match.isoIST)} · {formatISTTime(match.isoIST)}</span>
        {isFinished && <span className="pred-actual-score">FT</span>}
      </div>
    </div>
  );
}

/* ────────── Score Predictor Stats Dashboard ─────────────────── */
function ScoreStatsBar({ stats }) {
  if (stats.total === 0) return null;

  const percentage = stats.maxPoints > 0
    ? Math.round((stats.points / stats.maxPoints) * 100)
    : 0;

  return (
    <div className="sp-stats-bar">
      <div className="sp-stats-summary">
        <div className="sp-stats-points">
          <span className="sp-stats-pts-value">{stats.points}</span>
          <span className="sp-stats-pts-label">pts{stats.maxPoints > 0 ? ` / ${stats.maxPoints}` : ""}</span>
        </div>
        {stats.evaluated > 0 && (
          <div className="sp-stats-breakdown">
            {stats.exact > 0 && (
              <span className="sp-stat-chip sp-chip-exact">🎯 {stats.exact}</span>
            )}
            {stats.correctGD > 0 && (
              <span className="sp-stat-chip sp-chip-gd">✅ {stats.correctGD}</span>
            )}
            {stats.correctResult > 0 && (
              <span className="sp-stat-chip sp-chip-result">👍 {stats.correctResult}</span>
            )}
            {stats.incorrect > 0 && (
              <span className="sp-stat-chip sp-chip-wrong">❌ {stats.incorrect}</span>
            )}
          </div>
        )}
      </div>
      {stats.evaluated > 0 && (
        <div className="sp-stats-progress">
          <div className="sp-stats-progress-track">
            <div className="sp-stats-progress-fill" style={{ width: `${percentage}%` }} />
          </div>
          <span className="sp-stats-progress-label">{percentage}% accuracy</span>
        </div>
      )}
      <div className="sp-stats-meta">
        <span>{stats.total} predicted</span>
        <span>{stats.evaluated} evaluated</span>
        <span>{stats.total - stats.evaluated} pending</span>
      </div>
    </div>
  );
}

/* ────────── Score Predictor Filter Buttons ────────────────────── */
function ScoreFilterBar({ filter, setFilter, matchCounts }) {
  return (
    <div className="sp-filter-bar">
      <button
        className={`sp-filter-btn${filter === "all" ? " active" : ""}`}
        onClick={() => setFilter("all")}
      >
        All ({matchCounts.all})
      </button>
      <button
        className={`sp-filter-btn${filter === "scheduled" ? " active" : ""}`}
        onClick={() => setFilter("scheduled")}
      >
        Upcoming ({matchCounts.scheduled})
      </button>
      <button
        className={`sp-filter-btn${filter === "live" ? " active" : ""}`}
        onClick={() => setFilter("live")}
      >
        Live ({matchCounts.live})
      </button>
      <button
        className={`sp-filter-btn${filter === "finished" ? " active" : ""}`}
        onClick={() => setFilter("finished")}
      >
        Finished ({matchCounts.finished})
      </button>
    </div>
  );
}

/* ────────── Main Predictor Page ─────────────────────────────────── */
export default function Predictor({ results }) {
  const [preds, setPreds] = useState(() => loadPredictions());
  const [scorePreds, setScorePreds] = useState(() => loadScorePredictions());
  const [activeTab, setActiveTab] = useState("scores");
  const [scoreFilter, setScoreFilter] = useState("all");

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

  const handleScoreChange = useCallback(
    (matchId, homeScore, awayScore) => {
      setScorePreds((prev) => {
        const next = setScorePrediction(prev, matchId, homeScore, awayScore);
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
  const scoreStats = useMemo(() => calculateScoreAccuracy(scorePreds, results), [scorePreds, results]);

  const hasPredictions = Object.keys(preds).length > 0;

  // All matches with both teams resolved (group stage matches)
  const teamMatches = useMemo(
    () => MATCHES.filter((m) => m.home?.type === "team" && m.away?.type === "team"),
    []
  );

  // Count by status for filter bar
  const matchCounts = useMemo(() => {
    const counts = { all: teamMatches.length, scheduled: 0, live: 0, finished: 0 };
    teamMatches.forEach((m) => {
      const status = getMatchStatus(m, results);
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [teamMatches, results]);

  // Filtered matches for score predictor
  const filteredMatches = useMemo(() => {
    if (scoreFilter === "all") return teamMatches;
    return teamMatches.filter((m) => getMatchStatus(m, results) === scoreFilter);
  }, [teamMatches, scoreFilter, results]);

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

  return (
    <div className="pred-page">
      {/* Header */}
      <div className="pred-hero">
        <h1 className="pred-title">Predictor</h1>
        <p className="pred-subtitle">
          Predict exact scores for upcoming matches and pick knockout winners. Earn points for accuracy!
        </p>
        {/* Show bracket accuracy if on knockout tab */}
        {activeTab === "knockout" && hasPredictions && (
          <div className="pred-accuracy-bar">
            <span className="pred-accuracy-label">Bracket Accuracy</span>
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
          className={`pred-tab${activeTab === "scores" ? " active" : ""}`}
          onClick={() => setActiveTab("scores")}
        >
          ⚽ Score Predictions
        </button>
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

      {/* ── SCORE PREDICTIONS ── */}
      {activeTab === "scores" && (
        <div className="sp-section">
          {/* Points legend */}
          <div className="sp-legend">
            <span className="sp-legend-item">🎯 Exact Score = 3 pts</span>
            <span className="sp-legend-item">✅ Correct GD = 2 pts</span>
            <span className="sp-legend-item">👍 Correct Result = 1 pt</span>
            <span className="sp-legend-item">❌ Incorrect = 0 pts</span>
          </div>

          {/* Stats bar */}
          <ScoreStatsBar stats={scoreStats} />

          {/* Filter bar */}
          <ScoreFilterBar
            filter={scoreFilter}
            setFilter={setScoreFilter}
            matchCounts={matchCounts}
          />

          {/* Reset button */}
          {scoreStats.total > 0 && (
            <div className="pred-actions">
              <button
                className="pred-reset-btn"
                onClick={() => {
                  if (confirm("Clear all score predictions?")) {
                    localStorage.removeItem("wc2026_score_predictions");
                    setScorePreds({});
                  }
                }}
              >
                Reset All Predictions
              </button>
            </div>
          )}

          {/* Match cards */}
          <div className="sp-matches-grid">
            {filteredMatches.map((m) => (
              <ScorePredictorCard
                key={m.id}
                match={m}
                prediction={scorePreds[m.id]}
                result={results[m.id]}
                onScoreChange={handleScoreChange}
              />
            ))}
            {filteredMatches.length === 0 && (
              <div className="sp-empty">
                No matches found for this filter.
              </div>
            )}
          </div>
        </div>
      )}

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
