// Shared caching layer for the API proxies (stats/club/players).
// Underscore-prefixed paths under api/ are not deployed as Vercel functions.

import Redis from 'ioredis';

export function getRedis() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  return new Redis(url, {
    tls: url.startsWith('rediss://') ? {} : undefined,
    lazyConnect: false, connectTimeout: 5000, maxRetriesPerRequest: 1,
  });
}

// ── Resilient caching ────────────────────────────────────────────────────────
// The upstream free tiers are tiny (football-data ~10 req/min, API-Football
// 100 req/day). Without protection, one rate-limited window becomes
// self-sustaining: every visitor poll misses the cache, hits the upstream,
// gets 429, and returns 502 — nothing is ever cached, so the hammering (and
// the outage) continues as long as anyone is on the site. Defenses, in order:
//   1. warm-instance memory cache (works even when Redis is down/unset)
//   2. long-TTL stale copies (memory + `<key>:stale` in Redis) served
//      whenever the upstream call fails
//   3. a short cooldown after an upstream failure so a rate-limited window
//      is never hammered by the same instance
const memCache = new Map(); // key → { data, freshUntil, staleUntil }
const STALE_TTL_S = 6 * 60 * 60; // keep stale copies 6h
const UPSTREAM_COOLDOWN_MS = 30_000;
let upstreamCooldownUntil = 0;

export function __resetCache() {
  memCache.clear();
  upstreamCooldownUntil = 0;
}

// usageKey (e.g. 'fd_usage') increments a daily `<usageKey>_YYYY-MM-DD`
// counter in Redis on every real upstream call, for the ?action=usage report.
export async function cached(redis, key, ttl, fn, { usageKey = null } = {}) {
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

  if (redis && usageKey) {
    const today = new Date().toISOString().slice(0, 10);
    const uk = `${usageKey}_${today}`;
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
