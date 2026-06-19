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