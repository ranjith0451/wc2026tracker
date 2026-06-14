/**
 * WC2026 data hooks — React Query powered.
 * Automatic caching, deduplication, background refetch, stale-while-revalidate.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MATCHES } from '../data/matches.js';
import { buildFixtureMap, fixtureToResult, transformEvents, transformStatistics, transformLineups } from './transform.ts';

const LIVE_STATUS = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE']);

function utcDateStr(offsetDays = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function fetchDate(dateStr) {
  const res = await fetch(`/api/wc?action=date&d=${dateStr}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function buildResultsFromFixtures(allFixtures) {
  const fixtureMap = buildFixtureMap(allFixtures);
  const results = {};
  const idMap = {};

  for (const m of MATCHES) {
    if (!m.home?.name || !m.away?.name) continue;
    const key = `${m.home.name}|${m.away.name}`;
    const apiF = fixtureMap[key];
    if (!apiF) continue;
    const r = fixtureToResult(apiF);
    if (r) results[m.id] = r;
    if (apiF) idMap[m.id] = apiF.fixture.id;
  }

  return { results, idMap };
}

// ── Main live-data hook ────────────────────────────────────────────
export function useWCLive() {
  const WC_START = '2026-06-11';
  const tomorrow = utcDateStr(1);
  const dates = [];
  for (let d = new Date(WC_START); d <= new Date(tomorrow); d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  const uniqueDates = [...new Set(dates)].slice(0, 30);

  const query = useQuery({
    queryKey: ['wc-fixtures', uniqueDates.join(',')],
    queryFn: async () => {
      const responses = await Promise.all(uniqueDates.map(fetchDate));
      const allFixtures = responses.flatMap((r) => r?.response || []);
      return { allFixtures, ...buildResultsFromFixtures(allFixtures) };
    },
    // Smart refetch: 90s if any match is live, 5min otherwise
    refetchInterval: (query) => {
      const allFixtures = query.state.data?.allFixtures || [];
      const hasLive = allFixtures.some((f) => LIVE_STATUS.has(f.fixture?.status?.short));
      return hasLive ? 90_000 : 5 * 60_000;
    },
    refetchIntervalInBackground: false,
    staleTime: 60_000,
  });

  const allFixtures = query.data?.allFixtures || [];
  const liveCount = allFixtures.filter((f) => LIVE_STATUS.has(f.fixture?.status?.short)).length;

  return {
    results: query.data?.results || {},
    fixtureIdMap: query.data?.idMap || {},
    liveCount,
    lastUpdated: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
}

// ── Per-match detail: events + stats + lineups ─────────────────────
export function useMatchDetail(apiFixtureId) {
  const eventsQuery = useQuery({
    queryKey: ['match-events', apiFixtureId],
    queryFn: async () => {
      const res = await fetch(`/api/wc?action=events&id=${apiFixtureId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return transformEvents(data);
    },
    enabled: !!apiFixtureId,
    staleTime: 5 * 60_000,
  });

  const statsQuery = useQuery({
    queryKey: ['match-stats', apiFixtureId],
    queryFn: async () => {
      const res = await fetch(`/api/wc?action=stats&id=${apiFixtureId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return transformStatistics(data);
    },
    enabled: !!apiFixtureId,
    staleTime: 5 * 60_000,
  });

  const lineupsQuery = useQuery({
    queryKey: ['match-lineups', apiFixtureId],
    queryFn: async () => {
      const res = await fetch(`/api/wc?action=lineups&id=${apiFixtureId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return transformLineups(data);
    },
    enabled: !!apiFixtureId,
    staleTime: 30 * 60_000,
  });

  const queryClient = useQueryClient();

  return {
    events: eventsQuery.data || null,
    stats: statsQuery.data || null,
    lineups: lineupsQuery.data || null,
    loading: eventsQuery.isLoading || statsQuery.isLoading || lineupsQuery.isLoading,
    // Force-invalidate all caches for this fixture (retry button)
    load: (force = false) => {
      if (force) {
        queryClient.invalidateQueries({ queryKey: ['match-events', apiFixtureId] });
        queryClient.invalidateQueries({ queryKey: ['match-stats', apiFixtureId] });
        queryClient.invalidateQueries({ queryKey: ['match-lineups', apiFixtureId] });
      }
    },
  };
}

// ── API usage hook ──────────────────────────────────────────────────
export function useApiUsage() {
  const { data } = useQuery({
    queryKey: ['api-usage'],
    queryFn: async () => {
      const res = await fetch('/api/wc?action=usage');
      return res.json();
    },
    staleTime: 60_000,
  });
  return data || null;
}
