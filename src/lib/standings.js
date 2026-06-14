import { MATCHES } from "../data/matches.js";
import { GROUPS } from "../data/teams.js";

// Build a standings table for one group from finished group-stage matches.
// Tiebreaker order used: Points -> Goal Difference -> Goals For -> Alphabetical.
// NOTE: this is a simplified tiebreaker. Official FIFA rules also use head-to-head
// results and disciplinary (fair-play) points, which aren't modeled here.
export function getGroupStandings(groupKey, results) {
  const teams = GROUPS[groupKey] || [];
  const table = {};
  teams.forEach((t) => {
    table[t] = {
      team: t,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      pts: 0,
    };
  });

  const groupMatches = MATCHES.filter(
    (m) => m.stage === "Group Stage" && m.group === groupKey
  );

  groupMatches.forEach((m) => {
    const res = results[m.id];
    if (!res || res.status !== "finished") return;
    const home = m.home.name;
    const away = m.away.name;
    const hs = res.homeScore;
    const as = res.awayScore;
    if (!table[home] || !table[away]) return;

    table[home].played += 1;
    table[away].played += 1;
    table[home].gf += hs;
    table[home].ga += as;
    table[away].gf += as;
    table[away].ga += hs;

    if (hs > as) {
      table[home].won += 1;
      table[away].lost += 1;
      table[home].pts += 3;
    } else if (hs < as) {
      table[away].won += 1;
      table[home].lost += 1;
      table[away].pts += 3;
    } else {
      table[home].drawn += 1;
      table[away].drawn += 1;
      table[home].pts += 1;
      table[away].pts += 1;
    }
  });

  const rows = Object.values(table).map((r) => ({ ...r, gd: r.gf - r.ga }));
  rows.sort(
    (a, b) =>
      b.pts - a.pts ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      a.team.localeCompare(b.team)
  );

  const totalMatches = groupMatches.length;
  const playedMatches = groupMatches.filter(
    (m) => results[m.id]?.status === "finished"
  ).length;

  return {
    rows,
    complete: playedMatches === totalMatches && totalMatches > 0,
    played: playedMatches,
    total: totalMatches,
  };
}

export function getAllStandings(results) {
  const out = {};
  Object.keys(GROUPS).forEach((g) => {
    out[g] = getGroupStandings(g, results);
  });
  return out;
}

// Best 3rd-placed teams across all groups (only counts groups whose group
// stage is fully complete). Returns sorted array of { team, group, ...stats }
export function getThirdPlacedTeams(results) {
  const all = getAllStandings(results);
  const thirds = [];
  Object.entries(all).forEach(([groupKey, table]) => {
    if (!table.complete) return;
    const row = table.rows[2];
    if (row) thirds.push({ ...row, group: groupKey.replace("Group ", "") });
  });
  thirds.sort(
    (a, b) =>
      b.pts - a.pts ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      a.team.localeCompare(b.team)
  );
  return thirds;
}
