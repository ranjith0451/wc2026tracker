/**
 * WC2026 API proxy — TheSportsDB free key (123), Redis caching.
 *
 * Actions:
 *   ?action=date&d=2026-06-14   → WC fixtures for a date (cached 10min/24h)
 *   ?action=live                 → today's fixtures as "live" proxy (2min cache)
 *   ?action=events&id=EVENT_ID   → not available on free tier
 *   ?action=stats&id=EVENT_ID    → not available on free tier
 *   ?action=lineups&id=EVENT_ID  → not available on free tier
 *   ?action=usage                → cache hit stats
 */

import Redis from 'ioredis';

const SDB_BASE = 'https://www.thesportsdb.com/api/v1/json/123';
// FIFA World Cup 2026 in TheSportsDB — confirmed league ID 4429, season 2026
const WC_LEAGUE_ID = '4429';
const WC_SEASON    = '2026';

function getRedis() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  return new Redis(url, {
    tls: url.startsWith('rediss://') ? {} : undefined,
    lazyConnect: false, connectTimeout: 5000, maxRetriesPerRequest: 1,
  });
}

async function sdbFetch(path) {
  const res = await fetch(`${SDB_BASE}${path}`);
  if (!res.ok) throw new Error(`SportsDB HTTP ${res.status}`);
  return res.json();
}

// Normalise a TheSportsDB event into our fixture shape (mirrors API-Football shape)
function normEvent(ev) {
  if (!ev) return null;
  const homeScore = ev.intHomeScore != null && ev.intHomeScore !== '' ? parseInt(ev.intHomeScore) : null;
  const awayScore = ev.intAwayScore != null && ev.intAwayScore !== '' ? parseInt(ev.intAwayScore) : null;
  const statusRaw = (ev.strStatus || '').toLowerCase();

  let statusShort = 'NS';
  if (statusRaw === 'match finished' || statusRaw === 'ft' || statusRaw === 'aet' || statusRaw === 'pen') {
    statusShort = statusRaw === 'aet' ? 'AET' : statusRaw === 'pen' ? 'PEN' : 'FT';
  } else if (statusRaw.includes('progress') || statusRaw === 'ht' || statusRaw === '1h' || statusRaw === '2h') {
    statusShort = statusRaw === 'ht' ? 'HT' : '1H';
  } else if (statusRaw === 'postponed') {
    statusShort = 'PST';
  }

  // Build a shape similar to API-Football so the rest of the code works unchanged
  return {
    fixture: {
      id: ev.idEvent,
      status: { short: statusShort, elapsed: null },
      date: ev.dateEvent && ev.strTime ? `${ev.dateEvent}T${ev.strTime}Z` : null,
      venue: { name: ev.strVenue || '' },
    },
    league: { id: parseInt(WC_LEAGUE_ID), name: 'FIFA World Cup' },
    teams: {
      home: {
        id: ev.idHomeTeam,
        name: ev.strHomeTeam,
        logo: ev.strHomeTeamBadge || null,
      },
      away: {
        id: ev.idAwayTeam,
        name: ev.strAwayTeam,
        logo: ev.strAwayTeamBadge || null,
      },
    },
    goals: {
      home: homeScore,
      away: awayScore,
    },
    score: {
      halftime: { home: null, away: null },
      penalty: { home: null, away: null },
    },
  };
}

// Fetch all WC 2026 season events and cache them
async function fetchAllSeason(redis) {
  const cacheKey = `sdb_season_${WC_LEAGUE_ID}_${WC_SEASON}`;

  if (redis) {
    const hit = await redis.get(cacheKey);
    if (hit) return JSON.parse(hit);
  }

  // TheSportsDB: all events in a league season
  const data = await sdbFetch(`/eventsseason.php?id=${WC_LEAGUE_ID}&s=${WC_SEASON}`);
  const events = (data.events || []).map(normEvent).filter(Boolean);

  if (redis && events.length > 0) {
    // Cache season data for 5 minutes (results update as matches finish)
    await redis.setex(cacheKey, 300, JSON.stringify(events));
  }

  return events;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, d, id } = req.query;
  const redis = getRedis();

  try {
    // ── Usage ──────────────────────────────────────────────────────
    if (action === 'usage') {
      return res.status(200).json({ source: 'TheSportsDB', plan: 'free', limit: 'unlimited', note: 'No daily limit on free tier' });
    }

    // ── Stats / Events / Lineups — not available on free tier ──────
    if (action === 'events' || action === 'stats' || action === 'lineups') {
      return res.status(200).json({ response: [], note: 'Not available on TheSportsDB free tier' });
    }

    // ── Date fixtures ──────────────────────────────────────────────
    if (action === 'date') {
      const dateStr = d || new Date().toISOString().slice(0, 10);
      const cacheKey = `sdb_date_${dateStr}`;

      if (redis) {
        const hit = await redis.get(cacheKey);
        if (hit) {
          res.setHeader('X-Cache', 'HIT');
          return res.status(200).json(JSON.parse(hit));
        }
      }

      // Try date-specific endpoint first
      let events = [];
      try {
        const data = await sdbFetch(`/eventsday.php?d=${dateStr}&l=${WC_LEAGUE_ID}`);
        events = (data.events || []).map(normEvent).filter(Boolean);
      } catch {}

      // Fallback: season dump filtered by date
      if (events.length === 0) {
        const all = await fetchAllSeason(redis);
        events = all.filter(f => {
          const fd = f.fixture?.date;
          return fd && fd.startsWith(dateStr);
        });
      }

      const payload = { response: events };
      const allDone = events.length > 0 && events.every(f => ['FT','AET','PEN'].includes(f.fixture?.status?.short));
      const todayUTC = new Date().toISOString().slice(0, 10);
      const ttl = allDone && dateStr < todayUTC ? 7 * 86400 : allDone ? 3600 : 300;

      if (redis && events.length > 0) {
        await redis.setex(cacheKey, ttl, JSON.stringify(payload));
      }

      res.setHeader('X-Cache', 'MISS');
      return res.status(200).json(payload);
    }

    // ── Live — use today's date as proxy ───────────────────────────
    if (action === 'live') {
      const today = new Date().toISOString().slice(0, 10);
      const cacheKey = `sdb_live_${today}`;

      if (redis) {
        const hit = await redis.get(cacheKey);
        if (hit) {
          res.setHeader('X-Cache', 'HIT');
          return res.status(200).json(JSON.parse(hit));
        }
      }

      let events = [];
      try {
        const data = await sdbFetch(`/eventsday.php?d=${today}&l=${WC_LEAGUE_ID}`);
        events = (data.events || []).map(normEvent).filter(Boolean);
      } catch {}

      const payload = { response: events };
      if (redis) await redis.setex(cacheKey, 120, JSON.stringify(payload));

      res.setHeader('X-Cache', 'MISS');
      return res.status(200).json(payload);
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });

  } catch (err) {
    return res.status(502).json({ error: err.message });
  } finally {
    if (redis) redis.disconnect().catch(() => {});
  }
}
