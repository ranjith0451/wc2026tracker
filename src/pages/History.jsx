import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function useTournamentHistory() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("/data/history.json")
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, []);
  return data;
}

const FLAG_MAP = {
  "Uruguay": "🇺🇾", "Italy": "🇮🇹", "France": "🇫🇷", "Brazil": "🇧🇷",
  "West Germany": "🇩🇪", "Germany": "🇩🇪", "Sweden": "🇸🇪", "Chile": "🇨🇱",
  "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Mexico": "🇲🇽", "Argentina": "🇦🇷", "Spain": "🇪🇸",
  "South Korea & Japan": "🇰🇷🇯🇵", "South Africa": "🇿🇦", "Russia": "🇷🇺",
  "Qatar": "🇶🇦", "USA": "🇺🇸", "Switzerland": "🇨🇭",
};

const WINNER_FLAG = {
  "Uruguay": "🇺🇾", "Italy": "🇮🇹", "Brazil": "🇧🇷", "West Germany": "🇩🇪",
  "Germany": "🇩🇪", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Argentina": "🇦🇷", "France": "🇫🇷",
  "Spain": "🇪🇸", "Czechia": "🇨🇿", "Czechoslovakia": "🇨🇿", "Netherlands": "🇳🇱",
};

function WinnerBar({ summaries }) {
  const counts = {};
  for (const s of summaries) {
    if (s.winner) counts[s.winner] = (counts[s.winner] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;
  return (
    <div className="hist-winner-bar">
      <h3 className="hist-section-title">All-Time Champions</h3>
      <div className="hist-champ-grid">
        {sorted.map(([team, wins]) => (
          <div key={team} className="hist-champ-item">
            <div className="hist-champ-flag">{WINNER_FLAG[team] || "🏆"}</div>
            <div className="hist-champ-name">{team}</div>
            <div className="hist-champ-count">{wins}x</div>
            <div className="hist-champ-bar-wrap">
              <div className="hist-champ-bar" style={{ width: `${(wins / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TournamentCard({ t, onClick, active }) {
  return (
    <div className={`hist-card ${active ? "hist-card--active" : ""}`} onClick={onClick}>
      <div className="hist-card-year">{t.year}</div>
      <div className="hist-card-host">
        <span>{FLAG_MAP[t.host] || "🌍"}</span>
        <span>{t.host}</span>
      </div>
      <div className="hist-card-winner">
        {t.winner ? <>
          <span className="hist-card-trophy">🏆</span>
          <span>{WINNER_FLAG[t.winner] || ""} {t.winner}</span>
        </> : <span style={{ color: "var(--text-tertiary)" }}>—</span>}
      </div>
      <div className="hist-card-stats">
        <span>{t.matches}M</span>
        <span>{t.goals}G</span>
        <span>{t.teams}T</span>
      </div>
    </div>
  );
}

function TournamentDetail({ tournament }) {
  const [tab, setTab] = useState("results");
  if (!tournament) return null;

  const groupMatches = (tournament.matches || []).filter(m => m.group);
  const knockoutMatches = (tournament.matches || []).filter(m => !m.group);

  // Group stage standings
  const standings = {};
  for (const m of groupMatches) {
    [m.home, m.away].forEach(t => {
      if (!standings[t]) standings[t] = { team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, group: null };
    });
    const { home, away, homeScore: hs, awayScore: as, group } = m;
    if (hs == null) continue;
    standings[home].group = group;
    standings[away].group = group;
    standings[home].p++; standings[away].p++;
    standings[home].gf += hs; standings[home].ga += as;
    standings[away].gf += as; standings[away].ga += hs;
    if (hs > as) { standings[home].w++; standings[home].pts += 3; standings[away].l++; }
    else if (as > hs) { standings[away].w++; standings[away].pts += 3; standings[home].l++; }
    else { standings[home].d++; standings[away].d++; standings[home].pts++; standings[away].pts++; }
  }

  const groups = {};
  for (const row of Object.values(standings)) {
    if (!groups[row.group]) groups[row.group] = [];
    groups[row.group].push(row);
  }
  for (const g of Object.values(groups)) {
    g.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
  }

  const topScorers = {};
  for (const m of tournament.matches || []) {
    for (const s of m.scorers || []) {
      if (s.ownGoal) continue;
      if (!topScorers[s.player]) topScorers[s.player] = { player: s.player, goals: 0, team: s.team };
      topScorers[s.player].goals++;
    }
  }
  const scorerList = Object.values(topScorers).sort((a, b) => b.goals - a.goals).slice(0, 10);

  return (
    <div className="hist-detail">
      <div className="hist-detail-header">
        <div>
          <div className="hist-detail-year">{tournament.year} {FLAG_MAP[tournament.host] || "🌍"} {tournament.host}</div>
          <div className="hist-detail-meta">
            {tournament.matches?.length} matches · {tournament.matches?.reduce((s, m) => s + (m.homeScore || 0) + (m.awayScore || 0), 0)} goals
          </div>
        </div>
        {tournament.winner && (
          <div className="hist-detail-winner">
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 2 }}>CHAMPION</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {WINNER_FLAG[tournament.winner] || "🏆"} {tournament.winner}
            </div>
            {tournament.runnerUp && <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>vs {tournament.runnerUp}</div>}
          </div>
        )}
      </div>

      <div className="hist-tabs">
        {[["results", "Results"], ["standings", "Standings"], ["scorers", "Top Scorers"]].map(([k, l]) => (
          <button key={k} className={`hist-tab ${tab === k ? "hist-tab--active" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "results" && (
        <div className="hist-results">
          {Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([g, _]) => {
            const gms = groupMatches.filter(m => m.group === g);
            return (
              <div key={g} className="hist-group-results">
                <div className="hist-group-label">Group {g}</div>
                {gms.map((m, i) => (
                  <MatchRow key={i} m={m} />
                ))}
              </div>
            );
          })}
          {knockoutMatches.length > 0 && (
            <div className="hist-group-results">
              <div className="hist-group-label">Knockout Stage</div>
              {knockoutMatches.map((m, i) => <MatchRow key={i} m={m} />)}
            </div>
          )}
        </div>
      )}

      {tab === "standings" && (
        <div className="hist-standings">
          {Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([g, rows]) => (
            <div key={g} className="hist-standing-group">
              <div className="hist-group-label">Group {g}</div>
              <table className="hist-table">
                <thead>
                  <tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.team} className={i < 2 ? "hist-row-qualified" : ""}>
                      <td className="hist-team-cell">{row.team}</td>
                      <td>{row.p}</td><td>{row.w}</td><td>{row.d}</td><td>{row.l}</td>
                      <td>{row.gf}</td><td>{row.ga}</td>
                      <td>{row.gf - row.ga > 0 ? "+" : ""}{row.gf - row.ga}</td>
                      <td className="hist-pts">{row.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {tab === "scorers" && (
        <div className="hist-scorer-list">
          {scorerList.length === 0 ? (
            <div style={{ padding: 24, color: "var(--text-tertiary)", textAlign: "center" }}>Scorer data not available for this tournament</div>
          ) : scorerList.map((s, i) => (
            <div key={s.player} className="hist-scorer-row">
              <span className="hist-scorer-rank">{i + 1}</span>
              <span className="hist-scorer-name">{s.player}</span>
              <span className="hist-scorer-team">{s.team}</span>
              <span className="hist-scorer-goals">{s.goals} ⚽</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchRow({ m }) {
  const isKnockout = !m.group;
  const hasResult = m.homeScore != null;
  if (!hasResult) return null;
  const homeWin = m.homeScore > m.awayScore;
  const awayWin = m.awayScore > m.homeScore;
  return (
    <div className="hist-match-row">
      <span className={`hist-match-team ${homeWin ? "hist-winner" : ""}`}>{m.home}</span>
      <span className="hist-match-score">
        {m.homeScore}–{m.awayScore}
        {m.aet && <sup> AET</sup>}
        {m.pen && <sup> ({m.penHome}-{m.penAway} pens)</sup>}
      </span>
      <span className={`hist-match-team hist-match-team--away ${awayWin ? "hist-winner" : ""}`}>{m.away}</span>
    </div>
  );
}

export default function History() {
  const data = useTournamentHistory();
  const [selectedYear, setSelectedYear] = useState(null);

  if (!data) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60, color: "var(--text-tertiary)" }}>
      Loading historical data…
    </div>
  );

  const selected = selectedYear
    ? data.tournaments.find(t => t.year === selectedYear)
    : null;

  return (
    <div className="hist-page">
      <div className="hist-header">
        <h1 className="hist-title">World Cup History</h1>
        <p className="hist-subtitle">1930 – 2022 · {data.summaries.length} Tournaments · Data: openfootball/worldcup</p>
      </div>

      <WinnerBar summaries={data.summaries} />

      <div className="hist-top-scorers-global">
        <h3 className="hist-section-title">All-Time Top Scorers</h3>
        <div className="hist-scorer-grid">
          {data.topScorers.slice(0, 15).map((s, i) => (
            <div key={s.player} className="hist-scorer-card">
              <span className="hist-scorer-rank">#{i + 1}</span>
              <span className="hist-scorer-name">{s.player}</span>
              <span className="hist-scorer-goals">{s.goals}⚽</span>
            </div>
          ))}
        </div>
      </div>

      <h3 className="hist-section-title">Tournaments</h3>
      <div className="hist-timeline">
        {data.summaries.map(t => (
          <TournamentCard
            key={t.year}
            t={t}
            active={selectedYear === t.year}
            onClick={() => setSelectedYear(selectedYear === t.year ? null : t.year)}
          />
        ))}
      </div>

      {selected && <TournamentDetail tournament={selected} />}
    </div>
  );
}
