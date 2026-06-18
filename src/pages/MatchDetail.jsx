import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MATCHES } from '../data/matches.js';
import { TEAMS } from '../data/squads.js';
import { getVenue } from '../data/venues.js';
import { resolveMatchTeams } from '../lib/bracket.js';
import { getMatchStatus } from '../lib/time.js';
import LiveMatchPanel from '../components/LiveMatchPanel.jsx';

const FLAG_URL = (name) => `https://flagcdn.com/w40/${name?.toLowerCase().replace(/ /g, '-')}.png`;

const WMO_LABELS = {
  0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',
  45:'Foggy',48:'Icy fog',51:'Light drizzle',53:'Moderate drizzle',55:'Dense drizzle',
  61:'Light rain',63:'Moderate rain',65:'Heavy rain',
  71:'Light snow',73:'Moderate snow',75:'Heavy snow',
  80:'Rain showers',81:'Heavy showers',82:'Violent showers',
  95:'Thunderstorm',96:'Thunderstorm w/ hail',99:'Thunderstorm w/ heavy hail',
};
const WMO_ICON = {
  0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',
  51:'🌦️',53:'🌦️',55:'🌧️',61:'🌧️',63:'🌧️',65:'🌧️',
  71:'🌨️',73:'🌨️',75:'❄️',80:'🌧️',81:'🌧️',82:'⛈️',
  95:'⛈️',96:'⛈️',99:'⛈️',
};

function useWeather(lat, lon, enabled) {
  return useQuery({
    queryKey: ['weather', lat, lon],
    queryFn: async () => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m&timezone=auto`;
      const r = await fetch(url);
      if (!r.ok) throw new Error('weather fetch failed');
      return r.json();
    },
    enabled: !!enabled && lat != null && lon != null,
    staleTime: 15 * 60_000,
  });
}

function StadiumCard({ venueStr }) {
  const venue = getVenue(venueStr);
  const { data: wx } = useWeather(venue?.lat, venue?.lon, !!venue);
  const cur = wx?.current;
  const wCode = cur?.weathercode ?? -1;

  if (!venue) {
    return (
      <div className="prematch-venue-card">
        <div className="pmv-name">{venueStr}</div>
      </div>
    );
  }

  return (
    <div className="prematch-venue-card">
      <div className="pmv-header">
        <div className="pmv-icon">🏟️</div>
        <div>
          <div className="pmv-name">{venueStr.split(',')[0]}</div>
          <div className="pmv-location">{venue.city}, {venue.country}</div>
        </div>
      </div>
      <div className="pmv-stats">
        <div className="pmv-stat">
          <span className="pmv-stat-label">Capacity</span>
          <span className="pmv-stat-value">{venue.capacity.toLocaleString()}</span>
        </div>
        <div className="pmv-stat">
          <span className="pmv-stat-label">Surface</span>
          <span className="pmv-stat-value">{venue.surface}</span>
        </div>
        <div className="pmv-stat">
          <span className="pmv-stat-label">Opened</span>
          <span className="pmv-stat-value">{venue.opened}</span>
        </div>
      </div>
      {cur && (
        <div className="pmv-weather">
          <div className="pmv-wx-icon">{WMO_ICON[wCode] ?? '🌡️'}</div>
          <div className="pmv-wx-temp">{Math.round(cur.temperature_2m)}°C</div>
          <div className="pmv-wx-desc">{WMO_LABELS[wCode] ?? 'N/A'}</div>
          <div className="pmv-wx-extras">
            <span>💧 {cur.relativehumidity_2m}%</span>
            <span>💨 {Math.round(cur.windspeed_10m)} km/h</span>
          </div>
        </div>
      )}
    </div>
  );
}

const POS_ORDER = ['GK', 'DF', 'MF', 'FW'];
const POS_LABEL = { GK: 'Goalkeepers', DF: 'Defenders', MF: 'Midfielders', FW: 'Forwards' };

function SquadLineup({ teamName }) {
  const team = TEAMS.find(t => t.name === teamName);
  if (!team?.players?.length) return (
    <div className="pmq-empty">Squad not available</div>
  );

  const byPos = {};
  POS_ORDER.forEach(p => { byPos[p] = []; });
  team.players.forEach(p => {
    const pos = p.position?.toUpperCase();
    if (byPos[pos]) byPos[pos].push(p);
  });

  return (
    <div className="pmq-squad">
      {POS_ORDER.map(pos => {
        const players = byPos[pos];
        if (!players.length) return null;
        return (
          <div key={pos} className="pmq-pos-group">
            <div className="pmq-pos-label">{POS_LABEL[pos]}</div>
            <div className="pmq-players">
              {players.slice(0, pos === 'GK' ? 2 : pos === 'DF' ? 5 : pos === 'MF' ? 5 : 4).map(p => (
                <div key={p.id} className="pmq-player">
                  <div className="pmq-pos-badge">{pos}</div>
                  <div className="pmq-name">{p.name}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

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

  const match = MATCHES.find(m => String(m.id) === id);
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
      ) : status === 'scheduled' ? (
        <div className="prematch-wrap">
          {/* Venue + Weather */}
          <div className="prematch-section-head">Stadium &amp; Weather</div>
          <StadiumCard venueStr={match.venue} />

          {/* Squads */}
          {!home.isPlaceholder && !away.isPlaceholder && (
            <>
              <div className="prematch-section-head">Expected Lineup</div>
              <div className="prematch-lineups">
                <div className="prematch-team-squad">
                  <div className="prematch-team-header">
                    <img className="pmq-flag" src={FLAG_URL(home.name)} alt={home.name} onError={e => { e.target.style.display='none'; }} />
                    <span>{home.name}</span>
                  </div>
                  <SquadLineup teamName={home.name} />
                </div>
                <div className="prematch-team-squad">
                  <div className="prematch-team-header">
                    <img className="pmq-flag" src={FLAG_URL(away.name)} alt={away.name} onError={e => { e.target.style.display='none'; }} />
                    <span>{away.name}</span>
                  </div>
                  <SquadLineup teamName={away.name} />
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="md-empty">
          <div>No stats available yet</div>
        </div>
      )}
    </div>
  );
}
