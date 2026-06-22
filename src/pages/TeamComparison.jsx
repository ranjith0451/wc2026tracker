import { useState, useMemo } from "react";
import { TEAMS } from "../data/squads.js";
import { FLAGS, FLAG_URL } from "../data/teams.js";
import { HEAD_TO_HEAD_RECORDS, TEAM_STRATEGIES } from "../data/headToHead.js";
import { getTopScorers } from "../lib/topscorers.js";
import { getWCWins } from "../data/wcHistory.js";

// FIFA Rankings data
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
  { team: "Curaçao", rank: 50, points: 1190.21 },
  { team: "Qatar", rank: 55, points: 1140.87 },
  { team: "Haiti", rank: 60, points: 1090.54 },
  { team: "South Africa", rank: 65, points: 1045.23 },
  { team: "Czechia", rank: 70, points: 998.76 },
  { team: "Uzbekistan", rank: 75, points: 950.42 },
];

// Responsive styles helper
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);
  return matches;
};

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

function StatCard({ label, team1Value, team2Value, team1Name, team2Name }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 2fr 1fr",
      gap: "clamp(8px, 3vw, 12px)",
      padding: "clamp(10px, 3vw, 14px) clamp(12px, 3vw, 16px)",
      background: "var(--bg-secondary)",
      borderRadius: 8,
      alignItems: "center",
    }}>
      <div style={{
        textAlign: "right",
        fontSize: "clamp(12px, 3.5vw, 13px)",
        fontWeight: 600,
        color: "var(--text)",
      }}>
        {team1Value}
      </div>
      <div style={{
        textAlign: "center",
        fontSize: "clamp(10px, 3vw, 11px)",
        fontWeight: 500,
        color: "var(--text-tertiary)",
      }}>
        {label}
      </div>
      <div style={{
        textAlign: "left",
        fontSize: "clamp(12px, 3.5vw, 13px)",
        fontWeight: 600,
        color: "var(--text)",
      }}>
        {team2Value}
      </div>
    </div>
  );
}

function TeamCard({ team, stats, isRight = false }) {
  const teamData = TEAMS.find(t => t.name === team);
  const strategy = TEAM_STRATEGIES[team] || {};
  const ranking = RANKINGS.find(r => r.team === team);
  const wcWins = getWCWins(team).length;

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: "clamp(12px, 4vw, 16px)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "clamp(8px, 3vw, 12px)",
        padding: "clamp(12px, 3vw, 16px)",
        background: "var(--bg-secondary)",
        borderRadius: 12,
      }}>
        {FLAGS[team] && (
          <img
            src={FLAG_URL(team)}
            alt={team}
            style={{
              width: "clamp(45px, 12vw, 60px)",
              height: "clamp(30px, 8vw, 40px)",
              borderRadius: 6,
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "clamp(16px, 5vw, 18px)",
            fontWeight: 700,
            color: "var(--text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {team}
          </div>
          {ranking && (
            <div style={{
              fontSize: "clamp(11px, 2.5vw, 12px)",
              color: "var(--text-tertiary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              FIFA Rank: #{ranking.rank} ({ranking.points.toFixed(2)})
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", paddingX: 4 }}>Stats</div>
        <StatCard label="Squad Size" team1Value={teamData?.players?.length || 0} team2Value={null} team1Name={team} team2Name="" />
        <StatCard label="World Cups Won" team1Value={wcWins} team2Value={null} team1Name={team} team2Name="" />
        {stats?.topScorerGoals && (
          <StatCard label="Top Scorer Goals" team1Value={stats.topScorerGoals} team2Value={null} team1Name={team} team2Name="" />
        )}
      </div>

      {/* Strategy */}
      {strategy.style && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "16px",
          background: "var(--bg-secondary)",
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Playing Style</div>
          <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
            <div><strong>Formation:</strong> {strategy.formation}</div>
            <div><strong>Style:</strong> {strategy.style}</div>
            <div><strong>Strength:</strong> {strategy.strength}</div>
            <div style={{ marginTop: 8 }}>
              <strong>Key Tactics:</strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {strategy.tactics?.map((tac, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      background: "var(--blue)",
                      color: "#fff",
                      borderRadius: 14,
                    }}
                  >
                    {tac}
                  </span>
                ))}
              </div>
            </div>
            {strategy.weakness && (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-tertiary)" }}>
                ⚠️ Weakness: {strategy.weakness}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Players */}
      {teamData?.players && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Key Players</div>
          {teamData.players.slice(0, 3).map((player, i) => (
            <div
              key={i}
              style={{
                padding: "10px 12px",
                background: "var(--bg-secondary)",
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--text)" }}>{player.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{player.position}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TeamComparison({ results = {} }) {
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");

  const getTeamStats = (teamName) => {
    const scorers = getTopScorers(results).filter(s => s.team === teamName);
    return {
      topScorer: scorers[0],
      topScorerGoals: scorers[0]?.goals || 0,
      totalGoals: scorers.reduce((sum, s) => sum + s.goals, 0),
    };
  };

  const headToHead = useMemo(() => {
    if (!team1 || !team2) return null;
    const key1 = `${team1}-${team2}`;
    const key2 = `${team2}-${team1}`;
    return HEAD_TO_HEAD_RECORDS[key1] || HEAD_TO_HEAD_RECORDS[key2] || [];
  }, [team1, team2]);

  const stats1 = team1 ? getTeamStats(team1) : null;
  const stats2 = team2 ? getTeamStats(team2) : null;

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Title */}
      <div style={{
        marginBottom: "clamp(20px, 5vw, 32px)",
        paddingX: "clamp(12px, 3vw, 20px)",
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
          Compare teams across FIFA rankings, strategies, and head-to-head records
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
        "@media (min-width: 768px)": {
          flexDirection: "row",
        },
      }}>
        <TeamSelector value={team1} onChange={setTeam1} label="Team 1" />
        <TeamSelector value={team2} onChange={setTeam2} label="Team 2" />
      </div>

      {team1 && team2 && (
        <>
          {/* Side-by-side Comparison */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "clamp(16px, 4vw, 24px)",
            marginBottom: "clamp(20px, 5vw, 32px)",
            "@media (min-width: 768px)": {
              gridTemplateColumns: "1fr 1fr",
            },
          }}>
            <TeamCard team={team1} stats={stats1} />
            <TeamCard team={team2} stats={stats2} isRight={true} />
          </div>

          {/* Head-to-Head Records */}
          {headToHead && headToHead.length > 0 && (
            <div style={{
              marginBottom: "clamp(20px, 5vw, 32px)",
              padding: "clamp(14px, 4vw, 20px)",
              background: "var(--bg-secondary)",
              borderRadius: 12,
            }}>
              <h3 style={{
                fontSize: "clamp(15px, 4vw, 16px)",
                fontWeight: 700,
                marginBottom: "clamp(12px, 3vw, 16px)",
                color: "var(--text)",
              }}>
                Last 5 Head-to-Head Meetings
              </h3>
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "clamp(10px, 2.5vw, 12px)",
              }}>
                {headToHead.map((match, i) => {
                  const isTeam1 = match.team1 === team1;
                  const team1Score = isTeam1 ? match.score.split('-')[0] : match.score.split('-')[1];
                  const team2Score = isTeam1 ? match.score.split('-')[1] : match.score.split('-')[0];
                  const team1Goals = isTeam1 ? match.goals[team1] : match.goals[team2];
                  const team2Goals = isTeam1 ? match.goals[team2] : match.goals[team1];

                  return (
                    <div
                      key={i}
                      style={{
                        padding: "clamp(10px, 3vw, 14px) clamp(12px, 3vw, 16px)",
                        background: "var(--bg)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: 8,
                        display: "flex",
                        flexDirection: "column",
                        gap: "clamp(8px, 2vw, 10px)",
                      }}
                    >
                      {/* Match Result */}
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: "clamp(6px, 2vw, 12px)",
                        alignItems: "center",
                      }}>
                        <div style={{ textAlign: "right", minWidth: 0 }}>
                          <div style={{
                            fontWeight: 600,
                            color: "var(--text)",
                            fontSize: "clamp(12px, 3.5vw, 14px)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                            {team1}
                          </div>
                        </div>
                        <div style={{
                          textAlign: "center",
                          padding: "clamp(6px, 2vw, 10px)",
                          background: "var(--bg-secondary)",
                          borderRadius: 6,
                          fontWeight: 700,
                          fontSize: "clamp(14px, 4vw, 16px)",
                          color: "var(--text)",
                          flexShrink: 0,
                        }}>
                          {team1Score}-{team2Score}
                        </div>
                        <div style={{ textAlign: "left", minWidth: 0 }}>
                          <div style={{
                            fontWeight: 600,
                            color: "var(--text)",
                            fontSize: "clamp(12px, 3.5vw, 14px)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                            {team2}
                          </div>
                        </div>
                      </div>

                      {/* Goal Scorers */}
                      {(team1Goals?.length > 0 || team2Goals?.length > 0) && (
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "clamp(8px, 2vw, 12px)",
                          fontSize: "clamp(11px, 2.5vw, 12px)",
                          color: "var(--text-secondary)",
                        }}>
                          <div>
                            {team1Goals?.length > 0 ? (
                              <>
                                <strong>Goals:</strong>
                                <div style={{ marginTop: 4, paddingLeft: 8 }}>
                                  {team1Goals.map((goal, gi) => (
                                    <div key={gi} style={{ fontSize: "clamp(10px, 2.5vw, 11px)", margin: "2px 0" }}>
                                      ⚽ {goal}
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <span style={{ color: "var(--text-tertiary)" }}>No goals</span>
                            )}
                          </div>
                          <div>
                            {team2Goals?.length > 0 ? (
                              <>
                                <strong>Goals:</strong>
                                <div style={{ marginTop: 4, paddingLeft: 8 }}>
                                  {team2Goals.map((goal, gi) => (
                                    <div key={gi} style={{ fontSize: "clamp(10px, 2.5vw, 11px)", margin: "2px 0" }}>
                                      ⚽ {goal}
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <span style={{ color: "var(--text-tertiary)" }}>No goals</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Match Info */}
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "clamp(8px, 2vw, 12px)",
                        fontSize: "clamp(10px, 2.5vw, 11px)",
                        color: "var(--text-tertiary)",
                        paddingTop: 8,
                        borderTop: "1px solid var(--border-subtle)",
                      }}>
                        <div>
                          <div><strong>Date:</strong> {new Date(match.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                          <div style={{ marginTop: 2 }}><strong>Tournament:</strong> {match.tournament}</div>
                        </div>
                        <div>
                          <div><strong>Venue:</strong> {match.venue}</div>
                          <div style={{ marginTop: 2 }}><strong>Attendance:</strong> {match.attendance ? `${parseInt(match.attendance).toLocaleString()}` : 'N/A'}</div>
                        </div>
                      </div>

                      {/* Result Badge */}
                      <div style={{ textAlign: "center" }}>
                        <span style={{
                          fontSize: "clamp(10px, 2.5vw, 11px)",
                          fontWeight: 600,
                          padding: "clamp(3px, 1vw, 4px) clamp(8px, 2vw, 10px)",
                          borderRadius: 12,
                          background: match.winner === "Draw"
                            ? "rgba(255, 193, 7, 0.15)"
                            : match.winner === team1
                            ? "rgba(76, 175, 80, 0.15)"
                            : "rgba(244, 67, 54, 0.15)",
                          color: match.winner === "Draw"
                            ? "var(--text-secondary)"
                            : match.winner === team1
                            ? "var(--green)"
                            : "var(--red-bright)",
                          display: "inline-block",
                        }}>
                          {match.winner === "Draw" ? "Draw" : `${match.winner} won`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tactical Comparison */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "clamp(16px, 4vw, 24px)",
            marginBottom: "clamp(20px, 5vw, 32px)",
            "@media (min-width: 768px)": {
              gridTemplateColumns: "1fr 1fr",
            },
          }}>
            {[team1, team2].map(team => {
              const strategy = TEAM_STRATEGIES[team] || {};
              return (
                <div key={team} style={{
                  padding: "clamp(12px, 3vw, 16px)",
                  background: "var(--bg-secondary)",
                  borderRadius: 8,
                }}>
                  <h4 style={{
                    fontSize: "clamp(13px, 3.5vw, 14px)",
                    fontWeight: 700,
                    marginBottom: "clamp(10px, 2.5vw, 12px)",
                    color: "var(--text)",
                  }}>
                    {team} - Tactical
                  </h4>
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "clamp(8px, 2vw, 10px)",
                    fontSize: "clamp(11px, 2.5vw, 12px)",
                  }}>
                    <div>
                      <span style={{ fontWeight: 600, color: "var(--text)" }}>Formation: </span>
                      <span style={{ color: "var(--text-secondary)" }}>{strategy.formation}</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: "var(--text)" }}>Style: </span>
                      <span style={{ color: "var(--text-secondary)", fontSize: "clamp(10px, 2.5vw, 12px)" }}>{strategy.style}</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: "var(--text)" }}>Strength: </span>
                      <span style={{ color: "var(--text-secondary)" }}>{strategy.strength}</span>
                    </div>
                    {strategy.weakness && (
                      <div>
                        <span style={{ fontWeight: 600, color: "var(--text)" }}>Weakness: </span>
                        <span style={{ color: "var(--red-bright)", fontSize: "clamp(10px, 2.5vw, 12px)" }}>{strategy.weakness}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Player Comparison */}
          <div style={{
            padding: "clamp(14px, 4vw, 20px)",
            background: "var(--bg-secondary)",
            borderRadius: 12,
          }}>
            <h3 style={{
              fontSize: "clamp(15px, 4vw, 16px)",
              fontWeight: 700,
              marginBottom: "clamp(12px, 3vw, 16px)",
              color: "var(--text)",
            }}>
              Player Comparison
            </h3>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "clamp(14px, 4vw, 24px)",
              "@media (min-width: 768px)": {
                gridTemplateColumns: "1fr 1fr",
              },
            }}>
              {[team1, team2].map(team => {
                const teamData = TEAMS.find(t => t.name === team);
                const scorers = getTopScorers(results).filter(s => s.team === team);
                return (
                  <div key={team} style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "clamp(10px, 2.5vw, 12px)",
                  }}>
                    <h4 style={{
                      fontSize: "clamp(12px, 3vw, 13px)",
                      fontWeight: 700,
                      color: "var(--text)",
                    }}>
                      {team} Squad
                    </h4>
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "clamp(8px, 2vw, 12px)",
                    }}>
                      {/* Squad Size */}
                      <div style={{
                        padding: "clamp(8px, 2vw, 10px) clamp(10px, 2.5vw, 12px)",
                        background: "var(--bg)",
                        borderRadius: 6,
                        fontSize: "clamp(11px, 2.5vw, 12px)",
                      }}>
                        <div style={{ fontWeight: 600, color: "var(--text)" }}>Squad Size</div>
                        <div style={{ color: "var(--text-tertiary)", fontSize: "clamp(10px, 2.5vw, 11px)" }}>
                          {teamData?.players?.length || 0} players
                        </div>
                      </div>

                      {/* Top Scorer */}
                      {scorers[0] && (
                        <div style={{
                          padding: "clamp(8px, 2vw, 10px) clamp(10px, 2.5vw, 12px)",
                          background: "var(--bg)",
                          borderRadius: 6,
                          fontSize: "clamp(11px, 2.5vw, 12px)",
                        }}>
                          <div style={{ fontWeight: 600, color: "var(--text)" }}>Top Scorer</div>
                          <div style={{ color: "var(--text-secondary)", fontSize: "clamp(10px, 2.5vw, 11px)" }}>
                            {scorers[0].player} - {scorers[0].goals} goals
                          </div>
                        </div>
                      )}

                      {/* Key Players by Position */}
                      <div style={{
                        padding: "clamp(8px, 2vw, 10px) clamp(10px, 2.5vw, 12px)",
                        background: "var(--bg)",
                        borderRadius: 6,
                        fontSize: "clamp(11px, 2.5vw, 12px)",
                      }}>
                        <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>Key Players</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {teamData?.players?.slice(0, 5).map((p, i) => (
                            <div key={i} style={{ fontSize: "clamp(10px, 2.5vw, 11px)", color: "var(--text-secondary)" }}>
                              {p.name} <span style={{ color: "var(--text-tertiary)" }}>({p.position})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
          <div style={{ fontSize: "clamp(24px, 8vw, 32px)", marginBottom: "clamp(8px, 2vw, 12px)" }}>🏆</div>
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: "clamp(14px, 3.5vw, 16px)" }}>
            Select two teams to compare
          </div>
          <div style={{ fontSize: "clamp(12px, 3vw, 13px)" }}>
            Choose teams from the dropdown to see their complete analysis
          </div>
        </div>
      )}
    </div>
  );
}
