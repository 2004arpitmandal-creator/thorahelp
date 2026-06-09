"""thoraHELP backend API tests.
Covers: auth (register/login/me/profile), signals CRUD + respond/resolve,
messages, websocket auth + ping/ack, radius escalation, voice upload.
"""
import asyncio
import io
import json
import os
import time
import uuid

import pytest
import requests
import websockets

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://thorahelp-aid.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
WS_URL = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/api/ws"

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@thorahelp.app")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin@12345")

LAT, LNG = 12.9716, 77.5946


def _rand_email(prefix="test"):
    return f"TEST_{prefix}_{uuid.uuid4().hex[:8]}@thorahelp.app"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    return data["access_token"], data["user"]


@pytest.fixture(scope="session")
def user_a():
    email = _rand_email("a")
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "User@12345", "name": "Alice"})
    assert r.status_code == 200, r.text
    d = r.json()
    return {"token": d["access_token"], "user": d["user"], "email": email.lower()}


@pytest.fixture(scope="session")
def user_b():
    email = _rand_email("b")
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "User@12345", "name": "Bob"})
    assert r.status_code == 200, r.text
    d = r.json()
    return {"token": d["access_token"], "user": d["user"], "email": email.lower()}


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# --- Auth ----------------------------------------------------------------
class TestAuth:
    def test_register_returns_token_and_user(self, user_a):
        assert user_a["token"]
        assert user_a["user"]["email"] == user_a["email"]
        assert user_a["user"]["auth_provider"] == "password"

    def test_register_duplicate_returns_409(self, user_a):
        r = requests.post(f"{API}/auth/register",
                          json={"email": user_a["email"], "password": "X@12345", "name": "Dup"})
        assert r.status_code == 409

    def test_admin_login(self, admin_token):
        token, user = admin_token
        assert token
        assert user["email"] == ADMIN_EMAIL
        assert user.get("auth_provider") == "password"
        assert user.get("role") == "admin"

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_with_bearer(self, user_a):
        r = requests.get(f"{API}/auth/me", headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        assert r.json()["email"] == user_a["email"]

    def test_me_without_token(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_profile_update(self, user_a):
        payload = {
            "name": "Alice Updated", "phone": "+919999911111", "blood_group": "O+",
            "emergency_contact_name": "Mom", "emergency_contact_phone": "+919999922222",
            "medical_notes": "Asthma",
        }
        r = requests.patch(f"{API}/auth/profile", json=payload, headers=auth_headers(user_a["token"]))
        assert r.status_code == 200, r.text
        fresh = r.json()
        for k, v in payload.items():
            assert fresh.get(k) == v, f"{k} mismatch: {fresh.get(k)} != {v}"
        # verify persistence via me
        r2 = requests.get(f"{API}/auth/me", headers=auth_headers(user_a["token"]))
        assert r2.status_code == 200
        assert r2.json()["name"] == "Alice Updated"


# --- Signals -------------------------------------------------------------
@pytest.fixture(scope="session")
def created_signal(user_a):
    r = requests.post(f"{API}/signals",
                      json={"type": "medical", "description": "Test SOS", "lat": LAT, "lng": LNG},
                      headers=auth_headers(user_a["token"]))
    assert r.status_code == 200, r.text
    return r.json()


class TestSignals:
    def test_create_signal_defaults(self, created_signal):
        s = created_signal
        assert s["radius"] == 100
        assert s["status"] == "active"
        assert s["responders"] == []
        assert s["type"] == "medical"
        assert s["signal_id"].startswith("sig_")

    def test_list_nearby_includes_signal(self, user_a, created_signal):
        r = requests.get(f"{API}/signals",
                         params={"lat": LAT, "lng": LNG, "max_distance": 5000},
                         headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        sigs = r.json()
        ids = [s["signal_id"] for s in sigs]
        assert created_signal["signal_id"] in ids
        # distance is included and sorted
        distances = [s["distance_m"] for s in sigs]
        assert distances == sorted(distances)

    def test_list_filters_far_signals(self, user_a, created_signal):
        # 1 degree latitude ~ 111km away - should not appear with default radius
        r = requests.get(f"{API}/signals",
                         params={"lat": LAT + 5.0, "lng": LNG + 5.0, "max_distance": 1000},
                         headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        ids = [s["signal_id"] for s in r.json()]
        assert created_signal["signal_id"] not in ids

    def test_get_signal_by_id(self, user_a, created_signal):
        r = requests.get(f"{API}/signals/{created_signal['signal_id']}",
                         headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        assert r.json()["signal_id"] == created_signal["signal_id"]

    def test_respond_by_different_user(self, user_b, created_signal):
        sid = created_signal["signal_id"]
        r = requests.post(f"{API}/signals/{sid}/respond", headers=auth_headers(user_b["token"]))
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "responded"
        assert len(data["responders"]) == 1
        assert data["responders"][0]["user_id"] == user_b["user"]["user_id"]

        # call again - no duplicate
        r2 = requests.post(f"{API}/signals/{sid}/respond", headers=auth_headers(user_b["token"]))
        assert r2.status_code == 200
        assert len(r2.json()["responders"]) == 1

    def test_resolve_by_non_owner_forbidden(self, user_b, created_signal):
        r = requests.post(f"{API}/signals/{created_signal['signal_id']}/resolve",
                          headers=auth_headers(user_b["token"]))
        assert r.status_code == 403


# --- Messages ------------------------------------------------------------
class TestMessages:
    def test_post_and_list_messages(self, user_a, user_b, created_signal):
        sid = created_signal["signal_id"]
        msgs_to_post = ["hello there", "second message"]
        for txt in msgs_to_post:
            r = requests.post(f"{API}/signals/{sid}/messages",
                              json={"text": txt}, headers=auth_headers(user_a["token"]))
            assert r.status_code == 200, r.text
            assert r.json()["text"] == txt
        r = requests.get(f"{API}/signals/{sid}/messages", headers=auth_headers(user_b["token"]))
        assert r.status_code == 200
        lst = r.json()
        texts = [m["text"] for m in lst]
        for t in msgs_to_post:
            assert t in texts
        # chronological order
        times = [m["created_at"] for m in lst]
        assert times == sorted(times)


# --- WebSocket ------------------------------------------------------------
class TestWebSocket:
    def test_ws_invalid_token_closes(self):
        async def run():
            try:
                async with websockets.connect(f"{WS_URL}?token=invalid") as ws:
                    try:
                        await asyncio.wait_for(ws.recv(), timeout=3)
                    except Exception:
                        pass
                    return False  # if no close, fail
            except websockets.exceptions.InvalidStatusCode:
                return True
            except websockets.exceptions.ConnectionClosed:
                return True
            except Exception:
                return True
        assert asyncio.run(run())

    def test_ws_ack_and_pong(self, user_a):
        async def run():
            url = f"{WS_URL}?token={user_a['token']}"
            async with websockets.connect(url) as ws:
                await ws.send(json.dumps({"type": "location", "lat": LAT, "lng": LNG}))
                resp = await asyncio.wait_for(ws.recv(), timeout=5)
                d = json.loads(resp)
                assert d["event"] == "ack"
                await ws.send(json.dumps({"type": "ping"}))
                resp2 = await asyncio.wait_for(ws.recv(), timeout=5)
                d2 = json.loads(resp2)
                assert d2["event"] == "pong"
        asyncio.run(run())


# --- Resolve (last) ------------------------------------------------------
class TestResolve:
    def test_owner_resolves(self, user_a, created_signal):
        sid = created_signal["signal_id"]
        r = requests.post(f"{API}/signals/{sid}/resolve", headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        assert r.json()["status"] == "resolved"


# --- Signals history -----------------------------------------------------
class TestSignalsHistory:
    """GET /api/signals/history with role + status filters."""

    def test_requires_auth(self):
        r = requests.get(f"{API}/signals/history")
        assert r.status_code == 401

    def test_history_default_returns_user_signals(self, user_a, created_signal):
        r = requests.get(f"{API}/signals/history", headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # the created_signal belongs to user_a (creator) -> should be present
        ids = [s["signal_id"] for s in data]
        assert created_signal["signal_id"] in ids
        # limit cap
        assert len(data) <= 100

    def test_history_role_created(self, user_a, created_signal):
        r = requests.get(f"{API}/signals/history",
                         params={"role": "created"},
                         headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        data = r.json()
        # every returned signal must have user_a as creator
        uid = user_a["user"]["user_id"]
        for s in data:
            assert s["user_id"] == uid
        assert created_signal["signal_id"] in [s["signal_id"] for s in data]

    def test_history_role_responded(self, user_b, created_signal):
        # user_b responded to created_signal in TestSignals earlier
        r = requests.get(f"{API}/signals/history",
                         params={"role": "responded"},
                         headers=auth_headers(user_b["token"]))
        assert r.status_code == 200
        data = r.json()
        ids = [s["signal_id"] for s in data]
        assert created_signal["signal_id"] in ids
        uid = user_b["user"]["user_id"]
        for s in data:
            responder_ids = [r["user_id"] for r in s.get("responders", [])]
            assert uid in responder_ids

    def test_history_status_active_filter(self, user_a):
        # Create a fresh active signal, then verify it appears under status=active
        r = requests.post(f"{API}/signals",
                          json={"type": "general", "description": "active-history",
                                "lat": LAT + 0.002, "lng": LNG + 0.002},
                          headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        sid = r.json()["signal_id"]
        r2 = requests.get(f"{API}/signals/history",
                          params={"role": "created", "status": "active"},
                          headers=auth_headers(user_a["token"]))
        assert r2.status_code == 200
        statuses = {s["status"] for s in r2.json()}
        # if any returned, they must all be active
        assert statuses.issubset({"active"})
        assert sid in [s["signal_id"] for s in r2.json()]

    def test_history_status_resolved_filter(self, user_a):
        # Create then resolve a signal, ensure it appears under status=resolved
        r = requests.post(f"{API}/signals",
                          json={"type": "general", "description": "to-resolve",
                                "lat": LAT + 0.003, "lng": LNG + 0.003},
                          headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        sid = r.json()["signal_id"]
        rr = requests.post(f"{API}/signals/{sid}/resolve", headers=auth_headers(user_a["token"]))
        assert rr.status_code == 200
        rh = requests.get(f"{API}/signals/history",
                          params={"role": "created", "status": "resolved"},
                          headers=auth_headers(user_a["token"]))
        assert rh.status_code == 200
        items = rh.json()
        assert sid in [s["signal_id"] for s in items]
        for s in items:
            assert s["status"] == "resolved"

    def test_history_admin_no_signals_empty(self, admin_token):
        token, _ = admin_token
        r = requests.get(f"{API}/signals/history", headers=auth_headers(token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_signal_by_id_regression(self, user_a, created_signal):
        # Regression: /api/signals/{signal_id} should still work AFTER /history route
        sid = created_signal["signal_id"]
        r = requests.get(f"{API}/signals/{sid}", headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        assert r.json()["signal_id"] == sid

    def test_get_signal_history_literal_path_not_treated_as_id(self, user_a):
        # Ensure /signals/history is matched as history endpoint not signal_id='history'
        r = requests.get(f"{API}/signals/history", headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# --- Voice upload --------------------------------------------------------
class TestVoiceUpload:
    def test_voice_multipart_upload(self, user_a):
        # First create a fresh signal we can use
        r = requests.post(f"{API}/signals",
                          json={"type": "general", "description": "Voice", "lat": LAT, "lng": LNG},
                          headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        sid = r.json()["signal_id"]
        synthetic = b"\x1aE\xdf\xa3" + os.urandom(64)  # webm-ish header + bytes
        files = {"file": ("test.webm", io.BytesIO(synthetic), "audio/webm")}
        r2 = requests.post(f"{API}/signals/{sid}/voice", files=files,
                           headers=auth_headers(user_a["token"]))
        if r2.status_code == 503:
            pytest.skip("Object storage unavailable in this env")
        assert r2.status_code == 200, r2.text
        body = r2.json()
        assert "path" in body and body["path"]


# --- Escalation (slow) ---------------------------------------------------
class TestEscalation:
    def test_radius_escalates_after_30s(self, user_a):
        r = requests.post(f"{API}/signals",
                          json={"type": "medical", "description": "Escalation test",
                                "lat": LAT + 0.001, "lng": LNG + 0.001},
                          headers=auth_headers(user_a["token"]))
        assert r.status_code == 200
        sid = r.json()["signal_id"]
        assert r.json()["radius"] == 100
        # Wait ~ 35s for background task to escalate (loops every 5s, threshold 30s)
        time.sleep(38)
        r2 = requests.get(f"{API}/signals/{sid}", headers=auth_headers(user_a["token"]))
        assert r2.status_code == 200
        new_radius = r2.json()["radius"]
        assert new_radius >= 200, f"Expected radius >= 200, got {new_radius}"
        # cleanup
        requests.post(f"{API}/signals/{sid}/resolve", headers=auth_headers(user_a["token"]))
