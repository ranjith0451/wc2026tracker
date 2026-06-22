# Graph Report - src  (2026-06-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 308 nodes · 506 edges · 18 communities (15 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7da1ab1d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]

## God Nodes (most connected - your core abstractions)
1. `FLAG_URL()` - 12 edges
2. `MATCHES` - 11 edges
3. `TeamFlag()` - 10 edges
4. `resolveMatchTeams()` - 10 edges
5. `MatchCard()` - 9 edges
6. `LiveMatchPanel()` - 8 edges
7. `GROUPS` - 8 edges
8. `getMatchStatus()` - 8 edges
9. `getThirdPlaceAssignments()` - 7 edges
10. `formatISTTime()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `useResults()`  [EXTRACTED]
  App.jsx → lib/useResults.js
- `TeamSide()` --calls--> `FLAG_URL()`  [EXTRACTED]
  components/MatchCard.jsx → data/teams.js
- `MatchCard()` --calls--> `resolveMatchTeams()`  [EXTRACTED]
  components/MatchCard.jsx → lib/bracket.js
- `MatchResultForm()` --calls--> `formatISTFull()`  [EXTRACTED]
  components/MatchResultForm.jsx → lib/time.js
- `PlayerModal()` --calls--> `FLAG_URL()`  [EXTRACTED]
  components/PlayerModal.jsx → data/teams.js

## Import Cycles
- None detected.

## Communities (18 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (21): HeatmapWidget(), LiveMatchPanel(), RatingsTab(), RealShotmapTab(), PlayerRatingChip(), PlayerRatingRow(), ShotmapWidget(), DONE_STATUSES (+13 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (23): KNOCKOUT_STAGES, MatchResultForm(), AVATAR_GRADS, careerYears(), getInitials(), PlayerModal(), POS_META, wcAppearances() (+15 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (21): MATCHES, assignSlots(), getThirdPlaceAssignments(), MATCH_BY_ID, placeholderLabel(), resolveMatchTeams(), resolveSide(), THIRD_PLACE_SLOTS (+13 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (15): Admin, AllTimePlayers, Bracket, Groups, History, MatchDetail, NAV_ITEMS, Predictor (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (19): MatchCard(), TeamSide(), FLAG_URL(), calculateAccuracy(), clearPrediction(), loadPredictions(), resolvePredictedMatchTeams(), resolvePredictedSide() (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (26): ApiEvent, ApiFixture, ApiFixtureStatus, ApiLineupPlayer, ApiLineupSide, ApiScore, ApiStatEntry, ApiStatSide (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.21
Nodes (8): getVenue(), VENUES, POS_LABEL, POS_ORDER, StadiumCard(), useWeather(), WMO_ICON, WMO_LABELS

### Community 7 - "Community 7"
Cohesion: 0.22
Nodes (7): App(), loadOverrides(), mergeResults(), saveOverrides(), useSchedule(), useStatsMatchIdMap(), queryClient

### Community 9 - "Community 9"
Cohesion: 0.25
Nodes (4): FLAG_MAP, History(), useTournamentHistory(), WINNER_FLAG

### Community 10 - "Community 10"
Cohesion: 0.25
Nodes (5): HOST_FLAG, TEAM_FLAG, useWomenHistory(), WINS_LEADERBOARD, Women()

### Community 11 - "Community 11"
Cohesion: 0.29
Nodes (4): computePlayerRatings(), DEDUCTIONS, normalize(), WEIGHTS

### Community 12 - "Community 12"
Cohesion: 0.25
Nodes (4): BIGGEST_WINS, HIGH_SCORING_GAMES, NOTABLE_RECORDS, TOURNAMENT_STATS

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (4): CONFS, FALLBACK_RANKINGS, FLAGS, WC2026_TEAMS

### Community 14 - "Community 14"
Cohesion: 0.40
Nodes (4): AllTimePlayers(), MEDAL, PLAYER_COUNTRY, usePlayers()

## Knowledge Gaps
- **83 isolated node(s):** `Schedule`, `Groups`, `Bracket`, `Squads`, `SquadDetail` (+78 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MATCHES` connect `Community 2` to `Community 0`, `Community 4`, `Community 6`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `FLAG_URL()` connect `Community 4` to `Community 1`, `Community 6`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `TeamFlag()` connect `Community 1` to `Community 0`, `Community 2`, `Community 4`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `Schedule`, `Groups`, `Bracket` to the rest of the system?**
  _83 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06570048309178744 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08906882591093117 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.0990990990990991 - nodes in this community are weakly interconnected._