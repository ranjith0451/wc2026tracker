import { useState, useEffect, useMemo } from "react";

/* ── Static all-time records (WC history, men's) ─────────────────── */
const BIGGEST_WINS = [
  { winner: "Hungary", loser: "El Salvador", score: "10–1", year: 1982, stage: "Group" },
  { winner: "Hungary", loser: "South Korea", score: "9–0", year: 1954, stage: "Group" },
  { winner: "Yugoslavia", loser: "Zaïre", score: "9–0", year: 1974, stage: "Group" },
  { winner: "Germany", loser: "Saudi Arabia", score: "8–0", year: 2002, stage: "Group" },
  { winner: "Uruguay", loser: "Bolivia", score: "8–0", year: 1950, stage: "Group" },
  { winner: "Sweden", loser: "Cuba", score: "8–0", year: 1938, stage: "QF" },
  { winner: "France", loser: "Paraguay", score: "7–3", year: 1958, stage: "Group" },
  { winner: "Portugal", loser: "North Korea", score: "5–3", year: 1966, stage: "QF" },
  { winner: "Germany", loser: "Brazil", score: "7–1", year: 2014, stage: "SF" },
];

const HIGH_SCORING_GAMES = [
  { teams: "Austria vs Switzerland", score: "7–5", year: 1954, total: 12, stage: "QF" },
  { teams: "Brazil vs Poland", score: "6–5", year: 1938, total: 11, stage: "R16" },
  { teams: "France vs Paraguay", score: "7–3", year: 1958, total: 10, stage: "Group" },
  { teams: "West Germany vs Turkey", score: "7–2", year: 1954, total: 9, stage: "Group" },
  { teams: "Hungary vs West Germany", score: "8–3", year: 1954, total: 11, stage: "Group" },
  { teams: "Netherlands vs Yugoslavia", score: "5–1", year: 1998, total: 6, stage: "QF" },
  { teams: "Portugal vs North Korea", score: "5–3", year: 1966, total: 8, stage: "QF" },
];

const TOURNAMENT_STATS = [
  { year: 1930, host: "Uruguay",     teams: 13, matches: 18,  goals: 70,  avg: 3.89, attendance: 590549 },
  { year: 1934, host: "Italy",       teams: 16, matches: 17,  goals: 70,  avg: 4.12, attendance: 395000 },
  { year: 1938, host: "France",      teams: 15, matches: 18,  goals: 84,  avg: 4.67, attendance: 483000 },
  { year: 1950, host: "Brazil",      teams: 13, matches: 22,  goals: 88,  avg: 4.00, attendance: 1337000 },
  { year: 1954, host: "Switzerland", teams: 16, matches: 26,  goals: 140, avg: 5.38, attendance: 943000 },
  { year: 1958, host: "Sweden",      teams: 16, matches: 35,  goals: 126, avg: 3.60, attendance: 868000 },
  { year: 1962, host: "Chile",       teams: 16, matches: 32,  goals: 89,  avg: 2.78, attendance: 776000 },
  { year: 1966, host: "England",     teams: 16, matches: 32,  goals: 89,  avg: 2.78, attendance: 1614677 },
  { year: 1970, host: "Mexico",      teams: 16, matches: 32,  goals: 95,  avg: 2.97, attendance: 1673975 },
  { year: 1974, host: "West Germany",teams: 16, matches: 38,  goals: 97,  avg: 2.55, attendance: 1865762 },
  { year: 1978, host: "Argentina",   teams: 16, matches: 38,  goals: 102, avg: 2.68, attendance: 1610215 },
  { year: 1982, host: "Spain",       teams: 24, matches: 52,  goals: 146, avg: 2.81, attendance: 2109723 },
  { year: 1986, host: "Mexico",      teams: 24, matches: 52,  goals: 132, avg: 2.54, attendance: 2394031 },
  { year: 1990, host: "Italy",       teams: 24, matches: 52,  goals: 115, avg: 2.21, attendance: 2517348 },
  { year: 1994, host: "USA",         teams: 24, matches: 52,  goals: 141, avg: 2.71, attendance: 3587538 },
  { year: 1998, host: "France",      teams: 32, matches: 64,  goals: 171, avg: 2.67, attendance: 2785100 },
  { year: 2002, host: "South Korea/Japan", teams: 32, matches: 64,  goals: 161, avg: 2.52, attendance: 2705197 },
  { year: 2006, host: "Germany",     teams: 32, matches: 64,  goals: 147, avg: 2.30, attendance: 3359439 },
  { year: 2010, host: "South Africa",teams: 32, matches: 64,  goals: 145, avg: 2.27, attendance: 3178856 },
  { year: 2014, host: "Brazil",      teams: 32, matches: 64,  goals: 171, avg: 2.67, attendance: 3386810 },
  { year: 2018, host: "Russia",      teams: 32, matches: 64,  goals: 169, avg: 2.64, attendance: 3031768 },
  { year: 2022, host: "Qatar",       teams: 32, matches: 64,  goals: 172, avg: 2.69, attendance: 3404252 },
];

const NOTABLE_RECORDS = [
  { icon: "⚽", title: "Most Goals — Single Tournament", value: "Just Fontaine", detail: "13 goals, France, 1958" },
  { icon: "👑", title: "Most WC Titles", value: "Brazil", detail: "5 titles (1958, 62, 70, 94, 2002)" },
  { icon: "🏅", title: "Most Appearances", value: "Lothar Matthäus", detail: "25 matches across 5 tournaments" },
  { icon: "🧤", title: "Most Clean Sheets", value: "Peter Shilton / Fabien Barthez", detail: "10 clean sheets each" },
  { icon: "🎯", title: "Fastest Goal", value: "Hakan Şükür", detail: "10.8 seconds vs South Korea, 2002" },
  { icon: "📅", title: "Oldest Player", value: "Roger Milla", detail: "42 years, 39 days (Cameroon, 1994)" },
  { icon: "🌟", title: "Youngest Scorer", value: "Pelé", detail: "17 years, 239 days (Brazil, 1958)" },
  { icon: "🔴", title: "Most Red Cards — Tournament", value: "1998 France", detail: "22 red cards in 64 games" },
  { icon: "🏟️", title: "Highest Attendance — Single Game", value: "199,854", detail: "Brazil vs Uruguay, Maracanã 1950" },
  { icon: "💫", title: "Most Goals in a Game", value: "12 goals", detail: "Austria 7–5 Switzerland, 1954" },
];

function StatCard({ icon, title, value, detail }) {
  return (
    <div className="sts-record-card">
      <div className="sts-card-icon">{icon}</div>
      <div className="sts-card-body">
        <div className="sts-card-title">{title}</div>
        <div className="sts-card-value">{value}</div>
        <div className="sts-card-detail">{detail}</div>
      </div>
    </div>
  );
}

function formatAttendance(n) {
  if (!n) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  return (n / 1_000).toFixed(0) + "K";
}

export default function Stats() {
  const [histData, setHistData] = useState(null);
  const [activeTab, setActiveTab] = useState("records");

  useEffect(() => {
    fetch("/data/history-v2.json")
      .then(r => r.json())
      .then(setHistData)
      .catch(() => {});
  }, []);

  // Compute top scorers per tournament from history data
  const computedRecords = useMemo(() => {
    if (!histData?.men?.tournaments) return null;
    const tournaments = histData.men.tournaments;
    let highestGoalTournament = { year: null, goals: 0 };
    tournaments.forEach(t => {
      const goals = t.goals || 0;
      if (goals > highestGoalTournament.goals) {
        highestGoalTournament = { year: t.year, host: t.host, goals };
      }
    });
    return { highestGoalTournament };
  }, [histData]);

  const TABS = [
    { id: "records", label: "Records" },
    { id: "wins", label: "Biggest Wins" },
    { id: "goals", label: "High Scoring" },
    { id: "timeline", label: "By Year" },
  ];

  return (
    <div className="sts-page">
      <div className="sts-header">
        <h1 className="sts-title">World Cup Records</h1>
        <p className="sts-subtitle">All-time statistics &amp; milestones</p>
      </div>

      <div className="sts-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`sts-tab${activeTab === t.id ? " active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "records" && (
        <div className="sts-records-grid">
          {NOTABLE_RECORDS.map((r, i) => (
            <StatCard key={i} {...r} />
          ))}
          {computedRecords?.highestGoalTournament?.year && (
            <StatCard
              icon="📊"
              title="Most Goals (from data)"
              value={`${computedRecords.highestGoalTournament.goals} goals`}
              detail={`${computedRecords.highestGoalTournament.year} (${computedRecords.highestGoalTournament.host})`}
            />
          )}
        </div>
      )}

      {activeTab === "wins" && (
        <div className="sts-table-wrap">
          <table className="sts-timeline-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Winner</th>
                <th>Score</th>
                <th>Loser</th>
                <th>Stage</th>
              </tr>
            </thead>
            <tbody>
              {BIGGEST_WINS.map((g, i) => (
                <tr key={i}>
                  <td className="sts-year">{g.year}</td>
                  <td className="sts-team-win">{g.winner}</td>
                  <td className="sts-score">{g.score}</td>
                  <td className="sts-team-lose">{g.loser}</td>
                  <td className="sts-stage">{g.stage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "goals" && (
        <div className="sts-table-wrap">
          <p className="sts-note">Highest total goals in a single World Cup match</p>
          <table className="sts-timeline-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Match</th>
                <th>Score</th>
                <th>Total</th>
                <th>Stage</th>
              </tr>
            </thead>
            <tbody>
              {HIGH_SCORING_GAMES.sort((a, b) => b.total - a.total).map((g, i) => (
                <tr key={i}>
                  <td className="sts-year">{g.year}</td>
                  <td>{g.teams}</td>
                  <td className="sts-score">{g.score}</td>
                  <td>
                    <span className="sts-total-badge">{g.total}</span>
                  </td>
                  <td className="sts-stage">{g.stage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "timeline" && (
        <div className="sts-table-wrap">
          <table className="sts-timeline-table sts-timeline-full">
            <thead>
              <tr>
                <th>Year</th>
                <th>Host</th>
                <th>Teams</th>
                <th>Matches</th>
                <th>Goals</th>
                <th>Avg</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {TOURNAMENT_STATS.map(t => (
                <tr key={t.year}>
                  <td className="sts-year">{t.year}</td>
                  <td>{t.host}</td>
                  <td className="sts-num">{t.teams}</td>
                  <td className="sts-num">{t.matches}</td>
                  <td className="sts-num">{t.goals}</td>
                  <td>
                    <span className={`sts-avg ${t.avg >= 4 ? "sts-avg-high" : t.avg <= 2.3 ? "sts-avg-low" : ""}`}>
                      {t.avg.toFixed(2)}
                    </span>
                  </td>
                  <td className="sts-attendance">{formatAttendance(t.attendance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
