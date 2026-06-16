/**
 * WC2026 — TheStatsAPI proxy (server-side only, keeps API key hidden)
 *
 * Base: https://api.thestatsapi.com/api/football/
 * Auth: Authorization: Bearer STATS_API_KEY
 * WC Competition ID: comp_6107
 *
 * Set STATS_API_KEY in Vercel environment variables.
 *
 * Actions:
 *   ?action=matches&date=2026-06-14     → WC fixtures for a date
 *   ?action=all-matches                  → all WC matches (paginated internally)
 *   ?action=match&id=mt_xxx             → match details
 *   ?action=events&id=mt_xxx            → event timeline
 *   ?action=stats&id=mt_xxx             → team statistics
 *   ?action=player-stats&id=mt_xxx      → per-player stats (rating algorithm input)
 *   ?action=shotmap&id=mt_xxx           → shot coordinates + xG
 *   ?action=heatmap&id=mt_xxx&pid=p_xxx → player heatmap coordinates
 *   ?action=lineups&id=mt_xxx           → team lineups
 *   ?action=referee&id=mt_xxx           → referee info
 *   ?action=usage                        → API request counter for trial tracking
 */

import Redis from 'ioredis';

const BASE = 'https://api.thestatsapi.com/api/football';
const WC_COMP = 'comp_6107';
const API_KEY = process.env.STATS_API_KEY;

function getRedis() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  return new Redis(url, {
    tls: url.startsWith('rediss://') ? {} : undefined,
    lazyConnect: false, connectTimeout: 5000, maxRetriesPerRequest: 1,
  });
}

async function statsFetch(path) {
  if (!API_KEY) throw new Error('STATS_API_KEY not configured');
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`TheStatsAPI HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function cached(redis, key, ttl, fn, trackUsage = true) {
  if (redis) {
    try {
      const hit = await redis.get(key);
      if (hit) return { data: JSON.parse(hit), cached: true };
    } catch {}
  }
  const data = await fn();
  // Increment daily usage counter on cache miss (= real API call)
  if (redis && trackUsage) {
    const today = new Date().toISOString().slice(0, 10);
    const uk = `stats_usage_${today}`;
    try {
      await redis.incr(uk);
      await redis.expire(uk, 86400 * 8);
    } catch {}
  }
  if (redis && data) {
    try { await redis.setex(key, ttl, JSON.stringify(data)); } catch {}
  }
  return { data, cached: false };
}

function matchTTL(status) {
  const s = (status || '').toLowerCase();
  if (s === 'finished' || s === 'ft' || s === 'aet' || s === 'pen') return 86400;
  if (s === 'live' || s === '1h' || s === '2h' || s === 'ht') return 60;
  return 300;
}

// ── Normalize lineup side from TheStatsAPI → TeamLineup shape ────────────────
function normalizeLineupSide(side) {
  if (!side) return null;
  const posToRow = { G: 1, D: 2, M: 3, F: 4 };
  const rowCounts = {};
  const startXI = (side.starting_xi || []).map(p => {
    const pos = p.position || 'M';
    const row = posToRow[pos] || 3;
    rowCounts[row] = (rowCounts[row] || 0) + 1;
    return { name: p.name, number: p.jersey_number, pos, grid: `${row}:${rowCounts[row]}` };
  });
  const substitutes = (side.substitutes || []).map(p => ({
    name: p.name,
    number: p.jersey_number,
    pos: p.position || null,
  }));
  return { team: side.name, formation: side.formation || null, startXI, substitutes };
}

// Normalize player stats from API shape to our rating algorithm's expected shape
function normalizePlayerStats(p) {
  const pass = p.passing || {};
  const shoot = p.shooting || {};
  const duel = p.duels || {};
  const def = p.defending || {};
  const gk = p.goalkeeping || {};
  const gen = p.general || {};

  const totalPasses = pass.total_passes || 0;
  const accuratePasses = pass.accurate_passes || 0;
  const passAcc = totalPasses > 0 ? Math.round((accuratePasses / totalPasses) * 100) : 0;

  return {
    id: p.player_id,
    name: p.player_name,
    position: p.position,
    teamId: p.team_id,
    minutesPlayed: p.minutes_played || 0,
    goals: shoot.goals || 0,
    shotsOnTarget: shoot.shots_on_target || 0,
    assists: pass.assists || 0,
    passAccuracy: passAcc,
    keyPasses: pass.key_passes || 0,
    tackles: def.tackles || 0,
    tacklesWon: def.tackles || 0,
    interceptions: def.interceptions || 0,
    clearances: def.clearances || 0,
    aerialDuelsWon: duel.aerial_won || 0,
    yellowCards: gen.yellow_cards || 0,
    redCards: gen.red_cards || 0,
    saves: gk.saves || 0,
    xG: shoot.expected_goals || 0,
    apiRating: p.rating || null,
    _raw: p,
  };
}

// Normalize team statistics from TheStatsAPI → our MatchStats shape
function normalizeTeamStats(raw) {
  if (!raw) return null;
  const d = raw?.data || raw;

  let homeRaw, awayRaw;

  if (Array.isArray(d)) {
    // [{ team_name, stats: {...} }, ...]
    homeRaw = d[0]?.statistics || d[0]?.stats || d[0];
    awayRaw = d[1]?.statistics || d[1]?.stats || d[1];
  } else if (d?.home !== undefined || d?.teams?.home !== undefined) {
    const src = d.teams || d;
    homeRaw = src.home?.statistics || src.home;
    awayRaw = src.away?.statistics || src.away;
  } else {
    return null;
  }

  const toObj = (stats) => {
    if (!stats) return {};
    if (Array.isArray(stats)) {
      const o = {};
      for (const s of stats) {
        const k = s.type || s.name || s.key;
        if (k) o[k] = s.value ?? s.stat ?? s.count;
      }
      return o;
    }
    return stats;
  };

  const h = toObj(homeRaw);
  const a = toObj(awayRaw);

  const pv = (v) => {
    if (v == null || v === '') return null;
    if (typeof v === 'string' && v.endsWith('%')) return parseFloat(v);
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  const get = (obj, ...keys) => {
    for (const k of keys) { const v = pv(obj[k]); if (v != null) return v; }
    return null;
  };

  return {
    homePoss:         get(h, 'possession', 'Ball Possession', 'ball_possession'),
    awayPoss:         get(a, 'possession', 'Ball Possession', 'ball_possession'),
    homeShots:        get(h, 'total_shots', 'Total Shots', 'shots'),
    awayShots:        get(a, 'total_shots', 'Total Shots', 'shots'),
    homeShotsOT:      get(h, 'shots_on_target', 'Shots on Goal', 'Shots on Target'),
    awayShotsOT:      get(a, 'shots_on_target', 'Shots on Goal', 'Shots on Target'),
    homeShotsOff:     get(h, 'shots_off_target', 'Shots off Goal'),
    awayShotsOff:     get(a, 'shots_off_target', 'Shots off Goal'),
    homeShotsBlocked: get(h, 'blocked_shots', 'Blocked Shots'),
    awayShotsBlocked: get(a, 'blocked_shots', 'Blocked Shots'),
    homePasses:       get(h, 'total_passes', 'Total passes'),
    awayPasses:       get(a, 'total_passes', 'Total passes'),
    homePassesAcc:    get(h, 'accurate_passes', 'Passes accurate'),
    awayPassesAcc:    get(a, 'accurate_passes', 'Passes accurate'),
    homePassAcc:      get(h, 'pass_accuracy', 'Passes %', 'passing_accuracy'),
    awayPassAcc:      get(a, 'pass_accuracy', 'Passes %', 'passing_accuracy'),
    homeCorners:      get(h, 'corner_kicks', 'Corner Kicks', 'corners'),
    awayCorners:      get(a, 'corner_kicks', 'Corner Kicks', 'corners'),
    homeFouls:        get(h, 'fouls', 'Fouls'),
    awayFouls:        get(a, 'fouls', 'Fouls'),
    homeOffsides:     get(h, 'offsides', 'Offsides'),
    awayOffsides:     get(a, 'offsides', 'Offsides'),
    homeYC:           get(h, 'yellow_cards', 'Yellow Cards'),
    awayYC:           get(a, 'yellow_cards', 'Yellow Cards'),
    homeRC:           get(h, 'red_cards', 'Red Cards'),
    awayRC:           get(a, 'red_cards', 'Red Cards'),
    homeSaves:        get(h, 'goalkeeper_saves', 'Goalkeeper Saves', 'saves'),
    awaySaves:        get(a, 'goalkeeper_saves', 'Goalkeeper Saves', 'saves'),
    homeXG:           get(h, 'expected_goals', 'xg', 'xG'),
    awayXG:           get(a, 'expected_goals', 'xg', 'xG'),
    homeTackles:      get(h, 'tackles', 'Total Tackles', 'total_tackles'),
    awayTackles:      get(a, 'tackles', 'Total Tackles', 'total_tackles'),
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, id, date, pid } = req.query;
  const redis = getRedis();

  try {
    // ── API usage counter (trial tracking) ───────────────────────────────────
    if (action === 'usage') {
      const today = new Date().toISOString().slice(0, 10);
      let used = 0;
      if (redis) {
        try { used = parseInt(await redis.get(`stats_usage_${today}`) || '0'); } catch {}
      }
      const limit = 10000;
      return res.status(200).json({
        used,
        limit,
        remaining: limit - used,
        trialEnd: '2026-06-23T09:00:00+05:30',
        source: 'TheStatsAPI',
        plan: 'trial-7day',
      });
    }

    // ── All WC matches (builds statsMatchIdMap) ───────────────────────────────
    if (action === 'all-matches') {
      const { data: payload, cached: hit } = await cached(redis, 'stats_all_wc', 21600, async () => {
        const [page1, page2] = await Promise.all([
          statsFetch(`/matches?competition_id=${WC_COMP}&per_page=100&page=1`),
          statsFetch(`/matches?competition_id=${WC_COMP}&per_page=100&page=2`),
        ]);
        const matches = [
          ...(page1?.data || []),
          ...(page2?.data || []),
        ];
        return { matches };
      });
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(payload);
    }

    // ── Matches by date ───────────────────────────────────────────────────────
    if (action === 'matches') {
      const d = date || new Date().toISOString().slice(0, 10);
      const { data: payload, cached: hit } = await cached(redis, `stats_matches_${d}`, 300, async () => {
        const [page1, page2] = await Promise.all([
          statsFetch(`/matches?competition_id=${WC_COMP}&per_page=100&page=1`),
          statsFetch(`/matches?competition_id=${WC_COMP}&per_page=100&page=2`),
        ]);
        const all_matches = [...(page1?.data || []), ...(page2?.data || [])];
        const filtered = all_matches.filter(m => (m.utc_date || '').startsWith(d));
        return { matches: filtered };
      });
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(payload);
    }

    if (!id) return res.status(400).json({ error: 'id required' });

    // ── Match details ─────────────────────────────────────────────────────────
    if (action === 'match') {
      const { data: payload, cached: hit } = await cached(redis, `stats_match_${id}`, 300, async () => {
        const d = await statsFetch(`/matches/${id}`);
        return d?.data || d;
      });
      if (redis && payload?.status) {
        try { await redis.expire(`stats_match_${id}`, matchTTL(payload.status)); } catch {}
      }
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(payload);
    }

    // ── Event timeline ────────────────────────────────────────────────────────
    if (action === 'events') {
      const { data: payload, cached: hit } = await cached(redis, `stats_events_${id}`, 120, async () => {
        const d = await statsFetch(`/matches/${id}/timeline`);
        return d?.data || d;
      });
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(payload);
    }

    // ── Team statistics ───────────────────────────────────────────────────────
    if (action === 'stats') {
      const { data: payload, cached: hit } = await cached(redis, `stats_teamstats_${id}`, 120, async () => {
        const d = await statsFetch(`/matches/${id}/statistics`);
        const normalized = normalizeTeamStats(d);
        return normalized;
      });
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(payload || {});
    }

    // ── Per-player statistics (rating algorithm input) ────────────────────────
    if (action === 'player-stats') {
      const { data: payload, cached: hit } = await cached(redis, `stats_playerstats_${id}`, 3600, async () => {
        const d = await statsFetch(`/matches/${id}/player-stats`);
        const raw = d?.data || [];
        return raw.map(normalizePlayerStats);
      });
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json({ players: payload });
    }

    // ── Shotmap ───────────────────────────────────────────────────────────────
    if (action === 'shotmap') {
      const { data: payload, cached: hit } = await cached(redis, `stats_shotmap_${id}`, 86400 * 7, async () => {
        const d = await statsFetch(`/matches/${id}/shotmap`);
        const shots = (d?.data || []).map(s => ({
          x: s.x ?? s.x_coordinate ?? 50,
          y: s.y ?? s.y_coordinate ?? 50,
          xG: s.expected_goals ?? s.expected_goal ?? s.xg ?? 0,
          goal: s.is_goal === true || s.result === 'goal',
          onTarget: s.is_on_target === true || s.result === 'goal' || s.result === 'save',
          playerName: s.player_name || s.player?.name || '',
          team: s.team_name || s.team?.name || '',
          teamId: s.team_id || s.team?.id || '',
          minute: s.minute ?? s.time ?? null,
          situation: s.situation || null,
          bodyPart: s.body_part || null,
        }));
        return { shots };
      });
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(payload);
    }

    // ── Player heatmap ────────────────────────────────────────────────────────
    if (action === 'heatmap') {
      const cacheKey = pid ? `stats_heatmap_${id}_${pid}` : `stats_heatmap_${id}`;
      const { data: payload, cached: hit } = await cached(redis, cacheKey, 86400 * 7, async () => {
        const path = pid
          ? `/matches/${id}/heatmap?player_id=${pid}`
          : `/matches/${id}/heatmap`;
        const d = await statsFetch(path);
        // Normalize heatmap points
        const points = (d?.data || d?.heatmap || []).map(p => ({
          x: p.x ?? p.x_coordinate ?? 50,
          y: p.y ?? p.y_coordinate ?? 50,
          value: p.value ?? p.count ?? p.density ?? 1,
        }));
        return {
          points,
          playerName: d?.player_name || d?.player?.name || null,
          teamName: d?.team_name || d?.team?.name || null,
        };
      });
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(payload || { points: [] });
    }

    // ── Lineups ───────────────────────────────────────────────────────────────
    if (action === 'lineups') {
      const { data: payload, cached: hit } = await cached(redis, `stats_lineups_${id}`, 3600, async () => {
        const d = await statsFetch(`/matches/${id}/lineups`);
        const raw = d?.data;
        const home = normalizeLineupSide(raw?.home);
        const away = normalizeLineupSide(raw?.away);
        return { lineups: [home, away].filter(Boolean), confirmed: raw?.confirmed ?? false };
      });
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(payload);
    }

    // ── Referee ───────────────────────────────────────────────────────────────
    if (action === 'referee') {
      const { data: payload, cached: hit } = await cached(redis, `stats_referee_${id}`, 86400, async () => {
        const d = await statsFetch(`/matches/${id}/referee`);
        return d?.data || d;
      });
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(payload);
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });

  } catch (err) {
    console.error('[stats api]', err.message);
    return res.status(502).json({ error: err.message });
  } finally {
    if (redis) redis.disconnect().catch(() => {});
  }
}
