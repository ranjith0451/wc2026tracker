import { MATCHES } from "../data/matches.js";

// Aggregates goal scorers from all finished matches.
// Each result.scorers entry: { team, player, minute, penalty?: bool, ownGoal?: bool }
export function getTopScorers(results) {
  const tally = {}; // "team|player" -> { team, player, goals, penalties, matches: Set }

  MATCHES.forEach((m) => {
    const res = results[m.id];
    if (!res || res.status !== "finished" || !res.scorers) return;
    res.scorers.forEach((s) => {
      if (s.ownGoal) return; // own goals don't count for the scorer
      const key = `${s.team}|${s.player}`;
      if (!tally[key]) {
        tally[key] = { team: s.team, player: s.player, goals: 0, penalties: 0, matchIds: new Set() };
      }
      tally[key].goals += 1;
      if (s.penalty) tally[key].penalties += 1;
      tally[key].matchIds.add(m.id);
    });
  });

  const rows = Object.values(tally).map((r) => ({
    team: r.team,
    player: r.player,
    goals: r.goals,
    penalties: r.penalties,
    matches: r.matchIds.size,
  }));

  rows.sort((a, b) => b.goals - a.goals || a.player.localeCompare(b.player));
  return rows;
}

export function getTeamGoalCounts(results) {
  const counts = {};
  MATCHES.forEach((m) => {
    const res = results[m.id];
    if (!res || res.status !== "finished") return;
    if (m.home?.type === "team") {
      counts[m.home.name] = (counts[m.home.name] || 0) + (res.homeScore ?? 0);
    }
    if (m.away?.type === "team") {
      counts[m.away.name] = (counts[m.away.name] || 0) + (res.awayScore ?? 0);
    }
  });
  return counts;
}
