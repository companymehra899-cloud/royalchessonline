# Chess Arena — Product Requirements Document

## Original Problem Statement
User (Hindi/Hinglish): "mujhe ek chess game apk banan hai uska design mera pass hai" — A polished chess game app.
User choices: Play vs Computer + Online Multiplayer, Standard rules + AI engine (difficulty/Elo) + analysis, Guest Mode + Email/Password login + MongoDB, Luxury Gold & Dark theme + move sound effects + board/piece customisation.

## Architecture
- **Backend**: FastAPI (`/app/backend/server.py`) + `chess_engine.py` (python-chess based AI + curated puzzles), MongoDB.
- **Frontend**: Expo React Native (`/app/frontend/app/`), `chess.js` for local move validation/FEN, Context API (AuthContext, GameSettingsContext).
- **Theme**: Luxury Gold & Deep Obsidian dark theme.

## User Personas
- Casual player: quick games vs computer / puzzles.
- Competitive player: online rooms, rating, leaderboard.
- Guest: instant play without signup.

## Core Requirements (static)
- Player vs Computer (easy/medium/hard AI)
- Online multiplayer rooms (create/join by code)
- Standard chess rules, checkmate/stalemate/draw detection
- Guest + Email/Password auth, MongoDB persistence
- Puzzles + daily challenge, leaderboard, profile stats
- Board/piece theme customization, sound effects

## Implemented (Aug 2026)
- Backend endpoints: auth (register/login/guest/me/profile), chess/ai-move, chess/hint, puzzles (+daily+complete), games (record+history), leaderboard, online rooms (create/join/get/move). **21/21 backend tests passing.**
- Frontend screens: Auth, Home, Match (vs computer/friend), Profile, Settings, Puzzles, Leaderboard, OnlineModal.
- Components: ChessBoard (interactive, legal-move highlight, promotion, check indicator), ChessPiece, GameOverModal, PromotionModal, BottomTabBar, GoldenKnightLogo.
- **Verified end-to-end**: PLAY COMPUTER → e2-e4 → AI responded Nf6; Undo, Hint working; all tabs navigate.
- Added testIDs across Home tiles, tab bar, match actions, board squares.
- Demo user seeded: chessplayer@gmail.com / password123; leaderboard bots seeded.

## Backlog (prioritized)
- **P1**: Dedicated Analysis Board (evaluate positions, step through moves).
- **P1**: Online multiplayer realtime polish (turn sync UI, live clock over polling/websocket).
- **P2**: Board/piece customization live preview in Settings.
- **P2**: Real move sound assets wired (currently audio manager scaffold).
- **P2**: Strict auth on mutation endpoints (currently fall back to demo user).

## Next Tasks
1. Analysis board screen.
2. Online realtime turn sync + live clocks.
3. Wire actual sound assets + haptics.
