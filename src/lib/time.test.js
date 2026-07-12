import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  formatISTTime,
  formatISTDate,
  formatISTFull,
  getMatchStatus,
  timeUntil,
} from "./time.js";

// Kickoff at 2026-06-12 00:30 IST = 2026-06-11 19:00 UTC
const MATCH = { id: 1, isoIST: "2026-06-12T00:30:00+05:30" };
const KICKOFF_MS = new Date(MATCH.isoIST).getTime();

describe("IST formatting", () => {
  it("formats the time of day in IST", () => {
    expect(formatISTTime(MATCH.isoIST)).toMatch(/12:30\s*am/i);
  });

  it("formats the date in IST", () => {
    const d = formatISTDate(MATCH.isoIST);
    expect(d).toContain("12");
    expect(d).toContain("Jun");
  });

  it("combines date and time with an IST suffix", () => {
    expect(formatISTFull(MATCH.isoIST)).toMatch(/IST$/);
  });
});

describe("getMatchStatus", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("trusts an explicit finished or live result over the clock", () => {
    vi.setSystemTime(KICKOFF_MS - 60 * 60 * 1000); // an hour before kickoff
    expect(getMatchStatus(MATCH, { 1: { status: "finished" } })).toBe("finished");
    expect(getMatchStatus(MATCH, { 1: { status: "live" } })).toBe("live");
  });

  it("is scheduled before kickoff", () => {
    vi.setSystemTime(KICKOFF_MS - 1000);
    expect(getMatchStatus(MATCH, {})).toBe("scheduled");
  });

  it("is live from kickoff until ~2h15m after, without a recorded result", () => {
    vi.setSystemTime(KICKOFF_MS);
    expect(getMatchStatus(MATCH, {})).toBe("live");
    vi.setSystemTime(KICKOFF_MS + 2 * 60 * 60 * 1000);
    expect(getMatchStatus(MATCH, {})).toBe("live");
  });

  it("is finished once the match window has passed even with no result", () => {
    vi.setSystemTime(KICKOFF_MS + 2.5 * 60 * 60 * 1000);
    expect(getMatchStatus(MATCH, {})).toBe("finished");
  });
});

describe("timeUntil", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T00:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  const at = (ms) => new Date(Date.now() + ms).toISOString();

  it("returns null for times in the past or right now", () => {
    expect(timeUntil(at(0))).toBeNull();
    expect(timeUntil(at(-1000))).toBeNull();
  });

  it("formats days + hours", () => {
    expect(timeUntil(at((2 * 24 + 3) * 3600 * 1000))).toBe("in 2d 3h");
  });

  it("formats hours + minutes", () => {
    expect(timeUntil(at(90 * 60 * 1000))).toBe("in 1h 30m");
  });

  it("formats minutes only", () => {
    expect(timeUntil(at(5 * 60 * 1000))).toBe("in 5m");
  });
});
