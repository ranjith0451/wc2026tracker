/**
 * WC2026 — TheStatsAPI proxy (server-side only, keeps API key hidden)
 *
 * Set STATS_API_KEY in Vercel environment variables.
 *
 * Actions:
 *   ?action=matches&date=2026-06-14       → fixtures for a date
 *   ?action=live                           → currently live matches
 *   ?action=match&id=MATCH_ID             → match details
 *   ?action=events&id=MATCH_ID            → event timeline
 *   ?action=stats&id=MATCH_ID             → team statistics
 *   ?action=lineups&id=MATCH_ID           → lineups
 *   ?action=player-stats&id=MATCH_ID      → per-player stats (for rating algorithm)
 *   ?action=shotmap&id=MATCH_ID           → shot coordinates + xG
 *   ?action=heatmap&id=MATCH_ID&pid=PID  → player heatmap coordinates
 *   ?action=referee&id=MATCH_ID           → referee info
 */

import Redis from 'ioredis';

const BASE = 'https://api.thestatsapi.com/v1';
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

// Determine TTL: finished matches get 24h, live get 60s, upcoming get 5min
function matchTTL(status) {
  const s = (status || '').toUpperCase();
  if (['FT','AET','PEN','FINISHED'].some(x => s.includes(x))) return 86400;
  if (['1H','2H','HT','LIVE','ET','BT','P'].some(x => s === x)) return 60;
  return 300;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, id, date, pid } = req.query;
  const redis = getRedis();

  try {
    // ── List matches by date ──────────────────────────────────────────
    if (action === 'matches') {
      const d = date || new Date().toISOString().slice(0, 10);
      const { data, cached: hit } = await cached(redis, `stats_matches_${d}`, 300,
        () => statsFetch(`/matches?date=${d}&competition=FIFA%20World%20Cup%202026`));
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(data);
    }

    // ── Live matches ──────────────────────────────────────────────────
    if (action === 'live') {
      const { data, cached: hit } = await cached(redis, 'stats_live', 60,
        () => statsFetch('/matches/live?competition=FIFA%20World%20Cup%202026'));
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(data);
    }

    if (!id) return res.status(400).json({ error: 'id required' });

    // ── Match details ─────────────────────────────────────────────────
    if (action === 'match') {
      const { data, cached: hit } = await cached(redis, `stats_match_${id}`, 300,
        async () => {
          const d = await statsFetch(`/matches/${id}`);
          const status = d?.match?.status || d?.status || '';
          if (redis) await redis.expire(`stats_match_${id}`, matchTTL(status));
          return d;
        });
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(data);
    }

    // ── Event timeline ────────────────────────────────────────────────
    if (action === 'events') {
      const { data, cached: hit } = await cached(redis, `stats_events_${id}`, 120,
        () => statsFetch(`/matches/${id}/events`));
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(data);
    }

    // ── Team statistics ───────────────────────────────────────────────
    if (action === 'stats') {
      const { data, cached: hit } = await cached(redis, `stats_teamstats_${id}`, 300,
        () => statsFetch(`/matches/${id}/statistics`));
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(data);
    }

    // ── Lineups ───────────────────────────────────────────────────────
    if (action === 'lineups') {
      const { data, cached: hit } = await cached(redis, `stats_lineups_${id}`, 3600,
        () => statsFetch(`/matches/${id}/lineups`));
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(data);
    }

    // ── Per-player statistics (rating algorithm input) ────────────────
    if (action === 'player-stats') {
      const { data, cached: hit } = await cached(redis, `stats_playerstats_${id}`, 3600,
        () => statsFetch(`/matches/${id}/players`));
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(data);
    }

    // ── Shotmap ───────────────────────────────────────────────────────
    if (action === 'shotmap') {
      const { data, cached: hit } = await cached(redis, `stats_shotmap_${id}`, 86400,
        () => statsFetch(`/matches/${id}/shotmap`));
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(data);
    }

    // ── Player heatmap ────────────────────────────────────────────────
    if (action === 'heatmap') {
      if (!pid) return res.status(400).json({ error: 'pid required for heatmap' });
      const { data, cached: hit } = await cached(redis, `stats_heatmap_${id}_${pid}`, 86400,
        () => statsFetch(`/matches/${id}/heatmap/${pid}`));
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(data);
    }

    // ── Referee ───────────────────────────────────────────────────────
    if (action === 'referee') {
      const { data, cached: hit } = await cached(redis, `stats_referee_${id}`, 86400,
        () => statsFetch(`/matches/${id}/referee`));
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });

  } catch (err) {
    console.error('[stats api]', err.message);
    return res.status(502).json({ error: err.message });
  } finally {
    if (redis) redis.disconnect().catch(() => {});
  }
}
