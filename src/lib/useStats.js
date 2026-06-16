/**
 * React Query hooks for TheStatsAPI data.
 * All fetches go through /api/stats (server-side proxy, key hidden).
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { computePlayerRatings } from './playerRating.js';

async function statsFetch(action, params = {}) {
  const qs = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`/api/stats?${qs}`);
  if (!res.ok) throw new Error(`Stats API HTTP ${res.status}`);
  return res.json();
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
export function useMatchEvents(statsMatchId, { live = false } = {}) {
  return useQuery({
    queryKey: ['stats-events', statsMatchId],
    queryFn: () => statsFetch('events', { id: statsMatchId }),
    enabled: !!statsMatchId,
    refetchInterval: live ? 30_000 : false,
    staleTime: live ? 20_000 : 10 * 60_000,
  });
}

// ── Team statistics ───────────────────────────────────────────────────────────
export function useMatchStats(statsMatchId, { live = false } = {}) {
  return useQuery({
    queryKey: ['stats-teamstats', statsMatchId],
    queryFn: () => statsFetch('stats', { id: statsMatchId }),
    enabled: !!statsMatchId,
    refetchInterval: live ? 60_000 : false,
    staleTime: live ? 45_000 : 10 * 60_000,
  });
}

// ── Lineups ───────────────────────────────────────────────────────────────────
export function useMatchLineups(statsMatchId) {
  return useQuery({
    queryKey: ['stats-lineups', statsMatchId],
    queryFn: () => statsFetch('lineups', { id: statsMatchId }),
    enabled: !!statsMatchId,
    staleTime: 30 * 60_000,
  });
}

// ── Player statistics + computed ratings ──────────────────────────────────────
export function usePlayerRatings(statsMatchId, events, matchResult) {
  return useQuery({
    queryKey: ['stats-player-ratings', statsMatchId],
    queryFn: async () => {
      const data = await statsFetch('player-stats', { id: statsMatchId });
      const players = data?.players || data?.response || data || [];
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
    staleTime: 60 * 60_000,
  });
}

// ── Player heatmap (on-demand) ────────────────────────────────────────────────
export function usePlayerHeatmap(statsMatchId, playerId) {
  return useQuery({
    queryKey: ['stats-heatmap', statsMatchId, playerId],
    queryFn: () => statsFetch('heatmap', { id: statsMatchId, pid: playerId }),
    enabled: !!statsMatchId && !!playerId,
    staleTime: 60 * 60_000,
  });
}

// ── Referee info ──────────────────────────────────────────────────────────────
export function useMatchReferee(statsMatchId) {
  return useQuery({
    queryKey: ['stats-referee', statsMatchId],
    queryFn: () => statsFetch('referee', { id: statsMatchId }),
    enabled: !!statsMatchId,
    staleTime: 24 * 60 * 60_000,
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
// Fetches TheStatsAPI match list for a rolling 2-day window to build ID map
function utcDateStr(offsetDays = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function useStatsMatchIdMap() {
  const WC_START = '2026-06-11';
  const dates = [];
  for (let d = new Date(WC_START); d <= new Date(utcDateStr(1)); d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }

  return useQuery({
    queryKey: ['stats-match-id-map', dates.slice(-2).join(',')],
    queryFn: async () => {
      // Only fetch last 2 days + tomorrow to minimize requests
      const window = [utcDateStr(-1), utcDateStr(0), utcDateStr(1)];
      const results = await Promise.allSettled(
        window.map((d) => statsFetch('matches', { date: d }))
      );
      const idMap = {};
      for (const r of results) {
        if (r.status !== 'fulfilled') continue;
        const matches = r.value?.matches || r.value?.data || r.value?.response || [];
        for (const m of matches) {
          const homeTeam = m.homeTeam?.name || m.home?.name || m.homeTeamName || '';
          const awayTeam = m.awayTeam?.name || m.away?.name || m.awayTeamName || '';
          const matchId = m.id || m.matchId || m.fixture?.id;
          if (homeTeam && awayTeam && matchId) {
            idMap[`${homeTeam}|${awayTeam}`] = String(matchId);
          }
        }
      }
      return idMap;
    },
    // Refetch every 5 minutes — low priority, just needs to catch new fixtures
    refetchInterval: 5 * 60_000,
    staleTime: 4 * 60_000,
  });
}
