import os

import pytest
import requests


# module: shared public URL/session fixtures for live endpoint regression validation
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


# module: top scorers endpoint contract regression checks
def test_top_scorers_contract_non_empty(api_client, base_url):
    response = api_client.get(f"{base_url}/api/stats?action=top-scorers", timeout=30)
    assert response.status_code == 200

    payload = response.json()
    assert isinstance(payload, dict)
    assert "scorers" in payload
    assert isinstance(payload["scorers"], list)
    assert len(payload["scorers"]) > 0

    first = payload["scorers"][0]
    assert isinstance(first.get("player"), str)
    assert len(first.get("player", "").strip()) > 0
    assert isinstance(first.get("team"), str)
    assert len(first.get("team", "").strip()) > 0
    assert isinstance(first.get("goals"), int)
    assert first.get("goals") >= 0


# module: all-matches endpoint contract stability checks used by home cards
def test_all_matches_contract_has_match_identity_fields(api_client, base_url):
    response = api_client.get(f"{base_url}/api/stats?action=all-matches", timeout=30)
    assert response.status_code == 200

    payload = response.json()
    assert isinstance(payload, dict)
    matches = payload.get("matches")
    assert isinstance(matches, list)
    assert len(matches) > 0

    sample = matches[0]
    assert isinstance(sample.get("id"), str)
    assert len(sample.get("id", "").strip()) > 0
    assert isinstance(sample.get("home_team"), dict)
    assert isinstance(sample.get("away_team"), dict)
