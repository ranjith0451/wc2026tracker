import { useState, useMemo, useEffect } from "react";
import { TEAMS } from "../data/squads.js";
import { FLAGS, FLAG_URL } from "../data/teams.js";
import { TEAM_STRATEGIES } from "../data/headToHead.js";
import { getTopScorers } from "../lib/topscorers.js";
import { getWCWins } from "../data/wcHistory.js";

const RANKINGS = [
  { team: "Argentina", rank: 1, points: 1896.35 },
  { team: "Spain", rank: 2, points: 1838.28 },
  { team: "France", rank: 3, points: 1815.43 },
  { team: "England", rank: 4, points: 1800.11 },
  { team: "Brazil", rank: 5, points: 1782.56 },
  { team: "Portugal", rank: 6, points: 1766.34 },
  { team: "Netherlands", rank: 7, points: 1751.89 },
  { team: "Belgium", rank: 8, points: 1735.22 },
  { team: "Germany", rank: 9, points: 1718.77 },
  { team: "Italy", rank: 10, points: 1702.44 },
  { team: "Colombia", rank: 11, points: 1694.13 },
  { team: "Croatia", rank: 12, points: 1683.59 },
  { team: "Morocco", rank: 13, points: 1671.24 },
  { team: "Uruguay", rank: 14, points: 1659.88 },
  { team: "USA", rank: 15, points: 1648.32 },
  { team: "Mexico", rank: 16, points: 1632.17 },
  { team: "Japan", rank: 17, points: 1618.55 },
  { team: "Switzerland", rank: 18, points: 1604.91 },
  { team: "Senegal", rank: 19, points: 1591.43 },
  { team: "Canada", rank: 20, points: 1578.76 },
  { team: "South Korea", rank: 21, points: 1564.12 },
  { team: "Austria", rank: 23, points: 1538.43 },
  { team: "Ecuador", rank: 24, points: 1524.19 },
  { team: "Norway", rank: 25, points: 1511.67 },
  { team: "Egypt", rank: 26, points: 1497.83 },
  { team: "Iran", rank: 27, points: 1484.29 },
  { team: "Ivory Coast", rank: 28, points: 1471.55 },
  { team: "Algeria", rank: 29, points: 1458.82 },
  { team: "Australia", rank: 30, points: 1445.38 },
  { team: "Paraguay", rank: 31, points: 1432.74 },
  { team: "Tunisia", rank: 32, points: 1419.11 },
  { team: "Scotland", rank: 33, points: 1405.68 },
  { team: "Sweden", rank: 34, points: 1392.24 },
  { team: "Ghana", rank: 35, points: 1378.91 },
  { team: "Türkiye", rank: 36, points: 1365.57 },
  { team: "Saudi Arabia", rank: 37, points: 1352.13 },
  { team: "Jordan", rank: 39, points: 1325.46 },
  { team: "New Zealand", rank: 40, points: 1311.12 },
  { team: "Bosnia & Herzegovina", rank: 41, points: 1297.89 },
  { team: "Cape Verde", rank: 42, points: 1284.55 },
  { team: "Panama", rank: 43, points: 1271.21 },
  { team: "Iraq", rank: 44, points: 1257.88 },
  { team: "DR Congo", rank: 45, points: 1244.54 },
];

function TeamSelector({ value, onChange, label }) {
  const available = TEAMS.filter(t => FLAGS[t.name]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 8,
      flex: 1,
      minWidth: 0,
    }}>
      <label style={{
        fontSize: "clamp(11px, 2.5vw, 12px)",
        fontWeight: 600,
        color: "var(--text-secondary)",
      }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: "clamp(10px, 3vw, 12px) clamp(12px, 3vw, 14px)",
          background: "var(--bg-secondary)",
          border: "1.5px solid var(--border-medium)",
          borderRadius: 8,
          color: "var(--text)",
          fontSize: "clamp(13px, 3.5vw, 14px)",
          fontWeight: 500,
          cursor: "pointer",
          outline: "none",
          minHeight: "44px",
        }}
      >
        <option value="">Select {label}</option>
        {available.map(t => (
          <option key={t.name} value={t.name}>{t.name}</option>
        ))}
      </select>
    </div>
  );
}

// Comparison row - shows both teams side by side
function ComparisonRow({ label, team1Value, team2Value, subtext1, subtext2 }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "clamp(8px, 2vw, 12px)",
      padding: "clamp(10px, 2.5vw, 14px) 0",
      borderBottom: "1px solid var(--border-subtle)",
      alignItems: "center",
    }}>
      <div>
        <div style={{
          fontSize: "clamp(11px, 2.5vw, 12px)",
          color: "var(--text-tertiary)",
          marginBottom: 4,
          fontWeight: 500,
        }}>
          {label}
        </div>
        <div style={{
          fontSize: "clamp(13px, 3vw, 14px)",
          fontWeight: 600,
          color: "var(--text)",
        }}>
          {team1Value}
        </div>
        {subtext1 && (
          <div style={{
            fontSize: "clamp(10px, 2vw, 11px)",
            color: "var(--text-tertiary)",
            marginTop: 2,
          }}>
            {subtext1}
          </div>
        )}
      </div>
      <div>
        <div style={{
          fontSize: "clamp(11px, 2.5vw, 12px)",
          color: "var(--text-tertiary)",
          marginBottom: 4,
          fontWeight: 500,
        }}>
          {label}
        </div>
        <div style={{
          fontSize: "clamp(13px, 3vw, 14px)",
          fontWeight: 600,
          color: "var(--text)",
          textAlign: "right",
        }}>
          {team2Value}
        </div>
        {subtext2 && (
          <div style={{
            fontSize: "clamp(10px, 2vw, 11px)",
            color: "var(--text-tertiary)",
            marginTop: 2,
            textAlign: "right",
          }}>
            {subtext2}
          </div>
        )}
      </div>
    </div>
  );
}

// Match result card - side by side
function MatchResultCard({ match, team1, team2 }) {
  const isTeam1 = match.team1 === team1;
  const team1Score = isTeam1 ? match.score.split('-')[0] : match.score.split('-')[1];
  const team2Score = isTeam1 ? match.score.split('-')[1] : match.score.split('-')[0];
  const team1Goals = isTeam1 ? match.goals[team1] : match.goals[team2];
  const team2Goals = isTeam1 ? match.goals[team2] : match.goals[team1];

  const resultColor = match.winner === "Draw"
    ? "rgba(255, 193, 7, 0.15)"
    : match.winner === team1
    ? "rgba(76, 175, 80, 0.15)"
    : "rgba(244, 67, 54, 0.15)";

  const resultText = match.winner === "Draw" ? "Draw" : `${match.winner} won`;
  const resultTextColor = match.winner === "Draw"
    ? "var(--text-secondary)"
    : match.winner === team1
    ? "var(--green)"
    : "var(--red-bright)";

  return (
    <div style={{
      padding: "clamp(12px, 3vw, 16px)",
      background: "var(--bg)",
      border: "1px solid var(--border-subtle)",
      borderRadius: 8,
      display: "grid",
      gridTemplateColumns: "1fr 100px 1fr",
      gap: "clamp(8px, 2vw, 12px)",
      alignItems: "center",
      marginBottom: "clamp(8px, 2vw, 12px)",
    }}>
      {/* Team 1 Goals */}
      <div>
        <div style={{
          fontSize: "clamp(10px, 2.5vw, 11px)",
          color: "var(--text-secondary)",
          marginBottom: 4,
          fontWeight: 500,
        }}>
          Goals
        </div>
        <div style={{
          fontSize: "clamp(10px, 2.5vw, 11px)",
          color: "var(--text)",
          lineHeight: 1.4,
        }}>
          {team1Goals?.length > 0 ? (
            team1Goals.map((g, i) => <div key={i}>⚽ {g}</div>)
          ) : (
            <span style={{ color: "var(--text-tertiary)" }}>—</span>
          )}
        </div>
      </div>

      {/* Score */}
      <div style={{
        textAlign: "center",
        padding: "clamp(8px, 2vw, 10px)",
        background: "var(--bg-secondary)",
        borderRadius: 6,
      }}>
        <div style={{
          fontSize: "clamp(16px, 4vw, 18px)",
          fontWeight: 700,
          color: "var(--text)",
        }}>
          {team1Score}-{team2Score}
        </div>
        <div style={{
          fontSize: "clamp(9px, 2vw, 10px)",
          color: "var(--text-tertiary)",
          marginTop: 2,
          fontWeight: 500,
        }}>
          {new Date(match.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Team 2 Goals */}
      <div>
        <div style={{
          fontSize: "clamp(10px, 2.5vw, 11px)",
          color: "var(--text-secondary)",
          marginBottom: 4,
          fontWeight: 500,
          textAlign: "right",
        }}>
          Goals
        </div>
        <div style={{
          fontSize: "clamp(10px, 2.5vw, 11px)",
          color: "var(--text)",
          lineHeight: 1.4,
          textAlign: "right",
        }}>
          {team2Goals?.length > 0 ? (
            team2Goals.map((g, i) => <div key={i}>{g} ⚽</div>)
          ) : (
            <span style={{ color: "var(--text-tertiary)" }}>—</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TeamComparison({ results = {} }) {
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [matchHistory, setMatchHistory] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch recent matches from API
  useEffect(() => {
    if (!team1 || !team2) return;

    const fetchMatches = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stats?action=team-matches&team1=${encodeURIComponent(team1)}&team2=${encodeURIComponent(team2)}`);
        if (res.ok) {
          const data = await res.json();
          setMatchHistory(data.matches || {});
        } else {
          setMatchHistory({});
        }
      } catch (e) {
        console.log("Using fallback match data");
        setMatchHistory({});
      }
      setLoading(false);
    };

    fetchMatches();
  }, [team1, team2]);

  // Use fallback data if API fails
  const { HEAD_TO_HEAD_RECORDS } = require("../data/headToHead.js");
  const headToHead = useMemo(() => {
    if (!team1 || !team2) return null;
    const key1 = `${team1}-${team2}`;
    const key2 = `${team2}-${team1}`;
    return HEAD_TO_HEAD_RECORDS[key1] || HEAD_TO_HEAD_RECORDS[key2] || [];
  }, [team1, team2]);

  const getTeamStats = (teamName) => {
    const scorers = getTopScorers(results).filter(s => s.team === teamName);
    return {
      topScorer: scorers[0],
      topScorerGoals: scorers[0]?.goals || 0,
      totalGoals: scorers.reduce((sum, s) => sum + s.goals, 0),
    };
  };

  const stats1 = team1 ? getTeamStats(team1) : null;
  const stats2 = team2 ? getTeamStats(team2) : null;

  const teamData1 = team1 ? TEAMS.find(t => t.name === team1) : null;
  const teamData2 = team2 ? TEAMS.find(t => t.name === team2) : null;

  const ranking1 = team1 ? RANKINGS.find(r => r.team === team1) : null;
  const ranking2 = team2 ? RANKINGS.find(r => r.team === team2) : null;

  const strategy1 = team1 ? (TEAM_STRATEGIES[team1] || {}) : {};
  const strategy2 = team2 ? (TEAM_STRATEGIES[team2] || {}) : {};

  const wcWins1 = team1 ? getWCWins(team1).length : 0;
  const wcWins2 = team2 ? getWCWins(team2).length : 0;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Title */}
      <div style={{
        marginBottom: "clamp(20px, 5vw, 32px)",
      }}>
        <h1 style={{
          fontSize: "clamp(24px, 7vw, 32px)",
          fontWeight: 800,
          marginBottom: 8,
        }}>
          Team Comparison
        </h1>
        <p style={{
          color: "var(--text-tertiary)",
          fontSize: "clamp(13px, 3.5vw, 14px)",
          margin: 0,
        }}>
          Compare two teams side-by-side
        </p>
      </div>

      {/* Team Selector */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "clamp(12px, 3vw, 16px)",
        marginBottom: "clamp(20px, 5vw, 32px)",
        padding: "clamp(14px, 4vw, 20px)",
        background: "var(--bg-secondary)",
        borderRadius: 12,
      }}>
        <div style={{ display: "flex", gap: "clamp(12px, 3vw, 16px)" }}>
          <TeamSelector value={team1} onChange={setTeam1} label="Team 1" />
          <TeamSelector value={team2} onChange={setTeam2} label="Team 2" />
        </div>
      </div>

      {team1 && team2 && (
        <>
          {/* Team Headers with Flags */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "clamp(12px, 3vw, 16px)",
            marginBottom: "clamp(20px, 5vw, 32px)",
          }}>
            {[
              { name: team1, flag: FLAGS[team1], rank: ranking1 },
              { name: team2, flag: FLAGS[team2], rank: ranking2 },
            ].map((team, idx) => (
              <div key={idx} style={{
                textAlign: idx === 0 ? "left" : "right",
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "clamp(8px, 2vw, 12px)",
                  justifyContent: idx === 0 ? "flex-start" : "flex-end",
                  marginBottom: 8,
                }}>
                  {team.flag && (
                    <img
                      src={FLAG_URL(team.name)}
                      alt={team.name}
                      style={{
                        width: "clamp(40px, 10vw, 50px)",
                        height: "clamp(27px, 7vw, 33px)",
                        borderRadius: 4,
                        objectFit: "cover",
                      }}
                    />
                  )}
                  <div>
                    <div style={{
                      fontSize: "clamp(14px, 4vw, 16px)",
                      fontWeight: 700,
                      color: "var(--text)",
                    }}>
                      {team.name}
                    </div>
                    {team.rank && (
                      <div style={{
                        fontSize: "clamp(10px, 2.5vw, 11px)",
                        color: "var(--text-tertiary)",
                      }}>
                        Rank #{team.rank.rank}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison Table */}
          <div style={{
            padding: "clamp(14px, 3vw, 20px)",
            background: "var(--bg-secondary)",
            borderRadius: 12,
            marginBottom: "clamp(20px, 5vw, 32px)",
          }}>
            <h3 style={{
              fontSize: "clamp(14px, 3.5vw, 15px)",
              fontWeight: 700,
              marginBottom: "clamp(12px, 3vw, 16px)",
              color: "var(--text)",
            }}>
              Team Stats
            </h3>
            <div style={{ fontSize: "clamp(12px, 3vw, 14px)" }}>
              <ComparisonRow
                label="FIFA Ranking"
                team1Value={ranking1 ? `#${ranking1.rank}` : "—"}
                team2Value={ranking2 ? `#${ranking2.rank}` : "—"}
                subtext1={ranking1 ? ranking1.points.toFixed(2) : ""}
                subtext2={ranking2 ? ranking2.points.toFixed(2) : ""}
              />
              <ComparisonRow
                label="Squad Size"
                team1Value={teamData1?.players?.length || 0}
                team2Value={teamData2?.players?.length || 0}
              />
              <ComparisonRow
                label="World Cups Won"
                team1Value={wcWins1}
                team2Value={wcWins2}
              />
              <ComparisonRow
                label="Formation"
                team1Value={strategy1.formation || "—"}
                team2Value={strategy2.formation || "—"}
              />
              <ComparisonRow
                label="Playing Style"
                team1Value={strategy1.style || "—"}
                team2Value={strategy2.style || "—"}
              />
              <ComparisonRow
                label="Top Scorer"
                team1Value={stats1?.topScorer?.player || "—"}
                team2Value={stats2?.topScorer?.player || "—"}
                subtext1={stats1?.topScorer ? `${stats1.topScorer.goals} goals` : ""}
                subtext2={stats2?.topScorer ? `${stats2.topScorer.goals} goals` : ""}
              />
            </div>
          </div>

          {/* Last 5 Matches */}
          {headToHead && headToHead.length > 0 && (
            <div style={{
              padding: "clamp(14px, 3vw, 20px)",
              background: "var(--bg-secondary)",
              borderRadius: 12,
            }}>
              <h3 style={{
                fontSize: "clamp(14px, 3.5vw, 15px)",
                fontWeight: 700,
                marginBottom: "clamp(12px, 3vw, 16px)",
                color: "var(--text)",
              }}>
                Last 5 Meetings
              </h3>
              <div>
                {headToHead.map((match, i) => (
                  <MatchResultCard key={i} match={match} team1={team1} team2={team2} />
                ))}
              </div>

              {/* Match Details Table */}
              <div style={{
                marginTop: "clamp(16px, 3vw, 20px)",
                paddingTop: "clamp(16px, 3vw, 20px)",
                borderTop: "1px solid var(--border-subtle)",
              }}>
                {headToHead.map((match, i) => (
                  <div key={i} style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "clamp(8px, 2vw, 12px)",
                    padding: "clamp(10px, 2.5vw, 12px) 0",
                    borderBottom: i < headToHead.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    fontSize: "clamp(10px, 2.5vw, 11px)",
                    color: "var(--text-tertiary)",
                  }}>
                    <div>
                      <strong>Tournament:</strong> {match.tournament}
                      <br />
                      <strong>Venue:</strong> {match.venue}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <strong>Date:</strong> {new Date(match.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                      <br />
                      <strong>Attendance:</strong> {match.attendance ? `${parseInt(match.attendance).toLocaleString()}` : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {(!team1 || !team2) && (
        <div style={{
          padding: "clamp(24px, 6vw, 40px)",
          textAlign: "center",
          color: "var(--text-tertiary)",
          background: "var(--bg-secondary)",
          borderRadius: 12,
        }}>
          <div style={{ fontSize: "clamp(24px, 8vw, 32px)", marginBottom: "clamp(8px, 2vw, 12px)" }}>
            ⚽
          </div>
          <div style={{
            fontWeight: 600,
            marginBottom: 4,
            fontSize: "clamp(14px, 3.5vw, 16px)",
          }}>
            Select two teams to compare
          </div>
          <div style={{ fontSize: "clamp(12px, 3vw, 13px)" }}>
            Choose teams from the dropdowns above
          </div>
        </div>
      )}
    </div>
  );
}
