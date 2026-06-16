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
 *   ?action=player-stats&id=mt_xxx      → per-player stats (rating algorithm input)
 *   ?action=shotmap&id=mt_xxx           → shot coordinates + xG
 *   ?action=referee&id=mt_xxx           → referee info
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

async function cached(redis, key, ttl, fn) {
  if (redis) {
    try {
      const hit = await redis.get(key);
      if (hit) return { data: JSON.parse(hit), cached: true };
    } catch {}
  }
  const data = await fn();
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
    // Shooting
    goals: shoot.goals || 0,
    shotsOnTarget: shoot.shots_on_target || 0,
    assists: pass.assists || 0,
    // Passing
    passAccuracy: passAcc,
    keyPasses: pass.key_passes || 0,
    // Defending
    tackles: def.tackles || 0,
    tacklesWon: def.tackles || 0,
    interceptions: def.interceptions || 0,
    clearances: def.clearances || 0,
    aerialDuelsWon: duel.aerial_won || 0,
    // General
    yellowCards: gen.yellow_cards || 0,
    redCards: gen.red_cards || 0,
    // GK
    saves: gk.saves || 0,
    // xG
    xG: shoot.expected_goals || 0,
    // API-provided rating (fallback display)
    apiRating: p.rating || null,
    // Raw original
    _raw: p,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, id, date } = req.query;
  const redis = getRedis();

  try {
    // ── All WC matches (builds statsMatchIdMap) ───────────────────────────────
    if (action === 'all-matches') {
      const { data: payload, cached: hit } = await cached(redis, 'stats_all_wc', 300, async () => {
        // Fetch up to 2 pages (104 total matches, 100 per page)
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
        const all = await statsFetch(`/matches?competition_id=${WC_COMP}&per_page=100&page=1`);
        const matches2 = await statsFetch(`/matches?competition_id=${WC_COMP}&per_page=100&page=2`);
        const all_matches = [...(all?.data || []), ...(matches2?.data || [])];
        // Filter by UTC date prefix
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
      const { data: payload, cached: hit } = await cached(redis, `stats_shotmap_${id}`, 86400, async () => {
        const d = await statsFetch(`/matches/${id}/shotmap`);
        // Normalize shotmap shots
        const shots = (d?.data || []).map(s => ({
          x: s.x_coordinate ?? s.x ?? 50,
          y: s.y_coordinate ?? s.y ?? 50,
          xG: s.expected_goal ?? s.xg ?? s.xG ?? 0,
          goal: s.shot_type === 'goal' || s.outcome === 'goal' || s.goal === true,
          onTarget: s.on_target ?? (s.shot_type === 'goal' || s.shot_type === 'save'),
          playerName: s.player?.name || s.player_name || '',
          team: s.team?.name || s.team_name || '',
          teamId: s.team?.id || s.team_id || '',
          minute: s.minute || s.time || null,
        }));
        return { shots };
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
