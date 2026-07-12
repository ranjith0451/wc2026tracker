import { describe, it, expect } from "vitest";
import { MATCHES } from "./matches.js";
import { GROUPS, FLAGS } from "./teams.js";

// These hand-maintained data files feed the standings and bracket logic.
// A typo here breaks the app at runtime with no error, so we validate the
// invariants that code elsewhere silently relies on.

const KNOCKOUT_SOURCE_TYPES = new Set([
  "team",
  "winner",
  "runnerup",
  "third_best",
  "winner_match",
  "loser_match",
]);

const STAGES = new Set([
  "Group Stage",
  "Round of 32",
  "Round of 16",
  "Quarterfinal",
  "Semifinal",
  "Third Place",
  "Final",
]);

const MATCH_IDS = new Set(MATCHES.map((m) => m.id));

describe("GROUPS", () => {
  it("has 12 groups of exactly 4 teams with no duplicates", () => {
    const keys = Object.keys(GROUPS);
    expect(keys).toHaveLength(12);
    keys.forEach((k) => expect(k).toMatch(/^Group [A-L]$/));

    const allTeams = Object.values(GROUPS).flat();
    expect(allTeams).toHaveLength(48);
    expect(new Set(allTeams).size).toBe(48);
    Object.values(GROUPS).forEach((teams) => expect(teams).toHaveLength(4));
  });

  it("has a flag code for every team", () => {
    Object.values(GROUPS)
      .flat()
      .forEach((team) => {
        expect(FLAGS[team], `missing flag for ${team}`).toBeTruthy();
      });
  });
});

describe("MATCHES", () => {
  it("contains 104 matches with unique ids", () => {
    expect(MATCHES).toHaveLength(104);
    expect(MATCH_IDS.size).toBe(104);
  });

  it("uses only known stages and valid kickoff timestamps", () => {
    MATCHES.forEach((m) => {
      expect(STAGES.has(m.stage), `unknown stage "${m.stage}" in match ${m.id}`).toBe(true);
      expect(
        Number.isNaN(new Date(m.isoIST).getTime()),
        `bad isoIST in match ${m.id}`
      ).toBe(false);
    });
  });

  it("has 72 group-stage matches, 6 per group, between teams of that group", () => {
    const groupMatches = MATCHES.filter((m) => m.stage === "Group Stage");
    expect(groupMatches).toHaveLength(72);

    const perGroup = {};
    groupMatches.forEach((m) => {
      expect(GROUPS, `unknown group "${m.group}" in match ${m.id}`).toHaveProperty(m.group);
      perGroup[m.group] = (perGroup[m.group] || 0) + 1;

      expect(m.home.type).toBe("team");
      expect(m.away.type).toBe("team");
      const teams = GROUPS[m.group];
      expect(teams, `match ${m.id}: ${m.home.name} not in ${m.group}`).toContain(m.home.name);
      expect(teams, `match ${m.id}: ${m.away.name} not in ${m.group}`).toContain(m.away.name);
      expect(m.home.name).not.toBe(m.away.name);
    });
    Object.values(perGroup).forEach((count) => expect(count).toBe(6));
  });

  it("has knockout sides with valid source types", () => {
    MATCHES.filter((m) => m.stage !== "Group Stage").forEach((m) => {
      [m.home, m.away].forEach((side) => {
        expect(
          KNOCKOUT_SOURCE_TYPES.has(side.type),
          `match ${m.id}: unknown source type "${side.type}"`
        ).toBe(true);
      });
    });
  });

  it("only references earlier, existing matches in winner_match/loser_match sources", () => {
    MATCHES.forEach((m) => {
      [m.home, m.away].forEach((side) => {
        if (side.type === "winner_match" || side.type === "loser_match") {
          expect(
            MATCH_IDS.has(side.matchId),
            `match ${m.id} references missing match ${side.matchId}`
          ).toBe(true);
          expect(side.matchId, `match ${m.id} references a later match`).toBeLessThan(m.id);
        }
      });
    });
  });

  it("names real group-stage teams in resolved knockout sides", () => {
    const allTeams = new Set(Object.values(GROUPS).flat());
    MATCHES.filter((m) => m.stage !== "Group Stage").forEach((m) => {
      [m.home, m.away].forEach((side) => {
        if (side.type === "team") {
          expect(
            allTeams.has(side.name),
            `match ${m.id}: unknown team "${side.name}"`
          ).toBe(true);
        }
      });
    });
  });

  it("has well-formed embedded results", () => {
    MATCHES.filter((m) => m.result).forEach((m) => {
      expect(typeof m.result.homeScore, `match ${m.id}`).toBe("number");
      expect(typeof m.result.awayScore, `match ${m.id}`).toBe("number");
      expect(m.result.homeScore).toBeGreaterThanOrEqual(0);
      expect(m.result.awayScore).toBeGreaterThanOrEqual(0);
      if (m.result.penalties) {
        expect(typeof m.result.penalties.home).toBe("number");
        expect(typeof m.result.penalties.away).toBe("number");
      }
    });
  });
});
