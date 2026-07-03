# API surface (Vercel serverless functions)

All keys live in Vercel env vars; nothing client-side. All responses are
Redis-cached (`REDIS_URL`) with `X-Cache: HIT|MISS` headers. Consumed by both
the web app and the `wc2026-mobile` app.

## /api/stats — TheStatsAPI proxy (`STATS_API_KEY`)

Competition-scoped actions accept `&comp=wc` (default). Add new competitions
to the `COMPETITIONS` whitelist in `stats.js` — raw competition IDs from
clients are never accepted.

| Action | Params | Returns |
| --- | --- | --- |
| `all-matches` | `comp?` | all matches for the competition |
| `matches` | `date`, `comp?` | fixtures for a date |
| `competitions` | — | competition list (club-football discovery) |
| `standings` | `comp?` | league table (`unavailable: true` if endpoint missing) |
| `top-scorers` | — | WC golden-boot tallies from event timelines |
| `match` / `events` / `stats` / `live-stats` | `id` | per-match data |
| `player-stats` / `shotmap` / `heatmap` / `lineups` / `referee` | `id` (+`pid`) | per-match data |
| `usage` | — | daily request counter |

## /api/club — football-data.org v4 proxy (`FD_API_KEY`)

Baseline Champions League provider (free tier, 10 req/min). Returns
`{ configured: false }` with empty arrays until the key is set.

| Action | Returns |
| --- | --- |
| `standings` | UCL table(s) per stage/group |
| `matches` | UCL fixtures/results |
| `scorers` | UCL top scorers (limit 25) |

## /api/players — API-Football v3 proxy (`APIFOOTBALL_KEY`)

Player bio + photos. Free tier is 100 req/day — search results cache 7 days,
profiles 30 days. `marketValue` is always `null` (no free source); clients
hide the row. Returns `{ configured: false }` until the key is set.

| Action | Params | Returns |
| --- | --- | --- |
| `search` | `q` (min 3 chars) | up to 20 profile candidates |
| `player` | `id` | single profile |

## /api/results — KV-backed manual result overrides (pre-existing)
