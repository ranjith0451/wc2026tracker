/**
 * Bracket Predictor / Challenge
 * Saves user predictions to localStorage and handles cascading
 * for knockout bracket (R32 → Final).
 */

const STORAGE_KEY = "wc2026_predictions";

export function loadPredictions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePredictions(preds) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preds));
}

/**
 * Upsert a prediction for a single match.
 *
 * @param {Object} preds - current prediction map { matchId: "home" | "away" | "draw" }
 * @param {string|number} matchId
 * @param {string} value - "home" | "away" | "draw"
 * @returns {Object} updated prediction map
 */
export function setPrediction(preds, matchId, value) {
  const next = { ...preds, [matchId]: value };
  savePredictions(next);
  return next;
}

export function clearPrediction(preds, matchId) {
  const next = { ...preds };
  delete next[matchId];
  savePredictions(next);
  return next;
}

/**
 * Get the predicted winner of a match.
 *
 * @param {Object} preds
 * @param {Object} match - from MATCHES array
 * @returns {string|null} "home" | "away" | "draw" | null
 */
export function getPrediction(preds, matchId) {
  return preds[matchId] || null;
}

/**
 * Resolve a predicted team name for a match side,
 * considering prior-round predictions.
 *
 * For "type: team" return the team name.
 * For "winner_match" return the predicted winner of that match.
 *
 * @param {Object} side - { type, name, group, matchId, candidates }
 * @param {Object} preds - prediction map
 * @param {Array}  matches - MATCHES array
 * @returns {Object} { name, resolved, isPlaceholder }
 */
export function resolvePredictedSide(side, preds, matches) {
  if (!side) return { name: "TBD", resolved: false, isPlaceholder: true };

  if (side.type === "team") {
    return { name: side.name, resolved: true, isPlaceholder: false };
  }

  if (side.type === "winner" || side.type === "runnerup") {
    return {
      name: side.type === "winner" ? `Winner Group ${side.group}` : `Runner-up Group ${side.group}`,
      resolved: false,
      isPlaceholder: true,
    };
  }

  if (side.type === "third_best") {
    return {
      name: `Best 3rd (${side.candidates.join("/")})`,
      resolved: false,
      isPlaceholder: true,
    };
  }

  if (side.type === "winner_match" || side.type === "loser_match") {
    const prev = matches.find((m) => m.id === side.matchId);
    if (!prev) return { name: "TBD", resolved: false, isPlaceholder: true };

    const pred = preds[side.matchId];
    if (!pred || pred === "draw") {
      const label = side.type === "winner_match" ? `Winner M${side.matchId}` : `Loser M${side.matchId}`;
      return { name: label, resolved: false, isPlaceholder: true };
    }

    // Recursively resolve the winning/losing side: winner_match follows the
    // predicted pick, loser_match takes the opposite side.
    const winnerIsHome = pred === "home";
    const takeHome = side.type === "winner_match" ? winnerIsHome : !winnerIsHome;
    const targetSide = takeHome ? prev.home : prev.away;
    return resolvePredictedSide(targetSide, preds, matches);
  }

  return { name: "TBD", resolved: false, isPlaceholder: true };
}

/**
 * Resolve both home and away for a knockout match.
 */
export function resolvePredictedMatchTeams(match, preds, matches) {
  return {
    home: resolvePredictedSide(match.home, preds, matches),
    away: resolvePredictedSide(match.away, preds, matches),
  };
}

/**
 * Calculate prediction accuracy vs actual results.
 *
 * @param {Object} preds - prediction map
 * @param {Object} results - actual results from API/admin
 * @returns {Object} { total, correct, percentage }
 */
export function calculateAccuracy(preds, results) {
  const matchIds = Object.keys(preds);
  let correct = 0;
  let total = 0;

  matchIds.forEach((id) => {
    const res = results[id];
    if (!res || res.status !== "finished") return;
    total += 1;
    const pred = preds[id];
    if (pred === "draw") {
      if (res.homeScore === res.awayScore) correct += 1;
    } else if (pred === "home" && res.homeScore > res.awayScore) {
      correct += 1;
    } else if (pred === "away" && res.awayScore > res.homeScore) {
      correct += 1;
    }
  });

  return {
    total,
    correct,
    percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
  };
}

/**
 * Check if a match is currently live.
 */
export function isMatchLive(matchId, results) {
  const result = results[matchId];
  return result?.status === "live" || result?.status === "started";
}

/**
 * Check if a match is finished.
 */
export function isMatchFinished(matchId, results) {
  const result = results[matchId];
  return result?.status === "finished";
}

/**
 * Get all scheduled/upcoming matches (not live or finished).
 */
export function getUpcomingMatches(allMatches, results) {
  return allMatches.filter((m) => {
    const status = results[m.id]?.status;
    return !status || status === "scheduled";
  });
}

/**
 * Calculate accuracy broken down by tournament stage.
 */
export function getAccuracyByStage(preds, results, allMatches) {
  const stages = {};

  Object.keys(preds).forEach((id) => {
    const match = allMatches.find((m) => m.id === Number(id));
    const res = results[id];

    if (!match || !res || res.status !== "finished") return;

    const stage = match.stage;
    if (!stages[stage]) {
      stages[stage] = { total: 0, correct: 0, percentage: 0 };
    }
    stages[stage].total++;

    const pred = preds[id];
    let isCorrect = false;
    if (pred === "draw") {
      isCorrect = res.homeScore === res.awayScore;
    } else if (pred === "home") {
      isCorrect = res.homeScore > res.awayScore;
    } else if (pred === "away") {
      isCorrect = res.awayScore > res.homeScore;
    }

    if (isCorrect) stages[stage].correct++;
    stages[stage].percentage = Math.round(
      (stages[stage].correct / stages[stage].total) * 100
    );
  });

  return stages;
}

/**
 * Load accuracy history from localStorage.
 */
export function loadAccuracyHistory() {
  try {
    const raw = localStorage.getItem("wc2026_accuracy_history");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Save accuracy history to localStorage.
 */
export function saveAccuracyHistory(history) {
  localStorage.setItem("wc2026_accuracy_history", JSON.stringify(history));
}

/**
 * Record a match result against predictions for accuracy tracking.
 */
export function recordMatchResult(matchId, result, preds, allMatches) {
  const pred = preds[matchId];
  if (!pred) return;

  const match = allMatches.find((m) => m.id === Number(matchId));
  if (!match) return;

  let isCorrect = false;
  if (pred === "draw") {
    isCorrect = result.homeScore === result.awayScore;
  } else if (pred === "home") {
    isCorrect = result.homeScore > result.awayScore;
  } else if (pred === "away") {
    isCorrect = result.awayScore > result.homeScore;
  }

  const history = loadAccuracyHistory();
  history[matchId] = {
    prediction: pred,
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    correct: isCorrect,
    stage: match.stage,
    timestamp: new Date().toISOString(),
  };
  saveAccuracyHistory(history);
}
