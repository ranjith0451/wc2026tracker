// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import {
  loadPredictions,
  savePredictions,
  setPrediction,
  clearPrediction,
  getPrediction,
  resolvePredictedSide,
  resolvePredictedMatchTeams,
  calculateAccuracy,
  isMatchLive,
  isMatchFinished,
  getUpcomingMatches,
  getAccuracyByStage,
  loadAccuracyHistory,
  saveAccuracyHistory,
  recordMatchResult,
} from "./predictor.js";

const MINI_BRACKET = [
  { id: 1, stage: "Round of 32", home: { type: "team", name: "Brazil" }, away: { type: "team", name: "Japan" } },
  { id: 2, stage: "Round of 32", home: { type: "team", name: "France" }, away: { type: "team", name: "Sweden" } },
  {
    id: 3,
    stage: "Round of 16",
    home: { type: "winner_match", matchId: 1 },
    away: { type: "winner_match", matchId: 2 },
  },
  {
    id: 4,
    stage: "Quarterfinal",
    home: { type: "winner_match", matchId: 3 },
    away: { type: "loser_match", matchId: 3 },
  },
];

beforeEach(() => {
  localStorage.clear();
});

describe("prediction storage", () => {
  it("round-trips predictions through localStorage", () => {
    savePredictions({ 1: "home", 2: "away" });
    expect(loadPredictions()).toEqual({ 1: "home", 2: "away" });
  });

  it("returns an empty object when storage is empty or corrupted", () => {
    expect(loadPredictions()).toEqual({});
    localStorage.setItem("wc2026_predictions", "{not json");
    expect(loadPredictions()).toEqual({});
  });

  it("setPrediction upserts and persists", () => {
    const next = setPrediction({}, 5, "home");
    expect(next).toEqual({ 5: "home" });
    expect(loadPredictions()).toEqual({ 5: "home" });
  });

  it("clearPrediction removes a single entry and persists", () => {
    const preds = setPrediction(setPrediction({}, 5, "home"), 6, "draw");
    const next = clearPrediction(preds, 5);
    expect(next).toEqual({ 6: "draw" });
    expect(loadPredictions()).toEqual({ 6: "draw" });
  });

  it("getPrediction returns the pick or null", () => {
    expect(getPrediction({ 1: "away" }, 1)).toBe("away");
    expect(getPrediction({}, 1)).toBeNull();
  });
});

describe("resolvePredictedSide", () => {
  it("resolves a concrete team", () => {
    expect(resolvePredictedSide({ type: "team", name: "Brazil" }, {}, MINI_BRACKET)).toEqual({
      name: "Brazil",
      resolved: true,
      isPlaceholder: false,
    });
  });

  it("keeps group and third-place sources as placeholders", () => {
    expect(resolvePredictedSide({ type: "winner", group: "A" }, {}, MINI_BRACKET).name).toBe(
      "Winner Group A"
    );
    expect(resolvePredictedSide({ type: "runnerup", group: "B" }, {}, MINI_BRACKET).name).toBe(
      "Runner-up Group B"
    );
    expect(
      resolvePredictedSide({ type: "third_best", candidates: ["A", "B"] }, {}, MINI_BRACKET).name
    ).toBe("Best 3rd (A/B)");
  });

  it("shows a placeholder when the feeding match is unpredicted or predicted as a draw", () => {
    const side = { type: "winner_match", matchId: 1 };
    expect(resolvePredictedSide(side, {}, MINI_BRACKET)).toMatchObject({
      name: "Winner M1",
      resolved: false,
    });
    expect(resolvePredictedSide(side, { 1: "draw" }, MINI_BRACKET)).toMatchObject({
      name: "Winner M1",
      resolved: false,
    });
  });

  it("resolves through one predicted round", () => {
    const side = { type: "winner_match", matchId: 1 };
    expect(resolvePredictedSide(side, { 1: "home" }, MINI_BRACKET).name).toBe("Brazil");
    expect(resolvePredictedSide(side, { 1: "away" }, MINI_BRACKET).name).toBe("Japan");
  });

  it("resolves winner_match recursively across multiple rounds", () => {
    const preds = { 1: "home", 2: "away", 3: "away" };
    // Winner of M3 was predicted "away" = winner of M2 = Sweden
    expect(
      resolvePredictedSide({ type: "winner_match", matchId: 3 }, preds, MINI_BRACKET).name
    ).toBe("Sweden");
  });

  it("loser_match resolves to the losing side of the predicted match", () => {
    // M3 predicted "away": winner is Sweden (via M2), so the loser is M3's
    // home side — the winner of M1, Brazil. This feeds the third-place
    // playoff (match 103), whose sides are loser_match sources.
    const preds = { 1: "home", 2: "away", 3: "away" };
    expect(
      resolvePredictedSide({ type: "loser_match", matchId: 3 }, preds, MINI_BRACKET).name
    ).toBe("Brazil");
    expect(
      resolvePredictedSide({ type: "loser_match", matchId: 3 }, { ...preds, 3: "home" }, MINI_BRACKET).name
    ).toBe("Sweden");
  });

  it("returns TBD for unknown feeding matches and missing sides", () => {
    expect(resolvePredictedSide({ type: "winner_match", matchId: 99 }, {}, MINI_BRACKET).name).toBe(
      "TBD"
    );
    expect(resolvePredictedSide(null, {}, MINI_BRACKET).name).toBe("TBD");
  });

  it("resolvePredictedMatchTeams resolves both sides", () => {
    const teams = resolvePredictedMatchTeams(MINI_BRACKET[2], { 1: "home", 2: "home" }, MINI_BRACKET);
    expect(teams.home.name).toBe("Brazil");
    expect(teams.away.name).toBe("France");
  });
});

describe("calculateAccuracy", () => {
  const results = {
    1: { homeScore: 2, awayScore: 0, status: "finished" }, // home win
    2: { homeScore: 1, awayScore: 1, status: "finished" }, // draw
    3: { homeScore: 0, awayScore: 3, status: "finished" }, // away win
    4: { homeScore: 1, awayScore: 0, status: "live" }, // not counted
  };

  it("scores correct picks per outcome and skips unfinished matches", () => {
    const preds = { 1: "home", 2: "draw", 3: "home", 4: "home" };
    expect(calculateAccuracy(preds, results)).toEqual({
      total: 3,
      correct: 2,
      percentage: 67,
    });
  });

  it("returns 0% for no evaluable predictions", () => {
    expect(calculateAccuracy({}, results)).toEqual({ total: 0, correct: 0, percentage: 0 });
    expect(calculateAccuracy({ 4: "home" }, results)).toEqual({
      total: 0,
      correct: 0,
      percentage: 0,
    });
  });
});

describe("match status helpers", () => {
  const results = {
    1: { status: "live" },
    2: { status: "started" },
    3: { status: "finished" },
    4: { status: "scheduled" },
  };

  it("isMatchLive accepts live and started", () => {
    expect(isMatchLive(1, results)).toBe(true);
    expect(isMatchLive(2, results)).toBe(true);
    expect(isMatchLive(3, results)).toBe(false);
    expect(isMatchLive(99, results)).toBe(false);
  });

  it("isMatchFinished only accepts finished", () => {
    expect(isMatchFinished(3, results)).toBe(true);
    expect(isMatchFinished(1, results)).toBe(false);
  });

  it("getUpcomingMatches keeps matches with no status or scheduled", () => {
    const upcoming = getUpcomingMatches(MINI_BRACKET, results);
    expect(upcoming.map((m) => m.id)).toEqual([4]);
    expect(getUpcomingMatches(MINI_BRACKET, {}).map((m) => m.id)).toEqual([1, 2, 3, 4]);
  });
});

describe("getAccuracyByStage", () => {
  it("groups accuracy per stage using numeric match ids", () => {
    const results = {
      1: { homeScore: 1, awayScore: 0, status: "finished" },
      2: { homeScore: 0, awayScore: 2, status: "finished" },
      3: { homeScore: 1, awayScore: 1, status: "finished" },
    };
    const preds = { 1: "home", 2: "home", 3: "draw" };
    const stages = getAccuracyByStage(preds, results, MINI_BRACKET);
    expect(stages["Round of 32"]).toEqual({ total: 2, correct: 1, percentage: 50 });
    expect(stages["Round of 16"]).toEqual({ total: 1, correct: 1, percentage: 100 });
  });
});

describe("accuracy history", () => {
  it("round-trips history and tolerates corrupted storage", () => {
    expect(loadAccuracyHistory()).toEqual({});
    saveAccuracyHistory({ 1: { correct: true } });
    expect(loadAccuracyHistory()).toEqual({ 1: { correct: true } });
    localStorage.setItem("wc2026_accuracy_history", "oops");
    expect(loadAccuracyHistory()).toEqual({});
  });

  it("recordMatchResult stores the graded prediction", () => {
    recordMatchResult(1, { homeScore: 2, awayScore: 1 }, { 1: "home" }, MINI_BRACKET);
    const history = loadAccuracyHistory();
    expect(history[1]).toMatchObject({
      prediction: "home",
      homeScore: 2,
      awayScore: 1,
      correct: true,
      stage: "Round of 32",
    });
    expect(history[1].timestamp).toBeTruthy();
  });

  it("recordMatchResult is a no-op without a prediction or a known match", () => {
    recordMatchResult(1, { homeScore: 2, awayScore: 1 }, {}, MINI_BRACKET);
    recordMatchResult(99, { homeScore: 2, awayScore: 1 }, { 99: "home" }, MINI_BRACKET);
    expect(loadAccuracyHistory()).toEqual({});
  });
});
