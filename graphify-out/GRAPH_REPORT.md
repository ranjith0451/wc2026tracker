# Graph Report - wt-9c71cd1a  (2026-07-12)

## Corpus Check
- 97 files · ~125,755 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 669 nodes · 922 edges · 55 communities (47 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4713fece`
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
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 14 edges
2. `FLAG_URL()` - 13 edges
3. `MATCHES` - 12 edges
4. `🎨 Quick Start — Theme System` - 12 edges
5. `TeamFlag()` - 11 edges
6. `resolveMatchTeams()` - 10 edges
7. `getMatchStatus()` - 10 edges
8. `🎨 Theme System Implementation — WC2026` - 10 edges
9. `MatchCard()` - 9 edges
10. `GROUPS` - 9 edges

## Surprising Connections (you probably didn't know these)
- `TeamSide()` --calls--> `FLAG_URL()`  [EXTRACTED]
  src/components/MatchCard.jsx → src/data/teams.js
- `App()` --calls--> `usePlatform()`  [EXTRACTED]
  src/App.jsx → src/lib/usePlatform.js
- `GlassCard()` --calls--> `prefersReducedMotion()`  [EXTRACTED]
  src/components/GlassCard.jsx → src/lib/usePlatform.js
- `LiveMatchPanel()` --calls--> `useMatchEvents()`  [EXTRACTED]
  src/components/LiveMatchPanel.jsx → src/lib/useStats.js
- `LiveMatchPanel()` --calls--> `useMatchStats()`  [EXTRACTED]
  src/components/LiveMatchPanel.jsx → src/lib/useStats.js

## Import Cycles
- None detected.

## Communities (55 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.20
Nodes (7): LiveMatchPanel(), DONE_STATUSES, LIVE_STATUSES, NAME_ALIASES, useLiveStats(), useMatchLineups(), useMatchReferee()

### Community 1 - "Community 1"
Cohesion: 0.31
Nodes (9): cached(), fdFetch(), fetchAllWCMatches(), getRedis(), handler(), mapMatch(), mapStatus(), NAME_ALIASES (+1 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (23): ScorePredictorCard, calculateAccuracy(), clearPrediction(), getAccuracyByStage(), isMatchLive(), loadAccuracyHistory(), loadPredictions(), recordMatchResult() (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (17): Admin, AllTimePlayers, Bracket, Groups, History, Launch, MatchDetail, NAV_ITEMS (+9 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (20): 1. Toggle Light/Dark Mode, 2. Change Theme Color, 3. Your Preference is Saved, Accessibility, Available Combinations, 🟣 CYBER, 🔵 DEFAULT, Desktop Users (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (19): 1️⃣ DEFAULT THEME (Blue), 2️⃣ OCEAN THEME (Cyan/Teal), 3️⃣ SUNSET THEME (Orange/Gold), 4️⃣ FOREST THEME (Green), 5️⃣ CYBER THEME (Purple/Magenta), 📊 Color Contrast Reference, Dark Mode, Dark Mode (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (19): Adding New Themes, Build Status, 🎨 CSS Variables Available, 🚢 Deployment Notes, 🚀 Features, Files Created, For Developers, For Users (+11 more)

### Community 7 - "Community 7"
Cohesion: 0.36
Nodes (6): ThemeSwitcher(), ThemeContext, ThemeProvider(), useTheme(), THEME_LABELS, THEMES

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (34): MatchCard(), TeamSide(), MatchResultForm(), MATCHES, getVenue(), VENUES, assignSlots(), getThirdPlaceAssignments() (+26 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (37): allowScripts, esbuild@0.21.5, dependencies, framer-motion, ioredis, react, react-dom, react-router-dom (+29 more)

### Community 11 - "Community 11"
Cohesion: 0.05
Nodes (32): DATA_OUT, __dirname, enrichedMatches, goals, goalsByTournament, historyV2, kaggleMatches, matches (+24 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (26): ApiEvent, ApiFixture, ApiFixtureStatus, ApiLineupPlayer, ApiLineupSide, ApiScore, ApiStatEntry, ApiStatSide (+18 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (28): KNOCKOUT_STAGES, AVATAR_GRADS, careerYears(), getInitials(), PlayerModal(), POS_META, wcAppearances(), TeamFlag() (+20 more)

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (17): GlassCard(), itemVariants, listVariants, MotionList(), MotionPage(), variants, loadGraph(), nodesByType() (+9 more)

### Community 15 - "Community 15"
Cohesion: 0.09
Nodes (22): applyFdMatch(), body, BY_DATE_ORDER, byPair, counters, DONE, groupTable, istFields() (+14 more)

### Community 16 - "Community 16"
Cohesion: 0.11
Nodes (7): RatingsTab(), RealShotmapTab(), PlayerRatingChip(), PlayerRatingRow(), ShotmapWidget(), usePlayerRatings(), useShotmap()

### Community 17 - "Community 17"
Cohesion: 0.14
Nodes (15): addEdge(), addNode(), adjacency, byType, dataDir, __dirname, edges, graph (+7 more)

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (15): compilerOptions, allowJs, checkJs, esModuleInterop, isolatedModules, jsx, lib, module (+7 more)

### Community 19 - "Community 19"
Cohesion: 0.15
Nodes (12): DATASET, __dirname, OUT, parseFile(), parseMatchLine(), parseScorers(), scorerMap, size (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.15
Nodes (12): 1. What TonyScore does well (source analysis), 2. Adapted structure for WC2026 launch page, 3. Suggested color/type tokens for WC2026 (World Cup-flavored, not a copy of TonyScore's palette), 4. Implementation notes for this repo, 5. Next steps, Closing CTA, Footer, Hero (+4 more)

### Community 21 - "Community 21"
Cohesion: 0.17
Nodes (11): background_color, categories, description, display, icons, name, orientation, screenshots (+3 more)

### Community 22 - "Community 22"
Cohesion: 0.18
Nodes (8): loadOverrides(), mergeResults(), saveOverrides(), useResults(), useSchedule(), useStatsMatchIdMap(), App(), queryClient

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (8): getGroupStandings(), getTeamGoalCounts(), useMatchEvents(), useMatchStats(), GroupStandingsWidget(), Home(), LiveSummaryCard(), MEDALS

### Community 24 - "Community 24"
Cohesion: 0.27
Nodes (5): DashboardMock(), FeatureCard(), Launch(), MotionLink, useTilt()

### Community 26 - "Community 26"
Cohesion: 0.25
Nodes (4): FLAG_MAP, History(), useTournamentHistory(), WINNER_FLAG

### Community 27 - "Community 27"
Cohesion: 0.25
Nodes (5): HOST_FLAG, TEAM_FLAG, useWomenHistory(), WINS_LEADERBOARD, Women()

### Community 28 - "Community 28"
Cohesion: 0.29
Nodes (4): computePlayerRatings(), DEDUCTIONS, normalize(), WEIGHTS

### Community 29 - "Community 29"
Cohesion: 0.25
Nodes (4): BIGGEST_WINS, HIGH_SCORING_GAMES, NOTABLE_RECORDS, TOURNAMENT_STATS

### Community 30 - "Community 30"
Cohesion: 0.29
Nodes (4): CONFS, FALLBACK_RANKINGS, FLAGS, WC2026_TEAMS

### Community 31 - "Community 31"
Cohesion: 0.47
Nodes (4): cached(), COMPETITIONS, getRedis(), handler()

### Community 32 - "Community 32"
Cohesion: 0.47
Nodes (3): cached(), getRedis(), handler()

### Community 33 - "Community 33"
Cohesion: 0.33
Nodes (5): /api/club — football-data.org v4 proxy (`FD_API_KEY`), /api/players — API-Football v3 proxy (`APIFOOTBALL_KEY`), /api/results — KV-backed manual result overrides (pre-existing), /api/stats — TheStatsAPI proxy (`STATS_API_KEY`), API surface (Vercel serverless functions)

### Community 34 - "Community 34"
Cohesion: 0.50
Nodes (3): useTopScorers(), MEDALS, TopScorers()

## Knowledge Gaps
- **284 isolated node(s):** `COMPETITIONS`, `NAME_ALIASES`, `name`, `private`, `version` (+279 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MATCHES` connect `Community 9` to `Community 0`, `Community 24`, `Community 2`, `Community 23`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `GROUPS` connect `Community 13` to `Community 24`, `Community 9`, `Community 2`, `Community 23`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `TeamFlag()` connect `Community 13` to `Community 9`, `Community 2`, `Community 34`, `Community 23`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `COMPETITIONS`, `NAME_ALIASES`, `name` to the rest of the system?**
  _284 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.10160427807486631 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._