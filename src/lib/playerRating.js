/**
 * Automated post-match player rating algorithm.
 * Phases 1-4 as documented:
 *   1. Data extraction (caller's responsibility)
 *   2. Position-based weighted score
 *   3. Min-max normalization → 1.0–10.0
 *   4. Penalty deductions for red/yellow cards, own goals, penalty conceded
 */

// ── Position weights ──────────────────────────────────────────────────────────

const WEIGHTS = {
  FW: {
    goals:           0.30,
    assists:         0.25,
    shotsOnTarget:   0.15,
    passAccuracy:    0.15,
    keyPasses:       0.15,
  },
  MF: {
    passAccuracy:    0.25,
    keyPasses:       0.20,
    interceptions:   0.15,
    dribbles:        0.10,
    tackles:         0.10,
    ballRecoveries:  0.10,
    goals:           0.05,
    assists:         0.05,
  },
  DF: {
    cleanSheet:      0.30,
    tacklesWon:      0.20,
    interceptions:   0.20,
    aerialDuelsWon:  0.10,
    clearances:      0.10,
    blocks:          0.10,
  },
  GK: {
    saves:           0.40,
    cleanSheet:      0.25,
    claims:          0.10,
    goalsConceded:   -0.25, // per goal, applied as negative
  },
};

// Penalty deductions applied after normalization
const DEDUCTIONS = {
  ownGoal:          -1.5,
  redCard:          -2.0,
  yellowCard:       -0.5,
  penaltyConceded:  -1.0,
  penaltySaved:     +1.5,  // GK bonus
};

const BASE_SCORE = 6.0;

// ── Position detection ────────────────────────────────────────────────────────

function detectPositionGroup(pos) {
  if (!pos) return 'MF';
  const p = pos.toUpperCase();
  if (p.includes('GK') || p === 'G') return 'GK';
  if (p.includes('CB') || p.includes('LB') || p.includes('RB') ||
      p.includes('WB') || p === 'DF' || p === 'D') return 'DF';
  if (p.includes('FW') || p.includes('ST') || p.includes('CF') ||
      p.includes('LW') || p.includes('RW') || p === 'F') return 'FW';
  return 'MF';
}

// ── Per-player raw weighted score ─────────────────────────────────────────────

function computeRawScore(stats, posGroup, isCleanSheet) {
  const w = WEIGHTS[posGroup];
  let score = 0;

  const g = (key) => Number(stats[key] || 0);

  if (posGroup === 'GK') {
    const goalsConceded = g('goalsConceded') || g('goals_conceded') || 0;
    score += g('saves') * w.saves;
    score += (isCleanSheet ? 1 : 0) * w.cleanSheet;
    score += (g('claims') + g('punches')) * w.claims;
    score += goalsConceded * w.goalsConceded; // negative weight
  } else if (posGroup === 'DF') {
    const tacklesWon = g('tacklesWon') || g('tackles_won') || g('tackles') || 0;
    const aerialWon = g('aerialDuelsWon') || g('aerial_duels_won') || 0;
    score += (isCleanSheet ? 1 : 0) * w.cleanSheet;
    score += tacklesWon * w.tacklesWon;
    score += g('interceptions') * w.interceptions;
    score += aerialWon * w.aerialDuelsWon;
    score += g('clearances') * w.clearances;
    score += g('blocks') * w.blocks;
  } else if (posGroup === 'MF') {
    const passAcc = g('passAccuracy') || g('pass_accuracy') || 0;
    const keyPasses = g('keyPasses') || g('key_passes') || 0;
    const dribbles = g('dribblesCompleted') || g('dribbles_completed') || g('dribbles') || 0;
    const recoveries = g('ballRecoveries') || g('ball_recoveries') || 0;
    score += (passAcc / 100) * w.passAccuracy;
    score += keyPasses * w.keyPasses;
    score += g('interceptions') * w.interceptions;
    score += dribbles * w.dribbles;
    score += g('tackles') * w.tackles;
    score += recoveries * w.ballRecoveries;
    score += g('goals') * w.goals;
    score += g('assists') * w.assists;
  } else {
    // FW
    const passAcc = g('passAccuracy') || g('pass_accuracy') || 0;
    const keyPasses = g('keyPasses') || g('key_passes') || 0;
    const shotsOnTarget = g('shotsOnTarget') || g('shots_on_target') || 0;
    score += g('goals') * w.goals;
    score += g('assists') * w.assists;
    score += shotsOnTarget * w.shotsOnTarget;
    score += (passAcc / 100) * w.passAccuracy;
    score += keyPasses * w.keyPasses;
  }

  return score;
}

// ── Min-max normalization → 1.0–10.0 ─────────────────────────────────────────

function normalize(rawScores) {
  const values = rawScores.map((p) => p.raw);
  const min = Math.min(...values);
  const max = Math.max(...values);

  // No spread to normalize against (lone player in the group, or identical
  // raw scores): min-max would pin everyone to the 1.0 floor, so give the
  // neutral base score instead.
  if (max === min) {
    return rawScores.map((p) => ({ ...p, normalized: BASE_SCORE }));
  }

  const range = max - min;
  return rawScores.map((p) => ({
    ...p,
    normalized: 1.0 + ((p.raw - min) / range) * 9.0,
  }));
}

// ── Apply event deductions ────────────────────────────────────────────────────

function applyDeductions(player) {
  let rating = player.normalized;

  if (player.ownGoals > 0) rating += player.ownGoals * DEDUCTIONS.ownGoal;
  if (player.redCard)      rating += DEDUCTIONS.redCard;
  if (player.yellowCards > 0) rating += player.yellowCards * DEDUCTIONS.yellowCard;
  if (player.penaltyConceded > 0) rating += player.penaltyConceded * DEDUCTIONS.penaltyConceded;
  if (player.penaltySaved > 0 && player.posGroup === 'GK')
    rating += player.penaltySaved * DEDUCTIONS.penaltySaved;

  // Clamp to 1.0–10.0
  return Math.min(10.0, Math.max(1.0, rating));
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Compute post-match ratings for all players.
 *
 * @param {Array} playerStatsArray  Raw player stat objects from API
 * @param {Array} events            Match events array (for cards, own goals)
 * @param {Object} matchResult      { homeScore, awayScore, homeTeam, awayTeam }
 * @returns {Array} Players with .rating (1.0–10.0), .ratingColor, .posGroup
 */
export function computePlayerRatings(playerStatsArray, events = [], matchResult = {}) {
  if (!playerStatsArray?.length) return [];

  const { homeTeam = '', awayTeam = '' } = matchResult;

  // Build event maps: ownGoals, cards, penalties per playerId
  const eventMap = {};
  for (const ev of events) {
    const pid = ev.playerId || ev.player_id || ev.player?.id;
    if (!pid) continue;
    if (!eventMap[pid]) eventMap[pid] = { ownGoals: 0, yellowCards: 0, redCard: false, penaltyConceded: 0, penaltySaved: 0 };
    const type = (ev.type || ev.event_type || '').toLowerCase();
    if (type.includes('own goal'))        eventMap[pid].ownGoals++;
    if (type.includes('yellow'))          eventMap[pid].yellowCards++;
    if (type.includes('red'))             eventMap[pid].redCard = true;
    if (type.includes('penalty') && type.includes('missed')) eventMap[pid].penaltyConceded++;
    if (type.includes('penalty') && type.includes('saved'))  eventMap[pid].penaltySaved++;
  }

  // Determine which teams kept clean sheets
  const homeCS = (matchResult.awayScore ?? -1) === 0;
  const awayCS  = (matchResult.homeScore ?? -1) === 0;

  // Phase 2: compute raw weighted score per player
  const withRaw = playerStatsArray.map((p) => {
    const posGroup = detectPositionGroup(p.position || p.pos);
    const team = p.team?.name || p.teamName || '';
    const isHome = team === homeTeam || team.toLowerCase().includes(homeTeam.toLowerCase());
    const isCleanSheet = isHome ? homeCS : awayCS;

    const evData = eventMap[p.id || p.playerId] || {};
    const raw = computeRawScore(p, posGroup, isCleanSheet);

    return {
      id: p.id || p.playerId,
      name: p.name || p.playerName,
      position: p.position || p.pos,
      posGroup,
      team,
      minutesPlayed: p.minutesPlayed || p.minutes_played || 90,
      raw,
      ownGoals: evData.ownGoals || 0,
      yellowCards: evData.yellowCards || 0,
      redCard: evData.redCard || false,
      penaltyConceded: evData.penaltyConceded || 0,
      penaltySaved: evData.penaltySaved || 0,
      stats: p,
    };
  });

  // Phase 3: normalize per position group separately for fairness
  const groups = ['FW', 'MF', 'DF', 'GK'];
  const normalized = [];
  for (const grp of groups) {
    const subset = withRaw.filter((p) => p.posGroup === grp);
    if (!subset.length) continue;
    normalized.push(...normalize(subset));
  }

  // Phase 4: apply deductions + color coding
  return normalized.map((p) => {
    const rating = parseFloat(applyDeductions(p).toFixed(1));
    const ratingColor = rating >= 7.5 ? 'green' : rating >= 6.0 ? 'yellow' : 'red';
    return { ...p, rating, ratingColor };
  }).sort((a, b) => b.rating - a.rating);
}

export { DEDUCTIONS, BASE_SCORE };
