import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  NAME_ALIASES,
  normName,
  mapStatus,
  mapMatch,
  cached,
  __resetStatsCache,
} from "./stats.js";
import { GROUPS } from "../src/data/teams.js";

describe("normName", () => {
  it("maps football-data team names to local names", () => {
    expect(normName("Turkey")).toBe("Türkiye");
    expect(normName("Czech Republic")).toBe("Czechia");
    expect(normName("United States")).toBe("USA");
    expect(normName("Korea Republic")).toBe("South Korea");
  });

  it("passes through unknown names unchanged", () => {
    expect(normName("Brazil")).toBe("Brazil");
  });

  it("every alias target is a real team in GROUPS", () => {
    const allTeams = new Set(Object.values(GROUPS).flat());
    Object.values(NAME_ALIASES).forEach((local) => {
      expect(allTeams.has(local), `alias target "${local}" not in GROUPS`).toBe(true);
    });
  });
});

describe("mapStatus", () => {
  const m = (status, duration) => ({ status, score: duration ? { duration } : {} });

  it("maps finished states, deriving aet/pen from score duration", () => {
    expect(mapStatus(m("FINISHED"))).toBe("finished");
    expect(mapStatus(m("AWARDED"))).toBe("finished");
    expect(mapStatus(m("FINISHED", "PENALTY_SHOOTOUT"))).toBe("pen");
    expect(mapStatus(m("FINISHED", "EXTRA_TIME"))).toBe("aet");
    expect(mapStatus(m("FINISHED", "REGULAR"))).toBe("finished");
  });

  it("maps in-play and interruption states", () => {
    expect(mapStatus(m("IN_PLAY"))).toBe("live");
    expect(mapStatus(m("PAUSED"))).toBe("ht");
    expect(mapStatus(m("SUSPENDED"))).toBe("postponed");
    expect(mapStatus(m("POSTPONED"))).toBe("postponed");
    expect(mapStatus(m("CANCELLED"))).toBe("cancelled");
  });

  it("defaults everything else to scheduled", () => {
    expect(mapStatus(m("SCHEDULED"))).toBe("scheduled");
    expect(mapStatus(m("TIMED"))).toBe("scheduled");
    expect(mapStatus(m("SOMETHING_NEW"))).toBe("scheduled");
  });
});

describe("mapMatch", () => {
  const fdMatch = {
    id: 537384,
    utcDate: "2026-06-14T18:00:00Z",
    status: "FINISHED",
    stage: "GROUP_STAGE",
    group: "Group A",
    matchday: 1,
    homeTeam: { id: 1, name: "Turkey", tla: "TUR", crest: "tr.png" },
    awayTeam: { id: 2, name: "United States", tla: "USA", crest: "us.png" },
    score: {
      winner: "HOME_TEAM",
      duration: "REGULAR",
      fullTime: { home: 2, away: 1 },
      halfTime: { home: 1, away: 0 },
    },
    venue: "SoFi Stadium",
  };

  it("maps a football-data match to the legacy shape with normalized names", () => {
    const out = mapMatch(fdMatch);
    expect(out).toMatchObject({
      id: "537384",
      utc_date: "2026-06-14T18:00:00Z",
      status: "finished",
      stage: "GROUP_STAGE",
      group: "Group A",
      matchday: 1,
      home_team: { id: 1, name: "Türkiye", tla: "TUR", crest: "tr.png" },
      away_team: { id: 2, name: "USA", tla: "USA", crest: "us.png" },
      home_score: 2,
      away_score: 1,
      score: { home: 2, away: 1, half_time_home: 1, half_time_away: 0 },
      penalties: null,
      winner: "HOME_TEAM",
      duration: "REGULAR",
      venue: "SoFi Stadium",
    });
  });

  it("maps penalties when present", () => {
    const out = mapMatch({
      ...fdMatch,
      score: { ...fdMatch.score, duration: "PENALTY_SHOOTOUT", penalties: { home: 4, away: 3 } },
    });
    expect(out.status).toBe("pen");
    expect(out.penalties).toEqual({ home: 4, away: 3 });
  });

  it("degrades to nulls for missing fields", () => {
    const out = mapMatch({ id: 1, status: "TIMED" });
    expect(out).toMatchObject({
      id: "1",
      status: "scheduled",
      group: null,
      matchday: null,
      home_team: { id: null, name: null, tla: null, crest: null },
      away_team: { id: null, name: null, tla: null, crest: null },
      home_score: null,
      away_score: null,
      penalties: null,
      venue: null,
    });
  });
});

describe("cached (resilient caching)", () => {
  const makeRedis = () => ({
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue("OK"),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
  });

  beforeEach(() => {
    __resetStatsCache();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-12T12:00:00Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("calls the fetcher on a miss and serves memory-cached data afterwards, even without Redis", async () => {
    const fn = vi.fn().mockResolvedValue({ v: 1 });
    const first = await cached(null, "k", 60, fn);
    expect(first).toEqual({ data: { v: 1 }, cached: false });

    const second = await cached(null, "k", 60, fn);
    expect(second).toEqual({ data: { v: 1 }, cached: true });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("refetches after the memory TTL expires", async () => {
    const fn = vi.fn().mockResolvedValue({ v: 1 });
    await cached(null, "k", 60, fn);
    vi.advanceTimersByTime(61_000);
    await cached(null, "k", 60, fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("writes fresh and long-TTL stale copies to Redis and tracks usage", async () => {
    const redis = makeRedis();
    const fn = vi.fn().mockResolvedValue({ v: 1 });
    await cached(redis, "k", 60, fn);

    const json = JSON.stringify({ v: 1 });
    expect(redis.setex).toHaveBeenCalledWith("k", 60, json);
    expect(redis.setex).toHaveBeenCalledWith("k:stale", 6 * 60 * 60, json);
    expect(redis.incr).toHaveBeenCalledWith("fd_usage_2026-07-12");
  });

  it("returns a Redis hit without calling the fetcher", async () => {
    const redis = makeRedis();
    redis.get.mockResolvedValue(JSON.stringify({ v: "redis" }));
    const fn = vi.fn();
    const out = await cached(redis, "k", 60, fn);
    expect(out).toEqual({ data: { v: "redis" }, cached: true });
    expect(fn).not.toHaveBeenCalled();
  });

  it("serves stale memory data when the upstream fails after a prior success", async () => {
    const ok = vi.fn().mockResolvedValue({ v: 1 });
    await cached(null, "k", 60, ok);

    vi.advanceTimersByTime(120_000); // fresh copy expired
    const fail = vi.fn().mockRejectedValue(new Error("HTTP 429"));
    const out = await cached(null, "k", 60, fail);
    expect(fail).toHaveBeenCalledTimes(1);
    expect(out).toEqual({ data: { v: 1 }, cached: true, stale: true });
  });

  it("serves the Redis :stale copy when memory has nothing", async () => {
    const redis = makeRedis();
    redis.get.mockImplementation(async (key) =>
      key === "k:stale" ? JSON.stringify({ v: "old" }) : null
    );
    const fail = vi.fn().mockRejectedValue(new Error("HTTP 429"));
    const out = await cached(redis, "k", 60, fail);
    expect(out).toEqual({ data: { v: "old" }, cached: true, stale: true });
  });

  it("backs off after an upstream failure instead of hammering it", async () => {
    const ok = vi.fn().mockResolvedValue({ v: 1 });
    await cached(null, "k", 60, ok);

    vi.advanceTimersByTime(120_000);
    const fail = vi.fn().mockRejectedValue(new Error("HTTP 429"));
    await cached(null, "k", 60, fail); // trips the cooldown

    vi.advanceTimersByTime(10_000); // still within the 30s cooldown
    const retry = vi.fn().mockResolvedValue({ v: 2 });
    const during = await cached(null, "k", 60, retry);
    expect(retry).not.toHaveBeenCalled();
    expect(during).toEqual({ data: { v: 1 }, cached: true, stale: true });

    vi.advanceTimersByTime(30_000); // cooldown over
    const after = await cached(null, "k", 60, retry);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(after).toEqual({ data: { v: 2 }, cached: false });
  });

  it("rethrows when the upstream fails and no stale copy exists", async () => {
    const fail = vi.fn().mockRejectedValue(new Error("HTTP 429"));
    await expect(cached(null, "nothing", 60, fail)).rejects.toThrow("HTTP 429");
  });
});
