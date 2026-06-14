import { useMemo, useState } from "react";
import { MATCHES } from "../data/matches.js";
import MatchCard from "../components/MatchCard.jsx";
import { resolveMatchTeams } from "../lib/bracket.js";
import { getMatchStatus } from "../lib/time.js";

const STAGE_ORDER = [
  "Group Stage","Round of 32","Round of 16",
  "Quarterfinal","Semifinal","Third Place","Final",
];

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

function buildDateChips(matches) {
  const seen = new Set();
  const chips = [];
  for (const m of matches) {
    const d = new Date(m.isoIST);
    const key = d.toISOString().slice(0, 10);
    if (!seen.has(key)) {
      seen.add(key);
      chips.push({
        key,
        day: d.toLocaleDateString("en-IN", { day: "numeric", timeZone: "Asia/Kolkata" }),
        mon: d.toLocaleDateString("en-IN", { month: "short", timeZone: "Asia/Kolkata" }),
      });
    }
  }
  return chips;
}

export default function Schedule({ results }) {
  const [stage, setStage]  = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [dateKey, setDateKey] = useState("all");

  const stages = useMemo(() => STAGE_ORDER.filter(s => MATCHES.some(m => m.stage === s)), []);
  const dateChips = useMemo(() => buildDateChips([...MATCHES].sort((a,b) => new Date(a.isoIST)-new Date(b.isoIST))), []);

  const filtered = MATCHES.filter(m => {
    if (stage !== "all" && m.stage !== stage) return false;
    const st = getMatchStatus(m, results);
    if (status !== "all" && st !== status) return false;
    if (dateKey !== "all") {
      const mDate = new Date(m.isoIST).toISOString().slice(0, 10);
      if (mDate !== dateKey) return false;
    }
    if (search) {
      const { home, away } = resolveMatchTeams(m, results);
      const hay = `${home.name} ${away.name} ${m.venue} ${m.group ?? ""}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const grouped = STAGE_ORDER.reduce((acc, s) => {
    const list = filtered.filter(m => m.stage === s);
    if (list.length) acc[s] = list;
    return acc;
  }, {});

  return (
    <div>
      {/* Date carousel */}
      <div className="date-carousel">
        <button
          className={`date-chip${dateKey === "all" ? " active" : ""}`}
          onClick={() => setDateKey("all")}
        >
          <span className="day">All</span>
          <span className="mon">Dates</span>
        </button>
        {dateChips.map(c => (
          <button
            key={c.key}
            className={`date-chip${dateKey === c.key ? " active" : ""}`}
            onClick={() => setDateKey(c.key)}
          >
            <span className="day">{c.day}</span>
            <span className="mon">{c.mon}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="search-box">
        <SearchIcon />
        <input
          className="search-input"
          placeholder="Search team, venue or group…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Stage filter */}
      <div className="filter-row">
        {["all", ...stages].map(s => (
          <button
            key={s}
            className={`fpill${stage === s ? " active" : ""}`}
            onClick={() => setStage(s)}
          >
            {s === "all" ? "All Stages" : s}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="filter-row">
        {["all","scheduled","live","finished"].map(s => (
          <button
            key={s}
            className={`fpill${status === s ? " active" : ""}`}
            onClick={() => setStatus(s)}
          >
            {s === "all" ? "Any Status" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Results */}
      {Object.keys(grouped).length === 0 ? (
        <div className="empty-state">
          <div className="es-icon">🔍</div>
          <div className="es-text">No matches found</div>
          <div className="es-sub">Try adjusting your filters.</div>
        </div>
      ) : (
        Object.entries(grouped).map(([s, list]) => (
          <div key={s}>
            <div className="sec-head">
              <span className="sec-title">{s}</span>
              <span className="sec-count">· {list.length} match{list.length !== 1 ? "es" : ""}</span>
              <div className="sec-line" />
            </div>
            {list.map(m => <MatchCard key={m.id} match={m} results={results} />)}
          </div>
        ))
      )}
    </div>
  );
}
