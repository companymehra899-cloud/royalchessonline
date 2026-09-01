# ♟️ Royal Chess Online

> A full-featured online chess platform with AI, multiplayer, leagues, and puzzles

![Python](https://img.shields.io/badge/Python-3.11+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0+-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🎮 Features

- **AI Opponents**: 4 difficulty levels (Easy→Master) using Minimax algorithm
- **Multiplayer**: Real-time room-based gameplay with room codes
- **Auto-Matchmaking**: Queue system for instant pairing
- **League System**: Time-based competitions with prizes and leaderboards
- **Chess Puzzles**: Tactical puzzles with hints and ratings
- **User Profiles**: Customizable avatars, themes, and preferences
- **Game History**: Track all games with full move records (PGN)
- **Rating System**: Elo-based rating with best rating tracking
- **Authentication**: Email, Google OAuth, and guest login
- **In-Game Chat**: Real-time messaging during multiplayer games

## 🚀 Quick Start

### Docker (Recommended)
```bash
git clone https://github.com/companymehra899-cloud/royalchessonline.git
cd royalchessonline
docker-compose up -d
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs

### Manual Setup
```bash
# Install Python 3.11+
python -m venv venv
source venv/bin/activate

# Install dependencies
cd backend
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run server
uvicorn server:app --reload
```

[Full Setup Guide](SETUP.md)

## 📚 Documentation

- [App Preview & Features](APP_PREVIEW.md) - Detailed feature walkthrough
- [Setup Guide](SETUP.md) - Installation and configuration
- [Architecture](AGENTS.md) - System design and components

## 🛠️ API Quick Reference

### Authentication
```bash
# Register
POST /api/auth/register
{"email": "user@chess.local", "password": "SecurePass123!", "username": "Player"}

# Login
POST /api/auth/login
{"email": "user@chess.local", "password": "SecurePass123!"}

# Guest Login
POST /api/auth/guest
{"username": "GuestPlayer"}
```

### Chess AI
```bash
# Get AI Move
POST /api/chess/ai-move
{"fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "difficulty": "easy"}

# Get Hint
POST /api/chess/hint
{"fen": "<current-position-fen>"}
```

### Multiplayer
```bash
# Create Room
POST /api/online/rooms/create
{"color_preference": "white", "time_minutes": 10}

# Join Room
POST /api/online/rooms/join
{"room_code": "ABC123"}

# Make Move
POST /api/online/rooms/{room_code}/move
{"from_sq": "e2", "to_sq": "e4", "promotion": null}
```

### Puzzles
```bash
# Get All Puzzles
GET /api/puzzles

# Get Daily Puzzle
GET /api/puzzles/daily

# Complete Puzzle
POST /api/puzzles/complete
{"puzzle_id": "puz_1", "solved": true}
```

### League
```bash
# Get Current League
GET /api/league/current

# Register for League
POST /api/league/register

# View Leaderboard
GET /api/league/leaderboard?limit=50
```

[Full API Documentation](http://localhost:8000/docs)

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │  (React/Next.js - TBD)
└────────┬────────┘
         │ HTTP/WebSocket
         ▼
┌─────────────────────────────────────┐
│   FastAPI Backend (Python)          │
│  ├─ Authentication (JWT + OAuth)    │
│  ├─ Chess Engine (Minimax + AI)     │
│  ├─ Multiplayer (Rooms + Queue)     │
│  ├─ Leagues (Time-based Rankings)   │
│  └─ Game Recording (History)        │
└────────┬────────────────────────────┘
         │ Async Motor
         ▼
    ┌──────────────┐
    │  MongoDB     │  (Game state, User data, History)
    └──────────────┘
```

## 📊 Database Collections

- **users** - Player profiles, ratings, preferences
- **game_history** - Recorded games with moves
- **rooms** - Multiplayer game states
- **leagues** - League definitions
- **league_participants** - Player standings
- **match_point_logs** - League points audit

## 🧪 Testing

```bash
# Run all tests
pytest backend_test.py -v

# With coverage
pytest backend_test.py --cov=backend --cov-report=html

# Specific test
pytest backend_test.py::test_user_registration -v
```

## 📦 Technology Stack

- **Backend**: FastAPI + Uvicorn
- **Database**: MongoDB (Motor async)
- **Chess**: python-chess + Minimax AI
- **Auth**: JWT + bcrypt + Google OAuth 2.0
- **Validation**: Pydantic
- **Testing**: pytest + pytest-asyncio
- **Deployment**: Docker + Docker Compose

## 🔒 Security

- ✅ Bcrypt password hashing
- ✅ JWT token validation (30-day expiry)
- ✅ CORS middleware
- ✅ Rate limiting
- ✅ Admin role-based access control
- ✅ Server-side game validation
- ✅ No client-side rating manipulation

## 📈 Performance

- **AI**: Alpha-beta pruning, move ordering
- **Database**: Async operations, connection pooling, indexes
- **Matchmaking**: In-memory queue with TTL pruning
- **Games**: Real-time state updates

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -am 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 👤 Author

Royal Chess Team  
GitHub: [@companymehra899-cloud](https://github.com/companymehra899-cloud)

## 🙏 Acknowledgments

- [python-chess](https://python-chess.readthedocs.io/) - Chess logic library
- [FastAPI](https://fastapi.tiangolo.com/) - Modern web framework
- [MongoDB](https://www.mongodb.com/) - Database
- Chess community for inspiration and puzzle designs

---

**Status**: ✅ Production Ready  
**Last Updated**: 2026  
**Made with ♟️ and ❤️**
