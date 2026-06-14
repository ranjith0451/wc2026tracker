import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_OUT = join(ROOT, 'public', 'data');
const CURATED = 'C:/Users/ranji/Downloads/worldcupsai_database/curated';
const ARCHIVE = 'C:/Users/ranji/Downloads/archive (2)';

mkdirSync(DATA_OUT, { recursive: true });

// ── CSV Parser (handles quoted fields with embedded commas/newlines) ──────────
function parseCSV(filePath) {
  const text = readFileSync(filePath, 'utf-8');
  const rows = [];
  let headers = null;
  let i = 0;
  const n = text.length;

  function parseField() {
    if (text[i] === '"') {
      i++; // skip opening quote
      let val = '';
      while (i < n) {
        if (text[i] === '"') {
          i++;
          if (text[i] === '"') { val += '"'; i++; } // escaped quote
          else break;
        } else {
          val += text[i++];
        }
      }
      return val;
    } else {
      let val = '';
      while (i < n && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
        val += text[i++];
      }
      return val;
    }
  }

  while (i < n) {
    const row = [];
    while (i < n && text[i] !== '\n' && text[i] !== '\r') {
      row.push(parseField());
      if (text[i] === ',') i++;
    }
    // skip \r\n or \n
    if (text[i] === '\r') i++;
    if (text[i] === '\n') i++;

    if (!headers) {
      headers = row;
    } else if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = row[idx] ?? ''; });
      rows.push(obj);
    }
  }
  return rows;
}

// ── Load datasets ────────────────────────────────────────────────────────────
console.log('Loading tournaments...');
const tournaments = parseCSV(join(CURATED, 'tournaments_curated.csv'));
console.log(`  ${tournaments.length} tournaments`);

console.log('Loading matches...');
const matches = parseCSV(join(CURATED, 'matches_curated.csv'));
console.log(`  ${matches.length} matches`);

console.log('Loading goals...');
const goals = parseCSV(join(CURATED, 'goals_curated.csv'));
console.log(`  ${goals.length} goals`);

console.log('Loading group standings...');
const standings = parseCSV(join(CURATED, 'group_standings_curated.csv'));
console.log(`  ${standings.length} standing rows`);

console.log('Loading players...');
const players = parseCSV(join(CURATED, 'players_curated.csv'));
console.log(`  ${players.length} players`);

console.log('Loading Kaggle matches...');
const kaggleMatches = parseCSV(join(ARCHIVE, 'matches_1930_2022.csv'));
console.log(`  ${kaggleMatches.length} kaggle matches`);

console.log('Loading world_cup summary...');
const wcSummary = parseCSV(join(ARCHIVE, 'world_cup.csv'));
console.log(`  ${wcSummary.length} wc summary rows`);

console.log('Loading FIFA rankings...');
const rankings = parseCSV(join(ARCHIVE, 'fifa_ranking_2026-06-08.csv'));
console.log(`  ${rankings.length} ranked teams`);

// ── Helper: map tournament_id → set of match_ids ─────────────────────────────
const tournamentMatchIds = {};
matches.forEach(m => {
  if (!tournamentMatchIds[m.tournament_id]) tournamentMatchIds[m.tournament_id] = new Set();
  tournamentMatchIds[m.tournament_id].add(m.match_id);
});

// ── Helper: goals per tournament ─────────────────────────────────────────────
const goalsByTournament = {};
goals.forEach(g => {
  if (!goalsByTournament[g.tournament_id]) goalsByTournament[g.tournament_id] = [];
  goalsByTournament[g.tournament_id].push(g);
});

// ── Standings grouped by tournament ─────────────────────────────────────────
const standingsByTournament = {};
standings.forEach(s => {
  if (!standingsByTournament[s.tournament_id]) standingsByTournament[s.tournament_id] = [];
  standingsByTournament[s.tournament_id].push(s);
});

// ── world_cup.csv keyed by year ──────────────────────────────────────────────
const wcByYear = {};
wcSummary.forEach(r => { wcByYear[r.Year] = r; });

// ── Build tournament objects ─────────────────────────────────────────────────
function buildTournamentObj(t) {
  const tid = t.tournament_id;
  const year = parseInt(t.year);
  const tGoals = goalsByTournament[tid] || [];
  const tMatchIds = tournamentMatchIds[tid] || new Set();
  const matchCount = tMatchIds.size;
  const goalCount = tGoals.filter(g => g.own_goal !== 'TRUE').length; // non-own-goals for total? keep all
  const totalGoals = tGoals.length;

  // Groups from standings
  const tStandings = standingsByTournament[tid] || [];
  const groups = {};
  tStandings.forEach(s => {
    const grp = s.group_name;
    if (!grp) return;
    if (!groups[grp]) groups[grp] = [];
    const existing = groups[grp].find(x => x.team === s.team_name);
    if (!existing) groups[grp].push({ team: s.team_name, pos: parseInt(s.position) || 99 });
  });
  const groupsOut = {};
  Object.keys(groups).sort().forEach(grp => {
    groupsOut[grp] = groups[grp].sort((a, b) => a.pos - b.pos).map(x => x.team);
  });

  // Winner and runner-up from kaggle or world_cup.csv
  const wc = wcByYear[String(year)];
  let winner = null, runnerUp = null, topScorer = null, attendance = null;
  if (wc) {
    winner = wc.Champion || null;
    runnerUp = wc['Runner-Up'] || null;
    const ts = wc.TopScorrer || '';
    const tsMatch = ts.match(/^(.+?)\s*-\s*(\d+)/);
    if (tsMatch) topScorer = { name: tsMatch[1].trim(), goals: parseInt(tsMatch[2]) };
    attendance = wc.Attendance ? parseInt(wc.Attendance.replace(/,/g, '')) : null;
  }

  // For women's tournaments, derive winner from final match
  if (t.women === 'TRUE' || !wc) {
    // Find the final match
    const tMatches = matches.filter(m => m.tournament_id === tid);
    const finalMatch = tMatches.find(m => m.stage_name === 'final');
    if (finalMatch) {
      const homeScore = parseInt(finalMatch.home_team_score);
      const awayScore = parseInt(finalMatch.away_team_score);
      if (homeScore > awayScore) {
        winner = finalMatch.home_team_name;
        runnerUp = finalMatch.away_team_name;
      } else if (awayScore > homeScore) {
        winner = finalMatch.away_team_name;
        runnerUp = finalMatch.home_team_name;
      } else {
        // check penalty
        const homePen = parseInt(finalMatch.home_team_score_penalties) || 0;
        const awayPen = parseInt(finalMatch.away_team_score_penalties) || 0;
        if (homePen > awayPen) {
          winner = finalMatch.home_team_name;
          runnerUp = finalMatch.away_team_name;
        } else {
          winner = finalMatch.away_team_name;
          runnerUp = finalMatch.home_team_name;
        }
      }
    }
  }

  return {
    tournament_id: tid,
    year,
    name: t.tournament_name,
    host: t.host_country,
    winner,
    runnerUp,
    teams: parseInt(t.count_teams) || null,
    matches: matchCount,
    goals: totalGoals,
    attendance,
    topScorer,
    groups: groupsOut
  };
}

// ── All-time top scorers ─────────────────────────────────────────────────────
function buildTopScorers(goalsList, tournamentSet, limit = 50) {
  // tournamentSet: Set of tournament_ids for the gender
  const playerGoals = {};

  goalsList.forEach(g => {
    if (!tournamentSet.has(g.tournament_id)) return;
    const pid = g.player_id;
    if (!pid) return;
    if (!playerGoals[pid]) {
      playerGoals[pid] = {
        player_id: pid,
        family: g.family_name,
        given: g.given_name,
        name: `${g.given_name} ${g.family_name}`.trim(),
        goals: 0,
        nonPenGoals: 0,
        ownGoals: 0,
        penGoals: 0,
        tournamentSet: new Set()
      };
    }
    const p = playerGoals[pid];
    const isOwn = g.own_goal === 'TRUE';
    const isPen = g.penalty === 'TRUE';

    if (isOwn) {
      p.ownGoals++;
      // own goals count for the OPPONENT, not the player
    } else {
      p.goals++;
      if (isPen) p.penGoals++;
      else p.nonPenGoals++;
    }
    // get year from tournament
    const tourn = tournaments.find(t => t.tournament_id === g.tournament_id);
    if (tourn) p.tournamentSet.add(parseInt(tourn.year));
  });

  return Object.values(playerGoals)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, limit)
    .map(p => ({
      player_id: p.player_id,
      name: p.name,
      family: p.family,
      given: p.given,
      goals: p.goals,
      nonPenGoals: p.nonPenGoals,
      ownGoals: p.ownGoals,
      penGoals: p.penGoals,
      tournaments: Array.from(p.tournamentSet).sort()
    }));
}

// ── Build history-v2.json ────────────────────────────────────────────────────
console.log('\nBuilding history-v2.json...');

const menTournaments = tournaments.filter(t => t.men === 'TRUE');
const womenTournaments = tournaments.filter(t => t.women === 'TRUE');
const menTids = new Set(menTournaments.map(t => t.tournament_id));
const womenTids = new Set(womenTournaments.map(t => t.tournament_id));

const menTournObjs = menTournaments
  .map(buildTournamentObj)
  .sort((a, b) => a.year - b.year);
const womenTournObjs = womenTournaments
  .map(buildTournamentObj)
  .sort((a, b) => a.year - b.year);

// All-time wins
function buildAllTimeWins(tournObjs) {
  const wins = {};
  tournObjs.forEach(t => {
    if (t.winner) wins[t.winner] = (wins[t.winner] || 0) + 1;
  });
  // sort by wins desc
  return Object.fromEntries(
    Object.entries(wins).sort((a, b) => b[1] - a[1])
  );
}

const menTopScorers = buildTopScorers(goals, menTids);
const womenTopScorers = buildTopScorers(goals, womenTids);

const menGoals = goals.filter(g => menTids.has(g.tournament_id));
const womenGoals = goals.filter(g => womenTids.has(g.tournament_id));
const menMatches = matches.filter(m => menTids.has(m.tournament_id));
const womenMatches = matches.filter(m => womenTids.has(m.tournament_id));

const historyV2 = {
  generated: new Date().toISOString(),
  men: {
    tournaments: menTournObjs,
    allTimeTopScorers: menTopScorers,
    allTimeWins: buildAllTimeWins(menTournObjs)
  },
  women: {
    tournaments: womenTournObjs,
    allTimeTopScorers: womenTopScorers,
    allTimeWins: buildAllTimeWins(womenTournObjs)
  }
};

writeFileSync(join(DATA_OUT, 'history-v2.json'), JSON.stringify(historyV2, null, 2));
console.log(`  history-v2.json written: ${menTournObjs.length} men's + ${womenTournObjs.length} women's tournaments`);

// ── Build rankings.json ──────────────────────────────────────────────────────
console.log('\nBuilding rankings.json...');

const rankingsOut = {
  generated: new Date().toISOString(),
  date: '2026-06-08',
  men: rankings.map(r => ({
    rank: parseInt(r.rank),
    prev_rank: parseInt(r.previous_rank) || null,
    team: r.team,
    code: r.team_code,
    confederation: r.association,
    points: parseFloat(r.points)
  })).sort((a, b) => a.rank - b.rank)
};

writeFileSync(join(DATA_OUT, 'rankings.json'), JSON.stringify(rankingsOut, null, 2));
console.log(`  rankings.json written: ${rankingsOut.men.length} teams`);

// ── Build players.json ───────────────────────────────────────────────────────
console.log('\nBuilding players.json...');

const playersOut = {
  generated: new Date().toISOString(),
  men: {
    topScorers: menTopScorers,
    totalGoals: menGoals.filter(g => g.own_goal !== 'TRUE').length,
    totalMatches: menMatches.length
  },
  women: {
    topScorers: womenTopScorers,
    totalGoals: womenGoals.filter(g => g.own_goal !== 'TRUE').length,
    totalMatches: womenMatches.length
  }
};

writeFileSync(join(DATA_OUT, 'players.json'), JSON.stringify(playersOut, null, 2));
console.log(`  players.json written`);
console.log(`  Men goals: ${playersOut.men.totalGoals}, matches: ${playersOut.men.totalMatches}`);
console.log(`  Women goals: ${playersOut.women.totalGoals}, matches: ${playersOut.women.totalMatches}`);

// ── Build matches-enriched.json ──────────────────────────────────────────────
console.log('\nBuilding matches-enriched.json...');

const enrichedMatches = {};
kaggleMatches.forEach(m => {
  const home = m.home_team;
  const away = m.away_team;
  const date = m.Date;
  const year = parseInt(m.Year);
  if (!date || !home || !away) return;

  // parse scores
  const homeScore = m.home_score !== '' ? parseInt(m.home_score) : null;
  const awayScore = m.away_score !== '' ? parseInt(m.away_score) : null;
  const homeXg = m.home_xg !== '' ? parseFloat(m.home_xg) : null;
  const awayXg = m.away_xg !== '' ? parseFloat(m.away_xg) : null;
  const homePen = m.home_penalty !== '' ? parseInt(m.home_penalty) : null;
  const awayPen = m.away_penalty !== '' ? parseInt(m.away_penalty) : null;
  const attendance = m.Attendance !== '' ? parseInt(m.Attendance) : null;

  // venue: strip city part after comma
  const venue = m.Venue ? m.Venue.split(',')[0].trim() : null;

  const key = `${date}-${home}-${away}`.replace(/\s+/g, '-');
  enrichedMatches[key] = {
    year,
    home,
    away,
    homeScore,
    awayScore,
    aet: !!(homePen !== null || awayPen !== null),
    homePenalty: homePen,
    awayPenalty: awayPen,
    homeXg,
    awayXg,
    round: m.Round || null,
    venue,
    attendance
  };
});

const matchesEnriched = { matches: enrichedMatches };
writeFileSync(join(DATA_OUT, 'matches-enriched.json'), JSON.stringify(matchesEnriched));
console.log(`  matches-enriched.json written: ${Object.keys(enrichedMatches).length} matches`);

// ── Summary ──────────────────────────────────────────────────────────────────
const { statSync } = await import('fs');
function size(f) {
  const bytes = statSync(join(DATA_OUT, f)).size;
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(2)} MB`
    : `${(bytes / 1024).toFixed(1)} KB`;
}

console.log('\n── Output file sizes ────────────────────────────────');
['history-v2.json', 'rankings.json', 'players.json', 'matches-enriched.json'].forEach(f => {
  console.log(`  ${f}: ${size(f)}`);
});
console.log('Done!');
