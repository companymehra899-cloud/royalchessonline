from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
import string
import hashlib
import hmac
import jwt
import bcrypt
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
import httpx
from datetime import datetime, timezone, timedelta
import chess
import asyncio
import time as _time
from pymongo.errors import DuplicateKeyError

from chess_engine import get_best_move, get_hint, CURATED_PUZZLES, evaluate_board

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'test_database')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# JWT secret MUST come from the environment — never from a hardcoded source fallback.
# A leaked/guessable secret lets anyone forge tokens and impersonate any account.
JWT_SECRET = os.environ.get('JWT_SECRET')
JWT_ALGORITHM = "HS256"
if not JWT_SECRET or len(JWT_SECRET) < 32:
    raise RuntimeError(
        "JWT_SECRET must be set in backend/.env (or the environment) and be at least "
        "32 characters long. Refusing to start with a missing or weak secret."
    )

# --- League / Rewards configuration (badge rewards, no in-app payment) ---
# Admin emails come from the environment (comma-separated), never from source code.
# A user whose email is listed here is granted the 'admin' role on registration/login.
_admin_env = os.environ.get('ADMIN_EMAILS', '')
ADMIN_EMAILS = {e.strip().lower() for e in _admin_env.split(',') if e.strip()}

# Google OAuth 2.0 credentials (from /run/base44/app.env)
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
LEAGUE_DURATION_DAYS = 3
LEAGUE_MIN_PLAYERS = 200
LEAGUE_POINTS = {"win": 10, "draw": 4, "loss": 0}
LEAGUE_CLAIM_URL = os.environ.get('LEAGUE_CLAIM_URL', '') or ''
BADGE_TABLE = [
    {"rank": 1, "badges": 1000},
    {"rank": 2, "badges": 500},
    {"rank": 3, "badges": 500},
    {"rank": 4, "badges": 500},
    {"rank": 5, "badges": 500},
    {"rank": 6, "badges": 500},
    {"rank": 7, "badges": 500},
    {"rank": 8, "badges": 500},
    {"rank": 9, "badges": 500},
    {"rank": 10, "badges": 500},
]

# Simple in-memory rate limiter (best-effort, single-process)
_rate_buckets: Dict[str, List[float]] = {}

def rate_limit(key: str, max_calls: int, window_seconds: int):
    now = _time.time()
    cutoff = now - window_seconds
    bucket = _rate_buckets.get(key, [])
    bucket = [t for t in bucket if t >= cutoff]
    if len(bucket) >= max_calls:
        raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")
    bucket.append(now)
    _rate_buckets[key] = bucket

# Create the main app without a prefix
app = FastAPI(title="Royal Chess API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

def hash_password(password: str) -> str:
    """Hash a password with bcrypt (salted, slow, resistant to offline cracking)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against a stored hash.

    Supports bcrypt hashes. Legacy SHA-256 (unsalted) hashes are still accepted only
    to allow existing accounts to log in; they are re-hashed to bcrypt on next login.
    """
    if not stored_hash:
        return False
    if stored_hash.startswith("$2"):
        try:
            return bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8"))
        except ValueError:
            return False
    # Legacy unsalted SHA-256 fallback for pre-migration accounts
    legacy = hashlib.sha256(password.encode()).hexdigest()
    return hmac.compare_digest(legacy, stored_hash)

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "").strip()
    # JWT auth (email/password, guest, and Google logins all use JWT)
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id:
            user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
            if user:
                return user
    except Exception:
        pass
    return None

async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Auth-required dependency. Reuses the same token logic as optional variant."""
    user = await get_current_user_optional(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user

async def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    email = (current_user.get("email") or "").lower()
    # DB role field is authoritative; env-configured admin emails act as bootstrap/fallback.
    if current_user.get("role") == "admin" or email in ADMIN_EMAILS:
        return current_user
    # Re-fetch from DB in case the role was granted after the token was issued.
    db_user = await db.users.find_one({"id": current_user.get("id")}, {"_id": 0})
    if db_user and db_user.get("role") == "admin":
        return current_user
    raise HTTPException(status_code=403, detail="Admin access required")

# --- Pydantic Models ---
class UserRegister(BaseModel):
    email: str
    password: str
    username: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class GuestLogin(BaseModel):
    username: Optional[str] = None

class GoogleAuthRequest(BaseModel):
    code: str
    redirect_uri: str

class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    avatar_id: Optional[str] = None
    avatar_url: Optional[str] = None
    board_theme: Optional[str] = None
    piece_theme: Optional[str] = None
    difficulty: Optional[str] = None
    sound_enabled: Optional[bool] = None
    vibration_enabled: Optional[bool] = None
    hints_enabled: Optional[bool] = None
    move_confirm: Optional[bool] = None

class AIMoveRequest(BaseModel):
    fen: str
    difficulty: Optional[str] = "easy"

class HintRequest(BaseModel):
    fen: str

class RecordGameRequest(BaseModel):
    mode: str # 'computer', 'friend', 'online', 'puzzle'
    opponent_name: str
    player_color: str # 'white' or 'black'
    result: str # 'win', 'loss', 'draw'
    reason: str # 'checkmate', 'resignation', 'timeout', 'stalemate', 'draw'
    moves_count: int
    duration_seconds: Optional[int] = 0
    pgn: Optional[str] = ""
    difficulty: Optional[str] = "easy"

class CreateRoomRequest(BaseModel):
    color_preference: Optional[str] = "white" # 'white', 'black', 'random'
    time_minutes: Optional[int] = 10

class JoinRoomRequest(BaseModel):
    room_code: str

class MatchmakingRequest(BaseModel):
    time_minutes: Optional[int] = 10
    color_preference: Optional[str] = "random" # 'white', 'black', 'random'

class MakeRoomMoveRequest(BaseModel):
    from_sq: str
    to_sq: str
    promotion: Optional[str] = None

class CompletePuzzleRequest(BaseModel):
    puzzle_id: str
    solved: bool

class SendChatRequest(BaseModel):
    text: str

# --- League configuration note: badge rewards (no in-app wallet/payment) ---

# --- Helper function to initialize demo user if not exists ---
@app.on_event("startup")
async def init_db():
    try:
        # Indexes for League / Rewards system
        await db.league_participants.create_index([("league_id", 1), ("user_id", 1)], unique=True)
        await db.match_point_logs.create_index("match_id", unique=True)
        await db.leagues.create_index("status")
    except Exception as e:
        logging.error(f"Error creating league indexes: {e}")
    try:
        # Ensure there is always an active league and start the auto-rotation scheduler
        await ensure_active_league()
        asyncio.create_task(league_scheduler())
    except Exception as e:
        logging.error(f"Error starting league scheduler: {e}")
    try:
        # Seed a few leaderboard bot/players for realistic ranking
        leaderboard_count = await db.users.count_documents({})
        if leaderboard_count <= 2:
            sample_players = [
                {"id": "bot_gm_1", "email": "magnus@chess.ai", "username": "Grandmaster Magnus", "rating": 2180, "best_rating": 2240, "games_played": 420, "wins": 360, "losses": 30, "draws": 30, "avatar_id": "king_gold", "joined_date": "Joined Jan 2024"},
                {"id": "bot_gm_2", "email": "hikaru@chess.ai", "username": "HikaruSpeed", "rating": 2040, "best_rating": 2110, "games_played": 350, "wins": 280, "losses": 45, "draws": 25, "avatar_id": "queen_gold", "joined_date": "Joined Feb 2024"},
                {"id": "bot_gm_3", "email": "kasparov@chess.ai", "username": "TacticsMaster", "rating": 1820, "best_rating": 1900, "games_played": 190, "wins": 130, "losses": 40, "draws": 20, "avatar_id": "rook_gold", "joined_date": "Joined Mar 2024"},
                {"id": "bot_gm_4", "email": "arena_champ@chess.ai", "username": "ObsidianKnight", "rating": 1540, "best_rating": 1600, "games_played": 88, "wins": 55, "losses": 25, "draws": 8, "avatar_id": "knight_gold", "joined_date": "Joined Apr 2024"},
            ]
            for p in sample_players:
                exists = await db.users.find_one({"id": p["id"]})
                if not exists:
                    p["role"] = "user"
                    p["password_hash"] = hash_password("pass123")
                    p["created_at"] = datetime.now(timezone.utc).isoformat()
                    await db.users.insert_one(p)
    except Exception as e:
        logging.error(f"Error seeding DB: {e}")

# --- Auth Routes ---
@api_router.post("/auth/register")
async def register(req: UserRegister):
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    
    user_id = str(uuid.uuid4())
    username = req.username or req.email.split("@")[0].capitalize()
    now_str = datetime.now(timezone.utc).strftime("%B %Y")
    
    user_doc = {
        "id": user_id,
        "email": req.email.lower(),
        "username": username,
        "role": "admin" if req.email.lower() in ADMIN_EMAILS else "user",
        "password_hash": hash_password(req.password),
        "rating": 1200,
        "best_rating": 1200,
        "games_played": 0,
        "wins": 0,
        "losses": 0,
        "draws": 0,
        "puzzles_solved": 0,
        "avatar_id": "knight_gold",
        "board_theme": "wood",
        "piece_theme": "classic",
        "difficulty": "easy",
        "sound_enabled": True,
        "vibration_enabled": True,
        "hints_enabled": True,
        "move_confirm": False,
        "joined_date": f"Joined {now_str}",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id, req.email.lower())
    
    # Return user without sensitive data
    user_response = {k: v for k, v in user_doc.items() if k not in ["_id", "password_hash"]}
    return {"token": token, "user": user_response}

@api_router.post("/auth/login")
async def login(req: UserLogin):
    user = await db.users.find_one({"email": req.email.lower()})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    stored_hash = user.get("password_hash") or ""
    if not verify_password(req.password, stored_hash):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    # Upgrade legacy SHA-256 hashes to bcrypt on successful login.
    if not stored_hash.startswith("$2"):
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"password_hash": hash_password(req.password)}},
        )

    # Re-grant admin role from env list (covers users registered before role existed).
    if not user.get("role") and (user.get("email") or "").lower() in ADMIN_EMAILS:
        await db.users.update_one({"id": user["id"]}, {"$set": {"role": "admin"}})

    token = create_token(user["id"], user["email"])
    user_response = {k: v for k, v in user.items() if k not in ["_id", "password_hash"]}
    return {"token": token, "user": user_response}

@api_router.post("/auth/guest")
async def guest_login(req: GuestLogin):
    guest_id = f"guest_{uuid.uuid4().hex[:8]}"
    guest_num = random.randint(1000, 9999)
    username = req.username or f"Guest_{guest_num}"
    now_str = datetime.now(timezone.utc).strftime("%B %Y")
    
    user_doc = {
        "id": guest_id,
        "email": f"{guest_id}@guest.chessarena.io",
        "username": username,
        "role": "user",
        "password_hash": "",
        "is_guest": True,
        "rating": 1200,
        "best_rating": 1200,
        "games_played": 0,
        "wins": 0,
        "losses": 0,
        "draws": 0,
        "puzzles_solved": 0,
        "avatar_id": "pawn_gold",
        "board_theme": "wood",
        "piece_theme": "classic",
        "difficulty": "easy",
        "sound_enabled": True,
        "vibration_enabled": True,
        "hints_enabled": True,
        "move_confirm": False,
        "joined_date": f"Joined {now_str}",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    token = create_token(guest_id, user_doc["email"])
    user_response = {k: v for k, v in user_doc.items() if k not in ["_id", "password_hash"]}
    return {"token": token, "user": user_response}

@api_router.get("/auth/google-config")
async def google_config():
    """Return the Google OAuth client ID for the frontend."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    return {"client_id": GOOGLE_CLIENT_ID}


@api_router.post("/auth/google")
async def google_auth(req: GoogleAuthRequest):
    """Exchange a Google OAuth authorization code for a JWT."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            token_resp = await http_client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": req.code,
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "redirect_uri": req.redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
    except Exception:
        raise HTTPException(status_code=401, detail="Could not complete Google authentication")

    if token_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired Google authorization code")

    tokens = token_resp.json()
    access_token = tokens.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Google did not return an access token")

    try:
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            user_resp = await http_client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
    except Exception:
        raise HTTPException(status_code=401, detail="Could not fetch Google user info")

    if user_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Failed to get Google user info")

    data = user_resp.json()
    email = (data.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=401, detail="Google account has no email")

    google_name = data.get("name") or email.split("@")[0].capitalize()
    google_picture = data.get("picture")
    provider_id = data.get("id")

    # Upsert user by email — never create duplicates
    existing = await db.users.find_one({"email": email}, {"_id": 0, "password_hash": 0})
    if existing:
        user_id = existing["id"]
        google_fields = {
            "auth_provider": "google",
            "google_id": provider_id,
            "google_name": google_name,
        }
        if google_picture:
            google_fields["picture"] = google_picture
        await db.users.update_one({"id": user_id}, {"$set": google_fields})
        user_response = {**existing, **google_fields}
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        now_str = datetime.now(timezone.utc).strftime("%B %Y")
        user_doc = {
            "id": user_id,
            "email": email,
            "username": google_name,
            "role": "admin" if email in ADMIN_EMAILS else "user",
            "auth_provider": "google",
            "google_id": provider_id,
            "google_name": google_name,
            "picture": google_picture,
            "rating": 1200,
            "best_rating": 1200,
            "games_played": 0,
            "wins": 0,
            "losses": 0,
            "draws": 0,
            "puzzles_solved": 0,
            "avatar_id": "knight_gold",
            "board_theme": "wood",
            "piece_theme": "classic",
            "difficulty": "easy",
            "sound_enabled": True,
            "vibration_enabled": True,
            "hints_enabled": True,
            "move_confirm": False,
            "joined_date": f"Joined {now_str}",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user_doc)
        user_response = {k: v for k, v in user_doc.items() if k != "_id"}

    token = create_token(user_id, email)
    return {"token": token, "user": user_response}

@api_router.get("/auth/me")
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    return current_user

@api_router.put("/auth/profile")
async def update_profile(req: UserProfileUpdate, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    
    update_data = {}
    for k, v in req.dict(exclude_unset=True).items():
        if v is not None:
            update_data[k] = v
            
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
        
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return updated or {"success": True}


class AvatarUpload(BaseModel):
    image: str  # data URL (data:image/...;base64,...) or raw base64 string

ALLOWED_AVATAR_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_AVATAR_BYTES = 3 * 1024 * 1024  # 3MB decoded


@api_router.post("/auth/avatar")
async def upload_avatar(req: AvatarUpload, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Store a user-uploaded profile picture as a base64 data URL on the user doc."""
    import base64 as _base64
    import re as _re

    raw = (req.image or "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="No image provided.")

    mime = "image/jpeg"
    b64 = raw
    if raw.startswith("data:"):
        header, _, b64 = raw.partition(",")
        m = _re.match(r"data:([^;]+);base64", header)
        if m:
            mime = m.group(1).lower()

    if mime not in ALLOWED_AVATAR_MIME:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image format. Please use JPG, PNG, WEBP or GIF.",
        )

    try:
        decoded = _base64.b64decode(b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image data.")

    if len(decoded) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=400, detail="Image too large. Maximum size is 3MB.")

    data_url = f"data:{mime};base64,{_base64.b64encode(decoded).decode()}"
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"avatar_url": data_url}})
    return {"avatar_url": data_url}

# --- Game Recording & Stats Routes ---
@api_router.post("/games/record")
async def record_game(req: RecordGameRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    
    # Calculate Elo change
    elo_delta = 0
    if req.result == "win":
        elo_delta = 15 if req.difficulty == "hard" or req.mode == "online" else 10
    elif req.result == "loss":
        elo_delta = -10 if req.mode == "online" else -5
    else: # draw
        elo_delta = 2
        
    # Fetch current user stats
    user = await db.users.find_one({"id": user_id})
    current_rating = user.get("rating", 1200) if user else 1200
    new_rating = max(400, current_rating + elo_delta)
    best_rating = max(user.get("best_rating", 1200) if user else 1200, new_rating)
    
    game_id = str(uuid.uuid4())
    game_record = {
        "id": game_id,
        "user_id": user_id,
        "mode": req.mode,
        "opponent_name": req.opponent_name,
        "player_color": req.player_color,
        "result": req.result,
        "reason": req.reason,
        "moves_count": req.moves_count,
        "duration_seconds": req.duration_seconds,
        "difficulty": req.difficulty,
        "pgn": req.pgn,
        "rating_before": current_rating,
        "rating_after": new_rating,
        "elo_delta": elo_delta,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.game_history.insert_one(game_record)
    
    # Update user stats
    inc_wins = 1 if req.result == "win" else 0
    inc_losses = 1 if req.result == "loss" else 0
    inc_draws = 1 if req.result == "draw" else 0
    
    await db.users.update_one(
        {"id": user_id},
        {
            "$inc": {"games_played": 1, "wins": inc_wins, "losses": inc_losses, "draws": inc_draws},
            "$set": {"rating": new_rating, "best_rating": best_rating}
        }
    )
    
    game_record_clean = {k: v for k, v in game_record.items() if k != "_id"}
    return {
        "game": game_record_clean,
        "new_rating": new_rating,
        "elo_delta": elo_delta,
        "best_rating": best_rating
    }

@api_router.get("/games/history")
async def get_game_history(current_user: Dict[str, Any] = Depends(get_current_user), limit: int = 20):
    user_id = current_user["id"]
    cursor = db.game_history.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(limit)
    games = await cursor.to_list(limit)
    return games

# --- Chess Engine AI & Hint Routes ---
@api_router.post("/chess/ai-move")
async def get_ai_chess_move(req: AIMoveRequest):
    try:
        result = get_best_move(req.fen, req.difficulty or "easy")
        return result
    except Exception as e:
        logging.error(f"AI move calculation error: {e}")
        # Fallback: choose random legal move with chess library
        try:
            b = chess.Board(req.fen)
            legal = list(b.legal_moves)
            if legal:
                mv = random.choice(legal)
                return {
                    "move": {"from": chess.square_name(mv.from_square), "to": chess.square_name(mv.to_square), "promotion": None},
                    "uci": mv.uci(),
                    "san": b.san(mv),
                    "eval": 0.0,
                    "is_check": b.gives_check(mv),
                    "is_game_over": False
                }
        except Exception:
            pass
        raise HTTPException(status_code=400, detail="Invalid FEN or move state")

@api_router.post("/chess/hint")
async def get_chess_hint(req: HintRequest):
    try:
        result = get_hint(req.fen)
        return result
    except Exception as e:
        logging.error(f"Hint calculation error: {e}")
        raise HTTPException(status_code=400, detail="Unable to calculate hint for current position")

# --- Puzzles Routes ---
@api_router.get("/puzzles")
async def get_puzzles():
    return CURATED_PUZZLES

@api_router.get("/puzzles/daily")
async def get_daily_puzzle():
    # Deterministic daily puzzle index based on day of year
    day_of_year = datetime.now(timezone.utc).timetuple().tm_yday
    puzzle_idx = day_of_year % len(CURATED_PUZZLES)
    daily = CURATED_PUZZLES[puzzle_idx].copy()
    daily["is_daily"] = True
    daily["reward_elo"] = 25
    return daily

@api_router.post("/puzzles/complete")
async def complete_puzzle(req: CompletePuzzleRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    if req.solved:
        await db.users.update_one(
            {"id": user_id},
            {
                "$inc": {"puzzles_solved": 1, "rating": 15},
                "$max": {"best_rating": 1215}
            }
        )
    return {"success": True, "solved": req.solved, "bonus_elo": 15 if req.solved else 0}

# --- Leaderboard Route ---
@api_router.get("/leaderboard")
async def get_leaderboard(limit: int = 10):
    cursor = db.users.find({}, {"_id": 0, "password_hash": 0}).sort("rating", -1).limit(limit)
    players = await cursor.to_list(limit)
    return players

# --- Online Multiplayer Rooms ---
@api_router.post("/online/rooms/create")
async def create_room(req: CreateRoomRequest, current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    user_id = current_user.get("id") if current_user else "guest_" + uuid.uuid4().hex[:6]
    username = current_user.get("username") if current_user else "Player 1"
    user_rating = current_user.get("rating", 1200) if current_user else 1200
    
    # 6-character room code
    room_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    assigned_white = True
    if req.color_preference == "black":
        assigned_white = False
    elif req.color_preference == "random":
        assigned_white = random.choice([True, False])
        
    room_doc = {
        "room_code": room_code,
        "status": "waiting", # 'waiting', 'active', 'completed'
        "fen": chess.STARTING_FEN,
        "turn": "w",
        "white_player": {"id": user_id, "name": username, "rating": user_rating} if assigned_white else None,
        "black_player": {"id": user_id, "name": username, "rating": user_rating} if not assigned_white else None,
        "time_seconds": req.time_minutes * 60,
        "white_time": req.time_minutes * 60,
        "black_time": req.time_minutes * 60,
        "last_move": None,
        "move_history": [],
        "winner": None,
        "end_reason": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.rooms.insert_one(room_doc)
    
    clean_room = {k: v for k, v in room_doc.items() if k != "_id"}
    return clean_room

@api_router.post("/online/rooms/join")
async def join_room(req: JoinRoomRequest, current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    user_id = current_user.get("id") if current_user else "guest_" + uuid.uuid4().hex[:6]
    username = current_user.get("username") if current_user else "Guest Player"
    user_rating = current_user.get("rating", 1200) if current_user else 1200
    
    room = await db.rooms.find_one({"room_code": req.room_code.upper()})
    if not room:
        raise HTTPException(status_code=404, detail="Game room not found. Check room code.")
    
    if room.get("status") == "completed":
        raise HTTPException(status_code=400, detail="This game room has already concluded.")
        
    update_fields = {}
    # Assign empty slot
    if not room.get("white_player"):
        update_fields["white_player"] = {"id": user_id, "name": username, "rating": user_rating}
        update_fields["status"] = "active"
    elif not room.get("black_player") and room.get("white_player", {}).get("id") != user_id:
        update_fields["black_player"] = {"id": user_id, "name": username, "rating": user_rating}
        update_fields["status"] = "active"
        
    if update_fields:
        await db.rooms.update_one({"room_code": req.room_code.upper()}, {"$set": update_fields})
        
    updated_room = await db.rooms.find_one({"room_code": req.room_code.upper()}, {"_id": 0})
    return updated_room

@api_router.get("/online/rooms/{room_code}")
async def get_room_state(room_code: str):
    room = await db.rooms.find_one({"room_code": room_code.upper()}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Game room not found")
    return room

@api_router.post("/online/rooms/{room_code}/move")
async def make_room_move(
    room_code: str,
    req: MakeRoomMoveRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    room = await db.rooms.find_one({"room_code": room_code.upper()})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if room.get("status") == "completed":
        raise HTTPException(status_code=400, detail="This game room has already concluded.")

    uid = current_user.get("id")
    white = room.get("white_player") or {}
    black = room.get("black_player") or {}
    if uid not in (white.get("id"), black.get("id")):
        raise HTTPException(status_code=403, detail="You are not a player in this game")

    if room.get("status") != "active":
        raise HTTPException(status_code=400, detail="Waiting for an opponent before moves can be made")

    # Turn check: only the player whose colour it is may move.
    side = "white" if room.get("turn", "w") == "w" else "black"
    player = white if side == "white" else black
    if player.get("id") != uid:
        raise HTTPException(status_code=403, detail="Not your turn")

    current_fen = room.get("fen", chess.STARTING_FEN)
    board = chess.Board(current_fen)
    
    move_uci = f"{req.from_sq}{req.to_sq}{req.promotion or ''}"
    try:
        move = chess.Move.from_uci(move_uci)
        if move not in board.legal_moves:
            raise HTTPException(status_code=400, detail="Illegal move")
            
        san = board.san(move)
        board.push(move)
        new_fen = board.fen()
        
        status = "active"
        winner = None
        end_reason = None
        if board.is_checkmate():
            status = "completed"
            winner = "white" if board.turn == chess.BLACK else "black"
            end_reason = "checkmate"
        elif board.is_stalemate() or board.is_insufficient_material() or board.can_claim_threefold_repetition():
            status = "completed"
            winner = "draw"
            end_reason = "stalemate_or_draw"
            
        last_move = {"from": req.from_sq, "to": req.to_sq, "san": san, "uci": move_uci}
        
        await db.rooms.update_one(
            {"room_code": room_code.upper()},
            {
                "$set": {
                    "fen": new_fen,
                    "turn": "w" if board.turn == chess.WHITE else "b",
                    "last_move": last_move,
                    "status": status,
                    "winner": winner,
                    "end_reason": end_reason
                },
                "$push": {"move_history": last_move}
            }
        )
        
        updated = await db.rooms.find_one({"room_code": room_code.upper()}, {"_id": 0})
        # Award league points strictly server-side when the game concludes
        if updated and updated.get("status") == "completed":
            await award_league_points(updated)
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Move error in room {room_code}: {e}")
        raise HTTPException(status_code=400, detail="Invalid move execution")

# --- Resign an online room game (server-side result) ---
@api_router.post("/online/rooms/{room_code}/resign")
async def resign_room(room_code: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    room = await db.rooms.find_one({"room_code": room_code.upper()})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.get("status") == "completed":
        return await db.rooms.find_one({"room_code": room_code.upper()}, {"_id": 0})

    uid = current_user.get("id")
    white = room.get("white_player") or {}
    black = room.get("black_player") or {}
    if uid not in [white.get("id"), black.get("id")]:
        raise HTTPException(status_code=403, detail="You are not a player in this game")

    winner = "black" if uid == white.get("id") else "white"
    await db.rooms.update_one(
        {"room_code": room_code.upper()},
        {"$set": {"status": "completed", "winner": winner, "end_reason": "resignation"}},
    )
    updated = await db.rooms.find_one({"room_code": room_code.upper()}, {"_id": 0})
    if updated:
        await award_league_points(updated)
    return updated

# --- In-Game Chat (scoped to a single match room) ---
@api_router.post("/online/rooms/{room_code}/chat")
async def send_chat_message(
    room_code: str,
    req: SendChatRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    room = await db.rooms.find_one({"room_code": room_code.upper()})
    if not room:
        raise HTTPException(status_code=404, detail="Game room not found")

    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    text = text[:500]  # keep messages reasonable

    sender_id = current_user.get("id") if current_user else "guest"
    sender_name = current_user.get("username") if current_user else "Player"

    message = {
        "id": str(uuid.uuid4()),
        "sender_id": sender_id,
        "sender_name": sender_name,
        "text": text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.rooms.update_one(
        {"room_code": room_code.upper()},
        {"$push": {"chat_messages": message}},
    )
    return message

@api_router.get("/online/rooms/{room_code}/chat")
async def get_chat_messages(room_code: str):
    room = await db.rooms.find_one(
        {"room_code": room_code.upper()}, {"_id": 0, "chat_messages": 1}
    )
    if not room:
        raise HTTPException(status_code=404, detail="Game room not found")
    return room.get("chat_messages", [])

# --- Online Matchmaking (auto-pairing queue) ---
# In-memory matchmaking state (single-process server). Players are queued and
# automatically paired with the next available opponent.

_match_queue: List[Dict[str, Any]] = []
_match_rooms: Dict[str, Dict[str, Any]] = {}  # user_id -> {"room_code": str, "matched_at": float}
MATCH_QUEUE_TTL_SECONDS = 90
MATCH_ROOM_TTL_SECONDS = 300

def _prune_match_queue():
    now = _time.time()
    global _match_queue
    _match_queue = [e for e in _match_queue if now - e["queued_at"] < MATCH_QUEUE_TTL_SECONDS]
    stale = [uid for uid, m in _match_rooms.items() if now - m["matched_at"] > MATCH_ROOM_TTL_SECONDS]
    for uid in stale:
        _match_rooms.pop(uid, None)

def _identity_for(current_user: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if current_user:
        return {
            "id": current_user.get("id"),
            "name": current_user.get("username") or "Player",
            "rating": current_user.get("rating", 1200),
        }
    return {"id": "guest_" + uuid.uuid4().hex[:6], "name": "Guest Player", "rating": 1200}

def _pick_white(pref: str) -> bool:
    if pref == "white":
        return True
    if pref == "black":
        return False
    return random.choice([True, False])

async def _create_match_room(player_a: Dict[str, Any], player_b: Dict[str, Any], a_is_white: bool, time_minutes: int) -> dict:
    room_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    room_doc = {
        "room_code": room_code,
        "status": "active",
        "source": "matchmaking",
        "fen": chess.STARTING_FEN,
        "turn": "w",
        "white_player": player_a if a_is_white else player_b,
        "black_player": player_b if a_is_white else player_a,
        "time_seconds": time_minutes * 60,
        "white_time": time_minutes * 60,
        "black_time": time_minutes * 60,
        "last_move": None,
        "move_history": [],
        "winner": None,
        "end_reason": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.rooms.insert_one(room_doc)
    return {k: v for k, v in room_doc.items() if k != "_id"}

async def _match_response(uid: str) -> Optional[Dict[str, Any]]:
    match = _match_rooms.get(uid)
    room_code = match["room_code"] if match else None
    if not room_code:
        return None
    room = await db.rooms.find_one({"room_code": room_code}, {"_id": 0})
    if not room:
        _match_rooms.pop(uid, None)
        return None
    white = room.get("white_player") or {}
    black = room.get("black_player") or {}
    if uid == white.get("id"):
        return {"status": "matched", "room_code": room_code, "opponent": black, "color": "white"}
    return {"status": "matched", "room_code": room_code, "opponent": white, "color": "black"}

@api_router.post("/online/matchmaking/queue")
async def matchmaking_queue(req: MatchmakingRequest, current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    me = _identity_for(current_user)
    uid = me["id"]
    _prune_match_queue()

    # Already matched with someone -> hand over the room immediately
    resp = await _match_response(uid)
    if resp:
        return resp

    # Already waiting in the queue
    if any(e["user_id"] == uid for e in _match_queue):
        return {"status": "waiting", "in_queue": True}

    # Try to pair with the next available opponent
    now = _time.time()
    for idx, opp in enumerate(_match_queue):
        if opp["user_id"] == uid:
            continue
        _match_queue.pop(idx)

        me_white = _pick_white(req.color_preference or "random")
        room = await _create_match_room(
            me, opp["player"], me_white, req.time_minutes or 10
        )
        _match_rooms[uid] = {"room_code": room["room_code"], "matched_at": now}
        _match_rooms[opp["user_id"]] = {"room_code": room["room_code"], "matched_at": now}
        opponent = room["black_player"] if me_white else room["white_player"]
        return {
            "status": "matched",
            "room_code": room["room_code"],
            "opponent": opponent,
            "color": "white" if me_white else "black",
        }

    # No opponent available yet -> join the queue
    _match_queue.append({
        "user_id": uid,
        "player": me,
        "color_preference": req.color_preference or "random",
        "time_minutes": req.time_minutes or 10,
        "queued_at": now,
    })
    return {"status": "waiting", "in_queue": True}

@api_router.get("/online/matchmaking/status")
async def matchmaking_status(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    me = _identity_for(current_user)
    uid = me["id"]
    _prune_match_queue()

    resp = await _match_response(uid)
    if resp:
        return resp

    if any(e["user_id"] == uid for e in _match_queue):
        return {"status": "waiting", "in_queue": True}

    return {"status": "expired", "detail": "Matchmaking session ended. Please search again."}

@api_router.post("/online/matchmaking/leave")
async def matchmaking_leave(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    me = _identity_for(current_user)
    uid = me["id"]
    global _match_queue
    _match_queue = [e for e in _match_queue if e["user_id"] != uid]
    _match_rooms.pop(uid, None)
    return {"status": "left"}

# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# ==========================================================================
#  ROYAL CHESS LEAGUE  (points-based; badge rewards, no in-app payment)
# ==========================================================================

def _now():
    return datetime.now(timezone.utc)

def _parse_dt(value):
    if isinstance(value, datetime):
        dt = value
    else:
        dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt

async def ensure_active_league():
    """Guarantee there is always exactly one 'active' league; create one if missing."""
    active = await db.leagues.find_one({"status": "active"})
    if active:
        return {k: v for k, v in active.items() if k != "_id"}
    now = _now()
    league_id = str(uuid.uuid4())
    doc = {
        "id": league_id,
        "title": "Royal Chess League",
        "status": "active",
        "start_date": now.isoformat(),
        "end_date": (now + timedelta(days=LEAGUE_DURATION_DAYS)).isoformat(),
        "min_players": LEAGUE_MIN_PLAYERS,
        "badges": BADGE_TABLE,
        "winners": [],
        "created_at": now.isoformat(),
        "completed_at": None,
    }
    await db.leagues.insert_one(doc)
    logging.info(f"Created new active league {league_id}")
    return {k: v for k, v in doc.items() if k != "_id"}

async def complete_league(league):
    """Freeze the leaderboard, compute winners + badge rewards (only ranks with a badge). NO wallet/payment."""
    league_id = league["id"]
    top = await db.league_participants.find(
        {"league_id": league_id}
    ).sort([("points", -1), ("wins", -1)]).limit(10).to_list(10)

    winners = []
    for idx, p in enumerate(top):
        rank = idx + 1
        badges = next((x["badges"] for x in BADGE_TABLE if x["rank"] == rank), 0)
        if badges <= 0:
            continue
        winners.append({
            "rank": rank,
            "user_id": p["user_id"],
            "username": p.get("username", "Player"),
            "points": p.get("points", 0),
            "wins": p.get("wins", 0),
            "badges": badges,
        })

    await db.leagues.update_one(
        {"id": league_id},
        {"$set": {"status": "completed", "winners": winners, "completed_at": _now().isoformat()}},
    )
    logging.info(f"Completed league {league_id} with {len(winners)} winners")
    return winners

async def check_and_rotate_leagues():
    """If the active league has passed its end_date, complete it and open a fresh one."""
    active = await db.leagues.find_one({"status": "active"})
    if active:
        if _now() >= _parse_dt(active["end_date"]):
            await complete_league(active)
            active = None
    if not active:
        await ensure_active_league()

async def league_scheduler():
    """Lightweight self-contained cron: checks league rotation every 60s."""
    while True:
        try:
            await check_and_rotate_leagues()
        except Exception as e:
            logging.error(f"league_scheduler error: {e}")
        await asyncio.sleep(60)

async def award_league_points(room):
    """SERVER-SIDE ONLY point awarding. Never trusts client input.
    Idempotent via match_point_logs.match_id unique index. Only registered participants earn.
    """
    try:
        if room.get("status") != "completed":
            return
        winner = room.get("winner")  # 'white' | 'black' | 'draw'
        if winner not in ("white", "black", "draw"):
            return
        white = room.get("white_player") or {}
        black = room.get("black_player") or {}
        wid, bid = white.get("id"), black.get("id")
        # Need two distinct real (non-guest) players
        if not wid or not bid or wid == bid:
            return
        if str(wid).startswith("guest_") or str(bid).startswith("guest_"):
            # Guests can still play; they simply won't be league participants, so no points.
            pass

        league = await db.leagues.find_one({"status": "active"})
        if not league:
            return
        league_id = league["id"]

        # Idempotency: one award per room game (match_id = room_code)
        match_id = room.get("room_code")
        log_doc = {
            "id": str(uuid.uuid4()),
            "match_id": match_id,
            "league_id": league_id,
            "room_code": room.get("room_code"),
            "white_id": wid,
            "black_id": bid,
            "winner_id": None if winner == "draw" else (wid if winner == "white" else bid),
            "loser_id": None if winner == "draw" else (bid if winner == "white" else wid),
            "result": winner,
            "awarded_at": _now().isoformat(),
        }
        try:
            await db.match_point_logs.insert_one(log_doc)
        except DuplicateKeyError:
            logging.info(f"Points already awarded for match {match_id}; skipping.")
            return

        # Only players registered in the active league earn points (participation verified: they are the room players)
        parts = await db.league_participants.find(
            {"league_id": league_id, "user_id": {"$in": [wid, bid]}}
        ).to_list(10)
        registered = {p["user_id"] for p in parts}

        async def apply(uid, pts, res):
            if uid not in registered:
                return
            inc = {"points": pts, "games_played": 1}
            inc["wins" if res == "win" else "draws" if res == "draw" else "losses"] = 1
            await db.league_participants.update_one(
                {"league_id": league_id, "user_id": uid},
                {"$inc": inc, "$set": {"last_played_at": _now().isoformat()}},
            )

        if winner == "draw":
            await apply(wid, LEAGUE_POINTS["draw"], "draw")
            await apply(bid, LEAGUE_POINTS["draw"], "draw")
        elif winner == "white":
            await apply(wid, LEAGUE_POINTS["win"], "win")
            await apply(bid, LEAGUE_POINTS["loss"], "loss")
        else:  # black
            await apply(bid, LEAGUE_POINTS["win"], "win")
            await apply(wid, LEAGUE_POINTS["loss"], "loss")
    except Exception as e:
        logging.error(f"award_league_points error: {e}")

async def _get_my_rank(league_id, user_id):
    me = await db.league_participants.find_one({"league_id": league_id, "user_id": user_id}, {"_id": 0})
    if not me:
        return None, None
    higher = await db.league_participants.count_documents({
        "league_id": league_id,
        "$or": [
            {"points": {"$gt": me.get("points", 0)}},
            {"points": me.get("points", 0), "wins": {"$gt": me.get("wins", 0)}},
        ],
    })
    return higher + 1, me

# ---------------- League Endpoints ----------------
@api_router.get("/league/current")
async def league_current(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    await check_and_rotate_leagues()
    league = await ensure_active_league()
    participant_count = await db.league_participants.count_documents({"league_id": league["id"]})
    end_dt = _parse_dt(league["end_date"])
    time_left = max(0, int((end_dt - _now()).total_seconds()))

    joined = False
    my_rank = None
    my_points = 0
    if current_user:
        rank, me = await _get_my_rank(league["id"], current_user["id"])
        if me:
            joined = True
            my_rank = rank
            my_points = me.get("points", 0)

    return {
        "league": league,
        "participant_count": participant_count,
        "min_players": LEAGUE_MIN_PLAYERS,
        "time_left_seconds": time_left,
        "points_rule": LEAGUE_POINTS,
        "badges": BADGE_TABLE,
        "claim_url": LEAGUE_CLAIM_URL,
        "joined": joined,
        "my_rank": my_rank,
        "my_points": my_points,
    }

@api_router.post("/league/register")
async def league_register(current_user: Dict[str, Any] = Depends(get_current_user)):
    rate_limit(f"league_register:{current_user['id']}", max_calls=10, window_seconds=60)
    await check_and_rotate_leagues()
    league = await ensure_active_league()
    doc = {
        "id": str(uuid.uuid4()),
        "league_id": league["id"],
        "user_id": current_user["id"],
        "username": current_user.get("username", "Player"),
        "avatar_id": current_user.get("avatar_id", "knight_gold"),
        "points": 0,
        "games_played": 0,
        "wins": 0,
        "draws": 0,
        "losses": 0,
        "registered_at": _now().isoformat(),
    }
    try:
        await db.league_participants.insert_one(doc)
        already = False
    except DuplicateKeyError:
        already = True
    participant_count = await db.league_participants.count_documents({"league_id": league["id"]})
    return {"success": True, "already_registered": already, "league_id": league["id"], "participant_count": participant_count}

@api_router.get("/league/leaderboard")
async def league_leaderboard(limit: int = 50, current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    await check_and_rotate_leagues()
    league = await ensure_active_league()
    cursor = db.league_participants.find(
        {"league_id": league["id"]}, {"_id": 0}
    ).sort([("points", -1), ("wins", -1)]).limit(limit)
    players = await cursor.to_list(limit)
    ranked = []
    for i, p in enumerate(players):
        ranked.append({
            "rank": i + 1,
            "user_id": p.get("user_id"),
            "username": p.get("username", "Player"),
            "avatar_id": p.get("avatar_id", "knight_gold"),
            "points": p.get("points", 0),
            "wins": p.get("wins", 0),
            "draws": p.get("draws", 0),
            "losses": p.get("losses", 0),
            "games_played": p.get("games_played", 0),
        })
    my_rank = None
    if current_user:
        r, _me = await _get_my_rank(league["id"], current_user["id"])
        my_rank = r
    return {"league_id": league["id"], "leaderboard": ranked, "my_rank": my_rank}

@api_router.get("/league/me")
async def league_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    await check_and_rotate_leagues()
    league = await ensure_active_league()
    rank, me = await _get_my_rank(league["id"], current_user["id"])
    # Any badges the user won in the most recent completed league
    winnings = await league_my_winnings(current_user)
    return {
        "joined": me is not None,
        "rank": rank,
        "stats": me,
        "recent_winnings": winnings.get("winnings", []),
    }

@api_router.get("/league/my-winnings")
async def league_my_winnings(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns any Top-10 badge rewards the user has won in completed leagues."""
    uid = current_user["id"]
    cursor = db.leagues.find(
        {"status": "completed", "winners.user_id": uid}, {"_id": 0}
    ).sort([("completed_at", -1)]).limit(10)
    completed = await cursor.to_list(10)
    winnings = []
    for lg in completed:
        for w in lg.get("winners", []):
            if w.get("user_id") == uid:
                badges = w.get("badges", 0)
                winnings.append({
                    "league_id": lg["id"],
                    "league_title": lg.get("title", "Royal Chess League"),
                    "rank": w.get("rank"),
                    "points": w.get("points", 0),
                    "badges": badges,
                    "completed_at": lg.get("completed_at"),
                    "message": (
                        f"Congratulations! You won {badges} badges."
                    ),
                })
    return {"winnings": winnings}

# ---------------- Admin Endpoints (external verification/payout is done off-app) ----------------
@api_router.get("/admin/league/overview")
async def admin_league_overview(current_user: Dict[str, Any] = Depends(require_admin)):
    active = await ensure_active_league()
    participant_count = await db.league_participants.count_documents({"league_id": active["id"]})
    top = await db.league_participants.find(
        {"league_id": active["id"]}, {"_id": 0}
    ).sort([("points", -1), ("wins", -1)]).limit(10).to_list(10)
    completed = await db.leagues.find(
        {"status": "completed"}, {"_id": 0}
    ).sort([("completed_at", -1)]).limit(5).to_list(5)
    return {
        "active_league": active,
        "active_participant_count": participant_count,
        "active_top10": top,
        "recent_completed": completed,
    }

@api_router.post("/admin/league/force-complete")
async def admin_league_force_complete(current_user: Dict[str, Any] = Depends(require_admin)):
    """Admin/testing utility: freeze current league now, distribute Top 3, open a new one."""
    active = await db.leagues.find_one({"status": "active"})
    if not active:
        active_clean = await ensure_active_league()
        return {"success": False, "detail": "No active league was running; a new one has been created.", "league_id": active_clean["id"]}
    winners = await complete_league(active)
    new_league = await ensure_active_league()
    return {"success": True, "completed_league_id": active["id"], "winners": winners, "new_league_id": new_league["id"]}



# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
