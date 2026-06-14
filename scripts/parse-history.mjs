#!/usr/bin/env node
// Parse openfootball/worldcup Football.TXT → public/data/history.json
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATASET = join(__dirname, '../.dataset-worldcup');
const OUT = join(__dirname, '../public/data/history.json');

const YEARS = [
  { year: 1930, dir: '1930--uruguay', host: 'Uruguay' },
  { year: 1934, dir: '1934--italy', host: 'Italy' },
  { year: 1938, dir: '1938--france', host: 'France' },
  { year: 1950, dir: '1950--brazil', host: 'Brazil' },
  { year: 1954, dir: '1954--switzerland', host: 'Switzerland' },
  { year: 1958, dir: '1958--sweden', host: 'Sweden' },
  { year: 1962, dir: '1962--chile', host: 'Chile' },
  { year: 1966, dir: '1966--england', host: 'England' },
  { year: 1970, dir: '1970--mexico', host: 'Mexico' },
  { year: 1974, dir: '1974--west-germany', host: 'West Germany' },
  { year: 1978, dir: '1978--argentina', host: 'Argentina' },
  { year: 1982, dir: '1982--spain', host: 'Spain' },
  { year: 1986, dir: '1986--mexico', host: 'Mexico' },
  { year: 1990, dir: '1990--italy', host: 'Italy' },
  { year: 1994, dir: '1994--usa', host: 'USA' },
  { year: 1998, dir: '1998--france', host: 'France' },
  { year: 2002, dir: '2002--south-korea-n-japan', host: 'South Korea & Japan' },
  { year: 2006, dir: '2006--germany', host: 'Germany' },
  { year: 2010, dir: '2010--south-africa', host: 'South Africa' },
  { year: 2014, dir: '2014--brazil', host: 'Brazil' },
  { year: 2018, dir: '2018--russia', host: 'Russia' },
  { year: 2022, dir: '2022--qatar', host: 'Qatar' },
];

// Date-like patterns to reject as team names
const DATE_RE = /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i;

function parseMatchLine(trimmed) {
  let line = trimmed;
  // Strip date prefix (may include weekday + month + day), then time
  line = line.replace(/^(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+)?(?:\d{1,2}\s+)?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{0,2}\s*/i, '');
  // Strip time prefix HH:MM optionally followed by UTC offset
  line = line.replace(/^\d{1,2}:\d{2}\s+(?:UTC[+-]\d+\s+)?/, '');

  if (!line.includes('@')) return null;

  let home, away;

  // Format A: "Team1 v Team2   X-Y @ Venue" (2014-style)
  const mV = line.match(/^(.+?)\s+v\s+(.+?)\s{2,}(\d+)-(\d+)(.*?)\s+@\s+.+$/);
  if (mV) {
    home = mV[1].trim();
    away = mV[2].trim();
    const homeScore2 = parseInt(mV[3]), awayScore2 = parseInt(mV[4]);
    const full2 = mV[5] + line;
    const aet2 = /a\.e\.t|aet/i.test(full2);
    const pen2 = /pen\./i.test(line);
    let penHome2 = null, penAway2 = null;
    const penM2 = line.match(/,\s*(\d+)-(\d+)\s*pen/i);
    if (penM2) { penHome2 = parseInt(penM2[1]); penAway2 = parseInt(penM2[2]); }
    if (home.length < 2 || home.length > 40 || away.length < 2 || away.length > 40) return null;
    if (DATE_RE.test(home) || DATE_RE.test(away)) return null;
    return { home, away, homeScore: homeScore2, awayScore: awayScore2,
      aet: aet2 || undefined, pen: pen2 || undefined,
      penHome: penHome2 ?? undefined, penAway: penAway2 ?? undefined };
  }

  // Format B: "Team1   X-Y (HT)   Team2   @ Venue"
  const m = line.match(/^(.+?)\s{2,}(\d+)-(\d+)(.*?)\s{2,}(.+?)\s+@\s+.+$/);
  if (!m) return null;

  home = m[1].trim();
  away = m[5].trim();

  // Reject date-like team names
  if (DATE_RE.test(home) || DATE_RE.test(away)) return null;
  // Reject very long "team" names (likely parsing error)
  if (home.length > 40 || away.length > 40) return null;
  // Team name must start with letter
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ]/.test(home) || !/^[A-Za-zÀ-ÖØ-öø-ÿ]/.test(away)) return null;

  const homeScore = parseInt(m[2]);
  const awayScore = parseInt(m[3]);
  const extra = m[4] + ' ' + m[5];
  const aet = /a\.e\.t|aet/i.test(extra + line);
  const pen = /pen\./i.test(line);

  let penHome = null, penAway = null;
  const penM = line.match(/,\s*(\d+)-(\d+)\s*pen/i);
  if (penM) { penHome = parseInt(penM[1]); penAway = parseInt(penM[2]); }

  return { home, away, homeScore, awayScore,
    aet: aet || undefined, pen: pen || undefined,
    penHome: penHome ?? undefined, penAway: penAway ?? undefined };
}

function parseScorers(raw, homeTeam, awayTeam) {
  if (!raw) return [];
  const inner = raw.trim().replace(/^\(+/, '').replace(/\)+$/, '');
  const [homePart = '', awayPart = ''] = inner.split(';');
  const result = [];
  function extract(part, team) {
    const re = /([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s\-\.]*?)\s+(\d+(?:\+\d+)?)'([^A-Za-z]*)/g;
    let mm;
    while ((mm = re.exec(part)) !== null) {
      const player = mm[1].trim();
      if (player.length < 2) continue;
      const minute = parseInt(mm[2]);
      const flags = mm[3] || '';
      result.push({
        team, player, minute,
        ...((/pen/i.test(flags)) ? { penalty: true } : {}),
        ...((/o\.g\.|og\b|own goal/i.test(flags)) ? { ownGoal: true } : {}),
      });
    }
  }
  extract(homePart, homeTeam);
  extract(awayPart, awayTeam);
  return result;
}

function parseFile(filePath) {
  if (!existsSync(filePath)) return [];
  const text = readFileSync(filePath, 'utf8');
  const lines = text.split('\n');
  const matches = [];
  let currentGroup = null;
  let isFinalSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('=')) continue;

    // Group section header
    const grpM = trimmed.match(/(?:▪|►|•|\*|-)\s*Group\s+([A-Z0-9]+)/i);
    if (grpM) { currentGroup = grpM[1]; isFinalSection = false; continue; }

    // Round/knockout section
    if (/(?:▪|►|•|\*|-)\s*(Round of|Quarter|Semi|Third|Final|Match for)/i.test(trimmed)) {
      currentGroup = null;
      isFinalSection = /Final/i.test(trimmed) && !/Semi|Third/i.test(trimmed);
      continue;
    }

    // Must have @ to be a match
    if (!trimmed.includes('@')) continue;

    const matchData = parseMatchLine(trimmed);
    if (!matchData) continue;

    // Collect multi-line scorer block
    let scorerRaw = '';
    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j].trim();
      if (next.startsWith('(')) {
        scorerRaw += ' ' + next;
        j++;
        if (!next.includes(')') || next.split('(').length > next.split(')').length) {
          // unclosed paren, keep reading
          while (j < lines.length) {
            const cont = lines[j].trim();
            scorerRaw += ' ' + cont;
            j++;
            if (cont.includes(')')) break;
          }
        }
      } else break;
    }
    // advance i past scorer lines we consumed
    if (j > i + 1) i = j - 1;

    const scorers = parseScorers(scorerRaw.trim(), matchData.home, matchData.away);
    matches.push({
      ...matchData,
      group: currentGroup,
      isFinal: isFinalSection || undefined,
      scorers: scorers.length ? scorers : undefined,
    });
  }
  return matches;
}

function parseGroupDefs(filePath) {
  if (!existsSync(filePath)) return {};
  const text = readFileSync(filePath, 'utf8');
  const groups = {};
  for (const line of text.split('\n')) {
    const m = line.trim().match(/^Group\s+([A-Z0-9]+)\s*\|\s*(.+)$/i);
    if (m) {
      groups[m[1]] = m[2].trim().split(/\s{2,}/).map(t => t.trim()).filter(Boolean);
    }
  }
  return groups;
}

function findWinner(allMatches) {
  // Try isFinal flag first
  const finalMatches = allMatches.filter(m => m.isFinal);
  const target = finalMatches.length ? finalMatches[finalMatches.length - 1]
    : allMatches.filter(m => !m.group).pop();
  if (!target) return { winner: null, runnerUp: null, third: null };

  let winner, runnerUp;
  if (target.pen && target.penHome != null && target.penAway != null) {
    if (target.penHome > target.penAway) { winner = target.home; runnerUp = target.away; }
    else { winner = target.away; runnerUp = target.home; }
  } else {
    if (target.homeScore > target.awayScore) { winner = target.home; runnerUp = target.away; }
    else if (target.awayScore > target.homeScore) { winner = target.away; runnerUp = target.home; }
    else { winner = null; runnerUp = null; }
  }

  // Third place: look for explicit "Third" section or second-to-last knockout
  const knockouts = allMatches.filter(m => !m.group);
  let third = null;
  if (knockouts.length >= 2) {
    const tp = knockouts[knockouts.length - 2];
    if (tp !== target) {
      third = (tp.homeScore > tp.awayScore || (tp.pen && (tp.penHome ?? 0) > (tp.penAway ?? 0)))
        ? tp.home : tp.away;
    }
  }
  return { winner, runnerUp, third };
}

console.log('Parsing historical World Cup data...');
const tournaments = [];

for (const { year, dir, host } of YEARS) {
  const cupFile = join(DATASET, dir, 'cup.txt');
  const finalsFile = join(DATASET, dir, 'cup_finals.txt');

  const groups = parseGroupDefs(cupFile);
  const groupMatches = parseFile(cupFile);
  const knockoutMatches = parseFile(finalsFile);
  const allMatches = [...groupMatches, ...knockoutMatches];

  const { winner, runnerUp, third } = findWinner(allMatches);
  const goals = allMatches.reduce((s, m) => s + (m.homeScore || 0) + (m.awayScore || 0), 0);

  console.log(`  ${year}: ${allMatches.length} matches, ${goals} goals, winner: ${winner || '?'}`);

  tournaments.push({
    year, host, winner, runnerUp, third,
    groups,
    matches: allMatches.map(({ isFinal, penHome, penAway, ...m }) => {
      const out = { home: m.home, away: m.away, homeScore: m.homeScore, awayScore: m.awayScore };
      if (m.group) out.group = m.group;
      if (m.aet) out.aet = true;
      if (m.pen) out.pen = true;
      if (penHome != null) out.penHome = penHome;
      if (penAway != null) out.penAway = penAway;
      if (m.scorers) out.scorers = m.scorers;
      return out;
    }),
  });
}

// All-time top scorers
const scorerMap = {};
for (const t of tournaments) {
  for (const m of t.matches) {
    for (const s of m.scorers || []) {
      if (s.ownGoal) continue;
      if (!scorerMap[s.player]) scorerMap[s.player] = { player: s.player, goals: 0, years: [] };
      scorerMap[s.player].goals++;
      if (!scorerMap[s.player].years.includes(t.year)) scorerMap[s.player].years.push(t.year);
    }
  }
}
const topScorers = Object.values(scorerMap).sort((a, b) => b.goals - a.goals).slice(0, 100);

const summaries = tournaments.map(t => ({
  year: t.year, host: t.host,
  teams: (() => { const s = new Set(); t.matches.forEach(m => { s.add(m.home); s.add(m.away); }); return s.size; })(),
  matches: t.matches.length,
  goals: t.matches.reduce((s, m) => s + (m.homeScore || 0) + (m.awayScore || 0), 0),
  winner: t.winner, runnerUp: t.runnerUp, third: t.third,
}));

writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), tournaments, summaries, topScorers }));
const size = (JSON.stringify({ tournaments, summaries, topScorers }).length / 1024).toFixed(0);
console.log(`\nWrote ${OUT} (${size} KB)`);
console.log(`Top 5: ${topScorers.slice(0,5).map(s=>`${s.player} ${s.goals}`).join(', ')}`);
