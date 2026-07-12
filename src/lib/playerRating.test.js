import { describe, it, expect } from "vitest";
import { computePlayerRatings } from "./playerRating.js";

// Two-player groups normalize to the 1.0–10.0 extremes (min-max), which makes
// pre-deduction ratings deterministic: best raw → 10.0, worst raw → 1.0.
const fw = (id, stats = {}) => ({ id, name: id, position: "FW", teamName: "Alpha", ...stats });
const mf = (id, stats = {}) => ({ id, name: id, position: "CM", teamName: "Alpha", ...stats });

describe("computePlayerRatings", () => {
  it("returns an empty array for empty input", () => {
    expect(computePlayerRatings([])).toEqual([]);
    expect(computePlayerRatings(null)).toEqual([]);
  });

  it("detects position groups from position strings", () => {
    const players = [
      { id: "gk", position: "GK" },
      { id: "g", position: "G" },
      { id: "cb", position: "CB" },
      { id: "lb", position: "LB" },
      { id: "wb", position: "RWB" },
      { id: "d", position: "D" },
      { id: "st", position: "ST" },
      { id: "lw", position: "LW" },
      { id: "cf", position: "CF" },
      { id: "f", position: "F" },
      { id: "cm", position: "CM" },
      { id: "none" }, // no position → MF
    ];
    const byId = Object.fromEntries(
      computePlayerRatings(players).map((p) => [p.id, p.posGroup])
    );
    expect(byId).toEqual({
      gk: "GK",
      g: "GK",
      cb: "DF",
      lb: "DF",
      wb: "DF",
      d: "DF",
      st: "FW",
      lw: "FW",
      cf: "FW",
      f: "FW",
      cm: "MF",
      none: "MF",
    });
  });

  it("ranks better performers higher and stretches each group to 1.0–10.0", () => {
    const out = computePlayerRatings([
      fw("scorer", { goals: 2, shotsOnTarget: 3 }),
      fw("quiet", { goals: 0, shotsOnTarget: 0 }),
    ]);
    expect(out[0].id).toBe("scorer");
    expect(out[0].rating).toBe(10.0);
    expect(out[1].id).toBe("quiet");
    expect(out[1].rating).toBe(1.0);
  });

  it("reads snake_case stat keys the same as camelCase", () => {
    const out = computePlayerRatings([
      mf("camel", { keyPasses: 5 }),
      mf("snake", { key_passes: 5 }),
      mf("zero", {}),
    ]);
    const byId = Object.fromEntries(out.map((p) => [p.id, p.rating]));
    expect(byId.camel).toBe(byId.snake);
    expect(byId.camel).toBeGreaterThan(byId.zero);
  });

  it("normalizes each position group independently", () => {
    const out = computePlayerRatings([
      fw("fwBest", { goals: 3 }),
      fw("fwWorst", { goals: 0 }),
      mf("mfBest", { keyPasses: 4 }),
      mf("mfWorst", { keyPasses: 0 }),
    ]);
    const byId = Object.fromEntries(out.map((p) => [p.id, p.rating]));
    // Both group leaders top out at 10.0 despite different raw scales
    expect(byId.fwBest).toBe(10.0);
    expect(byId.mfBest).toBe(10.0);
    expect(byId.fwWorst).toBe(1.0);
    expect(byId.mfWorst).toBe(1.0);
  });

  it("gives the neutral base score when a position group has no spread", () => {
    // A lone player (or identical raw scores) can't be min-max normalized;
    // they get BASE_SCORE (6.0) instead of being pinned to the 1.0 floor.
    const solo = computePlayerRatings([
      { id: "soloGK", position: "GK", teamName: "Alpha", saves: 9 },
    ]);
    expect(solo[0].rating).toBe(6.0);

    const identical = computePlayerRatings([
      fw("twinA", { goals: 1 }),
      fw("twinB", { goals: 1 }),
    ]);
    expect(identical.map((p) => p.rating)).toEqual([6.0, 6.0]);
  });

  it("applies card and own-goal deductions from the events array", () => {
    const events = [
      { playerId: "top", type: "Yellow Card" },
      { playerId: "top", type: "Yellow Card" },
      { playerId: "og", type: "Own Goal" },
    ];
    const out = computePlayerRatings(
      [
        fw("top", { goals: 2 }), // 10.0 base
        fw("og", { goals: 2 }), // same raw → also 10.0 base... but min-max needs a spread
        fw("low", { goals: 0 }), // 1.0 base
      ],
      events
    );
    const byId = Object.fromEntries(out.map((p) => [p.id, p.rating]));
    expect(byId.top).toBe(9.0); // 10.0 − 2 × 0.5 yellow
    expect(byId.og).toBe(8.5); // 10.0 − 1.5 own goal
    expect(byId.low).toBe(1.0);
  });

  it("applies the red-card deduction and clamps at the 1.0 floor", () => {
    const events = [
      { playerId: "sentOff", type: "Red Card" },
      { playerId: "lowRed", type: "Red Card" },
    ];
    const out = computePlayerRatings(
      [fw("sentOff", { goals: 2 }), fw("lowRed", { goals: 0 })],
      events
    );
    const byId = Object.fromEntries(out.map((p) => [p.id, p.rating]));
    expect(byId.sentOff).toBe(8.0); // 10.0 − 2.0
    expect(byId.lowRed).toBe(1.0); // 1.0 − 2.0 → clamped to 1.0
  });

  it("caps ratings at 10.0 (GK penalty-save bonus cannot exceed the ceiling)", () => {
    const events = [{ playerId: "hero", type: "Penalty saved" }];
    const out = computePlayerRatings(
      [
        { id: "hero", position: "GK", teamName: "Alpha", saves: 8 },
        { id: "other", position: "GK", teamName: "Beta", saves: 0 },
      ],
      events
    );
    const hero = out.find((p) => p.id === "hero");
    expect(hero.rating).toBe(10.0); // 10.0 + 1.5 clamped
  });

  it("credits clean sheets to the right team's defenders", () => {
    const matchResult = { homeScore: 1, awayScore: 0, homeTeam: "Alpha", awayTeam: "Beta" };
    const out = computePlayerRatings(
      [
        { id: "alphaDF", position: "CB", teamName: "Alpha" },
        { id: "betaDF", position: "CB", teamName: "Beta" },
      ],
      [],
      matchResult
    );
    const byId = Object.fromEntries(out.map((p) => [p.id, p.rating]));
    // Alpha conceded 0 → its defender gets the clean-sheet weight → tops the group
    expect(byId.alphaDF).toBe(10.0);
    expect(byId.betaDF).toBe(1.0);
  });

  it("assigns rating colors by threshold and sorts descending", () => {
    // passAccuracy 0 / 61.1 / 100 → normalized 1.0 / 6.5 / 10.0
    const out = computePlayerRatings([
      mf("low", { passAccuracy: 0 }),
      mf("mid", { passAccuracy: 61.1 }),
      mf("high", { passAccuracy: 100 }),
    ]);
    expect(out.map((p) => p.id)).toEqual(["high", "mid", "low"]);
    expect(out.map((p) => p.ratingColor)).toEqual(["green", "yellow", "red"]);
  });
});
