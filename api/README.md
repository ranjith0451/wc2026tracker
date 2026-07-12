# API surface (Vercel serverless functions)

All keys live in Vercel env vars; nothing client-side. Responses are cached
through a shared resilient layer (`_lib/cache.js`): warm-instance memory +
Redis (`REDIS_URL`) with `X-Cache: HIT|MISS` headers, 6h stale copies served
whenever the upstream fails, and a 30s cooldown after an upstream failure so
rate-limited windows are never hammered. Consumed by both the web app and the
`wc2026-mobile` app.

## /api/stats — football-data.org v4 proxy (`FD_API_KEY`)

World Cup 2026 live data (competition code `WC`). Free tier is ~10 req/min —
shared with `/api/club` — and every real upstream call increments the daily
`fd_usage` counter reported by `?action=usage`.

| Action | Params | Returns |
| --- | --- | --- |
| `all-matches` | — | all WC matches (60s cache) |
| `matches` | `date?` | WC fixtures for a date (default today) |
| `match` | `id` | match details incl. venue, referee, attendance |
| `standings` | — | WC group tables |
| `top-scorers` | — | competition top scorers (limit 25) |
| `referee` | `id` | referee name + nationality |
| `usage` | — | daily request counter vs. theoretical ceiling |

The football-data free tier has **no** event timelines, lineups, per-player
stats, shotmaps or heatmaps. Those actions return empty payloads so the UI
degrades gracefully instead of erroring: `events`, `stats`, `live-stats`,
`player-stats`, `shotmap`, `heatmap`, `lineups`.

To re-sync the static schedule (`src/data/matches.js`) after matches finish:
`node scripts/sync-matches.mjs` (reads `FD_API_KEY` from env or `.env.local`).

## /api/club — football-data.org v4 proxy (`FD_API_KEY`)

Champions League provider for the mobile app. **Shares the same 10 req/min
FD_API_KEY budget as `/api/stats`** (its calls count against the same
`fd_usage` counter). Returns `{ configured: false }` with empty arrays until
the key is set. Competition whitelist: clients pass `?comp=ucl`; raw codes
are never accepted.

| Action | Returns |
| --- | --- |
| `standings` | UCL table(s) per stage/group |
| `matches` | UCL fixtures/results |
| `scorers` | UCL top scorers (limit 25) |

## /api/players — API-Football v3 proxy (`APIFOOTBALL_KEY`)

Player bio + photos. Free tier is 100 req/day (tracked under `af_usage`) —
search results cache 7 days, profiles 30 days. `marketValue` is always `null`
(no free source); clients hide the row. Returns `{ configured: false }` until
the key is set.

| Action | Params | Returns |
| --- | --- | --- |
| `search` | `q` (min 3 chars) | up to 20 profile candidates |
| `player` | `id` | single profile |

## /api/results — KV-backed manual result overrides (pre-existing)

GET returns the admin-entered results blob from Redis; POST replaces it.
Used by the admin panel (`/admin`) and merged client-side with priority:
manual overrides > cloud results > live API results.
