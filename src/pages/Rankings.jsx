import { useState, useEffect, useMemo } from "react";

const FLAGS = {
  "Argentina": "🇦🇷", "Spain": "🇪🇸", "France": "🇫🇷", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Brazil": "🇧🇷", "Portugal": "🇵🇹", "Netherlands": "🇳🇱", "Belgium": "🇧🇪",
  "Germany": "🇩🇪", "Italy": "🇮🇹", "USA": "🇺🇸", "Morocco": "🇲🇦",
  "Croatia": "🇭🇷", "Japan": "🇯🇵", "Colombia": "🇨🇴", "Uruguay": "🇺🇾",
  "Mexico": "🇲🇽", "Canada": "🇨🇦", "South Korea": "🇰🇷", "Senegal": "🇸🇳",
  "Switzerland": "🇨🇭", "Denmark": "🇩🇰", "Austria": "🇦🇹", "Ecuador": "🇪🇨",
  "Hungary": "🇭🇺", "Ukraine": "🇺🇦", "Turkey": "🇹🇷", "Türkiye": "🇹🇷",
  "Poland": "🇵🇱", "Serbia": "🇷🇸", "Czech Republic": "🇨🇿", "Czechia": "🇨🇿",
  "Sweden": "🇸🇪", "Wales": "🏴󠁧󠁢󠁷󠁬󠁳󠁿", "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "Norway": "🇳🇴",
  "Australia": "🇦🇺", "Iran": "🇮🇷", "Saudi Arabia": "🇸🇦",
  "South Africa": "🇿🇦", "Egypt": "🇪🇬", "Algeria": "🇩🇿", "Tunisia": "🇹🇳",
  "Nigeria": "🇳🇬", "Ghana": "🇬🇭", "Ivory Coast": "🇨🇮", "Cameroon": "🇨🇲",
  "Cape Verde": "🇨🇻", "DR Congo": "🇨🇩",
  "Costa Rica": "🇨🇷", "Panama": "🇵🇦", "Honduras": "🇭🇳", "Jamaica": "🇯🇲",
  "Chile": "🇨🇱", "Peru": "🇵🇪", "Venezuela": "🇻🇪", "Paraguay": "🇵🇾",
  "Bolivia": "🇧🇴", "Qatar": "🇶🇦", "Jordan": "🇯🇴", "Iraq": "🇮🇶",
  "New Zealand": "🇳🇿", "Uzbekistan": "🇺🇿", "Haiti": "🇭🇹", "Curaçao": "🇨🇼",
  "Bosnia & Herzegovina": "🇧🇦",
};

const WC2026_TEAMS = new Set([
  "Mexico", "South Africa", "South Korea", "Czechia", "Canada", "Bosnia & Herzegovina",
  "Qatar", "Switzerland", "Brazil", "Morocco", "Haiti", "Scotland", "USA", "Paraguay",
  "Australia", "Türkiye", "Germany", "Curaçao", "Ivory Coast", "Ecuador", "Netherlands",
  "Japan", "Sweden", "Tunisia", "Belgium", "Egypt", "Iran", "New Zealand", "Spain",
  "Cape Verde", "Saudi Arabia", "Uruguay", "France", "Senegal", "Iraq", "Norway",
  "Argentina", "Algeria", "Austria", "Jordan", "Portugal", "DR Congo", "Uzbekistan",
  "Colombia", "England", "Croatia", "Ghana", "Panama",
]);

const CONFS = ["All", "UEFA", "CONMEBOL", "CAF", "AFC", "CONCACAF", "OFC"];

function ChangeIndicator({ change }) {
  if (!change || change === 0) {
    return <span className="rnk-change-same" title="No change">—</span>;
  }
  if (change > 0) {
    return (
      <span className="rnk-change-up" title={`+${change}`}>
        ▲ {change}
      </span>
    );
  }
  return (
    <span className="rnk-change-down" title={change}>
      ▼ {Math.abs(change)}
    </span>
  );
}

// Fallback data if JSON is unavailable
const FALLBACK_RANKINGS = [
  { rank: 1, team: "Argentina", confederation: "CONMEBOL", points: 1896.35, change: 0 },
  { rank: 2, team: "Spain", confederation: "UEFA", points: 1838.28, change: 1 },
  { rank: 3, team: "France", confederation: "UEFA", points: 1815.43, change: -1 },
  { rank: 4, team: "England", confederation: "UEFA", points: 1800.11, change: 0 },
  { rank: 5, team: "Brazil", confederation: "CONMEBOL", points: 1782.56, change: 0 },
  { rank: 6, team: "Portugal", confederation: "UEFA", points: 1766.34, change: 2 },
  { rank: 7, team: "Netherlands", confederation: "UEFA", points: 1751.89, change: -1 },
  { rank: 8, team: "Belgium", confederation: "UEFA", points: 1735.22, change: -1 },
  { rank: 9, team: "Germany", confederation: "UEFA", points: 1718.77, change: 3 },
  { rank: 10, team: "Italy", confederation: "UEFA", points: 1702.44, change: -1 },
  { rank: 11, team: "Colombia", confederation: "CONMEBOL", points: 1694.13, change: 2 },
  { rank: 12, team: "Croatia", confederation: "UEFA", points: 1683.59, change: -1 },
  { rank: 13, team: "Morocco", confederation: "CAF", points: 1671.24, change: 0 },
  { rank: 14, team: "Uruguay", confederation: "CONMEBOL", points: 1659.88, change: 1 },
  { rank: 15, team: "USA", confederation: "CONCACAF", points: 1648.32, change: 2 },
  { rank: 16, team: "Mexico", confederation: "CONCACAF", points: 1632.17, change: -1 },
  { rank: 17, team: "Japan", confederation: "AFC", points: 1618.55, change: 3 },
  { rank: 18, team: "Switzerland", confederation: "UEFA", points: 1604.91, change: -1 },
  { rank: 19, team: "Senegal", confederation: "CAF", points: 1591.43, change: 0 },
  { rank: 20, team: "Canada", confederation: "CONCACAF", points: 1578.76, change: 5 },
  { rank: 21, team: "South Korea", confederation: "AFC", points: 1564.12, change: 1 },
  { rank: 22, team: "Denmark", confederation: "UEFA", points: 1551.87, change: -2 },
  { rank: 23, team: "Austria", confederation: "UEFA", points: 1538.43, change: 4 },
  { rank: 24, team: "Ecuador", confederation: "CONMEBOL", points: 1524.19, change: -1 },
  { rank: 25, team: "Norway", confederation: "UEFA", points: 1511.67, change: 6 },
  { rank: 26, team: "Egypt", confederation: "CAF", points: 1497.83, change: -1 },
  { rank: 27, team: "Iran", confederation: "AFC", points: 1484.29, change: 0 },
  { rank: 28, team: "Ivory Coast", confederation: "CAF", points: 1471.55, change: 2 },
  { rank: 29, team: "Algeria", confederation: "CAF", points: 1458.82, change: -1 },
  { rank: 30, team: "Australia", confederation: "AFC", points: 1445.38, change: 1 },
  { rank: 31, team: "Paraguay", confederation: "CONMEBOL", points: 1432.74, change: -2 },
  { rank: 32, team: "Tunisia", confederation: "CAF", points: 1419.11, change: 0 },
  { rank: 33, team: "Scotland", confederation: "UEFA", points: 1405.68, change: 3 },
  { rank: 34, team: "Sweden", confederation: "UEFA", points: 1392.24, change: -1 },
  { rank: 35, team: "Ghana", confederation: "CAF", points: 1378.91, change: 0 },
  { rank: 36, team: "Türkiye", confederation: "UEFA", points: 1365.57, change: 4 },
  { rank: 37, team: "Saudi Arabia", confederation: "AFC", points: 1352.13, change: -2 },
  { rank: 38, team: "Uruguay", confederation: "CONMEBOL", points: 1338.79, change: 0 },
  { rank: 39, team: "Jordan", confederation: "AFC", points: 1325.46, change: 7 },
  { rank: 40, team: "New Zealand", confederation: "OFC", points: 1311.12, change: 1 },
  { rank: 41, team: "Bosnia & Herzegovina", confederation: "UEFA", points: 1297.89, change: -1 },
  { rank: 42, team: "Cape Verde", confederation: "CAF", points: 1284.55, change: 5 },
  { rank: 43, team: "Panama", confederation: "CONCACAF", points: 1271.21, change: 2 },
  { rank: 44, team: "Iraq", confederation: "AFC", points: 1257.88, change: -3 },
  { rank: 45, team: "DR Congo", confederation: "CAF", points: 1244.54, change: 0 },
  { rank: 46, team: "Uzbekistan", confederation: "AFC", points: 1231.21, change: 8 },
  { rank: 47, team: "Senegal", confederation: "CAF", points: 1217.87, change: -1 },
  { rank: 48, team: "Portugal", confederation: "UEFA", points: 1204.53, change: 0 },
  { rank: 49, team: "Qatar", confederation: "AFC", points: 1191.2, change: -2 },
  { rank: 50, team: "Czechia", confederation: "UEFA", points: 1177.86, change: 1 },
];

export default function Rankings() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [conf, setConf] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/data/rankings.json")
      .then(r => r.json())
      .then(d => {
        setRankings(d.men || d);
        setLoading(false);
      })
      .catch(() => {
        setRankings(FALLBACK_RANKINGS);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    let list = rankings;
    if (conf !== "All") list = list.filter(r => r.confederation === conf);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r => r.team.toLowerCase().includes(q));
    }
    return list;
  }, [rankings, conf, search]);

  return (
    <div className="rnk-page">
      <div className="rnk-header">
        <h1 className="rnk-title">FIFA Rankings</h1>
        <p className="rnk-subtitle">As of June 2026</p>
      </div>

      <div className="rnk-controls">
        <div className="rnk-conf-filter">
          {CONFS.map(c => (
            <button
              key={c}
              className={`rnk-pill${conf === c ? " active" : ""}`}
              onClick={() => setConf(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="rnk-search-wrap">
          <svg className="rnk-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="rnk-search"
            type="text"
            placeholder="Search team…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="rnk-search-clear" onClick={() => setSearch("")}>✕</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rnk-loading">
          <div className="flp-spinner" />
          <span>Loading rankings…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rnk-empty">No teams found for "{search || conf}"</div>
      ) : (
        <div className="rnk-table-wrap">
          <table className="rnk-table">
            <thead>
              <tr>
                <th className="rnk-th-rank">Rank</th>
                <th className="rnk-th-change">±</th>
                <th className="rnk-th-team">Team</th>
                <th className="rnk-th-conf">Conf.</th>
                <th className="rnk-th-pts">Points</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const isWC = WC2026_TEAMS.has(r.team);
                const flag = FLAGS[r.team] || "";
                return (
                  <tr key={r.team + i} className={`rnk-row${isWC ? " rnk-row-wc" : ""}`}>
                    <td className="rnk-rank">
                      {r.rank <= 3 ? (
                        <span className={`rnk-rank-medal rnk-medal-${r.rank}`}>{r.rank}</span>
                      ) : r.rank}
                    </td>
                    <td className="rnk-change">
                      <ChangeIndicator change={r.change} />
                    </td>
                    <td className="rnk-team-cell">
                      <span className="rnk-flag">{flag}</span>
                      <span className="rnk-team-name">{r.team}</span>
                      {isWC && <span className="rnk-wc-badge">WC26</span>}
                    </td>
                    <td className="rnk-conf">
                      <span className={`rnk-conf-tag rnk-conf-${r.confederation}`}>
                        {r.confederation}
                      </span>
                    </td>
                    <td className="rnk-pts">
                      {typeof r.points === "number" ? r.points.toFixed(2) : r.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="rnk-count">{filtered.length} team{filtered.length !== 1 ? "s" : ""}</div>
        </div>
      )}
    </div>
  );
}
