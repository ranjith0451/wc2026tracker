/**
 * Score Predictor — allows users to predict exact scores for all matches.
 * Predictions are saved to localStorage.
 * Predictions become inactive once a match goes live.
 * Accuracy is calculated once a match finishes.
 */

const STORAGE_KEY = "wc2026_score_predictions";

/**
 * Load score predictions from localStorage.
 * @returns {Object} { matchId: { home: number, away: number } }
 */
export function loadScorePredictions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Save all score predictions to localStorage.
 */
export function saveScorePredictions(preds) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preds));
}

/**
 * Set a score prediction for a single match.
 * @param {Object} preds - current predictions map
 * @param {number|string} matchId
 * @param {number} homeScore
 * @param {number} awayScore
 * @returns {Object} updated predictions map
 */
export function setScorePrediction(preds, matchId, homeScore, awayScore) {
  const next = { ...preds, [matchId]: { home: homeScore, away: awayScore } };
  saveScorePredictions(next);
  return next;
}

/**
 * Remove a score prediction for a match.
 */
export function clearScorePrediction(preds, matchId) {
  const next = { ...preds };
  delete next[matchId];
  saveScorePredictions(next);
  return next;
}

/**
 * Evaluate a single prediction against the actual result.
 * @param {Object} prediction - { home: number, away: number }
 * @param {Object} result - { homeScore: number, awayScore: number, status: string }
 * @returns {string|null} "exact" | "correct_result" | "correct_goal_diff" | "incorrect" | null (if match not finished)
 */
export function evaluatePrediction(prediction, result) {
  if (!prediction || !result || result.status !== "finished") return null;

  const predHome = prediction.home;
  const predAway = prediction.away;
  const actHome = result.homeScore;
  const actAway = result.awayScore;

  // Exact score match
  if (predHome === actHome && predAway === actAway) {
    return "exact";
  }

  // Correct result (same outcome: home win / draw / away win)
  const predOutcome = predHome > predAway ? "home" : predHome < predAway ? "away" : "draw";
  const actOutcome = actHome > actAway ? "home" : actHome < actAway ? "away" : "draw";

  if (predOutcome === actOutcome) {
    // Check if goal difference is also correct
    const predDiff = predHome - predAway;
    const actDiff = actHome - actAway;
    if (predDiff === actDiff) {
      return "correct_goal_diff";
    }
    return "correct_result";
  }

  return "incorrect";
}

/**
 * Get a points value for a prediction accuracy level.
 * Exact: 3 pts, Correct GD: 2 pts, Correct Result: 1 pt, Incorrect: 0 pts
 */
export function getPoints(accuracy) {
  switch (accuracy) {
    case "exact": return 3;
    case "correct_goal_diff": return 2;
    case "correct_result": return 1;
    default: return 0;
  }
}

/**
 * Get display label for an accuracy level.
 */
export function getAccuracyLabel(accuracy) {
  switch (accuracy) {
    case "exact": return "Exact Score";
    case "correct_goal_diff": return "Correct GD";
    case "correct_result": return "Correct Result";
    case "incorrect": return "Incorrect";
    default: return "—";
  }
}

/**
 * Get emoji for an accuracy level.
 */
export function getAccuracyEmoji(accuracy) {
  switch (accuracy) {
    case "exact": return "🎯";
    case "correct_goal_diff": return "✅";
    case "correct_result": return "👍";
    case "incorrect": return "❌";
    default: return "";
  }
}

/**
 * Calculate overall stats for all score predictions.
 * @param {Object} preds - score predictions { matchId: { home, away } }
 * @param {Object} results - actual results { matchId: { homeScore, awayScore, status } }
 * @returns {Object} { total, evaluated, exact, correctGD, correctResult, incorrect, points, maxPoints }
 */
export function calculateScoreAccuracy(preds, results) {
  const matchIds = Object.keys(preds);
  let evaluated = 0;
  let exact = 0;
  let correctGD = 0;
  let correctResult = 0;
  let incorrect = 0;
  let points = 0;

  matchIds.forEach((id) => {
    const result = results[id];
    const accuracy = evaluatePrediction(preds[id], result);
    if (accuracy === null) return;
    evaluated += 1;
    points += getPoints(accuracy);
    switch (accuracy) {
      case "exact": exact += 1; break;
      case "correct_goal_diff": correctGD += 1; break;
      case "correct_result": correctResult += 1; break;
      case "incorrect": incorrect += 1; break;
    }
  });

  return {
    total: matchIds.length,
    evaluated,
    exact,
    correctGD,
    correctResult,
    incorrect,
    points,
    maxPoints: evaluated * 3,
  };
}
