# WC2026 Tracker — Feature Restoration PRD

## Original problem statement
User reported that new features disappeared from preview/live after branch overwrite and asked to restore everything to production on branch `conflict_190626_0326`.

Requested missing features:
- Compare page
- Theme switcher
- Favorites system
- 3D UI feature set
- Admin/live results flow

## Architecture decisions
- Keep current branch structure (root `src`, root `api`, Vite root app).
- Restore lost feature layer from earlier known-good commit snapshot into current branch.
- Re-apply production API hardening for Redis/SportsAPI handlers.
- Bump service worker cache key to force clients onto latest restored bundle.

## What has been implemented
- Restored feature files and wiring:
  - `src/pages/Compare.jsx`
  - `src/components/{ThemePicker,FavoriteButton,MatchDayToday,MyTeams,Trophy3D,Tilt3D,CountUp,RadarChart,ShareBracketModal,Confetti}.jsx`
  - `src/lib/{theme,favorites,motion,bracketShare}.js/.jsx`
  - `src/styles/{themes,features,motion,trophy3d,favorites}.css`
  - Trophy assets in `public/trophy.jpeg` and `public/trophy.png`
- Restored route/header integration in app shell:
  - Compare route in `src/App.jsx`
  - ThemePicker in header
  - Home page includes MatchDayToday + MyTeams + Trophy3D
  - Predictor page includes ShareBracketModal
- Reapplied production API resilience:
  - `api/results.js` robust JSON body handling and explicit Redis config errors
  - `api/stats.js` GET/POST handling with method guard + body parsing
  - Added `api/health.js` for env/connectivity diagnostics
- Cache invalidation fix:
  - `public/sw.js` cache version bumped to `wc2026-v4-livefix`

## Validation summary
- Local production build succeeds.
- Restored feature routes/components confirmed in source and build output.
- Local API checks with provided keys succeed:
  - `/api/health` returns `ok: true`
  - `/api/stats?action=usage` returns valid payload
  - `/api/results` POST/GET round-trip persists in Redis
- External preview URL still shows one deployment-level mismatch:
  - `/api/health` returns 404 while `/api/stats` and `/api/results` work.

## Prioritized backlog
### P0
- Deploy this restored branch snapshot to the exact Vercel project serving `wc2026-nine-sepia.vercel.app`.
- Verify `/api/health` is included in deployment artifact and publicly routable.

### P1
- Add a lightweight in-app diagnostics panel (health + API status) for faster incident checks.

### P2
- Add release guard checks (bundle hash + feature route smoke tests) before live promotion.

## Next tasks
1. Push this restored branch snapshot to GitHub from the workspace.
2. Redeploy same branch in Vercel and verify UI + APIs.
3. Re-run endpoint regression on deployed URL.

## Routing incident follow-up (latest)
- User reported tab/content misalignment across routes (`/schedule`, `/groups`, `/bracket`, `/predictor`, `/compare`, `/stats`) in both preview and live.
- Root cause: stale/deployed artifact mismatch and service-worker-cached lazy chunks causing runtime route-to-component drift on the public domain.
- Implemented hardening:
  - Removed route-transition wrapper (`AnimatePresence`/`PageWrap`) from `src/App.jsx` to simplify and enforce strict route rendering.
  - Added hash-query guards in `src/pages/Compare.jsx` and `src/pages/Predictor.jsx` to avoid cross-route query side effects.
  - Updated service-worker strategy in `public/sw.js`:
    - cache version bump to `wc2026-v5-route-fix`
    - network-first for non-index lazy JS chunks in `/assets/`.
- Validation:
  - Local built artifact route matrix passes with correct mapping:
    - `/#/schedule` => Schedule
    - `/#/groups` => Groups
    - `/#/bracket` => Bracket
    - `/#/predictor` => Predictor
    - `/#/compare` => Compare
    - `/#/stats` => Stats
  - Public URL still shows old/misaligned runtime until fresh deploy + SW update activation on client.

## Latest fixes (Top Scorers + Compare UI)
- Top Scorers data correction:
  - Updated `api/stats.js` `top-scorers` action to filter finished matches to the tournament date window derived from `src/data/matches.js`.
  - This prevents historical/out-of-scope scorer pollution (e.g., prior tournaments) and keeps the feed aligned to WC2026 tracker scope.
- Compare Visual Snapshot overlap fix:
  - Updated `src/components/RadarChart.jsx` sizing/layout:
    - chart canvas increased (`SIZE 432`, `RADIUS 126`)
    - axis labels pushed outward and balanced by axis
    - legend split into left/right anchors with team-name truncation safeguard
  - Updated `src/styles/features.css` compare radar card styles:
    - increased internal spacing
    - responsive `radar-svg` width control
    - overflow-safe card container
- Validation:
  - Build succeeds after changes.
  - Screenshot verification confirms no overlapping radar text at desktop and tablet widths.

## Latest fixes (Home goals + Live summary + Player profile navigation)
- Home goals metric corrected:
  - `src/pages/Home.jsx` now computes **Goals Scored** from both `finished` and `live` matches using current scorelines.
- Live summary on Home and match context:
  - Added live summary cards under Home Live section with event-based goals/cards snippets from TheStatsAPI timeline.
  - Added manual refresh button per live summary card (user chose manual refresh mode).
  - Added “Open Live Summary” link on live `MatchCard` footer that opens match detail in a **new tab**.
- Player profile route implemented:
  - New route: `/player/:team/:player`
  - New page: `src/pages/PlayerProfile.jsx`
  - Updated player links in `LiveMatchPanel` and Home summary to open player profile in **new tab**.
  - Player clicks now go to player profile (not country/squad profile).
- Data behavior:
  - `useMatchEvents` now supports configurable/no auto polling (`intervalMs`), enabling manual refresh-only behavior where required.
  - `useMatchStats` now supports configurable/no auto polling (`intervalMs`) and explicit `enabled` flag.

## Latest enhancement (manual live summary metrics)
- Added requested metrics into Home live summary card, fetched only on manual trigger:
  - Corners
  - Goal Kicks
  - Substitutions
  - Yellow Cards
  - Red Cards
  - Half Time
  - Full Time / Live score
- Manual mode implementation:
  - Both timeline events and stats queries are `enabled: false` by default for Home live summary.
  - Clicking Refresh triggers both fetches via `Promise.all([refetchEvents(), refetchStats()])`.

## UI refinement (compact live metrics)
- Redesigned live-summary metrics into compact responsive cards for better readability:
  - desktop: auto-fit multi-column mini cards
  - tablet: 2 columns
  - mobile: 1 column fallback
- Added clear hierarchy (label + bold value) and stronger spacing/contrast in each metric tile.

### Files touched for this scope
- `src/pages/Home.jsx`
- `src/components/MatchCard.jsx`
- `src/components/LiveMatchPanel.jsx`
- `src/pages/PlayerProfile.jsx`
- `src/lib/useStats.js`
- `src/App.jsx`
- `src/styles/features.css`