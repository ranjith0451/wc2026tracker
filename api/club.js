/**
 * Club football proxy — football-data.org v4 (server-side only, key hidden).
 *
 * Baseline provider for the Champions League section of the mobile app.
 * TheStatsAPI (api/stats.js) may also serve UCL if discovery finds it; this
 * proxy exists so club data never depends on that trial key.
 *
 * Set FD_API_KEY in Vercel environment variables (free tier: 10 req/min,
 * competitions include CL). Without the key every action returns
 * { configured: false } with empty data so clients degrade gracefully.
 *
 * Actions:
 *   ?action=standings   → UCL league-phase table
 *   ?action=matches     → UCL fixtures/results
 *   ?action=scorers     → UCL top scorers
 */

import Redis from 'ioredis';

const BASE = 'https://api.football-data.org/v4';
const API_KEY = process.env.FD_API_KEY;

// Competition whitelist — clients pass ?comp=ucl; raw codes are never accepted.
const COMPETITIONS = {
  ucl: 'CL',
};

function getRedis() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  return new Redis(url, {
    tls: url.startsWith('rediss://') ? {} : undefined,
    lazyConnect: false, connectTimeout: 5000, maxRetriesPerRequest: 1,
  });
}

async function fdFetch(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-Auth-Token': API_KEY, 'Accept': 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`football-data HTTP ${res.status}: ${body.slice(0, 200)}`);
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, comp } = req.query;
  const compCode = COMPETITIONS[comp] ?? COMPETITIONS.ucl;

  if (!API_KEY) {
    return res.status(200).json({
      configured: false,
      error: 'FD_API_KEY not set',
      standings: [], matches: [], scorers: [],
    });
  }

  const redis = getRedis();

  try {
    // —— League table ————————————————————————————————————————————————————
    if (action === 'standings') {
      const { data: payload, cached: hit } = await cached(redis, `club_standings_${compCode}`, 3600, async () => {
        const d = await fdFetch(`/competitions/${compCode}/standings`);
        // v4: standings[] per stage/group, each with table[]
        const groups = (d?.standings || []).map(s => ({
          stage: s.stage,
          group: s.group ?? null,
          type: s.type,
          table: (s.table || []).map(r => ({
            position: r.position,
            team: r.team?.name,
            tla: r.team?.tla ?? null,
            crest: r.team?.crest ?? null,
            played: r.playedGames,
            won: r.won, draw: r.draw, lost: r.lost,
            gf: r.goalsFor, ga: r.goalsAgainst, gd: r.goalDifference,
            points: r.points,
          })),
        }));
        return { configured: true, season: d?.season ?? null, standings: groups };
      });
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(payload);
    }

    // —— Fixtures / results ——————————————————————————————————————————————
    if (action === 'matches') {
      const { data: payload, cached: hit } = await cached(redis, `club_matches_${compCode}`, 300, async () => {
        const d = await fdFetch(`/competitions/${compCode}/matches`);
        const matches = (d?.matches || []).map(m => ({
          id: m.id,
          stage: m.stage,
          group: m.group ?? null,
          utcDate: m.utcDate,
          status: m.status, // SCHEDULED | TIMED | IN_PLAY | PAUSED | FINISHED
          home: m.homeTeam?.name,
          away: m.awayTeam?.name,
          homeCrest: m.homeTeam?.crest ?? null,
          awayCrest: m.awayTeam?.crest ?? null,
          homeScore: m.score?.fullTime?.home ?? null,
          awayScore: m.score?.fullTime?.away ?? null,
          winner: m.score?.winner ?? null,
        }));
        return { configured: true, matches };
      });
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(payload);
    }

    // —— Top scorers —————————————————————————————————————————————————————
    if (action === 'scorers') {
      const { data: payload, cached: hit } = await cached(redis, `club_scorers_${compCode}`, 3600, async () => {
        const d = await fdFetch(`/competitions/${compCode}/scorers?limit=25`);
        const scorers = (d?.scorers || []).map(s => ({
          id: s.player?.id,
          name: s.player?.name,
          team: s.team?.name,
          goals: s.goals ?? 0,
          assists: s.assists ?? 0,
          penalties: s.penalties ?? 0,
        }));
        return { configured: true, scorers };
      });
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(payload);
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    console.error('[club api]', err.message);
    return res.status(502).json({ error: err.message });
  } finally {
    if (redis) { try { redis.disconnect(); } catch (_) {} }
  }
}
