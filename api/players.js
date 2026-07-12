/**
 * Player profile proxy — API-Football v3 (server-side only, key hidden).
 *
 * Serves player bio + photo for the mobile app's player pages. Free tier is
 * 100 requests/day, so profiles are cached hard in Redis and clients must
 * treat null fields as "hide this row" (initials avatar, no market value).
 *
 * Set APIFOOTBALL_KEY in Vercel environment variables. Without the key every
 * action returns { configured: false } with empty data.
 *
 * Actions:
 *   ?action=search&q=<name>  → player profile candidates (min 3 chars)
 *   ?action=player&id=<id>   → single player profile
 */

import { getRedis, cached as baseCached } from './_lib/cache.js';

const BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.APIFOOTBALL_KEY;

async function afFetch(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'x-apisports-key': API_KEY, 'Accept': 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API-Football HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// Resilient shared cache (memory + Redis + stale fallback, see _lib/cache.js);
// tracks the 100 req/day API-Football budget under af_usage.
const cached = (redis, key, ttl, fn) =>
  baseCached(redis, key, ttl, fn, { usageKey: 'af_usage' });

function normalizePlayer(entry) {
  const p = entry?.player ?? entry ?? {};
  return {
    id: p.id ?? null,
    name: p.name ?? ([p.firstname, p.lastname].filter(Boolean).join(' ') || null),
    age: p.age ?? null,
    birthDate: p.birth?.date ?? null,
    nationality: p.nationality ?? null,
    height: p.height ?? null,
    weight: p.weight ?? null,
    position: p.position ?? null,
    number: p.number ?? null,
    photoUrl: p.photo ?? (p.id ? `https://media.api-sports.io/football/players/${p.id}.png` : null),
    // No free, reliable market-value source — contractually optional field.
    marketValue: null,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, q, id } = req.query;

  if (!API_KEY) {
    return res.status(200).json({ configured: false, error: 'APIFOOTBALL_KEY not set', players: [] });
  }

  const redis = getRedis();

  try {
    // —— Name search (budget-guarded: min 3 chars, cached 7 days) ————————————
    if (action === 'search') {
      const query = (q || '').trim();
      if (query.length < 3) {
        return res.status(400).json({ error: 'q must be at least 3 characters' });
      }
      const cacheKey = `players_search_${query.toLowerCase()}`;
      const { data: payload, cached: hit } = await cached(redis, cacheKey, 86400 * 7, async () => {
        const d = await afFetch(`/players/profiles?search=${encodeURIComponent(query)}`);
        const players = (d?.response || []).slice(0, 20).map(normalizePlayer);
        return { configured: true, players };
      });
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(payload);
    }

    // —— Single profile (cached 30 days) —————————————————————————————————————
    if (action === 'player') {
      if (!id) return res.status(400).json({ error: 'id required' });
      const { data: payload, cached: hit } = await cached(redis, `players_profile_${id}`, 86400 * 30, async () => {
        const d = await afFetch(`/players/profiles?player=${encodeURIComponent(id)}`);
        const player = d?.response?.[0] ? normalizePlayer(d.response[0]) : null;
        return { configured: true, player };
      });
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(payload);
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    console.error('[players api]', err.message);
    return res.status(502).json({ error: err.message });
  } finally {
    if (redis) { try { redis.disconnect(); } catch (_) {} }
  }
}
