import os
import uuid

import pytest
import requests


# module: shared base URL/session fixtures for production API validation
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


# module: /api/health endpoint contract
def test_health_returns_ok_true(api_client, base_url):
    response = api_client.get(f"{base_url}/api/health", timeout=20)
    assert response.status_code == 200

    payload = response.json()
    assert isinstance(payload, dict)
    assert payload.get("ok") is True


# module: /api/stats usage action contract
def test_stats_usage_returns_expected_shape(api_client, base_url):
    response = api_client.get(f"{base_url}/api/stats?action=usage", timeout=20)
    assert response.status_code == 200

    payload = response.json()
    assert isinstance(payload, dict)
    assert isinstance(payload.get("used"), int)
    assert isinstance(payload.get("limit"), int)
    assert "remaining" in payload


# module: /api/results read contract
def test_results_get_returns_json_object(api_client, base_url):
    response = api_client.get(f"{base_url}/api/results", timeout=20)
    assert response.status_code == 200

    payload = response.json()
    assert isinstance(payload, dict)


# module: /api/results write-read persistence contract
def test_results_post_persists_and_visible_on_subsequent_get(api_client, base_url):
    get_before = api_client.get(f"{base_url}/api/results", timeout=20)
    assert get_before.status_code == 200
    before_payload = get_before.json()
    assert isinstance(before_payload, dict)

    test_key = f"TEST_T1_{uuid.uuid4().hex[:10]}"
    updated_payload = {**before_payload, test_key: {"value": "ok"}}

    post_response = api_client.post(f"{base_url}/api/results", json=updated_payload, timeout=20)
    assert post_response.status_code == 200
    post_payload = post_response.json()
    assert post_payload.get("ok") is True

    get_after = api_client.get(f"{base_url}/api/results", timeout=20)
    assert get_after.status_code == 200
    after_payload = get_after.json()
    assert isinstance(after_payload, dict)
    assert test_key in after_payload

    # cleanup: restore original payload to avoid persisting test-only marker in prod data
    restore_response = api_client.post(f"{base_url}/api/results", json=before_payload, timeout=20)
    assert restore_response.status_code == 200


# module: /api/stats unsupported method contract
def test_stats_usage_rejects_unsupported_method(api_client, base_url):
    response = api_client.put(f"{base_url}/api/stats?action=usage", timeout=20)
    assert response.status_code == 405
