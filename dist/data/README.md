# Live results data

`results.json` is the single file the auto-update pipeline needs to touch.
The site polls this file every 60s (cache-busted) so updating it (e.g. via
the scheduled task / a GitHub Action / manual edit + redeploy) refreshes
standings, the bracket, and top scorers without a full rebuild.

Schema:

```json
{
  "<matchId>": {
    "status": "live" | "finished",
    "homeScore": 2,
    "awayScore": 1,
    "penalties": { "home": 4, "away": 3 },   // optional, knockout only
    "scorers": [
      { "team": "Brazil", "player": "Vinicius Junior", "minute": 23 },
      { "team": "Morocco", "player": "Achraf Hakimi", "minute": 67, "penalty": true },
      { "team": "Brazil", "player": "Marquinhos", "minute": 81, "ownGoal": true }
    ]
  }
}
```

Only finished/live matches need entries. Everything else is treated as
"scheduled".

## Manual entry workflow (recommended)

Open the deployed site and go to the **"Update Results"** tab in the nav
bar. For each match:

1. Pick the match (search by team, stage, group, venue, or match #).
2. Set its status (scheduled / live / finished).
3. Enter the score, and — for knockout stages — penalties if applicable.
4. Add goal scorers (name, minute, penalty/own-goal flags).
5. Click **Save result**.

The save is applied immediately in your browser via `localStorage`, so
standings, the bracket, and top scorers update right away for you — no
rebuild needed to check your own work.

When you're ready to make it live for everyone else:

1. Click **Download results.json** (or **Copy JSON**) on the "Update
   Results" page. This exports the full merged results object (everything
   from the current `results.json` plus your local edits).
2. Replace `public/data/results.json` with that file.
3. Redeploy (or just push — most static hosts redeploy on commit).

Other notes:

- **"Entered Results"** lists every match you've edited locally, with
  Edit/Clear actions.
- **"Clear all local edits"** wipes your browser's local overrides (does
  not touch the deployed `results.json`).
- The scheduled match-result check task has been turned off — manual entry
  via this tab is now the primary way results get updated.
