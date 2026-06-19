import os
import subprocess
import uuid
from pathlib import Path

import pytest
import requests


# module: shared public URL/session fixtures for wc2026tracker vercel API validation
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


# module: root wrapper files existence/loader checks
def test_root_api_wrapper_files_exist():
    wrapper_paths = [
        Path("/app/wc2026tracker/api/health.js"),
        Path("/app/wc2026tracker/api/stats.js"),
        Path("/app/wc2026tracker/api/results.js"),
    ]
    for p in wrapper_paths:
        assert p.exists() is True


def test_root_api_wrappers_are_loadable():
    script = Path("/tmp/test_wc2026tracker_wrappers.mjs")
    script.write_text(
        """
import health from '/app/wc2026tracker/api/health.js';
import stats from '/app/wc2026tracker/api/stats.js';
import results from '/app/wc2026tracker/api/results.js';

if (typeof health !== 'function') throw new Error('health wrapper did not export default function');
if (typeof stats !== 'function') throw new Error('stats wrapper did not export default function');
if (typeof results !== 'function') throw new Error('results wrapper did not export default function');

console.log('WRAPPERS_LOADABLE_OK');
""".strip()
    )

    output = subprocess.run(["node", str(script)], capture_output=True, text=True, check=False)
    assert output.returncode == 0
    assert "WRAPPERS_LOADABLE_OK" in output.stdout


# module: /api/health endpoint contract with required env configured on deployment
def test_health_returns_200_and_ok_true(api_client, base_url):
    response = api_client.get(f"{base_url}/api/health", timeout=30)
    assert response.status_code == 200

    payload = response.json()
    assert isinstance(payload, dict)
    assert payload.get("ok") is True


# module: /api/stats?action=usage contract
def test_stats_usage_returns_usage_payload(api_client, base_url):
    response = api_client.get(f"{base_url}/api/stats?action=usage", timeout=30)
    assert response.status_code == 200

    payload = response.json()
    assert isinstance(payload, dict)
    assert isinstance(payload.get("used"), int)
    assert isinstance(payload.get("limit"), int)
    assert isinstance(payload.get("remaining"), int)


# module: /api/results read/write persistence via redis
def test_results_post_then_get_persists_data(api_client, base_url):
    get_before = api_client.get(f"{base_url}/api/results", timeout=30)
    assert get_before.status_code == 200
    before_payload = get_before.json()
    assert isinstance(before_payload, dict)

    test_key = f"TEST_T1_{uuid.uuid4().hex[:10]}"
    updated_payload = {**before_payload, test_key: {"value": "ok"}}

    post_response = api_client.post(f"{base_url}/api/results", json=updated_payload, timeout=30)
    assert post_response.status_code == 200
    post_payload = post_response.json()
    assert post_payload.get("ok") is True

    get_after = api_client.get(f"{base_url}/api/results", timeout=30)
    assert get_after.status_code == 200
    after_payload = get_after.json()
    assert isinstance(after_payload, dict)
    assert test_key in after_payload

    # best-effort cleanup to restore original payload
    restore_response = api_client.post(f"{base_url}/api/results", json=before_payload, timeout=30)
    assert restore_response.status_code == 200
