import { MATCHES } from "../data/matches.js";
import { GROUPS } from "../data/teams.js";
import { getAllStandings, getThirdPlacedTeams } from "./standings.js";

const MATCH_BY_ID = Object.fromEntries(MATCHES.map((m) => [m.id, m]));

// The 8 "Best 3rd-placed team" slots in the Round of 32, with the groups
// that can feed each slot per FIFA's allocation table (Annex C has 495
// combinations - we approximate with a bipartite assignment, which gives a
// VALID but not guaranteed *official* pairing. Always double check against
// FIFA's published bracket once the group stage completes.)
const THIRD_PLACE_SLOTS = [
  { matchId: 74, candidates: ["A", "B", "C", "D", "F"] },
  { matchId: 77, candidates: ["C", "D", "F", "G", "H"] },
  { matchId: 79, candidates: ["C", "E", "F", "H", "I"] },
  { matchId: 80, candidates: ["E", "H", "I", "J", "K"] },
  { matchId: 81, candidates: ["B", "E", "F", "I", "J"] },
  { matchId: 82, candidates: ["A", "E", "H", "I", "J"] },
  { matchId: 85, candidates: ["E", "F", "G", "I", "J"] },
  { matchId: 87, candidates: ["D", "E", "I", "J", "L"] },
];

// Simple backtracking bipartite matcher: assign each qualifying group (8 of 12)
// to one of the 8 slots whose candidate list includes that group.
function assignSlots(qualifyingGroups) {
  const assignment = {}; // matchId -> group
  const usedGroups = new Set();

  function backtrack(slotIdx) {
    if (slotIdx === THIRD_PLACE_SLOTS.length) return true;
    const slot = THIRD_PLACE_SLOTS[slotIdx];
    for (const g of slot.candidates) {
      if (!qualifyingGroups.includes(g) || usedGroups.has(g)) continue;
      assignment[slot.matchId] = g;
      usedGroups.add(g);
      if (backtrack(slotIdx + 1)) return true;
      usedGroups.delete(g);
      delete assignment[slot.matchId];
    }
    return false;
  }

  backtrack(0);
  return assignment;
}

// Returns { [matchId]: teamName } for the third-place slots, or {} if the
// group stage isn't fully complete yet.
export function getThirdPlaceAssignments(results) {
  const all = getAllStandings(results);
  const allComplete = Object.values(all).every((t) => t.complete);
  if (!allComplete) return { assignments: {}, ready: false, qualifiers: [] };

  const thirds = getThirdPlacedTeams(results); // sorted best-first, 12 entries
  const qualifiers = thirds.slice(0, 8);
  const qualifyingGroups = qualifiers.map((q) => q.group);
  const assignment = assignSlots(qualifyingGroups);

  const byGroup = Object.fromEntries(qualifiers.map((q) => [q.group, q.team]));
  const assignments = {};
  Object.entries(assignment).forEach(([matchId, group]) => {
    assignments[matchId] = byGroup[group];
  });

  return { assignments, ready: true, qualifiers };
}

function placeholderLabel(source) {
  if (!source) return "TBD";
  switch (source.type) {
    case "team":
      return source.name;
    case "winner":
      return `Winner Group ${source.group}`;
    case "runnerup":
      return `Runner-up Group ${source.group}`;
    case "third_best":
      return `Best 3rd (${source.candidates.join("/")})`;
    case "winner_match":
      return `Winner M${source.matchId}`;
    case "loser_match":
      return `Loser M${source.matchId}`;
    default:
      return "TBD";
  }
}

// Resolve a match side ("home"/"away" source object) into a display name.
// Returns { name, resolved } - resolved=false means it's still a placeholder.
export function resolveSide(source, results, thirdAssignments) {
  if (!source) return { name: "TBD", resolved: false };

  switch (source.type) {
    case "team":
      return { name: source.name, resolved: true };

    case "winner":
    case "runnerup": {
      const groupKey = `Group ${source.group}`;
      const standings = getAllStandings(results)[groupKey];
      if (!standings || !standings.complete) {
        return { name: placeholderLabel(source), resolved: false };
      }
      const idx = source.type === "winner" ? 0 : 1;
      return { name: standings.rows[idx].team, resolved: true };
    }

    case "third_best": {
      // Only reachable here without matchId context; treat as unresolved.
      return { name: placeholderLabel(source), resolved: false, isThird: true };
    }

    case "winner_match":
    case "loser_match": {
      const res = results[source.matchId];
      const m = MATCH_BY_ID[source.matchId];
      if (!res || res.status !== "finished") {
        return { name: placeholderLabel(source), resolved: false };
      }
      const homeWon = res.homeScore > res.awayScore ||
        (res.homeScore === res.awayScore && res.penalties && res.penalties.home > res.penalties.away);
      const winnerSide = homeWon ? m.home : m.away;
      const loserSide = homeWon ? m.away : m.home;
      const target = source.type === "winner_match" ? winnerSide : loserSide;

      if (target?.type === "third_best") {
        const teamName = thirdAssignments?.assignments?.[String(source.matchId)];
        if (teamName) return { name: teamName, resolved: true, isThird: true };
        return { name: placeholderLabel(target), resolved: false, isThird: true };
      }
      return resolveSide(target, results, thirdAssignments);
    }

    default:
      return { name: "TBD", resolved: false };
  }
}

// Top-level helper: resolve both sides of a match by id.
export function resolveMatchTeams(match, results) {
  const thirdAssign = getThirdPlaceAssignments(results);

  const resolve = (source) => {
    if (source?.type === "third_best") {
      const teamName = thirdAssign.assignments?.[String(match.id)];
      if (teamName) return { name: teamName, resolved: true, isThird: true };
      return { name: placeholderLabel(source), resolved: false, isThird: true };
    }
    return resolveSide(source, results, thirdAssign);
  };

  return {
    home: resolve(match.home),
    away: resolve(match.away),
  };
}
