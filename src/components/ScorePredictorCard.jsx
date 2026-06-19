import { useState, useCallback, memo } from "react";
import TeamFlag from "./TeamFlag.jsx";
import { formatISTDate, formatISTTime, getMatchStatus } from "../lib/time.js";
import { evaluatePrediction, getAccuracyLabel, getAccuracyEmoji, getPoints } from "../lib/scorePredictor.js";

/**
 * A single match card for score prediction.
 * Shows team names, score inputs, and accuracy badge once match is finished.
 * Inputs are disabled when match is live or finished.
 */
const ScorePredictorCard = memo(function ScorePredictorCard({
  match,
  prediction,
  result,
  onScoreChange,
}) {
  const status = getMatchStatus(match, result ? { [match.id]: result } : {});
  const isLocked = status === "live" || status === "finished";
  const isLive = status === "live";
  const isFinished = status === "finished";

  // Evaluate accuracy
  const accuracy = isFinished ? evaluatePrediction(prediction, result) : null;
  const points = accuracy ? getPoints(accuracy) : null;

  // Get team names (for group stage, teams are always resolved)
  const homeName = match.home?.name || "TBD";
  const awayName = match.away?.name || "TBD";
  const isTeamMatch = match.home?.type === "team" && match.away?.type === "team";

  // Local input state for controlled inputs
  const [localHome, setLocalHome] = useState(
    prediction?.home !== undefined ? String(prediction.home) : ""
  );
  const [localAway, setLocalAway] = useState(
    prediction?.away !== undefined ? String(prediction.away) : ""
  );

  const handleHomeChange = useCallback(
    (e) => {
      const val = e.target.value;
      if (val === "" || (/^\d+$/.test(val) && Number(val) <= 20)) {
        setLocalHome(val);
        if (val !== "") {
          const awayVal = localAway !== "" ? Number(localAway) : 0;
          onScoreChange(match.id, Number(val), awayVal);
        }
      }
    },
    [match.id, localAway, onScoreChange]
  );

  const handleAwayChange = useCallback(
    (e) => {
      const val = e.target.value;
      if (val === "" || (/^\d+$/.test(val) && Number(val) <= 20)) {
        setLocalAway(val);
        if (val !== "") {
          const homeVal = localHome !== "" ? Number(localHome) : 0;
          onScoreChange(match.id, homeVal, Number(val));
        }
      }
    },
    [match.id, localHome, onScoreChange]
  );

  // Don't render non-team matches (knockout with TBD teams)
  if (!isTeamMatch) return null;

  return (
    <div
      className={`sp-card${isLive ? " sp-live" : ""}${isFinished ? " sp-finished" : ""}${accuracy ? ` sp-${accuracy}` : ""}`}
    >
      {/* Status indicator */}
      <div className="sp-card-status-bar">
        {isLive && (
          <span className="sp-status-badge sp-badge-live">
            <span className="sp-live-dot" /> LIVE
          </span>
        )}
        {isFinished && !accuracy && (
          <span className="sp-status-badge sp-badge-ft">FT</span>
        )}
        {accuracy && (
          <span className={`sp-status-badge sp-badge-${accuracy}`}>
            {getAccuracyEmoji(accuracy)} {getAccuracyLabel(accuracy)} (+{points}pt{points !== 1 ? "s" : ""})
          </span>
        )}
        {!isLocked && !prediction && (
          <span className="sp-status-badge sp-badge-pending">Predict</span>
        )}
        {!isLocked && prediction && (
          <span className="sp-status-badge sp-badge-set">✓ Set</span>
        )}
      </div>

      {/* Teams + Score inputs */}
      <div className="sp-card-body">
        {/* Home team */}
        <div className="sp-team sp-team-home">
          <TeamFlag team={homeName} className="sp-flag" />
          <span className="sp-team-name">{homeName}</span>
        </div>

        {/* Score inputs / display */}
        <div className="sp-score-area">
          {isLocked ? (
            <div className="sp-score-display">
              <span className="sp-score-predicted">
                {prediction ? `${prediction.home} - ${prediction.away}` : "—"}
              </span>
              {isFinished && result && (
                <span className="sp-score-actual">
                  FT: {result.homeScore} - {result.awayScore}
                </span>
              )}
              {isLive && (
                <span className="sp-score-locked-label">🔒 Locked</span>
              )}
            </div>
          ) : (
            <div className="sp-score-inputs">
              <input
                type="text"
                inputMode="numeric"
                className="sp-score-input"
                value={localHome}
                onChange={handleHomeChange}
                placeholder="0"
                maxLength={2}
                disabled={isLocked}
                aria-label={`${homeName} score prediction`}
              />
              <span className="sp-score-separator">–</span>
              <input
                type="text"
                inputMode="numeric"
                className="sp-score-input"
                value={localAway}
                onChange={handleAwayChange}
                placeholder="0"
                maxLength={2}
                disabled={isLocked}
                aria-label={`${awayName} score prediction`}
              />
            </div>
          )}
        </div>

        {/* Away team */}
        <div className="sp-team sp-team-away">
          <TeamFlag team={awayName} className="sp-flag" />
          <span className="sp-team-name">{awayName}</span>
        </div>
      </div>

      {/* Footer with match info */}
      <div className="sp-card-footer">
        <span className="sp-meta-group">{match.group}</span>
        <span className="sp-meta-time">
          {formatISTDate(match.isoIST)} · {formatISTTime(match.isoIST)}
        </span>
        <span className="sp-meta-venue">{match.venue}</span>
      </div>
    </div>
  );
});

export default ScorePredictorCard;
