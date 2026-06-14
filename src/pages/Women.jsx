import { useState, useEffect } from "react";

function useWomenHistory() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("/data/history-v2.json")
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, []);
  return data;
}

const HOST_FLAG = {
  "China": "🇨🇳", "Sweden": "🇸🇪", "USA": "🇺🇸", "Germany": "🇩🇪",
  "Canada": "🇨🇦", "France": "🇫🇷", "Australia & New Zealand": "🇦🇺🇳🇿",
  "Australia": "🇦🇺", "New Zealand": "🇳🇿",
};

const TEAM_FLAG = {
  "USA": "🇺🇸", "Germany": "🇩🇪", "Norway": "🇳🇴", "Japan": "🇯🇵",
  "Spain": "🇪🇸", "Sweden": "🇸🇪", "China": "🇨🇳", "Brazil": "🇧🇷",
  "Netherlands": "🇳🇱", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Canada": "🇨🇦", "Australia": "🇦🇺",
  "France": "🇫🇷", "Denmark": "🇩🇰", "Argentina": "🇦🇷",
};

const WINS_LEADERBOARD = [
  { team: "USA",     flag: "🇺🇸", wins: 4 },
  { team: "Germany", flag: "🇩🇪", wins: 2 },
  { team: "Norway",  flag: "🇳🇴", wins: 1 },
  { team: "Japan",   flag: "🇯🇵", wins: 1 },
  { team: "Spain",   flag: "🇪🇸", wins: 1 },
];

function WinsLeaderboard() {
  const max = WINS_LEADERBOARD[0].wins;
  return (
    <div className="wmn-section-box">
      <h3 className="wmn-section-title">All-Time Champions</h3>
      <div className="wmn-champ-grid">
        {WINS_LEADERBOARD.map(({ team, flag, wins }) => (
          <div key={team} className="wmn-champ-item">
            <div className="wmn-champ-flag">{flag}</div>
            <div className="wmn-champ-info">
              <div className="wmn-champ-name">{team}</div>
              <div className="wmn-champ-bar-wrap">
                <div className="wmn-champ-bar" style={{ width: `${(wins / max) * 100}%` }} />
              </div>
            </div>
            <div className="wmn-champ-count">{wins}x</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TournamentCard({ t, active, onClick }) {
  return (
    <div className={`wmn-card ${active ? "wmn-card--active" : ""}`} onClick={onClick}>
      <div className="wmn-card-year">{t.year}</div>
      <div className="wmn-card-host">
        <span>{HOST_FLAG[t.host] || "🌍"}</span>
        <span>{t.host}</span>
      </div>
      <div className="wmn-card-winner">
        {t.winner
          ? <><span className="wmn-card-trophy">🏆</span><span>{TEAM_FLAG[t.winner] || ""} {t.winner}</span></>
          : <span style={{ color: "var(--text-tertiary)" }}>—</span>}
      </div>
      {t.runnerUp && (
        <div className="wmn-card-runner">
          <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Runner-up: </span>
          <span>{TEAM_FLAG[t.runnerUp] || ""} {t.runnerUp}</span>
        </div>
      )}
      {t.topScorer && (
        <div className="wmn-card-scorer">
          <span>⚽ {t.topScorer}</span>
        </div>
      )}
    </div>
  );
}

function TournamentDetail({ t }) {
  if (!t) return null;
  return (
    <div className="wmn-detail">
      <div className="wmn-detail-header">
        <div>
          <div className="wmn-detail-year">
            {t.year} {HOST_FLAG[t.host] || "🌍"} {t.host}
          </div>
          {t.teams && <div className="wmn-detail-meta">{t.teams} teams · {t.matches} matches</div>}
        </div>
        {t.winner && (
          <div className="wmn-detail-winner">
            <div className="wmn-detail-winner-label">CHAMPION</div>
            <div className="wmn-detail-winner-name">
              {TEAM_FLAG[t.winner] || "🏆"} {t.winner}
            </div>
            {t.runnerUp && <div className="wmn-detail-winner-sub">vs {TEAM_FLAG[t.runnerUp] || ""} {t.runnerUp}</div>}
          </div>
        )}
      </div>
      {t.topScorer && (
        <div className="wmn-detail-row">
          <span className="wmn-detail-label">Top Scorer</span>
          <span className="wmn-detail-value">⚽ {t.topScorer} {t.topScorerGoals ? `(${t.topScorerGoals} goals)` : ""}</span>
        </div>
      )}
      {t.attendance && (
        <div className="wmn-detail-row">
          <span className="wmn-detail-label">Attendance</span>
          <span className="wmn-detail-value">{Number(t.attendance).toLocaleString()}</span>
        </div>
      )}
      {t.finalScore && (
        <div className="wmn-detail-row">
          <span className="wmn-detail-label">Final Score</span>
          <span className="wmn-detail-value">{t.finalScore}</span>
        </div>
      )}
      {t.notes && (
        <div className="wmn-detail-notes">{t.notes}</div>
      )}
    </div>
  );
}

export default function Women() {
  const data = useWomenHistory();
  const [selectedYear, setSelectedYear] = useState(null);

  if (!data) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--text-tertiary)" }}>
        Loading Women's WC data…
      </div>
    );
  }

  const womenData = data.women;

  if (!womenData) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--text-tertiary)" }}>
        Women's tournament data not available yet.
      </div>
    );
  }

  const { tournaments = [], allTimeTopScorers = [] } = womenData;

  const selectedTournament = selectedYear
    ? tournaments.find(t => t.year === selectedYear)
    : null;

  return (
    <div className="wmn-page">
      <div className="wmn-header">
        <div className="wmn-header-badge">⚽</div>
        <div>
          <h1 className="wmn-title">Women's World Cup History</h1>
          <p className="wmn-subtitle">1991 – 2023 · 9 Tournaments</p>
        </div>
      </div>

      <WinsLeaderboard />

      {allTimeTopScorers.length > 0 && (
        <div className="wmn-section-box">
          <h3 className="wmn-section-title">All-Time Top Scorers</h3>
          <div className="wmn-scorer-grid">
            {allTimeTopScorers.slice(0, 20).map((s, i) => (
              <div key={s.player || s.name} className="wmn-scorer-card">
                <span className="wmn-scorer-rank">#{i + 1}</span>
                <span className="wmn-scorer-name">{s.player || s.name}</span>
                <span className="wmn-scorer-flag">{TEAM_FLAG[s.team] || ""}</span>
                <span className="wmn-scorer-team">{s.team}</span>
                <span className="wmn-scorer-goals">{s.goals}⚽</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 className="wmn-section-title">Tournaments</h3>
      <div className="wmn-timeline">
        {tournaments.map(t => (
          <TournamentCard
            key={t.year}
            t={t}
            active={selectedYear === t.year}
            onClick={() => setSelectedYear(selectedYear === t.year ? null : t.year)}
          />
        ))}
      </div>

      {selectedTournament && <TournamentDetail t={selectedTournament} />}
    </div>
  );
}
