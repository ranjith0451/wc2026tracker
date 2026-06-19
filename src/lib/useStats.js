/**
 * React Query hooks for TheStatsAPI data.
 * All fetches go through /api/stats (server-side proxy, key hidden).
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { computePlayerRatings } from './playerRating.js';
import { MATCHES } from '../data/matches.js';

async function statsFetch(action, params = {}) {
  const qs = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`/api/stats?${qs}`);
  if (!res.ok) throw new Error(`Stats API HTTP ${res.status}`);
  return res.json();
}

// Team name aliases — keep in sync with transform.ts
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

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'live', 'in_progress', '1h', '2h', 'ht']);
const DONE_STATUSES = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO', 'ft', 'aet', 'pen', 'finished', 'completed', 'full_time']);

// ── Schedule (replaces TheSportsDB useWCLive) ─────────────────────────────────
export function useSchedule() {
  return useQuery({
    queryKey: ['stats-schedule'],
    queryFn: async () => {
      const data = await statsFetch('all-matches');
      const apiMatches = data?.matches || [];

      // Build "home|away" → api match lookup
      const apiMap = {};
      for (const m of apiMatches) {
        const h = normName(m.home_team?.name || '');
        const a = normName(m.away_team?.name || '');
        if (h && a) apiMap[`${h}|${a}`] = m;
      }

      const results = {};
      let liveCount = 0;

      for (const m of MATCHES) {
        if (!m.home?.name || !m.away?.name) continue;
        const key = `${m.home.name}|${m.away.name}`;
        const apiM = apiMap[key];
        if (!apiM) continue;

        const rawStatus = apiM.status || apiM.match_status || '';
        const statusUp = rawStatus.toUpperCase();

        let localStatus, statusShort;
        if (DONE_STATUSES.has(rawStatus) || DONE_STATUSES.has(statusUp)) {
          localStatus = 'finished';
          statusShort = statusUp === 'AET' ? 'AET' : statusUp === 'PEN' ? 'PEN' : 'FT';
        } else if (LIVE_STATUSES.has(rawStatus) || LIVE_STATUSES.has(statusUp)) {
          localStatus = 'live';
          statusShort = statusUp || '1H';
          liveCount++;
        } else {
          continue; // scheduled — no result to store
        }

        const homeScore = apiM.home_score ?? apiM.score?.home ?? apiM.goals?.home ?? null;
        const awayScore = apiM.away_score ?? apiM.score?.away ?? apiM.goals?.away ?? null;
        if (homeScore === null || awayScore === null) continue;

        results[m.id] = {
          status: localStatus,
          homeScore: Number(homeScore),
          awayScore: Number(awayScore),
          statusShort,
          elapsed: apiM.elapsed ?? apiM.minute ?? apiM.current_time ?? apiM.match_time ?? apiM.time_elapsed ?? apiM.time
            ?? (localStatus === 'live' && apiM.utc_date
              ? Math.min(90, Math.max(1, Math.floor((Date.now() - new Date(apiM.utc_date).getTime()) / 60000)))
              : null),
          halftime: (apiM.score?.half_time_home != null)
            ? { home: apiM.score.half_time_home, away: apiM.score.half_time_away }
            : (apiM.halftime ?? apiM.half_time ?? null),
          statsMatchId: apiM.id,
        };
      }

      // Also export idMap keyed by "home|away" (bypasses KV/override merge)
      const idMap = {};
      for (const m of MATCHES) {
        if (!m.home?.name || !m.away?.name) continue;
        const key = `${m.home.name}|${m.away.name}`;
        const apiM = apiMap[key];
        if (apiM?.id) idMap[key] = apiM.id;
      }

      return { results, liveCount, idMap };
    },
    refetchInterval: (query) => {
      const liveCount = query.state.data?.liveCount || 0;
      // Poll every 60s always — detects match going live even when currently no live matches
      return liveCount > 0 ? 30_000 : 60_000;
    },
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 55_000,
  });
}

// ── Match details (venue, weather, managers, attendance) ──────────────────────
export function useMatchDetails(statsMatchId) {
  return useQuery({
    queryKey: ['stats-match', statsMatchId],
    queryFn: () => statsFetch('match', { id: statsMatchId }),
    enabled: !!statsMatchId,
    staleTime: 5 * 60_000,
  });
}

// ── Event timeline ────────────────────────────────────────────────────────────
export function useMatchEvents(statsMatchId, { live = false, intervalMs } = {}) {
  const polling = intervalMs === false
    ? false
    : typeof intervalMs === 'number'
      ? intervalMs
      : (live ? 60_000 : false);

  return useQuery({
    queryKey: ['stats-events', statsMatchId],
    queryFn: () => statsFetch('events', { id: statsMatchId }),
    enabled: !!statsMatchId,
    refetchInterval: polling,
    refetchIntervalInBackground: true,
    staleTime: polling ? Math.max(20_000, Math.floor((typeof polling === 'number' ? polling : 60_000) * 0.85)) : 10 * 60_000,
  });
}

// ── Team statistics ───────────────────────────────────────────────────────────
export function useMatchStats(statsMatchId, { live = false } = {}) {
  return useQuery({
    queryKey: ['stats-teamstats', statsMatchId],
    queryFn: () => statsFetch('stats', { id: statsMatchId }),
    enabled: !!statsMatchId,
    refetchInterval: live ? 60_000 : false,
    refetchIntervalInBackground: true,
    staleTime: live ? 50_000 : 90_000,
  });
}

// ── Live match stats (in-play elapsed + real-time stats) ─────────────────────
export function useLiveStats(statsMatchId, enabled = false) {
  return useQuery({
    queryKey: ['stats-livestats', statsMatchId],
    queryFn: () => statsFetch('live-stats', { id: statsMatchId }),
    enabled: !!statsMatchId && enabled,
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    staleTime: 25_000,
  });
}

// ── Lineups ───────────────────────────────────────────────────────────────────
export function useMatchLineups(statsMatchId) {
  return useQuery({
    queryKey: ['stats-lineups', statsMatchId],
    queryFn: async () => {
      const data = await statsFetch('lineups', { id: statsMatchId });
      return data?.lineups || [];
    },
    enabled: !!statsMatchId,
    staleTime: 60 * 60_000,
  });
}

// ── Player statistics + computed ratings ──────────────────────────────────────
export function usePlayerRatings(statsMatchId, events, matchResult) {
  return useQuery({
    queryKey: ['stats-player-ratings', statsMatchId],
    queryFn: async () => {
      const data = await statsFetch('player-stats', { id: statsMatchId });
      const players = data?.players || [];
      return computePlayerRatings(players, events || [], matchResult || {});
    },
    enabled: !!statsMatchId,
    staleTime: 30 * 60_000,
  });
}

// ── Shotmap ───────────────────────────────────────────────────────────────────
export function useShotmap(statsMatchId, enabled = false) {
  return useQuery({
    queryKey: ['stats-shotmap', statsMatchId],
    queryFn: () => statsFetch('shotmap', { id: statsMatchId }),
    enabled: !!statsMatchId && enabled,
    staleTime: 7 * 24 * 60 * 60_000,
  });
}

// ── Player heatmap (on-demand) ────────────────────────────────────────────────
export function usePlayerHeatmap(statsMatchId, playerId) {
  return useQuery({
    queryKey: ['stats-heatmap', statsMatchId, playerId],
    queryFn: () => statsFetch('heatmap', { id: statsMatchId, pid: playerId }),
    enabled: !!statsMatchId && !!playerId,
    staleTime: 7 * 24 * 60 * 60_000,
  });
}

// ── Referee info ──────────────────────────────────────────────────────────────
export function useMatchReferee(statsMatchId) {
  return useQuery({
    queryKey: ['stats-referee', statsMatchId],
    queryFn: async () => {
      const d = await statsFetch('referee', { id: statsMatchId });
      const ref = d?.referee || d?.data || d;
      return { name: ref?.name || ref?.referee_name || null, nationality: ref?.nationality || null };
    },
    enabled: !!statsMatchId,
    staleTime: 24 * 60 * 60_000,
  });
}

// ── Competition top scorers ───────────────────────────────────────────────────
export function useTopScorers() {
  return useQuery({
    queryKey: ['stats-top-scorers'],
    queryFn: async () => {
      const data = await statsFetch('top-scorers');
      return data?.scorers || [];
    },
    refetchInterval: 5 * 60_000,
    staleTime: 4 * 60_000,
  });
}

// ── Invalidate all stats for a match (retry) ──────────────────────────────────
export function useStatsRefresh(statsMatchId) {
  const qc = useQueryClient();
  return () => {
    ['stats-events', 'stats-teamstats', 'stats-lineups', 'stats-player-ratings', 'stats-shotmap'].forEach(
      (key) => qc.invalidateQueries({ queryKey: [key, statsMatchId] })
    );
  };
}

// ── Build statsMatchId map (home|away → statsMatchId) ─────────────────────────
export function useStatsMatchIdMap() {
  return useQuery({
    queryKey: ['stats-match-id-map'],
    queryFn: async () => {
      const data = await statsFetch('all-matches');
      const matches = data?.matches || [];
      const idMap = {};
      for (const m of matches) {
        const home = normName(m.home_team?.name || '');
        const away = normName(m.away_team?.name || '');
        if (home && away && m.id) {
          idMap[`${home}|${away}`] = m.id;
        }
      }
      return idMap;
    },
    refetchInterval: 10 * 60_000,
    staleTime: 9 * 60_000,
  });
}
