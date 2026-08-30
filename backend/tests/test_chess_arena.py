"""Chess Arena backend API tests - covers auth, chess AI, puzzles, games, leaderboard, online rooms."""
import os
import pytest
import requests
import chess

BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "https://chess-recovery.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------- Auth ----------
class TestAuth:
    def test_login_demo_user(self, s):
        r = s.post(f"{API}/auth/login", json={"email": "chessplayer@gmail.com", "password": "password123"})
        assert r.status_code == 200, r.text
        j = r.json()
        assert "token" in j and "user" in j
        assert j["user"]["email"] == "chessplayer@gmail.com"
        assert j["user"].get("rating") == 1200 or isinstance(j["user"].get("rating"), int)
        pytest.demo_token = j["token"]
        pytest.demo_user_id = j["user"]["id"]

    def test_login_wrong_password(self, s):
        r = s.post(f"{API}/auth/login", json={"email": "chessplayer@gmail.com", "password": "wrong"})
        assert r.status_code == 400

    def test_register_new_user(self, s):
        import uuid
        email = f"TEST_{uuid.uuid4().hex[:8]}@test.io"
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "pwd123", "username": "TEST_user"})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["user"]["email"] == email.lower()
        assert "token" in j
        pytest.new_token = j["token"]
        pytest.new_email = email

    def test_register_duplicate(self, s):
        r = s.post(f"{API}/auth/register", json={"email": pytest.new_email, "password": "pwd123"})
        assert r.status_code == 400

    def test_guest_login(self, s):
        r = s.post(f"{API}/auth/guest", json={"username": "TEST_Guest"})
        assert r.status_code == 200, r.text
        j = r.json()
        assert "token" in j
        assert j["user"]["id"].startswith("guest_")
        assert j["user"].get("is_guest") is True
        pytest.guest_token = j["token"]

    def test_me_without_token(self, s):
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 200
        # Falls back to demo
        assert "username" in r.json()

    def test_me_with_token(self, s):
        r = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {pytest.demo_token}"})
        assert r.status_code == 200
        assert r.json()["email"] == "chessplayer@gmail.com"

    def test_session_exchange_invalid_id_returns_401(self, s):
        """POST /api/auth/session with fake session_id must return 401 and NOT create a user."""
        r = s.post(f"{API}/auth/session", json={"session_id": "fake_test_id_does_not_exist_12345"})
        assert r.status_code == 401, f"Expected 401 for invalid session_id, got {r.status_code}: {r.text}"
        # Ensure no random-user side effect: /leaderboard should not contain 'fake_test_id' user
        lb = s.get(f"{API}/leaderboard", params={"limit": 50}).json()
        assert not any("fake_test_id" in (p.get("id") or "") for p in lb)

    def test_session_exchange_missing_field_returns_422(self, s):
        """POST /api/auth/session without session_id must return 422 (Pydantic validation)."""
        r = s.post(f"{API}/auth/session", json={})
        assert r.status_code == 422, f"Expected 422, got {r.status_code}: {r.text}"

    def test_session_exchange_empty_string_returns_401(self, s):
        """Empty session_id must be rejected by upstream (401), not accepted."""
        r = s.post(f"{API}/auth/session", json={"session_id": ""})
        assert r.status_code in (401, 422), f"Expected 401/422 for empty session_id, got {r.status_code}"

    def test_jwt_still_works_after_session_helper_extension(self, s):
        """Regression: get_current_user_optional must still accept JWTs after being extended for session tokens."""
        r = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {pytest.demo_token}"})
        assert r.status_code == 200
        assert r.json()["email"] == "chessplayer@gmail.com"
        # Guest JWT should also still work
        rg = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {pytest.guest_token}"})
        assert rg.status_code == 200
        assert rg.json().get("is_guest") is True

    def test_update_profile(self, s):
        r = s.put(f"{API}/auth/profile",
                  json={"board_theme": "obsidian", "piece_theme": "royal", "difficulty": "hard"},
                  headers={"Authorization": f"Bearer {pytest.demo_token}"})
        assert r.status_code == 200
        j = r.json()
        assert j.get("board_theme") == "obsidian"
        assert j.get("piece_theme") == "royal"
        assert j.get("difficulty") == "hard"


# ---------- Chess AI + Hint ----------
class TestChessEngine:
    @pytest.mark.parametrize("difficulty", ["easy", "medium", "hard"])
    def test_ai_move_returns_legal(self, s, difficulty):
        r = s.post(f"{API}/chess/ai-move", json={"fen": STARTING_FEN, "difficulty": difficulty})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("uci"), f"Missing uci for {difficulty}: {j}"
        # Validate legality
        b = chess.Board(STARTING_FEN)
        move = chess.Move.from_uci(j["uci"])
        assert move in b.legal_moves
        assert j["move"]["from"] and j["move"]["to"]

    def test_ai_move_after_e2e4(self, s):
        b = chess.Board()
        b.push_uci("e2e4")
        fen = b.fen()
        r = s.post(f"{API}/chess/ai-move", json={"fen": fen, "difficulty": "easy"})
        assert r.status_code == 200
        j = r.json()
        move = chess.Move.from_uci(j["uci"])
        assert move in b.legal_moves

    def test_hint(self, s):
        r = s.post(f"{API}/chess/hint", json={"fen": STARTING_FEN})
        assert r.status_code == 200
        j = r.json()
        assert "from" in j and "to" in j and "description" in j
        b = chess.Board(STARTING_FEN)
        move = chess.Move.from_uci(j["from"] + j["to"])
        assert move in b.legal_moves


# ---------- Puzzles ----------
class TestPuzzles:
    def test_get_puzzles(self, s):
        r = s.get(f"{API}/puzzles")
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list) and len(arr) >= 3
        assert "id" in arr[0] and "fen" in arr[0]

    def test_daily_puzzle(self, s):
        r = s.get(f"{API}/puzzles/daily")
        assert r.status_code == 200
        j = r.json()
        assert j.get("is_daily") is True
        assert j.get("reward_elo") == 25

    def test_complete_puzzle_increments(self, s):
        # Get baseline
        r0 = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {pytest.demo_token}"})
        before = r0.json().get("puzzles_solved", 0)

        r = s.post(f"{API}/puzzles/complete",
                   json={"puzzle_id": "puz_1", "solved": True},
                   headers={"Authorization": f"Bearer {pytest.demo_token}"})
        assert r.status_code == 200
        assert r.json().get("bonus_elo") == 15

        r2 = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {pytest.demo_token}"})
        after = r2.json().get("puzzles_solved", 0)
        assert after == before + 1


# ---------- Games ----------
class TestGames:
    def test_record_win_and_persist(self, s):
        r0 = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {pytest.demo_token}"})
        rating_before = r0.json().get("rating", 1200)

        payload = {
            "mode": "computer",
            "opponent_name": "AI Easy",
            "player_color": "white",
            "result": "win",
            "reason": "checkmate",
            "moves_count": 25,
            "duration_seconds": 300,
            "pgn": "1. e4 e5",
            "difficulty": "easy"
        }
        r = s.post(f"{API}/games/record", json=payload,
                   headers={"Authorization": f"Bearer {pytest.demo_token}"})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["elo_delta"] == 10
        assert j["new_rating"] == rating_before + 10

        # Verify via history
        rh = s.get(f"{API}/games/history",
                   headers={"Authorization": f"Bearer {pytest.demo_token}"})
        assert rh.status_code == 200
        games = rh.json()
        assert isinstance(games, list) and len(games) >= 1
        assert games[0]["result"] == "win"
        assert games[0]["mode"] == "computer"


# ---------- Leaderboard ----------
class TestLeaderboard:
    def test_leaderboard_sorted_desc(self, s):
        r = s.get(f"{API}/leaderboard")
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list) and len(arr) >= 1
        ratings = [p.get("rating", 0) for p in arr]
        assert ratings == sorted(ratings, reverse=True)
        # Ensure no _id / password_hash leak
        assert "_id" not in arr[0]
        assert "password_hash" not in arr[0]


# ---------- Online Rooms ----------
class TestOnlineRooms:
    def test_create_join_move_flow(self, s):
        # Create room as demo (white)
        r = s.post(f"{API}/online/rooms/create",
                   json={"color_preference": "white", "time_minutes": 5},
                   headers={"Authorization": f"Bearer {pytest.demo_token}"})
        assert r.status_code == 200, r.text
        room = r.json()
        code = room["room_code"]
        assert room["status"] == "waiting"
        assert room["white_player"] is not None
        assert room["black_player"] is None

        # Join as guest -> becomes black
        rj = s.post(f"{API}/online/rooms/join", json={"room_code": code},
                    headers={"Authorization": f"Bearer {pytest.guest_token}"})
        assert rj.status_code == 200
        joined = rj.json()
        assert joined["status"] == "active"
        assert joined["black_player"] is not None

        # Get state
        rg = s.get(f"{API}/online/rooms/{code}")
        assert rg.status_code == 200
        assert rg.json()["room_code"] == code

        # Legal move by white (demo)
        rm = s.post(f"{API}/online/rooms/{code}/move",
                    json={"from_sq": "e2", "to_sq": "e4"},
                    headers={"Authorization": f"Bearer {pytest.demo_token}"})
        assert rm.status_code == 200, rm.text
        state = rm.json()
        assert state["turn"] == "b"
        assert state["last_move"]["san"] in ("e4",)
        assert len(state["move_history"]) == 1

        # Illegal move must come from the player whose turn it is (black = guest)
        ril = s.post(f"{API}/online/rooms/{code}/move",
                     json={"from_sq": "e2", "to_sq": "e5"},
                     headers={"Authorization": f"Bearer {pytest.guest_token}"})
        assert ril.status_code == 400

        # Unauthenticated move is rejected (401)
        r_unauth = s.post(f"{API}/online/rooms/{code}/move",
                          json={"from_sq": "e7", "to_sq": "e5"})
        assert r_unauth.status_code == 401

        # Out-of-turn player is rejected (403): white tries to move while black's turn
        r_oot = s.post(f"{API}/online/rooms/{code}/move",
                       json={"from_sq": "e2", "to_sq": "e4"},
                       headers={"Authorization": f"Bearer {pytest.demo_token}"})
        assert r_oot.status_code == 403

    def test_non_player_cannot_move(self, s):
        import uuid
        email = f"outsider_{uuid.uuid4().hex[:8]}@test.io"
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "pwd123", "username": "Outsider"})
        outsider_token = r.json()["token"]

        # Demo creates + guest joins a fresh room
        rc = s.post(f"{API}/online/rooms/create",
                    json={"color_preference": "white", "time_minutes": 5},
                    headers={"Authorization": f"Bearer {pytest.demo_token}"})
        code = rc.json()["room_code"]
        s.post(f"{API}/online/rooms/join", json={"room_code": code},
               headers={"Authorization": f"Bearer {pytest.guest_token}"})

        # Outsider (not a player) is rejected with 403
        rm = s.post(f"{API}/online/rooms/{code}/move",
                    json={"from_sq": "e2", "to_sq": "e4"},
                    headers={"Authorization": f"Bearer {outsider_token}"})
        assert rm.status_code == 403

    def test_join_nonexistent_room(self, s):
        r = s.post(f"{API}/online/rooms/join", json={"room_code": "ZZZZZZ"})
        assert r.status_code == 404

    def test_fools_mate_checkmate(self, s):
        # Create a fresh room as demo (white), join as guest (black)
        r = s.post(f"{API}/online/rooms/create",
                   json={"color_preference": "white", "time_minutes": 5},
                   headers={"Authorization": f"Bearer {pytest.demo_token}"})
        code = r.json()["room_code"]
        s.post(f"{API}/online/rooms/join", json={"room_code": code},
               headers={"Authorization": f"Bearer {pytest.guest_token}"})
        # Fool's mate: 1.f3 e5 2.g4 Qh4# (white = demo, black = guest)
        moves = [
            ("f2", "f3", pytest.demo_token),
            ("e7", "e5", pytest.guest_token),
            ("g2", "g4", pytest.demo_token),
            ("d8", "h4", pytest.guest_token),
        ]
        last = None
        for f, t, token in moves:
            resp = s.post(f"{API}/online/rooms/{code}/move",
                          json={"from_sq": f, "to_sq": t},
                          headers={"Authorization": f"Bearer {token}"})
            assert resp.status_code == 200, resp.text
            last = resp.json()
        assert last["status"] == "completed"
        assert last["winner"] == "black"
        assert last["end_reason"] == "checkmate"
