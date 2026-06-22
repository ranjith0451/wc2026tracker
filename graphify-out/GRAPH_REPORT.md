# Graph Report - wc2026  (2026-06-22)

## Corpus Check
- 105 files · ~432,994 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 164 nodes · 187 edges · 9 communities (8 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dfc209ef`
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

## God Nodes (most connected - your core abstractions)
1. `🎨 Quick Start — Theme System` - 12 edges
2. `🎨 Theme System Implementation — WC2026` - 10 edges
3. `🎨 WC2026 Theme Color Palettes` - 9 edges
4. `Theme Descriptions` - 6 edges
5. `handler()` - 5 edges
6. `How to Use` - 4 edges
7. `📱 Using the Theme System` - 4 edges
8. `✅ Testing` - 4 edges
9. `PageErrorBoundary` - 4 edges
10. `savePredictions()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `ThemeSwitcher()` --calls--> `useTheme()`  [EXTRACTED]
  src/components/ThemeSwitcher.jsx → src/lib/themeContext.jsx
- `MatchPredCard()` --calls--> `resolvePredictedMatchTeams()`  [EXTRACTED]
  src/pages/Predictor.jsx → src/lib/predictor.js
- `MatchPredCard()` --calls--> `isMatchLive()`  [EXTRACTED]
  src/pages/Predictor.jsx → src/lib/predictor.js
- `TopScorers()` --calls--> `useWC2026TopScorers()`  [EXTRACTED]
  src/pages/TopScorers.jsx → src/lib/useStats.js

## Import Cycles
- None detected.

## Communities (9 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (8): DONE_STATUSES, LIVE_STATUSES, NAME_ALIASES, useSchedule(), useStatsMatchIdMap(), useWC2026TopScorers(), MEDALS, TopScorers()

### Community 1 - "Community 1"
Cohesion: 0.33
Nodes (5): cached(), getRedis(), handler(), matchTTL(), statsFetch()

### Community 2 - "Community 2"
Cohesion: 0.16
Nodes (14): calculateAccuracy(), clearPrediction(), getAccuracyByStage(), isMatchLive(), loadAccuracyHistory(), loadPredictions(), recordMatchResult(), resolvePredictedMatchTeams() (+6 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (15): Admin, AllTimePlayers, Bracket, Groups, History, MatchDetail, NAV_ITEMS, Predictor (+7 more)

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

## Knowledge Gaps
- **65 isolated node(s):** `Where to Find the Theme Switcher`, `1. Toggle Light/Dark Mode`, `2. Change Theme Color`, `3. Your Preference is Saved`, `Available Combinations` (+60 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useSchedule()` connect `Community 0` to `Community 3`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `useStatsMatchIdMap()` connect `Community 0` to `Community 3`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `PageErrorBoundary` connect `Community 8` to `Community 3`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `Where to Find the Theme Switcher`, `1. Toggle Light/Dark Mode`, `2. Change Theme Color` to the rest of the system?**
  _65 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09057971014492754 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._