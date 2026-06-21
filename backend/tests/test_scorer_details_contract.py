import os

import pytest
import requests


# module: shared public URL/session fixtures for scorer details contract regression
@pytest.fixture(scope="session")
def base_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        pytest.skip("REACT_APP_BACKEND_URL is not set")
    return url.rstrip("/")


@pytest.fixture(scope="session")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# module: scorer-details requires scorer/team params
def test_scorer_details_requires_params(api_client, base_url):
    response = api_client.get(f"{base_url}/api/stats?action=scorer-details", timeout=30)
    assert response.status_code == 400

    payload = response.json()
    assert isinstance(payload, dict)
    assert "error" in payload


# module: scorer-details payload contract and top-scorers regression safety
def test_scorer_details_payload_and_top_scorers_stability(api_client, base_url):
    top_before = api_client.get(f"{base_url}/api/stats?action=top-scorers", timeout=45)
    assert top_before.status_code == 200
    top_before_payload = top_before.json()
    assert isinstance(top_before_payload, dict)
    assert isinstance(top_before_payload.get("scorers"), list)
    assert len(top_before_payload["scorers"]) > 0

    scorer_item = top_before_payload["scorers"][0]
    scorer = scorer_item.get("player")
    team = scorer_item.get("team")
    assert isinstance(scorer, str) and scorer.strip()
    assert isinstance(team, str) and team.strip()

    details_res = api_client.get(
        f"{base_url}/api/stats",
        params={"action": "scorer-details", "scorer": scorer, "team": team},
        timeout=45,
    )
    assert details_res.status_code == 200
    details = details_res.json()

    assert isinstance(details, dict)
    assert details.get("scorer") == scorer
    assert details.get("team") == team
    assert isinstance(details.get("totalGoals"), int)
    goals = details.get("goals")
    assert isinstance(goals, list)

    if len(goals) > 0:
        first_goal = goals[0]
        assert isinstance(first_goal.get("opponent"), str)
        assert len(first_goal.get("opponent", "").strip()) > 0
        assert isinstance(first_goal.get("minute"), int)
        assert first_goal.get("minute") >= 0
        assert isinstance(first_goal.get("matchDate"), str) or first_goal.get("matchDate") is None
        assert isinstance(first_goal.get("goalType"), str)
        assert len(first_goal.get("goalType", "").strip()) > 0

    top_after = api_client.get(f"{base_url}/api/stats?action=top-scorers", timeout=45)
    assert top_after.status_code == 200
    top_after_payload = top_after.json()
    assert isinstance(top_after_payload, dict)
    assert isinstance(top_after_payload.get("scorers"), list)
    assert len(top_after_payload["scorers"]) > 0
