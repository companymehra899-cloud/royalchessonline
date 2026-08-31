import os
import requests

BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"


class TestGoogleOAuthDirectConfig:
    """Covers: 'Preview Google OAuth configuration status is accurately exposed' and
    'Google login frontend uses direct Google OAuth'
    (backend half — the /api/auth/google code-exchange endpoint)."""

    def test_google_config_returns_500_when_unconfigured(self):
        r = requests.get(f"{API}/auth/google-config")
        assert r.status_code == 500, f"Expected 500, got {r.status_code}: {r.text}"
        body = r.json()
        assert body.get("detail") == "Google OAuth not configured", body
        # No secret values should ever be present in the response body
        text = r.text.lower()
        assert "client_secret" not in text
        assert "googleclientsecret" not in text

    def test_google_code_exchange_rejects_bogus_code(self):
        """POST /api/auth/google with a bogus authorization code must be rejected (401),
        not silently accepted, and must not create a user."""
        r = requests.post(
            f"{API}/auth/google",
            json={"code": "tscheck-bogus-code-does-not-exist-12345", "redirect_uri": "https://example.com/"},
        )
        assert r.status_code in (401, 500), f"Expected 401/500 for bogus code, got {r.status_code}: {r.text}"
        lb = requests.get(f"{API}/leaderboard", params={"limit": 50}).json()
        assert not any("tscheck-bogus" in (p.get("id") or "") for p in lb)

    def test_google_code_exchange_missing_field_returns_422(self):
        r = requests.post(f"{API}/auth/google", json={})
        assert r.status_code == 422, f"Expected 422, got {r.status_code}: {r.text}"

    def test_no_session_endpoint_exists(self):
        """The old /api/auth/session exchange endpoint must be gone —
        confirms the app only uses direct Google OAuth."""
        r = requests.post(f"{API}/auth/session", json={"session_id": "anything"})
        assert r.status_code == 404, f"Expected /api/auth/session to be removed (404), got {r.status_code}"
