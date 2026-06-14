import { useState, useEffect } from "react";

function usePlayers() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("/data/players.json")
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, []);
  return data;
}

const MEDAL = ["🥇", "🥈", "🥉"];

const TEAM_FLAG = {
  "Brazil": "🇧🇷", "Germany": "🇩🇪", "West Germany": "🇩🇪", "France": "🇫🇷",
  "Argentina": "🇦🇷", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Netherlands": "🇳🇱", "Italy": "🇮🇹",
  "Hungary": "🇭🇺", "Poland": "🇵🇱", "Portugal": "🇵🇹", "Spain": "🇪🇸",
  "Czech Republic": "🇨🇿", "Yugoslavia": "🇷🇸", "Uruguay": "🇺🇾",
  "USA": "🇺🇸", "Norway": "🇳🇴", "Japan": "🇯🇵", "Sweden": "🇸🇪",
  "China": "🇨🇳", "Brazil (W)": "🇧🇷", "Canada": "🇨🇦", "Australia": "🇦🇺",
  "South Korea": "🇰🇷", "Russia": "🇷🇺", "Cameroon": "🇨🇲",
};

function StatsBar({ players }) {
  const totalGoals = players.reduce((s, p) => s + (p.goals || 0), 0);
  const totalMatches = players.reduce((s, p) => s + (p.matches || 0), 0);
  const avgGoals = totalMatches > 0 ? (totalGoals / totalMatches).toFixed(2) : "—";

  return (
    <div className="atp-stats-bar">
      <div className="atp-stat">
        <div className="atp-stat-value">{players.length}</div>
        <div className="atp-stat-label">Scorers</div>
      </div>
      <div className="atp-stat-divider" />
      <div className="atp-stat">
        <div className="atp-stat-value">{totalGoals.toLocaleString()}</div>
        <div className="atp-stat-label">Total Goals</div>
      </div>
      <div className="atp-stat-divider" />
      <div className="atp-stat">
        <div className="atp-stat-value">{totalMatches.toLocaleString()}</div>
        <div className="atp-stat-label">Total Appearances</div>
      </div>
      <div className="atp-stat-divider" />
      <div className="atp-stat">
        <div className="atp-stat-value">{avgGoals}</div>
        <div className="atp-stat-label">Goals / Game</div>
      </div>
    </div>
  );
}

export default function AllTimePlayers() {
  const [gender, setGender] = useState("men");
  const [search, setSearch] = useState("");
  const data = usePlayers();

  if (!data) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--text-tertiary)" }}>
        Loading player data…
      </div>
    );
  }

  const pool = (gender === "men" ? data.men : data.women) || [];

  const filtered = search.trim()
    ? pool.filter(p =>
        (p.player || p.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.team || "").toLowerCase().includes(search.toLowerCase())
      )
    : pool;

  return (
    <div className="atp-page">
      <div className="atp-header">
        <div>
          <h1 className="atp-title">All-Time Players</h1>
          <p className="atp-subtitle">World Cup Goal Scorers · Historical Records</p>
        </div>
      </div>

      {/* Gender toggle */}
      <div className="atp-toggle-wrap">
        <button
          className={`atp-toggle-btn ${gender === "men" ? "atp-toggle-btn--active" : ""}`}
          onClick={() => { setGender("men"); setSearch(""); }}
        >
          ⚽ Men's
        </button>
        <button
          className={`atp-toggle-btn ${gender === "women" ? "atp-toggle-btn--active atp-toggle-btn--women" : ""}`}
          onClick={() => { setGender("women"); setSearch(""); }}
        >
          ⚽ Women's
        </button>
      </div>

      {/* Stats summary */}
      {pool.length > 0 && <StatsBar players={pool} />}

      {/* Search */}
      <div className="atp-search-wrap">
        <div className="atp-search-icon">🔍</div>
        <input
          className="atp-search"
          type="text"
          placeholder="Search player or country…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="atp-search-clear" onClick={() => setSearch("")}>✕</button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-tertiary)" }}>
          No players found for "{search}"
        </div>
      ) : (
        <div className="atp-table-wrap">
          <table className="atp-table">
            <thead>
              <tr>
                <th className="atp-th-rank">#</th>
                <th className="atp-th-name">Player</th>
                <th className="atp-th-country">Country</th>
                <th title="Total goals">Goals</th>
                <th title="Penalty goals" className="atp-th-hide-sm">Pens</th>
                <th title="Appearances" className="atp-th-hide-sm">Apps</th>
                <th title="Tournaments played" className="atp-th-hide-sm">Tourn.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const name = p.player || p.name;
                const flag = TEAM_FLAG[p.team] || "";
                const originalRank = pool.indexOf(p) + 1;
                const rank = search ? originalRank : i + 1;
                return (
                  <tr key={name + (p.team || "")} className={`atp-row ${rank <= 3 ? "atp-row--top" : ""}`}>
                    <td className="atp-td-rank">
                      {rank <= 3 ? MEDAL[rank - 1] : <span className="atp-rank-num">{rank}</span>}
                    </td>
                    <td className="atp-td-name">
                      <span className="atp-player-name">{name}</span>
                      {p.active && <span className="atp-badge-active">Active</span>}
                    </td>
                    <td className="atp-td-country">
                      <span className="atp-flag">{flag}</span>
                      <span className="atp-team-name">{p.team}</span>
                    </td>
                    <td className="atp-td-goals">
                      <span className="atp-goals-num">{p.goals ?? "—"}</span>
                    </td>
                    <td className="atp-td-hide-sm">{p.penaltyGoals ?? p.pens ?? "—"}</td>
                    <td className="atp-td-hide-sm">{p.matches ?? p.apps ?? "—"}</td>
                    <td className="atp-td-hide-sm">{p.tournaments ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="atp-footer-note">
        Showing {filtered.length} of {pool.length} records · {gender === "men" ? "Men's" : "Women's"} FIFA World Cup
      </div>
    </div>
  );
}
