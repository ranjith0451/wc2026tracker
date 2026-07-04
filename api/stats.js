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
// Competition whitelist - clients pass ?comp=wc|ucl; raw competition IDs are
// never accepted from the client. Fill 'ucl' after ?action=competitions discovery.
const COMPETITIONS = {
  wc: WC_COMP,
};
const API_KEY = process.env.STATS_API_KEY;

// Team name aliases — keep in sync with useStats.js
const NAME_ALIASES = {
  'Turkey': 'Türkiye',
  'Türkei': 'Türkiye',
  'Czech Republic': 'Czechia',
  'Bosnia-Herzegovina': 'Bosnia & Herzegovina',
  'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
  "Côte d'Ivoire": 'Ivory Coast',
  'Democratic Republic of Congo': 'DR Congo',
  'Cabo Verde': 'Cape Verde',
};
const normName = (n) => NAME_ALIASES[n] ?? n;

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
    return { id: p.id, name: p.name, number: p.jersey_number, pos, grid: `${row}:${rowCounts[row]}` };
  });
  const substitutes = (side.substitutes || []).map(p => ({
    id: p.id,
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
// API shape: { data: { overview: { ball_possession: { all: { home, away } }, ... } } }
function normalizeTeamStats(raw) {
  if (!raw) return null;
  const d = raw?.data || raw;

  // Primary shape: data.overview.{stat}.all.{home|away}
  const ov = d?.overview;
  if (ov) {
    const g = (key) => ({ home: ov[key]?.all?.home ?? null, away: ov[key]?.all?.away ?? null });
    const poss = g('ball_possession');
    const shots = g('total_shots');
    const sot = g('shots_on_target');
    const saves = g('goalkeeper_saves');
    const corners = g('corner_kicks');
    const fouls = g('fouls');
    const yc = g('yellow_cards');
    const rc = g('red_cards');
    const passes = g('passes');
    const accPasses = g('accurate_passes');
    const tackles = g('tackles');
    const xg = g('expected_goals');
    const offsides = g('offsides');
    return {
      homePoss: poss.home, awayPoss: poss.away,
      homeShots: shots.home, awayShots: shots.away,
      homeShotsOT: sot.home, awayShotsOT: sot.away,
      homeSaves: saves.home, awaySaves: saves.away,
      homeCorners: corners.home, awayCorners: corners.away,
      homeFouls: fouls.home, awayFouls: fouls.away,
      homeYC: yc.home, awayYC: yc.away,
      homeRC: rc.home, awayRC: rc.away,
      homePasses: passes.home, awayPasses: passes.away,
      homePassesAcc: accPasses.home, awayPassesAcc: accPasses.away,
      homePassAcc: passes.home ? Math.round((accPasses.home / passes.home) * 100) : null,
      awayPassAcc: passes.away ? Math.round((accPasses.away / passes.away) * 100) : null,
      homeTackles: tackles.home, awayTackles: tackles.away,
      homeXG: xg.home, awayXG: xg.away,
      homeOffsides: offsides.home, awayOffsides: offsides.away,
      homeShotsOff: d?.shots?.shots_off_target?.all?.home ?? null,
      awayShotsOff: d?.shots?.shots_off_target?.all?.away ?? null,
      homeShotsBlocked: d?.shots?.blocked_shots?.all?.home ?? null,
      awayShotsBlocked: d?.shots?.blocked_shots?.all?.away ?? null,
    };
  }

  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, id, date, pid, comp } = req.query;
  const compKey = COMPETITIONS[comp] ? comp : 'wc';
  const COMP_ID = COMPETITIONS[compKey];
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
      // Fetch all matches with balanced cache
      // 60s cache balances freshness vs server load
      const { data: allData, cached: hit } = await cached(redis, `stats_all_${compKey}`, 60, async () => {
        const [page1, page2] = await Promise.all([
          statsFetch(`/matches?competition_id=${COMP_ID}&per_page=100&page=1`),
          statsFetch(`/matches?competition_id=${COMP_ID}&per_page=100&page=2`),
        ]);
        const matches = [...(page1?.data || []), ...(page2?.data || [])];

        // If no live matches in current fetch, force refresh to catch finished matches
        const hasLive = matches.some(m => m.status === 'live' || m.status === 'in_progress');

        return { matches, hasLive };
      });

      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json({ matches: allData?.matches || [] });
    }

    // ── Matches by date ───────────────────────────────────────────────────────
    if (action === 'matches') {
      const d = date || new Date().toISOString().slice(0, 10);
      const { data: payload, cached: hit } = await cached(redis, `stats_matches_${compKey}_${d}`, 300, async () => {
        const [page1, page2] = await Promise.all([
          statsFetch(`/matches?competition_id=${COMP_ID}&per_page=100&page=1`),
          statsFetch(`/matches?competition_id=${COMP_ID}&per_page=100&page=2`),
        ]);
        const all_matches = [...(page1?.data || []), ...(page2?.data || [])];
        const filtered = all_matches.filter(m => (m.utc_date || '').startsWith(d));
        return { matches: filtered };
      });
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(payload);
    }

    // ── Competition top scorers (derived from per-match event timelines) ────────
    if (action === 'top-scorers') {
      const { data: payload, cached: hit } = await cached(redis, 'stats_topscorers', 300, async () => {
        // Import MATCHES (only WC2026 group/knockout stage)
        const { MATCHES } = await import('../src/data/matches.js');

        // Step 1: get all WC matches from API
        const [p1, p2] = await Promise.all([
          statsFetch(`/matches?competition_id=${COMP_ID}&per_page=100&page=1`),
          statsFetch(`/matches?competition_id=${COMP_ID}&per_page=100&page=2`),
        ]);
        const allMatches = [...(p1?.data || []), ...(p2?.data || [])];

        // Build API match lookup by home|away
        const apiMap = {};
        for (const m of allMatches) {
          const h = normName(m.home_team?.name || '');
          const a = normName(m.away_team?.name || '');
          if (h && a) apiMap[`${h}|${a}`] = m;
        }

        // Step 2: filter to only WC2026 matches (from local MATCHES)
        const DONE = new Set(['ft', 'aet', 'pen', 'finished', 'completed', 'full_time', 'awarded', 'walkover']);
        const finished = [];
        for (const m of MATCHES) {
          if (!m.home?.name || !m.away?.name) continue;
          const key = `${m.home.name}|${m.away.name}`;
          const apiM = apiMap[key];
          if (!apiM) continue;
          if (DONE.has((apiM.status || '').toLowerCase())) {
            finished.push(apiM);
          }
        }

        // Step 2: fetch timeline for each finished match (re-use cached events where possible)
        const GOAL_TYPES = new Set(['goal', 'penalty_goal', 'freekick_goal', 'own_goal']);
        const tally = {}; // "player||team" -> { player, team, goals, penalties, assists, matchIds }

        await Promise.allSettled(finished.map(async m => {
          let events;
          if (redis) {
            try {
              const cached_hit = await redis.get(`stats_events_${m.id}`);
              if (cached_hit) { events = JSON.parse(cached_hit); }
            } catch {}
          }
          if (!events) {
            try {
              const d = await statsFetch(`/matches/${m.id}/timeline`);
              // Store the raw data object (same shape as the regular events action)
              events = d?.data || d || {};
              if (redis) {
                try { await redis.setex(`stats_events_${m.id}`, 86400, JSON.stringify(events)); } catch {}
              }
            } catch { return; }
          }

          // Events are nested: { events: [...] } or a plain array
          const evArray = events?.events || events?.data?.events || (Array.isArray(events) ? events : []);

          for (const ev of evArray) {
            const type = (ev.type || ev.event_type || '').toLowerCase();

            // Count goals
            if (GOAL_TYPES.has(type) && type !== 'own_goal') {
              const player = ev.player_name || ev.player?.name || '';
              const team   = ev.team_name   || ev.team?.name   || '';
              if (player) {
                const key = `${player}||${team}`;
                if (!tally[key]) tally[key] = { player, team, goals: 0, penalties: 0, assists: 0, matchIds: new Set() };
                tally[key].goals++;
                if (type === 'penalty_goal') tally[key].penalties++;
                tally[key].matchIds.add(m.id);
              }
            }

            // Count assists on goal events
            if (GOAL_TYPES.has(type) && type !== 'own_goal' && ev.assist) {
              const assister = ev.assist || '';
              const team   = ev.team_name   || ev.team?.name   || '';
              if (assister) {
                const key = `${assister}||${team}`;
                if (!tally[key]) tally[key] = { player: assister, team, goals: 0, penalties: 0, assists: 0, matchIds: new Set() };
                tally[key].assists++;
                tally[key].matchIds.add(m.id);
              }
            }
          }
        }));

        return Object.values(tally)
          .map(t => ({ player: t.player, team: t.team, goals: t.goals, penalties: t.penalties, assists: t.assists, matches: t.matchIds.size }))
          .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.player.localeCompare(b.player));
      }, false);

      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json({ scorers: payload || [] });
    }

    // ── Debug: inspect raw timeline for one finished match ───────────────────
    if (action === 'debug-scorers') {
      const [p1] = await Promise.all([
        statsFetch(`/matches?competition_id=${COMP_ID}&per_page=100&page=1`),
      ]);
      const allMatches = p1?.data || [];
      const DONE = new Set(['ft', 'aet', 'pen', 'finished', 'completed', 'full_time', 'awarded', 'walkover']);
      const finished = allMatches.filter(m => DONE.has((m.status || '').toLowerCase()));
      if (finished.length === 0) return res.status(200).json({ error: 'no finished matches', allMatches: allMatches.slice(0, 3) });
      const sample = finished[0];
      const rawTimeline = await statsFetch(`/matches/${sample.id}/timeline`);
      return res.status(200).json({
        matchId: sample.id,
        matchStatus: sample.status,
        home: sample.home_team?.name,
        away: sample.away_team?.name,
        timelineTopLevelKeys: Object.keys(rawTimeline || {}),
        rawTimelineSample: rawTimeline,
        finishedCount: finished.length,
      });
    }

    // -- Competitions list (club-football discovery) ------------------------
    if (action === 'competitions') {
      const { data: payload, cached: hit } = await cached(redis, 'stats_competitions', 86400, async () => {
        const d = await statsFetch('/competitions?per_page=100');
        const list = (d?.data || []).map(c => ({ id: c.id, name: c.name, country: c.country || c.region || null }));
        return { competitions: list };
      });
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(payload);
    }

    // -- Standings (league table) for whitelisted competitions --------------
    if (action === 'standings') {
      const { data: payload, cached: hit } = await cached(redis, `stats_standings_${compKey}`, 3600, async () => {
        try {
          const d = await statsFetch(`/standings?competition_id=${COMP_ID}`);
          return { standings: d?.data || d || [], comp: compKey };
        } catch (e) {
          if (e.message.includes('404')) return { standings: [], unavailable: true, comp: compKey };
          throw e;
        }
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
        const d = await statsFetch(`/matches/${id}/stats`);
        const normalized = normalizeTeamStats(d);
        return normalized;
      });
      res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
      return res.status(200).json(payload || {});
    }

    // ── Live match stats (in-play only) ──────────────────────────────────────
    if (action === 'live-stats') {
      const { data: payload, cached: hit } = await cached(redis, `stats_livestats_${id}`, 30, async () => {
        const d = await statsFetch(`/matches/${id}/live-stats`);
        const raw = d?.data || d || {};
        // Normalize: merge live-stats shape into same structure as /stats
        const normalized = normalizeTeamStats(d) || {};
        // Also expose raw elapsed/minute from live-stats
        return {
          ...normalized,
          elapsed: raw.elapsed ?? raw.minute ?? raw.current_time ?? raw.match_time ?? raw.time ?? null,
          statusShort: raw.status ?? raw.match_status ?? raw.period ?? null,
          raw,
        };
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
      try {
        const { data: payload, cached: hit } = await cached(redis, cacheKey, 86400 * 7, async () => {
          const path = pid
            ? `/matches/${id}/players/${pid}/heatmap`
            : `/matches/${id}/heatmap`;
          const d = await statsFetch(path);
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
      } catch (heatmapErr) {
        // 404 = no heatmap data for this player — return empty gracefully
        if (heatmapErr.message.includes('404')) {
          return res.status(200).json({ points: [], unavailable: true });
        }
        throw heatmapErr;
      }
    }

    // ── Lineups ───────────────────────────────────────────────────────────────
    if (action === 'lineups') {
      const { data: payload, cached: hit } = await cached(redis, `stats_lineups_v2_${id}`, 3600, async () => {
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
    if (redis) { try { redis.disconnect(); } catch (_) {} }
  }
}
