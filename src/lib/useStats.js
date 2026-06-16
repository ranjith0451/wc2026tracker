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
      // Server normalizes player stats — returns { players: [...normalized] }
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
    queryFn: async () => {
      const d = await statsFetch('referee', { id: statsMatchId });
      // Normalize: API returns { name, nationality } or wrapped
      const ref = d?.referee || d?.data || d;
      return { name: ref?.name || ref?.referee_name || null, nationality: ref?.nationality || null };
    },
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
  return useQuery({
    queryKey: ['stats-match-id-map'],
    queryFn: async () => {
      // Single call fetches all 104 WC matches — cached 5min server-side
      const data = await statsFetch('all-matches');
      const matches = data?.matches || [];
      const idMap = {};
      for (const m of matches) {
        const home = m.home_team?.name || '';
        const away = m.away_team?.name || '';
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
