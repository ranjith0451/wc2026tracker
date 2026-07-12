import { describe, it, expect } from "vitest";
import {
  getThirdPlaceAssignments,
  resolveSide,
  resolveMatchTeams,
} from "./bracket.js";
import { getThirdPlacedTeams } from "./standings.js";
import { MATCHES } from "../data/matches.js";

// Real tournament results embedded in matches.js — all 72 group matches
// are finished there, which makes the group stage fully complete.
const REAL_RESULTS = Object.fromEntries(
  MATCHES.filter((m) => m.result).map((m) => [m.id, m.result])
);

// Mirror of THIRD_PLACE_SLOTS in bracket.js (not exported) so we can verify
// each assignment respects its slot's allowed feeder groups.
const SLOT_CANDIDATES = {
  74: ["A", "B", "C", "D", "F"],
  77: ["C", "D", "F", "G", "H"],
  79: ["C", "E", "F", "H", "I"],
  80: ["E", "H", "I", "J", "K"],
  81: ["B", "E", "F", "I", "J"],
  82: ["A", "E", "H", "I", "J"],
  85: ["E", "F", "G", "I", "J"],
  87: ["D", "E", "I", "J", "L"],
};

describe("getThirdPlaceAssignments", () => {
  it("is not ready while any group is incomplete", () => {
    const out = getThirdPlaceAssignments({});
    expect(out.ready).toBe(false);
    expect(out.assignments).toEqual({});
    expect(out.qualifiers).toEqual([]);
  });

  it("assigns the best 8 third-placed teams to distinct valid slots", () => {
    const out = getThirdPlaceAssignments(REAL_RESULTS);
    expect(out.ready).toBe(true);
    expect(out.qualifiers).toHaveLength(8);

    const slotIds = Object.keys(out.assignments).map(Number);
    expect(slotIds).toHaveLength(8);
    slotIds.forEach((id) => expect(SLOT_CANDIDATES).toHaveProperty(String(id)));

    // Every slot gets a distinct team, and each team comes from a group
    // allowed to feed that slot.
    const teams = Object.values(out.assignments);
    expect(new Set(teams).size).toBe(8);

    const groupByTeam = Object.fromEntries(
      out.qualifiers.map((q) => [q.team, q.group])
    );
    Object.entries(out.assignments).forEach(([matchId, team]) => {
      expect(teams).toContain(team);
      expect(SLOT_CANDIDATES[matchId]).toContain(groupByTeam[team]);
    });
  });

  it("qualifiers are the top 8 of the sorted third-place ranking", () => {
    const thirds = getThirdPlacedTeams(REAL_RESULTS);
    expect(thirds).toHaveLength(12);
    const { qualifiers } = getThirdPlaceAssignments(REAL_RESULTS);
    expect(qualifiers.map((q) => q.team)).toEqual(
      thirds.slice(0, 8).map((t) => t.team)
    );
  });
});

describe("resolveSide", () => {
  it("resolves a concrete team immediately", () => {
    expect(resolveSide({ type: "team", name: "Brazil" }, {}, null)).toEqual({
      name: "Brazil",
      resolved: true,
    });
  });

  it("returns TBD for a missing source", () => {
    expect(resolveSide(null, {}, null)).toEqual({ name: "TBD", resolved: false });
    expect(resolveSide({ type: "???" }, {}, null)).toEqual({
      name: "TBD",
      resolved: false,
    });
  });

  it("keeps group winner/runner-up as placeholders while the group is incomplete", () => {
    expect(resolveSide({ type: "winner", group: "A" }, {}, null)).toEqual({
      name: "Winner Group A",
      resolved: false,
    });
    expect(resolveSide({ type: "runnerup", group: "A" }, {}, null)).toEqual({
      name: "Runner-up Group A",
      resolved: false,
    });
  });

  it("resolves group winner and runner-up from a complete group", () => {
    // Same Group A scenario as standings.test.js: Mexico 1st, South Korea 2nd
    const results = {
      1: { homeScore: 2, awayScore: 0, status: "finished" },
      2: { homeScore: 2, awayScore: 0, status: "finished" },
      25: { homeScore: 1, awayScore: 0, status: "finished" },
      28: { homeScore: 1, awayScore: 0, status: "finished" },
      53: { homeScore: 0, awayScore: 2, status: "finished" },
      54: { homeScore: 0, awayScore: 1, status: "finished" },
    };
    expect(resolveSide({ type: "winner", group: "A" }, results, null)).toEqual({
      name: "Mexico",
      resolved: true,
    });
    expect(resolveSide({ type: "runnerup", group: "A" }, results, null)).toEqual({
      name: "South Korea",
      resolved: true,
    });
  });

  it("keeps winner_match unresolved until that match finishes", () => {
    // Match 76 is Brazil vs Japan
    const side = { type: "winner_match", matchId: 76 };
    expect(resolveSide(side, {}, null)).toEqual({
      name: "Winner M76",
      resolved: false,
    });
    expect(
      resolveSide(side, { 76: { homeScore: 1, awayScore: 0, status: "live" } }, null)
    ).toEqual({ name: "Winner M76", resolved: false });
  });

  it("resolves winner and loser of a finished knockout match", () => {
    const results = { 76: { homeScore: 2, awayScore: 1, status: "finished" } };
    expect(resolveSide({ type: "winner_match", matchId: 76 }, results, null)).toEqual(
      { name: "Brazil", resolved: true }
    );
    expect(resolveSide({ type: "loser_match", matchId: 76 }, results, null)).toEqual({
      name: "Japan",
      resolved: true,
    });
  });

  it("uses the penalty shootout to decide a drawn knockout match", () => {
    // Match 74 is Germany (home) vs Paraguay (away)
    const homeWinsPens = {
      74: {
        homeScore: 1,
        awayScore: 1,
        status: "finished",
        penalties: { home: 5, away: 3 },
      },
    };
    expect(
      resolveSide({ type: "winner_match", matchId: 74 }, homeWinsPens, null)
    ).toEqual({ name: "Germany", resolved: true });

    const awayWinsPens = {
      74: {
        homeScore: 1,
        awayScore: 1,
        status: "finished",
        penalties: { home: 3, away: 4 },
      },
    };
    expect(
      resolveSide({ type: "winner_match", matchId: 74 }, awayWinsPens, null)
    ).toEqual({ name: "Paraguay", resolved: true });
  });

  it("KNOWN ISSUE: a drawn knockout match with no penalty data silently declares the away team the winner", () => {
    // A finished knockout draw without penalties should arguably stay
    // unresolved, but the current homeWon logic falls through to "away won".
    // This characterization test documents the behavior; if you fix
    // resolveSide, update this expectation.
    const drawNoPens = {
      74: { homeScore: 1, awayScore: 1, status: "finished" },
    };
    expect(
      resolveSide({ type: "winner_match", matchId: 74 }, drawNoPens, null)
    ).toEqual({ name: "Paraguay", resolved: true });
  });

  it("resolves a chain of knockout references recursively", () => {
    // Semifinal 102 feeds the final (104 home is winner of 101, away winner of 102).
    // Match 102: home = winner M99, away = winner M100.
    const results = {
      ...REAL_RESULTS,
      99: { homeScore: 2, awayScore: 0, status: "finished" },
      100: { homeScore: 0, awayScore: 1, status: "finished" },
      102: { homeScore: 3, awayScore: 1, status: "finished" },
    };
    const side = resolveSide({ type: "winner_match", matchId: 102 }, results, null);
    expect(side.resolved).toBe(true);
    // Winner of 102 is its home side = winner of match 99 = match 99's home team
    const m99 = MATCHES.find((m) => m.id === 99);
    const expected =
      m99.home.type === "team"
        ? m99.home.name
        : resolveSide(m99.home, results, null).name;
    expect(side.name).toBe(expected);
  });
});

describe("resolveMatchTeams", () => {
  it("returns placeholders for the final while semifinals are unplayed", () => {
    const final = MATCHES.find((m) => m.id === 104);
    const { home, away } = resolveMatchTeams(final, {});
    expect(home).toEqual({ name: "Winner M101", resolved: false });
    expect(away).toEqual({ name: "Winner M102", resolved: false });
  });

  it("resolves concrete teams directly", () => {
    const m76 = MATCHES.find((m) => m.id === 76);
    const { home, away } = resolveMatchTeams(m76, {});
    expect(home).toEqual({ name: "Brazil", resolved: true });
    expect(away).toEqual({ name: "Japan", resolved: true });
  });

  it("resolves a third_best side from the slot assignment once groups complete", () => {
    const { assignments } = getThirdPlaceAssignments(REAL_RESULTS);
    const syntheticMatch = {
      id: 74,
      home: { type: "team", name: "Germany" },
      away: { type: "third_best", candidates: ["A", "B", "C", "D", "F"] },
    };
    const { away } = resolveMatchTeams(syntheticMatch, REAL_RESULTS);
    expect(away.resolved).toBe(true);
    expect(away.isThird).toBe(true);
    expect(away.name).toBe(assignments["74"]);
  });

  it("keeps a third_best side as placeholder while groups are incomplete", () => {
    const syntheticMatch = {
      id: 74,
      home: { type: "team", name: "Germany" },
      away: { type: "third_best", candidates: ["A", "B"] },
    };
    const { away } = resolveMatchTeams(syntheticMatch, {});
    expect(away).toEqual({
      name: "Best 3rd (A/B)",
      resolved: false,
      isThird: true,
    });
  });
});
