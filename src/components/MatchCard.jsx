import { FLAG_URL, FLAGS } from "../data/teams.js";
import { resolveMatchTeams } from "../lib/bracket.js";
import { formatISTTime, formatISTDate, getMatchStatus, timeUntil } from "../lib/time.js";

function TeamSide({ side, score, showScore, align }) {
  const isRight = align === "right";

  return (
    <div className="mc-team" style={isRight ? { flexDirection:"row-reverse", textAlign:"right" } : {}}>
      {side.resolved && FLAGS[side.name] ? (
        <img
          className="mc-flag"
          src={FLAG_URL(side.name)}
          alt={side.name}
        />
      ) : (
        <div className="mc-flag-placeholder">?</div>
      )}
      <span className={`mc-name${side.resolved ? "" : " tbd"}`}>
        {side.name}
      </span>
    </div>
  );
}

export default function MatchCard({ match, results }) {
  const { home, away } = resolveMatchTeams(match, results);
  const status    = getMatchStatus(match, results);
  const result    = results[match.id];
  const showScore = status !== "scheduled" && result;
  const countdown = status === "scheduled" ? timeUntil(match.isoIST) : null;
  const isLive    = status === "live";
  const isFT      = status === "finished";

  return (
    <div className={`mc-wrap${isLive ? " is-live" : ""}`}>
      {/* ── Main row ── */}
      <div className="mc-body">
        <TeamSide side={home} score={result?.homeScore} showScore={showScore} align="left" />

        {/* Center */}
        <div className="mc-center">
          {showScore ? (
            <>
              <div className="mc-score-row">
                <span className="mc-score">{result.homeScore}</span>
                <span className="mc-score-sep">—</span>
                <span className="mc-score">{result.awayScore}</span>
              </div>
              <div className={`mc-status ${isLive ? "live" : "ft"}`}>
                {isLive ? "Live" : "Full Time"}
              </div>
            </>
          ) : (
            <>
              <div className="mc-time">{formatISTTime(match.isoIST)}</div>
              <div className="mc-date">{formatISTDate(match.isoIST)}</div>
              {countdown && <div className="mc-countdown">{countdown}</div>}
            </>
          )}
        </div>

        <TeamSide side={away} score={result?.awayScore} showScore={showScore} align="right" />
      </div>

      {/* ── Footer ── */}
      <div className="mc-footer">
        <span className="mc-tag group">{match.group}</span>
        {isLive && (
          <span className="mc-tag live">
            <span style={{ width:5, height:5, background:"var(--red)", borderRadius:"50%", flexShrink:0 }} />
            Live
          </span>
        )}
        {isFT  && <span className="mc-tag ft">FT</span>}
        {match.special && <span className="mc-tag special">{match.special}</span>}
        <span className="mc-tag venue">{match.venue}</span>
      </div>
    </div>
  );
}
