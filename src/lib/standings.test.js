import { describe, it, expect } from "vitest";
import {
  getGroupStandings,
  getAllStandings,
  getThirdPlacedTeams,
} from "./standings.js";

// Group A fixtures (from src/data/matches.js):
//   m1:  Mexico       vs South Africa
//   m2:  South Korea  vs Czechia
//   m25: Czechia      vs South Africa
//   m28: Mexico       vs South Korea
//   m53: Czechia      vs Mexico
//   m54: South Africa vs South Korea
const finished = (homeScore, awayScore, cards) => ({
  homeScore,
  awayScore,
  status: "finished",
  ...(cards ? { cards } : {}),
});

describe("getGroupStandings", () => {
  it("returns four zeroed rows and complete=false with no results", () => {
    const t = getGroupStandings("Group A", {});
    expect(t.rows).toHaveLength(4);
    expect(t.total).toBe(6);
    expect(t.played).toBe(0);
    expect(t.complete).toBe(false);
    t.rows.forEach((r) => {
      expect(r.played).toBe(0);
      expect(r.pts).toBe(0);
      expect(r.gd).toBe(0);
    });
  });

  it("returns empty rows for an unknown group", () => {
    const t = getGroupStandings("Group Z", {});
    expect(t.rows).toEqual([]);
    expect(t.complete).toBe(false);
  });

  it("awards 3 points for a win and accumulates goals for both sides", () => {
    const t = getGroupStandings("Group A", { 1: finished(2, 0) });
    const mexico = t.rows.find((r) => r.team === "Mexico");
    const sa = t.rows.find((r) => r.team === "South Africa");
    expect(mexico).toMatchObject({ played: 1, won: 1, pts: 3, gf: 2, ga: 0, gd: 2 });
    expect(sa).toMatchObject({ played: 1, lost: 1, pts: 0, gf: 0, ga: 2, gd: -2 });
  });

  it("awards 1 point each for a draw", () => {
    const t = getGroupStandings("Group A", { 1: finished(1, 1) });
    const mexico = t.rows.find((r) => r.team === "Mexico");
    const sa = t.rows.find((r) => r.team === "South Africa");
    expect(mexico).toMatchObject({ drawn: 1, pts: 1 });
    expect(sa).toMatchObject({ drawn: 1, pts: 1 });
  });

  it("ignores matches that are not finished", () => {
    const t = getGroupStandings("Group A", {
      1: { homeScore: 2, awayScore: 0, status: "live" },
    });
    expect(t.played).toBe(0);
    expect(t.rows.every((r) => r.played === 0)).toBe(true);
  });

  it("breaks a points tie on goal difference", () => {
    // Mexico +2, South Korea +1, both on 3 pts
    const t = getGroupStandings("Group A", {
      1: finished(2, 0), // Mexico 2-0 South Africa
      2: finished(1, 0), // South Korea 1-0 Czechia
    });
    expect(t.rows[0].team).toBe("Mexico");
    expect(t.rows[1].team).toBe("South Korea");
  });

  it("breaks a points+GD tie on goals for", () => {
    // Both +2 GD and 3 pts; Mexico GF 3 vs South Korea GF 2
    const t = getGroupStandings("Group A", {
      1: finished(3, 1), // Mexico 3-1
      2: finished(2, 0), // South Korea 2-0
    });
    expect(t.rows[0].team).toBe("Mexico");
    expect(t.rows[1].team).toBe("South Korea");
  });

  it("breaks a points+GD+GF tie on fair play (fewer cards ranks higher)", () => {
    // Identical records; Mexico picks up two yellows (fp -2),
    // South Korea a red (fp -3) → Mexico ranks higher.
    const t = getGroupStandings("Group A", {
      1: finished(1, 0, [
        { team: "Mexico", cardType: "yellow" },
        { team: "Mexico", cardType: "yellow" },
      ]),
      2: finished(1, 0, [{ team: "South Korea", cardType: "red" }]),
    });
    const mexico = t.rows.find((r) => r.team === "Mexico");
    const korea = t.rows.find((r) => r.team === "South Korea");
    expect(mexico.fp).toBe(-2);
    expect(korea.fp).toBe(-3);
    expect(t.rows[0].team).toBe("Mexico");
    expect(t.rows[1].team).toBe("South Korea");
  });

  it("falls back to alphabetical order when fully level", () => {
    const t = getGroupStandings("Group A", {
      1: finished(1, 0), // Mexico 1-0
      2: finished(1, 0), // South Korea 1-0
    });
    expect(t.rows[0].team).toBe("Mexico"); // "Mexico" < "South Korea"
    expect(t.rows[1].team).toBe("South Korea");
  });

  it("counts yellow and red cards into yc/rc and ignores unknown teams", () => {
    const t = getGroupStandings("Group A", {
      1: finished(1, 0, [
        { team: "Mexico", cardType: "yellow" },
        { team: "Mexico", cardType: "red" },
        { team: "Nowhere FC", cardType: "red" }, // not in this group → ignored
      ]),
    });
    const mexico = t.rows.find((r) => r.team === "Mexico");
    expect(mexico.yc).toBe(1);
    expect(mexico.rc).toBe(1);
    expect(mexico.fp).toBe(-4); // -1 yellow, -3 red
  });

  it("flags the group complete only when all six matches are finished", () => {
    const five = {
      1: finished(1, 0),
      2: finished(1, 0),
      25: finished(1, 0),
      28: finished(1, 0),
      53: finished(1, 0),
    };
    expect(getGroupStandings("Group A", five).complete).toBe(false);
    expect(
      getGroupStandings("Group A", { ...five, 54: finished(1, 0) }).complete
    ).toBe(true);
  });
});

describe("getAllStandings", () => {
  it("returns a table for each of the 12 groups", () => {
    const all = getAllStandings({});
    expect(Object.keys(all)).toHaveLength(12);
    expect(all["Group A"].rows).toHaveLength(4);
    expect(all["Group L"].rows).toHaveLength(4);
  });
});

describe("getThirdPlacedTeams", () => {
  // Full Group A scenario: Mexico 9 pts, South Korea 6, Czechia 3, South Africa 0
  const groupAComplete = {
    1: finished(2, 0), // Mexico 2-0 South Africa
    2: finished(2, 0), // South Korea 2-0 Czechia
    25: finished(1, 0), // Czechia 1-0 South Africa
    28: finished(1, 0), // Mexico 1-0 South Korea
    53: finished(0, 2), // Czechia 0-2 Mexico
    54: finished(0, 1), // South Africa 0-1 South Korea
  };

  it("only includes groups whose group stage is complete", () => {
    const thirds = getThirdPlacedTeams(groupAComplete);
    expect(thirds).toHaveLength(1);
    expect(thirds[0].team).toBe("Czechia");
    expect(thirds[0].group).toBe("A"); // "Group A" → "A"
  });

  it("returns an empty list when no group is complete", () => {
    expect(getThirdPlacedTeams({})).toEqual([]);
  });
});
