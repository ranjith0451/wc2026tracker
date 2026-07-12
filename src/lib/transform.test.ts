import { describe, it, expect } from "vitest";
import {
  apiStatusToLocal,
  buildFixtureMap,
  fixtureToResult,
  transformEvents,
  transformStatistics,
  transformLineups,
  computeTopScorers,
} from "./transform";

const fixture = (over: Record<string, unknown> = {}) => ({
  fixture: { id: 101, status: { short: "FT", elapsed: 90 } },
  teams: {
    home: { id: 1, name: "Brazil", logo: "br.png" },
    away: { id: 2, name: "Japan", logo: "jp.png" },
  },
  goals: { home: 2, away: 1 },
  score: { halftime: { home: 1, away: 0 } },
  ...over,
});

describe("apiStatusToLocal", () => {
  it("maps live, finished, and scheduled status codes", () => {
    for (const s of ["1H", "HT", "2H", "ET", "P", "LIVE"]) {
      expect(apiStatusToLocal(s)).toBe("live");
    }
    for (const s of ["FT", "AET", "PEN", "AWD", "WO"]) {
      expect(apiStatusToLocal(s)).toBe("finished");
    }
    expect(apiStatusToLocal("NS")).toBe("scheduled");
    expect(apiStatusToLocal("TBD")).toBe("scheduled");
  });
});

describe("buildFixtureMap", () => {
  it("keys fixtures by team pair and fixture id, normalizing team names", () => {
    const map = buildFixtureMap([
      fixture({
        teams: {
          home: { name: "Turkey" },
          away: { name: "Czech Republic" },
        },
      }),
    ]);
    const f = map["Türkiye|Czechia"];
    expect(f).toBeDefined();
    expect(f.teams.home.name).toBe("Türkiye");
    expect(map["101"]).toBe(f);
  });

  it("handles null/undefined input", () => {
    expect(buildFixtureMap(null)).toEqual({});
    expect(buildFixtureMap(undefined)).toEqual({});
  });
});

describe("fixtureToResult", () => {
  it("returns null for scheduled or missing fixtures", () => {
    expect(fixtureToResult(null)).toBeNull();
    expect(
      fixtureToResult(fixture({ fixture: { id: 1, status: { short: "NS" } } }))
    ).toBeNull();
  });

  it("maps a finished fixture to a MatchResult", () => {
    const r = fixtureToResult(fixture());
    expect(r).toMatchObject({
      status: "finished",
      homeScore: 2,
      awayScore: 1,
      statusShort: "FT",
      apiFixtureId: 101,
      homeLogo: "br.png",
      awayLogo: "jp.png",
      halftime: { home: 1, away: 0 },
    });
    expect(r?.penalties).toBeUndefined();
  });

  it("includes penalties only when both sides are present", () => {
    const withPens = fixtureToResult(
      fixture({
        score: { halftime: null, penalty: { home: 4, away: 3 } },
      })
    );
    expect(withPens?.penalties).toEqual({ home: 4, away: 3 });

    const partial = fixtureToResult(
      fixture({ score: { halftime: null, penalty: { home: 4, away: null } } })
    );
    expect(partial?.penalties).toBeUndefined();
  });

  it("defaults missing goals to 0 for a live match", () => {
    const r = fixtureToResult(
      fixture({
        fixture: { id: 1, status: { short: "1H", elapsed: 30 } },
        goals: { home: null, away: null },
      })
    );
    expect(r).toMatchObject({ status: "live", homeScore: 0, awayScore: 0, elapsed: 30 });
  });
});

describe("transformEvents", () => {
  it("splits events into scorers, cards, and subs with stoppage-time minutes", () => {
    const out = transformEvents({
      response: [
        {
          time: { elapsed: 45, extra: 2 },
          team: { name: "Brazil" },
          player: { name: "Ace" },
          assist: { name: "Wing" },
          type: "Goal",
          detail: "Normal Goal",
        },
        {
          time: { elapsed: 60 },
          team: { name: "Japan" },
          player: { name: "Pen Taker" },
          type: "Goal",
          detail: "Penalty",
        },
        {
          time: { elapsed: 70 },
          team: { name: "Japan" },
          player: { name: "Unlucky" },
          type: "Goal",
          detail: "Own Goal",
        },
        {
          time: { elapsed: 30 },
          team: { name: "Brazil" },
          player: { name: "Hard Man" },
          type: "Card",
          detail: "Yellow Card",
        },
        {
          time: { elapsed: 80 },
          team: { name: "Brazil" },
          player: { name: "Sent Off" },
          type: "Card",
          detail: "Red Card",
        },
        {
          time: { elapsed: 65 },
          team: { name: "Japan" },
          player: { name: "Out" },
          assist: { name: "In" },
          type: "subst",
        },
      ],
    });

    expect(out.scorers).toHaveLength(3);
    expect(out.scorers[0]).toMatchObject({
      player: "Ace",
      minute: 47,
      penalty: false,
      ownGoal: false,
      assist: "Wing",
    });
    expect(out.scorers[1]).toMatchObject({ penalty: true, ownGoal: false });
    expect(out.scorers[2]).toMatchObject({ ownGoal: true });

    expect(out.cards).toEqual([
      expect.objectContaining({ player: "Hard Man", cardType: "yellow" }),
      expect.objectContaining({ player: "Sent Off", cardType: "red" }),
    ]);

    expect(out.subs).toEqual([
      { team: "Japan", playerOut: "Out", playerIn: "In", minute: 65 },
    ]);
  });

  it("returns empty arrays for a missing response", () => {
    expect(transformEvents(null)).toEqual({ scorers: [], cards: [], subs: [] });
  });
});

describe("transformStatistics", () => {
  it("returns null when there are no sides", () => {
    expect(transformStatistics(null)).toBeNull();
    expect(transformStatistics({ response: [] })).toBeNull();
  });

  it("parses values, percentages, and derives away possession", () => {
    const out = transformStatistics({
      response: [
        {
          team: { name: "Brazil" },
          statistics: [
            { type: "Ball Possession", value: "62%" },
            { type: "Total Shots", value: 14 },
            { type: "expected_goals", value: "2.35" },
            { type: "Fouls", value: null },
          ],
        },
        {
          team: { name: "Japan" },
          statistics: [{ type: "Total Shots", value: 6 }],
        },
      ],
    });
    expect(out).toMatchObject({
      homeTeam: "Brazil",
      awayTeam: "Japan",
      homePoss: 62,
      awayPoss: 38,
      homeShots: 14,
      awayShots: 6,
      homeXG: 2.35,
      homeFouls: null,
    });
  });
});

describe("transformLineups", () => {
  it("maps sides, starters, and subs", () => {
    const out = transformLineups({
      response: [
        {
          team: { name: "Brazil", logo: "br.png" },
          formation: "4-3-3",
          startXI: [{ player: { name: "Keeper", number: 1, pos: "G", grid: "1:1" } }],
          substitutes: [{ player: { name: "Backup", number: 12, pos: "G" } }],
          coach: { name: "Boss" },
        },
      ],
    });
    expect(out).toEqual([
      {
        team: "Brazil",
        logo: "br.png",
        formation: "4-3-3",
        startXI: [{ name: "Keeper", number: 1, pos: "G", grid: "1:1" }],
        substitutes: [{ name: "Backup", number: 12, pos: "G" }],
        coach: "Boss",
      },
    ]);
    expect(transformLineups(null)).toEqual([]);
  });
});

describe("computeTopScorers", () => {
  it("aggregates goals and assists, skipping own goals", () => {
    const events = {
      m1: {
        scorers: [
          { team: "Brazil", player: "Ace", minute: 10, assist: "Wing" },
          { team: "Brazil", player: "Ace", minute: 50, assist: null },
          { team: "Japan", player: "Unlucky", minute: 70, ownGoal: true },
        ],
        cards: [],
        subs: [],
      },
      m2: {
        scorers: [{ team: "Brazil", player: "Wing", minute: 30 }],
        cards: [],
        subs: [],
      },
      m3: null,
    };
    const top = computeTopScorers(events);
    expect(top[0]).toEqual({
      player: "Ace",
      team: "Brazil",
      goals: 2,
      assists: 0,
      appearances: 0,
    });
    const wing = top.find((p) => p.player === "Wing");
    expect(wing).toMatchObject({ goals: 1, assists: 1 });
    // own-goal scorer is not credited
    expect(top.some((p) => p.player === "Unlucky")).toBe(false);
  });

  it("sorts by goals, breaking ties on assists", () => {
    const top = computeTopScorers({
      m1: {
        scorers: [
          { team: "A", player: "GoalOnly", minute: 1 },
          { team: "A", player: "GoalAndAssist", minute: 2 },
          { team: "A", player: "GoalOnly2", minute: 3, assist: "GoalAndAssist" },
        ],
        cards: [],
        subs: [],
      },
    });
    // All three have 1 goal; the assist breaks the tie
    expect(top[0]).toMatchObject({ player: "GoalAndAssist", goals: 1, assists: 1 });
  });
});
