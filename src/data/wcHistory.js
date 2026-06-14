// World Cup Finals 1930–2022
// Note: West Germany entries are normalised to "Germany" for current team matching
// 1950 had no formal final (round-robin), but Uruguay vs Brazil was the deciding game

export const WC_FINALS = [
  { year: 1930, winner: "Uruguay",       runnerUp: "Argentina" },
  { year: 1934, winner: "Italy",         runnerUp: "Czechoslovakia" },
  { year: 1938, winner: "Italy",         runnerUp: "Hungary" },
  { year: 1950, winner: "Uruguay",       runnerUp: "Brazil" },
  { year: 1954, winner: "Germany",       runnerUp: "Hungary" },
  { year: 1958, winner: "Brazil",        runnerUp: "Sweden" },
  { year: 1962, winner: "Brazil",        runnerUp: "Czechoslovakia" },
  { year: 1966, winner: "England",       runnerUp: "Germany" },
  { year: 1970, winner: "Brazil",        runnerUp: "Italy" },
  { year: 1974, winner: "Germany",       runnerUp: "Netherlands" },
  { year: 1978, winner: "Argentina",     runnerUp: "Netherlands" },
  { year: 1982, winner: "Italy",         runnerUp: "Germany" },
  { year: 1986, winner: "Argentina",     runnerUp: "Germany" },
  { year: 1990, winner: "Germany",       runnerUp: "Argentina" },
  { year: 1994, winner: "Brazil",        runnerUp: "Italy" },
  { year: 1998, winner: "France",        runnerUp: "Brazil" },
  { year: 2002, winner: "Brazil",        runnerUp: "Germany" },
  { year: 2006, winner: "Italy",         runnerUp: "France" },
  { year: 2010, winner: "Spain",         runnerUp: "Netherlands" },
  { year: 2014, winner: "Germany",       runnerUp: "Argentina" },
  { year: 2018, winner: "France",        runnerUp: "Croatia" },
  { year: 2022, winner: "Argentina",     runnerUp: "France" },
];

// Also store original names for display
export const WC_FINALS_DISPLAY = [
  { year: 1930, winner: "Uruguay",       runnerUp: "Argentina",        winnerOrig: "Uruguay",       runnerUpOrig: "Argentina" },
  { year: 1934, winner: "Italy",         runnerUp: "Czechoslovakia",   winnerOrig: "Italy",         runnerUpOrig: "Czechoslovakia" },
  { year: 1938, winner: "Italy",         runnerUp: "Hungary",          winnerOrig: "Italy",         runnerUpOrig: "Hungary" },
  { year: 1950, winner: "Uruguay",       runnerUp: "Brazil",           winnerOrig: "Uruguay",       runnerUpOrig: "Brazil",        note: "Deciding round-robin match" },
  { year: 1954, winner: "Germany",       runnerUp: "Hungary",          winnerOrig: "West Germany",  runnerUpOrig: "Hungary" },
  { year: 1958, winner: "Brazil",        runnerUp: "Sweden",           winnerOrig: "Brazil",        runnerUpOrig: "Sweden" },
  { year: 1962, winner: "Brazil",        runnerUp: "Czechoslovakia",   winnerOrig: "Brazil",        runnerUpOrig: "Czechoslovakia" },
  { year: 1966, winner: "England",       runnerUp: "Germany",          winnerOrig: "England",       runnerUpOrig: "West Germany" },
  { year: 1970, winner: "Brazil",        runnerUp: "Italy",            winnerOrig: "Brazil",        runnerUpOrig: "Italy" },
  { year: 1974, winner: "Germany",       runnerUp: "Netherlands",      winnerOrig: "West Germany",  runnerUpOrig: "Netherlands" },
  { year: 1978, winner: "Argentina",     runnerUp: "Netherlands",      winnerOrig: "Argentina",     runnerUpOrig: "Netherlands" },
  { year: 1982, winner: "Italy",         runnerUp: "Germany",          winnerOrig: "Italy",         runnerUpOrig: "West Germany" },
  { year: 1986, winner: "Argentina",     runnerUp: "Germany",          winnerOrig: "Argentina",     runnerUpOrig: "West Germany" },
  { year: 1990, winner: "Germany",       runnerUp: "Argentina",        winnerOrig: "West Germany",  runnerUpOrig: "Argentina" },
  { year: 1994, winner: "Brazil",        runnerUp: "Italy",            winnerOrig: "Brazil",        runnerUpOrig: "Italy" },
  { year: 1998, winner: "France",        runnerUp: "Brazil",           winnerOrig: "France",        runnerUpOrig: "Brazil" },
  { year: 2002, winner: "Brazil",        runnerUp: "Germany",          winnerOrig: "Brazil",        runnerUpOrig: "Germany" },
  { year: 2006, winner: "Italy",         runnerUp: "France",           winnerOrig: "Italy",         runnerUpOrig: "France" },
  { year: 2010, winner: "Spain",         runnerUp: "Netherlands",      winnerOrig: "Spain",         runnerUpOrig: "Netherlands" },
  { year: 2014, winner: "Germany",       runnerUp: "Argentina",        winnerOrig: "Germany",       runnerUpOrig: "Argentina" },
  { year: 2018, winner: "France",        runnerUp: "Croatia",          winnerOrig: "France",        runnerUpOrig: "Croatia" },
  { year: 2022, winner: "Argentina",     runnerUp: "France",           winnerOrig: "Argentina",     runnerUpOrig: "France" },
];

export function getWCWins(teamName) {
  return WC_FINALS.filter(f => f.winner === teamName).map(f => f.year);
}

export function getWCRunnerUps(teamName) {
  return WC_FINALS.filter(f => f.runnerUp === teamName).map(f => f.year);
}
