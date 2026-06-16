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

// Known country map for top scorers (data has no team field)
const PLAYER_COUNTRY = {
  "Miroslav Klose": { team: "Germany", flag: "🇩🇪" },
  "Ronaldo": { team: "Brazil", flag: "🇧🇷" },
  "Gerd Müller": { team: "Germany", flag: "🇩🇪" },
  "Just Fontaine": { team: "France", flag: "🇫🇷" },
  "Lionel Messi": { team: "Argentina", flag: "🇦🇷" },
  "Pelé": { team: "Brazil", flag: "🇧🇷" },
  "Kylian Mbappé": { team: "France", flag: "🇫🇷" },
  "Sándor Kocsis": { team: "Hungary", flag: "🇭🇺" },
  "Teófilo Cubillas": { team: "Peru", flag: "🇵🇪" },
  "Helmut Rahn": { team: "Germany", flag: "🇩🇪" },
  "Thomas Müller": { team: "Germany", flag: "🇩🇪" },
  "Grzegorz Lato": { team: "Poland", flag: "🇵🇱" },
  "Gary Lineker": { team: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  "Gabriel Batistuta": { team: "Argentina", flag: "🇦🇷" },
  "Eusébio": { team: "Portugal", flag: "🇵🇹" },
  "Jürgen Klinsmann": { team: "Germany", flag: "🇩🇪" },
  "Cristiano Ronaldo": { team: "Portugal", flag: "🇵🇹" },
  "Roberto Baggio": { team: "Italy", flag: "🇮🇹" },
  "Karl-Heinz Rummenigge": { team: "Germany", flag: "🇩🇪" },
  "Uwe Seeler": { team: "Germany", flag: "🇩🇪" },
  "Jairzinho": { team: "Brazil", flag: "🇧🇷" },
  "Paolo Rossi": { team: "Italy", flag: "🇮🇹" },
  "Rivaldo": { team: "Brazil", flag: "🇧🇷" },
  "Ademir": { team: "Brazil", flag: "🇧🇷" },
  "Leônidas": { team: "Brazil", flag: "🇧🇷" },
  "Vavá": { team: "Brazil", flag: "🇧🇷" },
  "Luca Toni": { team: "Italy", flag: "🇮🇹" },
  "David Villa": { team: "Spain", flag: "🇪🇸" },
  "Harry Kane": { team: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  "Olivier Giroud": { team: "France", flag: "🇫🇷" },
  // Women
  "Marta": { team: "Brazil", flag: "🇧🇷" },
  "Birgit Prinz": { team: "Germany", flag: "🇩🇪" },
  "Abby Wambach": { team: "USA", flag: "🇺🇸" },
  "Michelle Akers": { team: "USA", flag: "🇺🇸" },
  "Sun Wen": { team: "China", flag: "🇨🇳" },
  "Bettina Wiegmann": { team: "Germany", flag: "🇩🇪" },
  "Ann Kristin Aarønes": { team: "Norway", flag: "🇳🇴" },
  "Heidi Mohr": { team: "Germany", flag: "🇩🇪" },
  "Linda Medalen": { team: "Norway", flag: "🇳🇴" },
  "Hege Riise": { team: "Norway", flag: "🇳🇴" },
  "Alex Morgan": { team: "USA", flag: "🇺🇸" },
  "Homare Sawa": { team: "Japan", flag: "🇯🇵" },
  "Cristiane": { team: "Brazil", flag: "🇧🇷" },
};

function StatsBar({ players }) {
  const totalGoals = players.reduce((s, p) => s + (p.goals || 0), 0);
  const topPlayer = players[0];
  return (
    <div className="atp-stats-bar">
      <div className="atp-stat">
        <div className="atp-stat-value">{players.length}</div>
        <div className="atp-stat-label">Scorers</div>
      </div>
      <div className="atp-stat-divider" />
      <div className="atp-stat">
        <div className="atp-stat-value">{totalGoals}</div>
        <div className="atp-stat-label">Total Goals</div>
      </div>
      <div className="atp-stat-divider" />
      <div className="atp-stat">
        <div className="atp-stat-value">{topPlayer?.goals ?? "—"}</div>
        <div className="atp-stat-label">Top Score</div>
      </div>
      <div className="atp-stat-divider" />
      <div className="atp-stat">
        <div className="atp-stat-value">{topPlayer?.name ?? "—"}</div>
        <div className="atp-stat-label">All-Time Leader</div>
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
        <div className="flp-spinner" style={{ margin: "0 auto 12px" }} />
        Loading player data…
      </div>
    );
  }

  const pool = (gender === "men" ? data.men?.topScorers : data.women?.topScorers) || [];

  const filtered = search.trim()
    ? pool.filter(p =>
        (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (PLAYER_COUNTRY[p.name]?.team || "").toLowerCase().includes(search.toLowerCase())
      )
    : pool;

  return (
    <div className="atp-page">
      <div className="atp-header">
        <h1 className="atp-title">All-Time Players</h1>
        <p className="atp-subtitle">World Cup All-Time Goal Scorers</p>
      </div>

      {/* Gender toggle */}
      <div className="atp-toggle-wrap">
        <button
          className={`atp-toggle-btn ${gender === "men" ? "atp-toggle-btn--active" : ""}`}
          onClick={() => { setGender("men"); setSearch(""); }}
        >⚽ Men's</button>
        <button
          className={`atp-toggle-btn ${gender === "women" ? "atp-toggle-btn--active atp-toggle-btn--women" : ""}`}
          onClick={() => { setGender("women"); setSearch(""); }}
        >⚽ Women's</button>
      </div>

      {pool.length > 0 && <StatsBar players={pool} />}

      {/* Search */}
      <div className="atp-search-wrap">
        <span className="atp-search-icon">🔍</span>
        <input
          className="atp-search"
          type="text"
          placeholder="Search player or country…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button className="atp-search-clear" onClick={() => setSearch("")}>✕</button>}
      </div>

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
                <th className="atp-th-country atp-hide-xs">Country</th>
                <th title="Total goals">Goals</th>
                <th title="Penalty goals" className="atp-hide-sm">Pens</th>
                <th title="Tournaments" className="atp-hide-xs">Tournaments</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const country = PLAYER_COUNTRY[p.name];
                const rank = search ? pool.indexOf(p) + 1 : i + 1;
                const years = Array.isArray(p.tournaments)
                  ? p.tournaments.join(", ")
                  : (p.tournaments ?? "—");
                return (
                  <tr key={p.player_id || p.name} className={`atp-row ${rank <= 3 ? "atp-row--top" : ""}`}>
                    <td className="atp-td-rank">
                      {rank <= 3
                        ? <span title={`#${rank}`}>{MEDAL[rank - 1]}</span>
                        : <span className="atp-rank-num">{rank}</span>}
                    </td>
                    <td className="atp-td-name">
                      <span className="atp-player-name">{p.name}</span>
                      {/* show country inline on mobile */}
                      {country && (
                        <span className="atp-country-mobile atp-show-xs">
                          {country.flag} {country.team}
                        </span>
                      )}
                    </td>
                    <td className="atp-td-country atp-hide-xs">
                      {country
                        ? <><span className="atp-flag">{country.flag}</span><span className="atp-team-name">{country.team}</span></>
                        : <span style={{ color: "var(--text-tertiary)" }}>—</span>}
                    </td>
                    <td className="atp-td-goals">
                      <span className="atp-goals-num">{p.goals ?? "—"}</span>
                      {p.penGoals > 0 && (
                        <span className="atp-pen-inline atp-show-xs"> ({p.penGoals}p)</span>
                      )}
                    </td>
                    <td className="atp-hide-sm" style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                      {p.penGoals > 0 ? p.penGoals : "—"}
                    </td>
                    <td className="atp-hide-xs atp-td-years">{years}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="atp-footer-note">
        {filtered.length} of {pool.length} scorers · {gender === "men" ? "Men's" : "Women's"} FIFA World Cup
      </div>
    </div>
  );
}
