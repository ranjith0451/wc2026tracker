/**
 * WC2026 — football-data.org v4 proxy (server-side only, keeps API key hidden)
 *
 * Base: https://api.football-data.org/v4
 * Auth: X-Auth-Token: FD_API_KEY
 * WC competition code: WC (FIFA World Cup 2026)
 *
 * Set FD_API_KEY in Vercel environment variables.
 * Free tier: ~10 req/min — Redis caching below keeps us well under it.
 *
 * Actions (response shapes kept compatible with src/lib/useStats.js):
 *   ?action=matches&date=2026-06-14  → WC fixtures for a date
 *   ?action=all-matches              → all WC matches
 *   ?action=match&id=537384          → match details (venue, referee)
 *   ?action=standings                → WC group tables
 *   ?action=top-scorers              → competition top scorers
 *   ?action=referee&id=537384        → referee info
 *   ?action=usage                    → API request counter
 *
 * The football-data free tier has NO event timelines, lineups, per-player
 * stats, shotmaps or heatmaps. Those actions return empty payloads so the
 * UI degrades gracefully instead of erroring:
 *   events → {events:[]}  stats/live-stats → {}  player-stats → {players:[]}
 *   shotmap → {shots:[]}  heatmap → {points:[],unavailable:true}
 *   lineups → {lineups:[],confirmed:false}
 */

import Redis from 'ioredis';

const BASE = 'https://api.football-data.org/v4';
const WC_COMP = 'WC';
const API_KEY = process.env.FD_API_KEY;

// Team name aliases — football-data names → local names (keep in sync with useStats.js)
export const NAME_ALIASES = {
  'Turkey': 'Türkiye',
  'Türkei': 'Türkiye',
  'Czech Republic': 'Czechia',
  'Bosnia-Herzegovina': 'Bosnia & Herzegovina',
  'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
  "Côte d'Ivoire": 'Ivory Coast',
  'Democratic Republic of Congo': 'DR Congo',
  'Cabo Verde': 'Cape Verde',
  'United States': 'USA',
  'Korea Republic': 'South Korea',
  'IR Iran': 'Iran',
};
export const normName = (n) => NAME_ALIASES[n] ?? n;

function getRedis() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  return new Redis(url, {
    tls: url.startsWith('rediss://') ? {} : undefined,
    lazyConnect: false, connectTimeout: 5000, maxRetriesPerRequest: 1,
  });
}

async function fdFetch(path) {
  if (!API_KEY) throw new Error('FD_API_KEY not configured');
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-Auth-Token': API_KEY, 'Accept': 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`football-data HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// ── Resilient caching ────────────────────────────────────────────────────────
// The FD free tier allows ~10 req/min. Without protection, one rate-limited
// window becomes self-sustaining: every visitor poll misses the cache, hits
// football-data, gets 429, and returns 502 — nothing is ever cached, so the
// hammering (and the outage) continues as long as anyone is on the site.
// Defenses, in order:
//   1. warm-instance memory cache (works even when Redis is down/unset)
//   2. long-TTL stale copies (memory + `<key>:stale` in Redis) served
//      whenever the upstream call fails
//   3. a short cooldown after an upstream failure so a rate-limited window
//      is never hammered by the same instance
const memCache = new Map(); // key → { data, freshUntil, staleUntil }
const STALE_TTL_S = 6 * 60 * 60; // keep stale copies 6h
const UPSTREAM_COOLDOWN_MS = 30_000;
let upstreamCooldownUntil = 0;

export function __resetStatsCache() {
  memCache.clear();
  upstreamCooldownUntil = 0;
}

export async function cached(redis, key, ttl, fn, trackUsage = true) {
  const now = Date.now();

  const mem = memCache.get(key);
  if (mem && now < mem.freshUntil) return { data: mem.data, cached: true };

  if (redis) {
    try {
      const hit = await redis.get(key);
      if (hit) {
        const data = JSON.parse(hit);
        memCache.set(key, { data, freshUntil: now + ttl * 1000, staleUntil: now + STALE_TTL_S * 1000 });
        return { data, cached: true };
      }
    } catch {}
  }

  const staleFallback = async () => {
    if (mem && now < mem.staleUntil) return { data: mem.data, cached: true, stale: true };
    if (redis) {
      try {
        const s = await redis.get(`${key}:stale`);
        if (s) return { data: JSON.parse(s), cached: true, stale: true };
      } catch {}
    }
    return null;
  };

  // Upstream failed very recently — serve stale data instead of hammering it.
  if (now < upstreamCooldownUntil) {
    const s = await staleFallback();
    if (s) return s;
  }

  let data;
  try {
    data = await fn();
  } catch (err) {
    upstreamCooldownUntil = Date.now() + UPSTREAM_COOLDOWN_MS;
    const s = await staleFallback();
    if (s) return s;
    throw err;
  }
  upstreamCooldownUntil = 0;

  // Increment daily usage counter on cache miss (= real API call)
  if (redis && trackUsage) {
    const today = new Date().toISOString().slice(0, 10);
    const uk = `fd_usage_${today}`;
    try {
      await redis.incr(uk);
      await redis.expire(uk, 86400 * 8);
    } catch {}
  }

  if (data) {
    memCache.set(key, { data, freshUntil: now + ttl * 1000, staleUntil: now + STALE_TTL_S * 1000 });
    if (redis) {
      try {
        const json = JSON.stringify(data);
        await redis.setex(key, ttl, json);
        await redis.setex(`${key}:stale`, STALE_TTL_S, json);
      } catch {}
    }
  }
  return { data, cached: false };
}

// Map football-data status → the lowercase statuses useStats.js understands.
// AET/PEN are derived from score.duration so the UI can badge them correctly.
export function mapStatus(m) {
  switch (m.status) {
    case 'FINISHED':
    case 'AWARDED':
      if (m.score?.duration === 'PENALTY_SHOOTOUT') return 'pen';
      if (m.score?.duration === 'EXTRA_TIME') return 'aet';
      return 'finished';
    case 'IN_PLAY': return 'live';
    case 'PAUSED': return 'ht';
    case 'SUSPENDED':
    case 'POSTPONED': return 'postponed';
    case 'CANCELLED': return 'cancelled';
    default: return 'scheduled'; // SCHEDULED | TIMED
  }
}

// football-data match → legacy shape consumed by useStats.js
export function mapMatch(m) {
  return {
    id: String(m.id),
    utc_date: m.utcDate,
    status: mapStatus(m),
    stage: m.stage,
    group: m.group ?? null,
    matchday: m.matchday ?? null,
    home_team: {
      id: m.homeTeam?.id ?? null,
      name: normName(m.homeTeam?.name || '') || null,
      tla: m.homeTeam?.tla ?? null,
      crest: m.homeTeam?.crest ?? null,
    },
    away_team: {
      id: m.awayTeam?.id ?? null,
      name: normName(m.awayTeam?.name || '') || null,
      tla: m.awayTeam?.tla ?? null,
      crest: m.awayTeam?.crest ?? null,
    },
    home_score: m.score?.fullTime?.home ?? null,
    away_score: m.score?.fullTime?.away ?? null,
    score: {
      home: m.score?.fullTime?.home ?? null,
      away: m.score?.fullTime?.away ?? null,
      half_time_home: m.score?.halfTime?.home ?? null,
      half_time_away: m.score?.halfTime?.away ?? null,
    },
    penalties: m.score?.penalties
      ? { home: m.score.penalties.home ?? null, away: m.score.penalties.away ?? null }
      : null,
    winner: m.score?.winner ?? null,
    duration: m.score?.duration ?? null,
    venue: m.venue ?? null,
  };
}

async function fetchAllWCMatches() {
  const d = await fdFetch(`/competitions/${WC_COMP}/matches`);
  return (d?.matches || []).map(mapMatch);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, id, date } = req.query;
  const redis = getRedis();

  try {
    // ── API usage counter ────────────────────────────────────────────────
    if (action === 'usage') {
      const today = new Date().toISOString().slice(0, 10);
      let used = 0;
      if (redis) {
        try { used = parseInt(await redis.get(`fd_usage_${today}`) || '0'); } catch {}
      }
      const limit = 14400; // 10 req/min theoretical daily ceiling
      return res.status(200).json({
        used,
        limit,
        remaining: limit - used,
        trialEnd: null,
        source: 'football-data.org',
        plan: 'free',
      });
    }

    // ── All WC matches (builds statsMatchIdMap) ──────────────────────────
    if (action === 'all-matches') {
      const { data: matches, cached: hit } = await cached(redis, 'fd_all_wc', 60, fetchAllWCMatches);
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json({ matches: matches || [] });
    }

    // ── Matches by date ──────────────────────────────────────────────────
    if (action === 'matches') {
      const d = date || new Date().toISOString().slice(0, 10);
      const { data: payload, cached: hit } = await cached(redis, `fd_matches_${d}`, 300, async () => {
        const all = await fetchAllWCMatches();
        return { matches: all.filter(m => (m.utc_date || '').startsWith(d)) };
      });
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(payload);
    }

    // ── Group standings ──────────────────────────────────────────────────
    if (action === 'standings') {
      const { data: payload, cached: hit } = await cached(redis, 'fd_wc_standings', 900, async () => {
        const d = await fdFetch(`/competitions/${WC_COMP}/standings`);
        const groups = (d?.standings || []).map(s => ({
          stage: s.stage,
          group: s.group ?? null,
          type: s.type,
          table: (s.table || []).map(r => ({
            position: r.position,
            team: normName(r.team?.name || ''),
            tla: r.team?.tla ?? null,
            crest: r.team?.crest ?? null,
            played: r.playedGames,
            won: r.won, draw: r.draw, lost: r.lost,
            gf: r.goalsFor, ga: r.goalsAgainst, gd: r.goalDifference,
            points: r.points,
          })),
        }));
        return { season: d?.season ?? null, standings: groups };
      });
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(payload);
    }

    // ── Competition top scorers ──────────────────────────────────────────
    if (action === 'top-scorers') {
      const { data: payload, cached: hit } = await cached(redis, 'fd_topscorers', 300, async () => {
        const d = await fdFetch(`/competitions/${WC_COMP}/scorers?limit=25`);
        return (d?.scorers || []).map(s => ({
          player: s.player?.name || '',
          team: normName(s.team?.name || ''),
          goals: s.goals ?? 0,
          penalties: s.penalties ?? 0,
          assists: s.assists ?? 0,
          matches: s.playedMatches ?? 0,
        }));
      });
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json({ scorers: payload || [] });
    }

    if (!id) return res.status(400).json({ error: 'id required' });

    // ── Match details ────────────────────────────────────────────────────
    if (action === 'match') {
      const { data: payload, cached: hit } = await cached(redis, `fd_match_${id}`, 300, async () => {
        const d = await fdFetch(`/matches/${id}`);
        const mapped = mapMatch(d);
        const ref = (d.referees || []).find(r => r.type === 'REFEREE') || d.referees?.[0];
        return {
          ...mapped,
          attendance: d.attendance ?? null,
          referee: ref ? { name: ref.name, nationality: ref.nationality ?? null } : null,
        };
      });
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(payload);
    }

    // ── Referee ──────────────────────────────────────────────────────────
    if (action === 'referee') {
      const { data: payload, cached: hit } = await cached(redis, `fd_referee_${id}`, 86400, async () => {
        const d = await fdFetch(`/matches/${id}`);
        const ref = (d.referees || []).find(r => r.type === 'REFEREE') || d.referees?.[0];
        return { name: ref?.name ?? null, nationality: ref?.nationality ?? null };
      });
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(payload);
    }

    // ── Not available on the football-data free tier — degrade gracefully ─
    if (action === 'events') return res.status(200).json({ events: [], unavailable: true });
    if (action === 'stats') return res.status(200).json({});
    if (action === 'live-stats') return res.status(200).json({ elapsed: null, statusShort: null });
    if (action === 'player-stats') return res.status(200).json({ players: [] });
    if (action === 'shotmap') return res.status(200).json({ shots: [], unavailable: true });
    if (action === 'heatmap') return res.status(200).json({ points: [], unavailable: true });
    if (action === 'lineups') return res.status(200).json({ lineups: [], confirmed: false });

    return res.status(400).json({ error: `Unknown action: ${action}` });

  } catch (err) {
    console.error('[stats api]', err.message);
    return res.status(502).json({ error: err.message });
  } finally {
    if (redis) { try { redis.disconnect(); } catch (_) {} }
  }
}
