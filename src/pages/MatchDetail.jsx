import { useParams, useNavigate } from 'react-router-dom';
import { MATCHES } from '../data/matches.js';
import { resolveMatchTeams } from '../lib/bracket.js';
import { getMatchStatus } from '../lib/time.js';
import LiveMatchPanel from '../components/LiveMatchPanel.jsx';

const FLAGS = {};
const FLAG_URL = (name) => `https://flagcdn.com/w40/${name?.toLowerCase().replace(/ /g, '-')}.png`;

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}

export default function MatchDetail({ results, statsMatchIdMap = {} }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const match = MATCHES.find(m => m.id === id);
  if (!match) {
    return (
      <div className="md-not-found">
        <div className="md-nf-icon">⚽</div>
        <div className="md-nf-text">Match not found</div>
        <button className="md-back-btn" onClick={() => navigate(-1)}>Go back</button>
      </div>
    );
  }

  const { home, away } = resolveMatchTeams(match, results);
  const result = results[id];
  const status = getMatchStatus(match, results);
  const isLive = status === 'live';
  const isFT   = status === 'finished';
  const hasData = (isFT || isLive) && result;
  const statsMatchId = statsMatchIdMap[`${home.name}|${away.name}`];

  const homeScore = result?.homeScore ?? null;
  const awayScore = result?.awayScore ?? null;
  const statusLabel = isFT
    ? (result?.statusShort === 'AET' ? 'AET' : result?.statusShort === 'PEN' ? 'PEN' : 'Full Time')
    : isLive
    ? `${result?.elapsed ?? ''}′ LIVE`
    : 'Scheduled';

  return (
    <div className="md-wrap">
      {/* Back button */}
      <button className="md-back-btn" onClick={() => navigate(-1)}>
        <BackIcon />
        Back
      </button>

      {/* Match header */}
      <div className="md-header">
        <div className="md-meta">{match.stage} · {match.venue}</div>
        <div className="md-teams">
          <div className="md-team">
            <img
              className="md-flag"
              src={result?.homeLogo || FLAG_URL(home.name)}
              alt={home.name}
              onError={e => { e.target.style.display = 'none'; }}
            />
            <span className="md-team-name">{home.name}</span>
          </div>

          <div className="md-score-block">
            {homeScore !== null ? (
              <>
                <div className="md-score">{homeScore} – {awayScore}</div>
                <div className={`md-status-badge${isLive ? ' live' : ''}`}>{statusLabel}</div>
              </>
            ) : (
              <>
                <div className="md-vs">VS</div>
                <div className="md-kickoff">
                  {new Date(match.isoIST).toLocaleString('en-IN', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    hour12: true, timeZone: 'Asia/Kolkata',
                  })} IST
                </div>
              </>
            )}
          </div>

          <div className="md-team md-team-away">
            <span className="md-team-name">{away.name}</span>
            <img
              className="md-flag"
              src={result?.awayLogo || FLAG_URL(away.name)}
              alt={away.name}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
        </div>
      </div>

      {/* Stats panel */}
      {hasData ? (
        <div className="md-panel">
          <LiveMatchPanel
            result={result}
            homeTeam={home.name}
            awayTeam={away.name}
            matchId={match.id}
            statsMatchId={statsMatchId}
            homeLogo={result.homeLogo || FLAG_URL(home.name)}
            awayLogo={result.awayLogo || FLAG_URL(away.name)}
          />
        </div>
      ) : (
        <div className="md-empty">
          <div>No stats available yet</div>
          {status === 'scheduled' && (
            <div className="md-empty-sub">
              Kicks off {new Date(match.isoIST).toLocaleString('en-IN', {
                weekday: 'short', day: 'numeric', month: 'short',
                hour: '2-digit', minute: '2-digit', hour12: true,
                timeZone: 'Asia/Kolkata',
              })} IST
            </div>
          )}
        </div>
      )}
    </div>
  );
}
