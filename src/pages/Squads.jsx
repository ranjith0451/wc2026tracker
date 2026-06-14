import { useState } from "react";
import { Link } from "react-router-dom";
import { TEAMS } from "../data/squads.js";
import { GROUPS } from "../data/teams.js";
import { getWCWins } from "../data/wcHistory.js";
import TeamFlag from "../components/TeamFlag.jsx";

const TEAM_GROUP = {};
Object.entries(GROUPS).forEach(([g, teams]) => {
  teams.forEach((t) => (TEAM_GROUP[t] = g.replace("Group ", "")));
});

function MiniStars({ count }) {
  if (!count) return null;
  return (
    <div className="tile-stars">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" className="tile-star">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default function Squads() {
  const [search, setSearch] = useState("");

  const sorted = [...TEAMS].sort((a, b) => a.name.localeCompare(b.name));
  const filtered = sorted.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const fullCount = TEAMS.filter((t) => t.hasSquad).length;

  return (
    <div>
      <div className="sec-head">
        <span className="sec-title">Squads &amp; Players</span>
        <span className="sec-count">· {fullCount}/48 full rosters available</span>
        <div className="sec-line" />
      </div>

      <div className="search-box" style={{ marginBottom: 20 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="search-input"
          placeholder="Search nation…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="team-grid">
        {filtered.map((t) => {
          const wins = getWCWins(t.name);
          return (
            <Link to={`/squads/${encodeURIComponent(t.name)}`} key={t.name} style={{ display: "block" }}>
              <div className="team-tile">
                <TeamFlag team={t.name} />
                {wins.length > 0 && <MiniStars count={wins.length} />}
                <div className="t-name">{t.name}</div>
                <div className="t-group">Group {TEAM_GROUP[t.name]}</div>
                {!t.hasSquad && <div className="t-tbd">Roster TBD</div>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
