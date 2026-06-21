import json
import subprocess
import tempfile
from pathlib import Path


ROOT = Path("/app/wc2026tracker")


# module: route wiring contract for new player-id and scorer details pages
def test_app_routes_include_player_id_and_scorer_goal_details_paths():
    app_src = (ROOT / "src/App.jsx").read_text(encoding="utf-8")
    assert 'path="/player-id/:id"' in app_src
    assert 'path="/scorers/:team/:player"' in app_src


# module: top scorers goals value must navigate to scorer details page
def test_top_scorers_goals_value_is_link_to_details_page():
    top_scorers_src = (ROOT / "src/pages/TopScorers.jsx").read_text(encoding="utf-8")
    assert "import { Link } from \"react-router-dom\";" in top_scorers_src
    assert 'className="scorer-goals"' in top_scorers_src
    assert 'to={`/scorers/${encodeURIComponent(s.team)}/${encodeURIComponent(s.player)}`}' in top_scorers_src


# module: live timeline normalization should carry playerId + PlayerLink id fallback behavior
def test_live_match_panel_player_id_normalization_and_link_fallback_contract():
    panel_src = (ROOT / "src/components/LiveMatchPanel.jsx").read_text(encoding="utf-8")

    # timeline normalization retains player ids
    assert "playerId: ev.player?.id" in panel_src
    assert "playerId: ev.player?.id, minute: min, cardType: 'yellow'" in panel_src

    # PlayerLink prioritizes /player-id route and falls back to /player route
    assert "const idSlug = playerId ? encodeURIComponent(playerId) : null;" in panel_src
    assert "to={idSlug ? `/player-id/${idSlug}?team=${teamSlug}&name=${playerSlug}` : `/player/${teamSlug}/${playerSlug}`}" in panel_src


def _run_node_script(script_text: str):
    with tempfile.NamedTemporaryFile(suffix=".mjs", mode="w", encoding="utf-8", delete=False) as fh:
        fh.write(script_text)
        script_path = fh.name

    proc = subprocess.run(["node", script_path], capture_output=True, text=True, check=False)
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout.strip())


# module: local /api/stats scorer-details handler payload contract
def test_local_stats_handler_scorer_details_contract_with_mocked_fetch():
    script = """
process.env.STATS_API_KEY = 'TEST_KEY';
delete process.env.REDIS_URL;

const { default: handler } = await import('/app/wc2026tracker/api/stats.js');

global.fetch = async (url) => {
  const mk = (payload) => ({
    ok: true,
    status: 200,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  });

  if (url.includes('/matches?competition_id=comp_6107') && url.includes('page=1')) {
    return mk({
      data: [
        {
          id: 'mt_1',
          status: 'finished',
          utc_date: '2026-06-20T00:00:00Z',
          home_team: { name: 'USA' },
          away_team: { name: 'Australia' }
        }
      ]
    });
  }

  if (url.includes('/matches?competition_id=comp_6107') && url.includes('page=2')) {
    return mk({ data: [] });
  }

  if (url.includes('/matches/mt_1/timeline')) {
    return mk({
      data: {
        events: [
          {
            type: 'goal',
            player_name: 'John Doe',
            team_name: 'USA',
            minute: 17,
            extra_time: 0,
            player: { id: 'p_9' }
          }
        ]
      }
    });
  }

  return {
    ok: false,
    status: 404,
    json: async () => ({ error: 'not mocked' }),
    text: async () => 'not mocked',
  };
};

const output = { statusCode: null, body: null, headers: {} };
const req = {
  method: 'GET',
  query: {
    action: 'scorer-details',
    scorer: 'John Doe',
    team: 'USA',
  },
};
const res = {
  setHeader: (k, v) => { output.headers[k] = v; },
  status: (code) => {
    output.statusCode = code;
    return {
      json: (obj) => { output.body = obj; return obj; },
      end: () => null,
    };
  },
};

await handler(req, res);
console.log(JSON.stringify(output));
"""

    result = _run_node_script(script)
    assert result["statusCode"] == 200
    payload = result["body"]
    assert payload["scorer"] == "John Doe"
    assert payload["team"] == "USA"
    assert isinstance(payload["totalGoals"], int)
    assert isinstance(payload["goals"], list)
    assert payload["totalGoals"] == len(payload["goals"])

    first = payload["goals"][0]
    assert first["opponent"] == "Australia"
    assert first["minute"] == 17
    assert isinstance(first["matchDate"], str)
    assert first["goalType"] == "open-play"
    assert first["playerId"] == "p_9"


# module: scorer-details should reject missing params
def test_local_stats_handler_scorer_details_rejects_missing_params():
    script = """
process.env.STATS_API_KEY = 'TEST_KEY';
delete process.env.REDIS_URL;

const { default: handler } = await import('/app/wc2026tracker/api/stats.js');

const output = { statusCode: null, body: null, headers: {} };
const req = { method: 'GET', query: { action: 'scorer-details' } };
const res = {
  setHeader: (k, v) => { output.headers[k] = v; },
  status: (code) => {
    output.statusCode = code;
    return {
      json: (obj) => { output.body = obj; return obj; },
      end: () => null,
    };
  },
};

await handler(req, res);
console.log(JSON.stringify(output));
"""

    result = _run_node_script(script)
    assert result["statusCode"] == 400
    assert result["body"]["error"] == "scorer and team are required"
