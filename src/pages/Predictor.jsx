import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
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
import { decodeBracket, buildShareUrl } from "../lib/bracketShare.js";
import ShareBracketModal from "../components/ShareBracketModal.jsx";
import Confetti from "../components/Confetti.jsx";
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

/* ────────── Main Predictor Page ─────────────────────────────────── */
export default function Predictor({ results }) {
  const [preds, setPreds] = useState(() => loadPredictions());
  const [activeTab, setActiveTab] = useState("knockout");
  const [shareOpen, setShareOpen] = useState(false);
  const [importBanner, setImportBanner] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const captureRef = useRef(null);
  const didParseSharedRef = useRef(false);

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

  // ── Import shared bracket from URL on mount ───────────────────────
  useEffect(() => {
    if (didParseSharedRef.current) return;
    didParseSharedRef.current = true;

    const encoded = searchParams.get("bracket");
    if (!encoded) return;
    const decoded = decodeBracket(encoded);
    if (!decoded) return;

    // Show banner so user can choose to import (don't overwrite silently)
    setImportBanner({ preds: decoded.preds, groupPicks: decoded.groupPicks });
    // strip query string so refresh doesn't loop
    const next = new URLSearchParams(searchParams);
    next.delete("bracket");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  function acceptImport() {
    if (!importBanner) return;
    savePredictions(importBanner.preds);
    setPreds(importBanner.preds);
    localStorage.setItem("wc2026_group_picks", JSON.stringify(importBanner.groupPicks));
    setGroupPicks(importBanner.groupPicks);
    setImportBanner(null);
  }
  function rejectImport() { setImportBanner(null); }

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

  // Predicted champion = home of Final match (id=104) winner pick → resolves recursively
  const predictedChampion = useMemo(() => {
    const finalMatch = MATCHES.find(m => m.stage === "Final");
    if (!finalMatch) return null;
    const finalPick = preds[finalMatch.id];
    if (!finalPick || finalPick === "draw") return null;
    const { home, away } = resolvePredictedMatchTeams(finalMatch, preds, MATCHES);
    const winner = finalPick === "home" ? home : away;
    if (!winner || winner.isPlaceholder) return null;
    return winner.name;
  }, [preds]);

  const shareUrl = useMemo(() => buildShareUrl(preds, groupPicks), [preds, groupPicks]);

  // Confetti burst when champion changes (not on initial mount)
  const [burstKey, setBurstKey] = useState(0);
  const prevChampionRef = useRef(predictedChampion);
  useEffect(() => {
    // Only fire if there was a previous champion AND the new one is different/new
    if (predictedChampion && prevChampionRef.current !== predictedChampion) {
      if (prevChampionRef.current !== undefined) {
        setBurstKey(k => k + 1);
      }
    }
    prevChampionRef.current = predictedChampion;
  }, [predictedChampion]);

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
      {/* Import banner — appears when a shared URL contains a bracket */}
      {importBanner && (
        <div className="pred-import-banner" data-testid="pred-import-banner">
          <div className="pib-icon">📥</div>
          <div className="pib-text">
            <div className="pib-title">Someone shared a bracket with you</div>
            <div className="pib-sub">Import their picks? This will replace your current predictions.</div>
          </div>
          <div className="pib-actions">
            <button data-testid="pib-accept" className="pib-btn primary" onClick={acceptImport}>Import</button>
            <button data-testid="pib-reject" className="pib-btn" onClick={rejectImport}>Keep mine</button>
          </div>
        </div>
      )}

      <div ref={captureRef} className="pred-capture-wrap">
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
        {predictedChampion && (
          <div className="pred-champion-badge" data-testid="pred-champion-badge">
            <span className="pcb-trophy">🏆</span>
            <span>Your champion: <strong>{predictedChampion}</strong></span>
            {burstKey > 0 && <Confetti key={burstKey} count={42} duration={1.6} />}
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
            data-testid="pred-share-btn"
            className="pred-share-btn"
            onClick={() => setShareOpen(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share Bracket
          </button>
          <button
            data-testid="pred-reset-btn"
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
      {!hasPredictions && activeTab === "knockout" && (
        <div className="pred-actions">
          <button
            data-testid="pred-share-btn-empty"
            className="pred-share-btn"
            onClick={() => setShareOpen(true)}
            style={{ opacity: 0.6 }}
            title="Make picks first to share a meaningful bracket"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share Bracket
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
      </div>{/* /pred-capture-wrap */}

      <ShareBracketModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        shareUrl={shareUrl}
        captureRef={captureRef}
        winnerName={predictedChampion}
      />
    </div>
  );
}
