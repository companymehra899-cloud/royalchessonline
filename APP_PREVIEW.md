# 🎯 Royal Chess Online - App Preview

A full-featured online chess application with AI opponents, multiplayer battles, leagues, and puzzles!

## 🌟 Features

### Authentication & User Management
- ✅ Email/Password registration & login
- ✅ Google OAuth 2.0 integration
- ✅ Guest player support
- ✅ Secure JWT tokens (30-day expiry)
- ✅ Password hashing with bcrypt
- ✅ Profile customization (avatar, themes)

### Chess Engine & AI
- ✅ Minimax algorithm with alpha-beta pruning
- ✅ 4 difficulty levels:
  - **Easy**: 70% random, 30% shallow (depth-1)
  - **Medium**: Depth-2 with 15% blunders
  - **Hard**: Depth-3 evaluation
  - **Master**: Depth-4 (computationally intensive)
- ✅ Piece-square table evaluation
- ✅ Move ordering optimization
- ✅ In-game hints system

### Game Modes
1. **vs AI** - Play against computer
2. **Multiplayer** - Create/join rooms with room codes
3. **Matchmaking** - Auto-pairing queue system
4. **Puzzle Mode** - Solve tactical puzzles
5. **Friend Games** - Friendly matches

### Multiplayer System
- ✅ Real-time room-based gameplay
- ✅ 6-character room codes
- ✅ Automatic matchmaking queue
- ✅ In-game chat
- ✅ Time control (configurable minutes per side)
- ✅ Auto-resign on timeout

### League System
- ✅ Time-based competitions (3-day default)
- ✅ Points-based ranking
  - Win: 10 points
  - Draw: 4 points
  - Loss: 0 points
- ✅ Top players get prizes (externally claimed)
- ✅ Automatic league rotation
- ✅ Leaderboard & standings
- ✅ Admin controls for testing

### Rating System
- ✅ Elo-style rating calculation
- ✅ Minimum rating: 400
- ✅ Win bonuses: +15 (hard/online), +10 (easy/normal)
- ✅ Loss penalties: -10 (online), -5 (offline)
- ✅ Best rating tracking
- ✅ Game history with rating deltas

### Puzzle System
- ✅ 6 curated tactical puzzles (easy→hard)
- ✅ Daily puzzle rotation
- ✅ +15 ELO bonus per solved puzzle
- ✅ Solution hints included
- ✅ Themed puzzles (checkmate, forks, skewers, etc.)

## 📊 Database Schema

### Collections
- **users** - Player profiles, ratings, preferences
- **game_history** - Recorded games with moves, results, ratings
- **rooms** - Multiplayer game rooms with state
- **leagues** - League definitions and schedules
- **league_participants** - Player standings in leagues
- **match_point_logs** - League points audit log

## 🔌 API Endpoints

All endpoints use `/api/` prefix.

### Authentication
```
POST /auth/register          - Create account
POST /auth/login             - Email login
POST /auth/guest             - Guest session
POST /auth/google            - Google OAuth
GET  /auth/me                - Current user
PUT  /auth/profile           - Update profile
GET  /auth/google-config     - OAuth client ID
```

### Chess Engine
```
POST /chess/ai-move          - Get AI recommendation
POST /chess/hint             - Get strategic hint
```

### Game Recording
```
POST /games/record           - Log game result
GET  /games/history          - Player game history
GET  /leaderboard            - Top 10 players
```

### Multiplayer Rooms
```
POST /online/rooms/create              - Create room
POST /online/rooms/join                - Join room
GET  /online/rooms/{room_code}         - Get room state
POST /online/rooms/{room_code}/move    - Make move
POST /online/rooms/{room_code}/resign  - Resign
POST /online/rooms/{room_code}/chat    - Send message
GET  /online/rooms/{room_code}/chat    - Get messages
```

### Matchmaking
```
POST /online/matchmaking/queue         - Join queue
GET  /online/matchmaking/status        - Check status
POST /online/matchmaking/leave         - Leave queue
```

### Puzzles
```
GET  /puzzles                          - All puzzles
GET  /puzzles/daily                    - Today's puzzle
POST /puzzles/complete                 - Submit solution
```

### League System
```
GET  /league/current                   - Active league info
POST /league/register                  - Join league
GET  /league/leaderboard               - League standings
GET  /league/me                        - My league stats
GET  /league/my-winnings               - Prize history
```

### Admin
```
GET  /admin/league/overview            - League analytics
POST /admin/league/force-complete      - Test league rotation
```

## 🛠️ Technology Stack

- **Language**: Python 3.11+
- **Framework**: FastAPI (async)
- **Database**: MongoDB (async with Motor)
- **Chess Logic**: python-chess
- **Auth**: JWT + bcrypt + Google OAuth
- **Validation**: Pydantic
- **Rate Limiting**: In-memory (best-effort)
- **Middleware**: CORS enabled

## 📦 Deployment

### Docker Compose
```bash
docker-compose up -d
```

Services:
- **Backend API**: http://localhost:8000
- **MongoDB**: localhost:27017

### Manual Setup
```bash
cd backend
pip install -r requirements.txt

# Set environment variables
export MONGO_URL=mongodb://localhost:27017
export DB_NAME=royal_chess_db
export JWT_SECRET="your-secret-key-min-32-chars"

# Run server
uvicorn server:app --reload
```

## 🔒 Security Features

- ✅ JWT token validation (30-day expiry)
- ✅ Bcrypt password hashing
- ✅ CORS middleware
- ✅ Rate limiting (10 league registrations per 60s)
- ✅ Admin role authorization
- ✅ Server-side game validation
- ✅ Idempotent league point awards
- ✅ No client-side rating manipulation

## 🚀 Performance Optimizations

- ✅ Alpha-beta pruning in minimax
- ✅ Move ordering (captures first)
- ✅ Async database operations
- ✅ Connection pooling with Motor
- ✅ Database indexes on common queries
- ✅ In-memory matchmaking queue
- ✅ Game state cached in rooms collection

## 📝 Notes

- **Prizes**: Claimed externally (no in-app wallet)
- **Guest Players**: Can play but don't earn league points
- **Rating Floor**: 400 ELO minimum
- **League Duration**: Configurable (default 3 days)
- **Minimum League Players**: Configurable (default 200)

## 🎮 Example Game Flow

1. User registers/logs in
2. Creates multiplayer room or joins via code
3. Waits for opponent (or uses matchmaking)
4. Plays chess with real-time move validation
5. Game concludes (checkmate, resignation, draw)
6. Rating updated, game recorded in history
7. If in league: points awarded (server-side)
8. Can view game in history with full PGN

---

**Created**: 2026  
**Status**: ✅ Production Ready  
**License**: MIT
