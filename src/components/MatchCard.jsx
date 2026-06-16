import { useState, useCallback } from "react";
import { FLAG_URL, FLAGS } from "../data/teams.js";
import { resolveMatchTeams } from "../lib/bracket.js";
import { formatISTTime, formatISTDate, getMatchStatus, timeUntil } from "../lib/time.js";
import { useMatchDetail } from "../lib/useWC.js";
import LiveMatchPanel from "./LiveMatchPanel.jsx";

function TeamSide({ side, align }) {
  const isRight = align === "right";
  return (
    <div className="mc-team" style={isRight ? { flexDirection:"row-reverse", textAlign:"right" } : {}}>
      {side.resolved && (FLAGS[side.name] || side.logo) ? (
        <img
          className="mc-flag"
          src={side.logo || FLAG_URL(side.name)}
          alt={side.name}
          onError={e => { if (FLAGS[side.name]) e.target.src = FLAG_URL(side.name); }}
        />
      ) : (
        <div className="mc-flag-placeholder">?</div>
      )}
      <span className={`mc-name${side.resolved ? "" : " tbd"}`}>{side.name}</span>
    </div>
  );
}

const ChevronIcon = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: "transform 0.25s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const LiveDot = () => (
  <span className="mc-live-dot" aria-label="Live" />
);

function ShareButton({ match, home, away, result, status }) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async (e) => {
    e.stopPropagation();
    const scoreText = result ? `${result.homeScore}–${result.awayScore}` : "vs";
    const statusText = status === "live" ? " [LIVE]" : status === "finished" ? " FT" : "";
    const text = `${home.name} ${scoreText} ${away.name}${statusText} — FIFA World Cup 2026`;
    const url = window.location.href;

    if (navigator.share) {
      try { await navigator.share({ title: text, url }); return; } catch {}
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [match, home, away, result, status]);

  return (
    <button className="mc-share-btn" onClick={handleShare} title="Share match" aria-label="Share match">
      {copied ? (
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
          <path d="M3 8l3 3 7-7" stroke="var(--green-bright)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
          <circle cx="12" cy="3" r="2" stroke="currentColor" strokeWidth="1.4"/>
          <circle cx="4" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
          <circle cx="12" cy="13" r="2" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M6 7l4.5-3M6 9l4.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      )}
      <span>{copied ? "Copied!" : "Share"}</span>
    </button>
  );
}

export default function MatchCard({ match, results, apiFixtureId, statsMatchId }) {
  const [open, setOpen] = useState(false);

  const { home, away } = resolveMatchTeams(match, results);
  const status    = getMatchStatus(match, results);
  const result    = results[match.id];
  const showScore = status !== "scheduled" && result;
  const countdown = status === "scheduled" ? timeUntil(match.isoIST) : null;
  const isLive    = status === "live";
  const isFT      = status === "finished";
  const elapsed   = result?.elapsed;
  const statusShort = result?.statusShort;
  const hasData   = (isFT || isLive) && result;

  // React Query auto-fetches when apiFixtureId is set — no manual load() call needed
  const { events, stats, lineups, loading: detailLoading, load } = useMatchDetail(
    open ? apiFixtureId : null
  );

  function handleToggle() {
    if (!hasData) return;
    setOpen((prev) => !prev);
  }

  return (
    <div className={`mc-wrap${isLive ? " is-live" : ""}${open ? " mc-expanded" : ""}`}>
      {/* ── Main row ── */}
      <div className="mc-body" onClick={handleToggle} style={hasData ? { cursor: "pointer" } : {}}>
        <TeamSide side={home} align="left" />

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
                {isLive ? (
                  <><LiveDot />{statusShort === 'HT' ? 'HT' : `${elapsed}'`}</>
                ) : (
                  statusShort === 'AET' ? 'AET' : statusShort === 'PEN' ? 'Pens' : 'Full Time'
                )}
              </div>
              {result.halftime && !isLive && (
                <div className="mc-ht">HT {result.halftime.home}–{result.halftime.away}</div>
              )}
            </>
          ) : (
            <>
              <div className="mc-time">{formatISTTime(match.isoIST)}</div>
              <div className="mc-date">{formatISTDate(match.isoIST)}</div>
              {countdown && <div className="mc-countdown">{countdown}</div>}
            </>
          )}
        </div>

        <TeamSide side={away} align="right" />
      </div>

      {/* ── Footer ── */}
      <div className="mc-footer" onClick={handleToggle} style={hasData ? { cursor: "pointer" } : {}}>
        {match.group && <span className="mc-tag group">{match.group}</span>}
        {isLive && (
          <span className="mc-tag live">
            <span style={{ width:5, height:5, background:"var(--red)", borderRadius:"50%", flexShrink:0 }} />
            Live
          </span>
        )}
        {isFT  && <span className="mc-tag ft">FT</span>}
        {match.special && <span className="mc-tag special">{match.special}</span>}
        <span className="mc-tag venue">{match.venue}</span>
        {hasData && (
          <span className="mc-tag stats-toggle">
            <ChevronIcon open={open} />
            {open ? "Hide" : "Stats & Events"}
          </span>
        )}
        {apiFixtureId && (
          <span className="mc-tag api-badge" title="Live data from API-Football">◉ Live</span>
        )}
        <ShareButton match={match} home={home} away={away} result={result} status={status} />
      </div>

      {/* ── Stats drawer ── */}
      {hasData && open && (
        <div className="mc-stats-drawer">
          <LiveMatchPanel
            result={result}
            homeTeam={home.name}
            awayTeam={away.name}
            matchId={match.id}
            apiFixtureId={apiFixtureId}
            statsMatchId={statsMatchId}
            events={events}
            stats={stats}
            lineups={lineups}
            loading={detailLoading}
            homeLogo={result.homeLogo || (FLAGS[home.name] ? FLAG_URL(home.name) : null)}
            awayLogo={result.awayLogo || (FLAGS[away.name] ? FLAG_URL(away.name) : null)}
            onRetry={() => load(true)}
          />
        </div>
      )}
    </div>
  );
}
