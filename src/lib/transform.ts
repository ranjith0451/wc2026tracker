// Transform raw API-Football / TheSportsDB responses into the shapes used by the app.

// ─── Raw API shapes (what comes off the wire) ────────────────────────────────

interface ApiTeam {
  id?: number | string;
  name: string;
  logo?: string | null;
}

interface ApiFixtureStatus {
  short: string;
  elapsed?: number | null;
}

interface ApiScore {
  home: number | null;
  away: number | null;
}

interface ApiFixture {
  fixture: {
    id: number | string;
    status: ApiFixtureStatus;
    date?: string | null;
    venue?: { name?: string } | null;
  };
  league?: { id?: number; name?: string };
  teams: { home: ApiTeam; away: ApiTeam };
  goals: { home: number | null; away: number | null };
  score?: {
    halftime?: ApiScore | null;
    penalty?: ApiScore | null;
  };
}

interface ApiEvent {
  time?: { elapsed?: number; extra?: number };
  team?: { name?: string };
  player?: { name?: string };
  assist?: { name?: string };
  type?: string;
  detail?: string;
}

interface ApiStatEntry {
  type: string;
  value: string | number | null;
}

interface ApiStatSide {
  team?: { name?: string };
  statistics?: ApiStatEntry[];
}

interface ApiLineupPlayer {
  player?: {
    name?: string;
    number?: number;
    pos?: string;
    grid?: string;
  };
}

interface ApiLineupSide {
  team?: { name?: string; logo?: string };
  formation?: string;
  startXI?: ApiLineupPlayer[];
  substitutes?: ApiLineupPlayer[];
  coach?: { name?: string };
}

// ─── Our app's data shapes (what UI components consume) ──────────────────────

export type MatchStatus = 'live' | 'finished' | 'scheduled';

export interface MatchResult {
  status: MatchStatus;
  homeScore: number;
  awayScore: number;
  elapsed?: number | null;
  statusShort: string;
  halftime?: ApiScore | null;
  apiFixtureId?: number | string;
  homeLogo?: string | null;
  awayLogo?: string | null;
  penalties?: { home: number; away: number };
  // Legacy manual stats (fallback when API has no data)
  stats?: Record<string, unknown>;
  scorers?: ScorerEvent[];
  cards?: CardEvent[];
}

export interface ScorerEvent {
  team?: string;
  player?: string;
  minute: number;
  penalty?: boolean;
  ownGoal?: boolean;
  assist?: string | null;
}

export interface CardEvent {
  team?: string;
  player?: string;
  minute: number;
  cardType: 'yellow' | 'red';
  detail?: string;
}

export interface SubEvent {
  team?: string;
  playerOut?: string;
  playerIn?: string;
  minute: number;
}

export interface MatchEvents {
  scorers: ScorerEvent[];
  cards: CardEvent[];
  subs: SubEvent[];
}

export interface MatchStats {
  homeTeam?: string;
  awayTeam?: string;
  homePoss?: number | null;
  awayPoss?: number | null;
  homeShots?: number | null;
  awayShots?: number | null;
  homeShotsOT?: number | null;
  awayShotsOT?: number | null;
  homeShotsOff?: number | null;
  awayShotsOff?: number | null;
  homeShotsBlocked?: number | null;
  awayShotsBlocked?: number | null;
  homeShotsBox?: number | null;
  awayShotsBox?: number | null;
  homeShotsOut?: number | null;
  awayShotsOut?: number | null;
  homePasses?: number | null;
  awayPasses?: number | null;
  homePassesAcc?: number | null;
  awayPassesAcc?: number | null;
  homePassAcc?: number | null;
  awayPassAcc?: number | null;
  homeCorners?: number | null;
  awayCorners?: number | null;
  homeFouls?: number | null;
  awayFouls?: number | null;
  homeOffsides?: number | null;
  awayOffsides?: number | null;
  homeYC?: number | null;
  awayYC?: number | null;
  homeRC?: number | null;
  awayRC?: number | null;
  homeSaves?: number | null;
  awaySaves?: number | null;
  homeXG?: number | null;
  awayXG?: number | null;
  homeTackles?: number | null;
  awayTackles?: number | null;
}

export interface LineupPlayer {
  name?: string;
  number?: number;
  pos?: string;
  grid?: string;
}

export interface TeamLineup {
  team?: string;
  logo?: string;
  formation?: string;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
  coach?: string;
}

export interface TopScorer {
  player: string;
  team: string;
  goals: number;
  assists: number;
  appearances: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LIVE_STATUS = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE']);
const DONE_STATUS = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO']);

// Map external API team names → our matches.js team names
const NAME_ALIASES: Record<string, string> = {
  'Turkey':                    'Türkiye',
  'Türkei':                    'Türkiye',
  'Czech Republic':            'Czechia',
  'Bosnia-Herzegovina':        'Bosnia & Herzegovina',
  'Bosnia and Herzegovina':    'Bosnia & Herzegovina',
  "Côte d'Ivoire":             'Ivory Coast',
  'Democratic Republic of Congo': 'DR Congo',
  'Cabo Verde':                'Cape Verde',
};

function normalizeTeamName(name: string): string {
  return NAME_ALIASES[name] ?? name;
}

// ─── Exported transforms ──────────────────────────────────────────────────────

export function apiStatusToLocal(short: string): MatchStatus {
  if (LIVE_STATUS.has(short)) return 'live';
  if (DONE_STATUS.has(short)) return 'finished';
  return 'scheduled';
}

/** Build a lookup map: "HomeTeam|AwayTeam" → normalised ApiFixture */
export function buildFixtureMap(
  apiFixtures: ApiFixture[] | null | undefined
): Record<string, ApiFixture> {
  const map: Record<string, ApiFixture> = {};

  for (const f of apiFixtures ?? []) {
    const homeName = normalizeTeamName(f.teams.home.name);
    const awayName = normalizeTeamName(f.teams.away.name);
    const normF: ApiFixture = {
      ...f,
      teams: {
        home: { ...f.teams.home, name: homeName },
        away: { ...f.teams.away, name: awayName },
      },
    };
    map[`${homeName}|${awayName}`] = normF;
    map[String(f.fixture.id)] = normF;
  }

  return map;
}

/** Convert one API fixture → our MatchResult (returns null for scheduled matches) */
export function fixtureToResult(f: ApiFixture | null | undefined): MatchResult | null {
  if (!f) return null;

  const short = f.fixture.status.short;
  const localStatus = apiStatusToLocal(short);
  if (localStatus === 'scheduled') return null;

  const result: MatchResult = {
    status: localStatus,
    homeScore: f.goals.home ?? 0,
    awayScore: f.goals.away ?? 0,
    elapsed: f.fixture.status.elapsed,
    statusShort: short,
    halftime: f.score?.halftime ?? null,
    apiFixtureId: f.fixture.id,
    homeLogo: f.teams.home.logo ?? null,
    awayLogo: f.teams.away.logo ?? null,
  };

  const pen = f.score?.penalty;
  if (pen?.home != null && pen?.away != null) {
    result.penalties = { home: pen.home, away: pen.away };
  }

  return result;
}

/** Transform events API response → { scorers, cards, subs } */
export function transformEvents(apiResponse: { response?: ApiEvent[] } | null): MatchEvents {
  const events = apiResponse?.response ?? [];
  const scorers: ScorerEvent[] = [];
  const cards: CardEvent[] = [];
  const subs: SubEvent[] = [];

  for (const e of events) {
    const min = (e.time?.elapsed ?? 0) + (e.time?.extra ?? 0);
    const base = { team: e.team?.name, player: e.player?.name, minute: min };

    if (e.type === 'Goal') {
      scorers.push({
        ...base,
        penalty: e.detail === 'Penalty',
        ownGoal: e.detail === 'Own Goal',
        assist: e.assist?.name ?? null,
      });
    } else if (e.type === 'Card') {
      cards.push({
        ...base,
        cardType: e.detail === 'Yellow Card' ? 'yellow' : 'red',
        detail: e.detail,
      });
    } else if (e.type === 'subst') {
      subs.push({
        team: e.team?.name,
        playerOut: e.player?.name,
        playerIn: e.assist?.name,
        minute: min,
      });
    }
  }

  return { scorers, cards, subs };
}

/** Transform statistics API response → MatchStats */
export function transformStatistics(
  apiResponse: { response?: ApiStatSide[] } | null
): MatchStats | null {
  const sides = apiResponse?.response ?? [];
  if (sides.length === 0) return null;

  function parseVal(v: string | number | null | undefined): number | null {
    if (v == null) return null;
    if (typeof v === 'string' && v.endsWith('%')) return parseInt(v, 10);
    if (typeof v === 'number') return v;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }

  function statMap(statistics: ApiStatEntry[] | undefined): Record<string, number | null> {
    const m: Record<string, number | null> = {};
    for (const s of statistics ?? []) m[s.type] = parseVal(s.value);
    return m;
  }

  const h = statMap(sides[0]?.statistics);
  const a = statMap(sides[1]?.statistics);

  return {
    homeTeam: sides[0]?.team?.name,
    awayTeam: sides[1]?.team?.name,
    homePoss:         h['Ball Possession'],
    awayPoss:         100 - (h['Ball Possession'] ?? 50),
    homeShots:        h['Total Shots'],
    awayShots:        a['Total Shots'],
    homeShotsOT:      h['Shots on Goal'],
    awayShotsOT:      a['Shots on Goal'],
    homeShotsOff:     h['Shots off Goal'],
    awayShotsOff:     a['Shots off Goal'],
    homeShotsBlocked: h['Blocked Shots'],
    awayShotsBlocked: a['Blocked Shots'],
    homeShotsBox:     h['Shots insidebox'],
    awayShotsBox:     a['Shots insidebox'],
    homeShotsOut:     h['Shots outsidebox'],
    awayShotsOut:     a['Shots outsidebox'],
    homePasses:       h['Total passes'],
    awayPasses:       a['Total passes'],
    homePassesAcc:    h['Passes accurate'],
    awayPassesAcc:    a['Passes accurate'],
    homePassAcc:      h['Passes %'],
    awayPassAcc:      a['Passes %'],
    homeCorners:      h['Corner Kicks'],
    awayCorners:      a['Corner Kicks'],
    homeFouls:        h['Fouls'],
    awayFouls:        a['Fouls'],
    homeOffsides:     h['Offsides'],
    awayOffsides:     a['Offsides'],
    homeYC:           h['Yellow Cards'],
    awayYC:           a['Yellow Cards'],
    homeRC:           h['Red Cards'],
    awayRC:           a['Red Cards'],
    homeSaves:        h['Goalkeeper Saves'],
    awaySaves:        a['Goalkeeper Saves'],
    homeXG:           h['expected_goals'],
    awayXG:           a['expected_goals'],
    homeTackles:      h['Total Tackles'],
    awayTackles:      a['Total Tackles'],
  };
}

/** Transform lineups API response → TeamLineup[] */
export function transformLineups(
  apiResponse: { response?: ApiLineupSide[] } | null
): TeamLineup[] {
  const sides = apiResponse?.response ?? [];

  return sides.map((s) => ({
    team: s.team?.name,
    logo: s.team?.logo,
    formation: s.formation,
    startXI: (s.startXI ?? []).map((p) => ({
      name:   p.player?.name,
      number: p.player?.number,
      pos:    p.player?.pos,
      grid:   p.player?.grid,
    })),
    substitutes: (s.substitutes ?? []).map((p) => ({
      name:   p.player?.name,
      number: p.player?.number,
      pos:    p.player?.pos,
    })),
    coach: s.coach?.name,
  }));
}

/** Aggregate top scorers across all match events */
export function computeTopScorers(
  eventsMap: Record<string, MatchEvents | null | undefined>
): TopScorer[] {
  const players: Record<string, TopScorer> = {};

  for (const ev of Object.values(eventsMap)) {
    for (const s of ev?.scorers ?? []) {
      if (!s.player || s.ownGoal) continue;
      const key = `${s.player}|${s.team}`;
      players[key] ??= { player: s.player, team: s.team ?? '', goals: 0, assists: 0, appearances: 0 };
      players[key].goals += 1;
    }
    for (const s of ev?.scorers ?? []) {
      if (!s.assist || !s.team) continue;
      const key = `${s.assist}|${s.team}`;
      players[key] ??= { player: s.assist, team: s.team, goals: 0, assists: 0, appearances: 0 };
      players[key].assists += 1;
    }
  }

  return Object.values(players).sort(
    (a, b) => b.goals - a.goals || b.assists - a.assists
  );
}
