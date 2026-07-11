/**
 * Sync src/data/matches.js from football-data.org.
 *
 * - Group stage: matched by "home|away" team-name pair (after aliasing).
 * - Knockouts: resolved deterministically from the bracket — group winners /
 *   runners-up come from the live standings, later rounds chain from the
 *   winner of each synced feeder match, and the matching football-data
 *   fixture confirms the pairing (and supplies best-third opponents).
 * - Finished matches get result: { homeScore, awayScore, status, statusShort, penalties? }.
 * - Kickoff fields (isoIST / ist / date) are corrected to FIFA's actual
 *   schedule wherever football-data disagrees with the projected times.
 *
 * Usage:  node scripts/sync-matches.mjs        (reads FD_API_KEY from env or .env.local)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MATCHES_PATH = join(ROOT, 'src', 'data', 'matches.js');

// ── API key ────────────────────────────────────────────────────────────────
let apiKey = process.env.FD_API_KEY;
if (!apiKey) {
  try {
    const env = readFileSync(join(ROOT, '.env.local'), 'utf8');
    apiKey = env.match(/^FD_API_KEY=(.+)$/m)?.[1]?.trim();
  } catch {}
}
if (!apiKey) {
  console.error('FD_API_KEY not set (env or .env.local)');
  process.exit(1);
}

// football-data names → local names (keep in sync with api/stats.js)
const NAME_ALIASES = {
  'Turkey': 'Türkiye',
  'Czech Republic': 'Czechia',
  'Bosnia-Herzegovina': 'Bosnia & Herzegovina',
  'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
  "Côte d'Ivoire": 'Ivory Coast',
  'Democratic Republic of Congo': 'DR Congo',
  'Congo DR': 'DR Congo',
  'Cabo Verde': 'Cape Verde',
  'Cape Verde Islands': 'Cape Verde',
  'United States': 'USA',
  'Korea Republic': 'South Korea',
  'IR Iran': 'Iran',
};
const normName = (n) => NAME_ALIASES[n] ?? n;

const STAGE_MAP = {
  'Round of 32': 'LAST_32',
  'Round of 16': 'LAST_16',
  'Quarterfinal': 'QUARTER_FINALS',
  'Semifinal': 'SEMI_FINALS',
  'Third Place': 'THIRD_PLACE',
  'Final': 'FINAL',
};
const STAGE_ORDER = ['Round of 32', 'Round of 16', 'Quarterfinal', 'Semifinal', 'Third Place', 'Final'];

const fdGet = async (path) => {
  const res = await fetch(`https://api.football-data.org/v4${path}`, {
    headers: { 'X-Auth-Token': apiKey, 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`football-data HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
};

// ── Load local MATCHES + remote data ───────────────────────────────────────
const src = readFileSync(MATCHES_PATH, 'utf8');
const MATCHES = JSON.parse(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1));
const localById = Object.fromEntries(MATCHES.map(m => [m.id, m]));

const fd = (await fdGet('/competitions/WC/matches')).matches || [];
const standingsRaw = (await fdGet('/competitions/WC/standings')).standings || [];
console.log(`Local: ${MATCHES.length} matches | football-data: ${fd.length} matches, ${standingsRaw.length} groups`);

// Group letter → [1st, 2nd, 3rd, 4th] team names (local naming)
const groupTable = {};
for (const s of standingsRaw) {
  const letter = (s.group || '').replace('GROUP_', '').replace('Group ', '');
  groupTable[letter] = (s.table || []).map(r => normName(r.team?.name || ''));
}

const DONE = new Set(['FINISHED', 'AWARDED']);

// FD name-pair index
const byPair = new Map();
for (const m of fd) {
  const h = normName(m.homeTeam?.name || '');
  const a = normName(m.awayTeam?.name || '');
  if (h && a) byPair.set(`${h}|${a}`, m);
}

// ── Helpers ────────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function istFields(utcISO) {
  const t = new Date(Date.parse(utcISO) + 5.5 * 3600 * 1000); // shift to IST, read via UTC getters
  const h24 = t.getUTCHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  return {
    isoIST: `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T${pad(h24)}:${pad(t.getUTCMinutes())}:00+05:30`,
    ist: `${h12}:${pad(t.getUTCMinutes())} ${ampm}`,
    date: `${WEEKDAYS[t.getUTCDay()]}, ${MONTHS[t.getUTCMonth()]} ${t.getUTCDate()}`,
  };
}

function applyFdMatch(local, fdm, counters) {
  const fdHome = normName(fdm.homeTeam?.name || '');
  const fdAway = normName(fdm.awayTeam?.name || '');
  if (fdHome && local.home?.name !== fdHome) { local.home = { type: 'team', name: fdHome }; counters.teams++; }
  if (fdAway && local.away?.name !== fdAway) { local.away = { type: 'team', name: fdAway }; counters.teams++; }

  const fields = istFields(fdm.utcDate);
  if (local.isoIST !== fields.isoIST) {
    local.isoIST = fields.isoIST;
    local.ist = fields.ist;
    local.date = fields.date;
    counters.times++;
  }

  if (DONE.has(fdm.status)) {
    const result = {
      homeScore: fdm.score?.fullTime?.home ?? null,
      awayScore: fdm.score?.fullTime?.away ?? null,
      status: 'finished',
      statusShort: fdm.score?.duration === 'PENALTY_SHOOTOUT' ? 'PEN'
        : fdm.score?.duration === 'EXTRA_TIME' ? 'AET' : 'FT',
    };
    if (fdm.score?.penalties) {
      result.penalties = { home: fdm.score.penalties.home, away: fdm.score.penalties.away };
    }
    local.result = result;
    counters.results++;
  }
}

// Resolve one side of a knockout match to a team name, or null if undecidable.
function resolveSide(source) {
  if (!source) return null;
  switch (source.type) {
    case 'team': return source.name;
    case 'winner': return groupTable[source.group]?.[0] ?? null;
    case 'runnerup': return groupTable[source.group]?.[1] ?? null;
    case 'third_best': return null; // slot assignment comes from the FD fixture
    case 'winner_match':
    case 'loser_match': {
      const feeder = localById[source.matchId];
      const r = feeder?.result;
      if (!feeder || !r || r.status !== 'finished') return null;
      if (feeder.home?.type !== 'team' || feeder.away?.type !== 'team') return null;
      let homeWon;
      if (r.homeScore !== r.awayScore) homeWon = r.homeScore > r.awayScore;
      else if (r.penalties) homeWon = r.penalties.home > r.penalties.away;
      else return null;
      const winner = homeWon ? feeder.home.name : feeder.away.name;
      const loser = homeWon ? feeder.away.name : feeder.home.name;
      return source.type === 'winner_match' ? winner : loser;
    }
    default: return null;
  }
}

// ── 1) Group stage: name-pair matching ─────────────────────────────────────
const counters = { teams: 0, results: 0, times: 0 };
const unmatched = [];

for (const local of MATCHES) {
  if (local.stage !== 'Group Stage') continue;
  const fdm = byPair.get(`${local.home?.name}|${local.away?.name}`)
    ?? byPair.get(`${local.away?.name}|${local.home?.name}`);
  if (!fdm) { unmatched.push(`#${local.id} ${local.home?.name} v ${local.away?.name}`); continue; }
  applyFdMatch(local, fdm, counters);
}

// ── 2) Knockouts: bracket resolution, stage by stage ───────────────────────
// From the semis on there is exactly one match per calendar day, so those
// stages pair by chronological order instead — this also syncs fixtures the
// bracket chain can't decide yet (FD is the source of truth for pairings).
const BY_DATE_ORDER = new Set(['Semifinal', 'Third Place', 'Final']);
const usedFd = new Set();
for (const stage of STAGE_ORDER) {
  const fdStage = fd.filter(m => m.stage === STAGE_MAP[stage]);
  const locals = MATCHES.filter(m => m.stage === stage);

  if (BY_DATE_ORDER.has(stage)) {
    const fdSorted = [...fdStage].sort((x, y) => Date.parse(x.utcDate) - Date.parse(y.utcDate));
    const localSorted = [...locals].sort((x, y) => Date.parse(x.isoIST) - Date.parse(y.isoIST));
    localSorted.forEach((local, i) => {
      if (fdSorted[i]) applyFdMatch(local, fdSorted[i], counters);
    });
    continue;
  }

  for (const local of locals) {
    const wantHome = resolveSide(local.home);
    const wantAway = resolveSide(local.away);
    if (!wantHome && !wantAway) { unmatched.push(`#${local.id} ${stage} (feeders undecided)`); continue; }

    const candidates = fdStage.filter(m => {
      if (usedFd.has(m.id)) return false;
      const h = normName(m.homeTeam?.name || '');
      const a = normName(m.awayTeam?.name || '');
      const okHome = !wantHome || h === wantHome || a === wantHome;
      const okAway = !wantAway || h === wantAway || a === wantAway;
      return okHome && okAway && (h || a);
    });

    if (candidates.length !== 1) {
      unmatched.push(`#${local.id} ${stage} want ${wantHome ?? '?'} v ${wantAway ?? '?'} → ${candidates.length} candidates`);
      continue;
    }
    usedFd.add(candidates[0].id);
    applyFdMatch(local, candidates[0], counters);
  }
}

console.log(`Team slots updated: ${counters.teams} | results: ${counters.results} | kickoff corrections: ${counters.times}`);
if (unmatched.length) console.log(`Unresolved (expected for matches whose feeders are unplayed):\n  ${unmatched.join('\n  ')}`);

// ── Write back, one match per line for reviewable diffs ────────────────────
const body = MATCHES.map(m => '  ' + JSON.stringify(m)).join(',\n');
writeFileSync(MATCHES_PATH, `export const MATCHES = [\n${body}\n];\n`, 'utf8');
console.log(`Wrote ${MATCHES_PATH}`);
