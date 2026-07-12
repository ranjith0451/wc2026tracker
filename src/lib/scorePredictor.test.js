// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import {
  loadScorePredictions,
  saveScorePredictions,
  setScorePrediction,
  clearScorePrediction,
  evaluatePrediction,
  getPoints,
  getAccuracyLabel,
  getAccuracyEmoji,
  calculateScoreAccuracy,
} from "./scorePredictor.js";

const fin = (homeScore, awayScore) => ({ homeScore, awayScore, status: "finished" });

beforeEach(() => {
  localStorage.clear();
});

describe("score prediction storage", () => {
  it("round-trips through localStorage and tolerates corrupted data", () => {
    expect(loadScorePredictions()).toEqual({});
    saveScorePredictions({ 1: { home: 2, away: 1 } });
    expect(loadScorePredictions()).toEqual({ 1: { home: 2, away: 1 } });
    localStorage.setItem("wc2026_score_predictions", "{bad");
    expect(loadScorePredictions()).toEqual({});
  });

  it("setScorePrediction and clearScorePrediction persist changes", () => {
    const preds = setScorePrediction({}, 1, 2, 0);
    expect(preds).toEqual({ 1: { home: 2, away: 0 } });
    expect(loadScorePredictions()).toEqual({ 1: { home: 2, away: 0 } });
    expect(clearScorePrediction(preds, 1)).toEqual({});
    expect(loadScorePredictions()).toEqual({});
  });
});

describe("evaluatePrediction", () => {
  it("returns null when the prediction or result is missing or unfinished", () => {
    expect(evaluatePrediction(null, fin(1, 0))).toBeNull();
    expect(evaluatePrediction({ home: 1, away: 0 }, null)).toBeNull();
    expect(
      evaluatePrediction({ home: 1, away: 0 }, { homeScore: 1, awayScore: 0, status: "live" })
    ).toBeNull();
  });

  it("grades an exact score as exact, not correct_goal_diff", () => {
    expect(evaluatePrediction({ home: 2, away: 1 }, fin(2, 1))).toBe("exact");
    expect(evaluatePrediction({ home: 0, away: 0 }, fin(0, 0))).toBe("exact");
  });

  it("grades same outcome and same goal difference as correct_goal_diff", () => {
    expect(evaluatePrediction({ home: 2, away: 1 }, fin(3, 2))).toBe("correct_goal_diff");
    expect(evaluatePrediction({ home: 1, away: 0 }, fin(2, 1))).toBe("correct_goal_diff");
    // any non-exact correct draw always shares GD 0
    expect(evaluatePrediction({ home: 1, away: 1 }, fin(2, 2))).toBe("correct_goal_diff");
  });

  it("grades same outcome but different goal difference as correct_result", () => {
    expect(evaluatePrediction({ home: 2, away: 0 }, fin(1, 0))).toBe("correct_result");
    expect(evaluatePrediction({ home: 0, away: 1 }, fin(0, 3))).toBe("correct_result");
  });

  it("grades a wrong outcome as incorrect", () => {
    expect(evaluatePrediction({ home: 2, away: 0 }, fin(0, 1))).toBe("incorrect");
    expect(evaluatePrediction({ home: 1, away: 1 }, fin(1, 0))).toBe("incorrect");
  });
});

describe("points, labels, emojis", () => {
  it("maps accuracy levels to points", () => {
    expect(getPoints("exact")).toBe(3);
    expect(getPoints("correct_goal_diff")).toBe(2);
    expect(getPoints("correct_result")).toBe(1);
    expect(getPoints("incorrect")).toBe(0);
    expect(getPoints(null)).toBe(0);
  });

  it("maps accuracy levels to labels and emojis", () => {
    expect(getAccuracyLabel("exact")).toBe("Exact Score");
    expect(getAccuracyLabel(null)).toBe("—");
    expect(getAccuracyEmoji("exact")).toBe("🎯");
    expect(getAccuracyEmoji(null)).toBe("");
  });
});

describe("calculateScoreAccuracy", () => {
  it("aggregates counts and points across finished matches only", () => {
    const preds = {
      1: { home: 2, away: 1 }, // exact → 3 pts
      2: { home: 1, away: 0 }, // correct GD (2-1) → 2 pts
      3: { home: 3, away: 0 }, // correct result (1-0) → 1 pt
      4: { home: 0, away: 2 }, // incorrect (2-0) → 0 pts
      5: { home: 1, away: 1 }, // match not finished → skipped
    };
    const results = {
      1: fin(2, 1),
      2: fin(2, 1),
      3: fin(1, 0),
      4: fin(2, 0),
      5: { homeScore: 0, awayScore: 0, status: "live" },
    };
    expect(calculateScoreAccuracy(preds, results)).toEqual({
      total: 5,
      evaluated: 4,
      exact: 1,
      correctGD: 1,
      correctResult: 1,
      incorrect: 1,
      points: 6,
      maxPoints: 12,
    });
  });

  it("handles an empty prediction set", () => {
    expect(calculateScoreAccuracy({}, {})).toEqual({
      total: 0,
      evaluated: 0,
      exact: 0,
      correctGD: 0,
      correctResult: 0,
      incorrect: 0,
      points: 0,
      maxPoints: 0,
    });
  });
});
