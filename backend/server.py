from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
import string
import hashlib
import jwt
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import chess

from chess_engine import get_best_move, get_hint, CURATED_PUZZLES, evaluate_board

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'test_database')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get('JWT_SECRET', 'chess_arena_secret_luxury_key_2025')
JWT_ALGORITHM = "HS256"

# Create the main app without a prefix
app = FastAPI(title="Chess Arena API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

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
    try:
        token = authorization.replace("Bearer ", "").strip()
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        return user
    except Exception:
        return None

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

class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    avatar_id: Optional[str] = None
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

class MakeRoomMoveRequest(BaseModel):
    from_sq: str
    to_sq: str
    promotion: Optional[str] = None

class CompletePuzzleRequest(BaseModel):
    puzzle_id: str
    solved: bool

# --- Helper function to initialize demo user if not exists ---
@app.on_event("startup")
async def init_db():
    try:
        # Seed default test account: chessplayer@gmail.com / password123
        demo_user = await db.users.find_one({"email": "chessplayer@gmail.com"})
        if not demo_user:
            user_id = "user_demo_chessplayer"
            now_str = datetime.now(timezone.utc).strftime("%B %Y")
            await db.users.insert_one({
                "id": user_id,
                "email": "chessplayer@gmail.com",
                "username": "ChessPlayer",
                "password_hash": hash_password("password123"),
                "rating": 1200,
                "best_rating": 1200,
                "games_played": 0,
                "wins": 0,
                "losses": 0,
                "draws": 0,
                "puzzles_solved": 0,
                "avatar_id": "knight_gold",
                "joined_date": f"Joined {now_str}",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
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
    
    if user.get("password_hash") != hash_password(req.password):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
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

@api_router.get("/auth/me")
async def get_me(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    if not current_user:
        # Return default guest/demo profile
        demo = await db.users.find_one({"email": "chessplayer@gmail.com"}, {"_id": 0, "password_hash": 0})
        if demo:
            return demo
        return {
            "id": "guest_default",
            "username": "ChessPlayer",
            "email": "chessplayer@gmail.com",
            "rating": 1200,
            "best_rating": 1200,
            "games_played": 0,
            "wins": 0,
            "losses": 0,
            "draws": 0,
            "avatar_id": "knight_gold",
            "joined_date": "Joined May 2024"
        }
    return current_user

@api_router.put("/auth/profile")
async def update_profile(req: UserProfileUpdate, current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    user_id = current_user.get("id") if current_user else "user_demo_chessplayer"
    
    update_data = {}
    for k, v in req.dict(exclude_unset=True).items():
        if v is not None:
            update_data[k] = v
            
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
        
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return updated or {"success": True}

# --- Game Recording & Stats Routes ---
@api_router.post("/games/record")
async def record_game(req: RecordGameRequest, current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    user_id = current_user.get("id") if current_user else "user_demo_chessplayer"
    
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
async def get_game_history(current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional), limit: int = 20):
    user_id = current_user.get("id") if current_user else "user_demo_chessplayer"
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
async def complete_puzzle(req: CompletePuzzleRequest, current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    user_id = current_user.get("id") if current_user else "user_demo_chessplayer"
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
async def make_room_move(room_code: str, req: MakeRoomMoveRequest):
    room = await db.rooms.find_one({"room_code": room_code.upper()})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
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
        return updated
    except Exception as e:
        logging.error(f"Move error in room {room_code}: {e}")
        raise HTTPException(status_code=400, detail="Invalid move execution")

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
