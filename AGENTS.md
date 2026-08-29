# Base44 Dev Environment — Royal Chess Online

## Stack
- **Frontend**: Expo (React Native) web app, SDK 54, React 19, Metro bundler. Served on host port 3000 (container 8081).
- **Backend**: FastAPI + MongoDB (motor). Served on host port 8000. Live reload via `uvicorn --reload`.
- **Database**: MongoDB 7 (compose service `mongo`).

## Running
```
docker compose -f docker-compose.base44.yml up -d
```
- Web preview: http://localhost:3000
- API docs: http://localhost:8000/docs

## Architecture notes
- **Two origins**: the web app (port 3000) and API (port 8000) are separate public origins. The frontend points to the API via `EXPO_PUBLIC_BACKEND_URL` (an Expo public env var inlined by Metro at bundle time). Auth uses Bearer tokens in the `Authorization` header (not cookies), so cross-origin works with the backend's existing `allow_origins=["*"]` CORS.
- **Expo dev CORS**: Expo's dev server (`@expo/cli` CorsMiddleware) blocks non-localhost origins by default. `frontend/app.config.js` reads `EXPO_BASE44_PREVIEW_ORIGIN` and sets `exp.extra.router.origin` so the external preview origin is allowlisted. Both `EXPO_PUBLIC_BACKEND_URL` and `EXPO_BASE44_PREVIEW_ORIGIN` are derived from `BASE44_PUBLIC_HOST_SUFFIX` in compose — never hardcoded.
- **Expo `--host`**: only accepts `lan|tunnel|localhost`. We use `--host lan` (binds to the container's LAN IP, reachable via Docker port mapping). Do NOT pass `0.0.0.0` — it throws an assertion error.
- **Watch mode**: `CI=true` must NOT be set on the web service — it disables Metro file watching/reload. The container runs non-interactively without it (stdin is not a TTY in detached mode).

## Backend dependencies
- The repo's `backend/requirements.txt` pulls in many unused heavy packages (pandas, numpy, litellm from a private URL, AI SDKs, stripe, boto3) that `server.py`/`chess_engine.py` never import. We use `backend/requirements.base44.txt` instead — a trimmed set of only the packages the server actually needs. If a new import is added to the backend, add it there.

## No external secrets required
- MongoDB runs locally in compose with generated credentials.
- `JWT_SECRET`, `MONGO_URL`, `DB_NAME` have sensible defaults set via compose `environment:`.
- The only external HTTP call is to `demobackend.emergentagent.com` for Google OAuth session exchange — this is a demo endpoint needing no credentials. Email/password and guest login work without it.

## Demo user
- The frontend auto-logs in as `chessplayer@gmail.com` / `password123` on first load (autoDemoLogin in `AuthContext.tsx`). This user is auto-created by the backend on first login attempt.

## Verifying it works
- `curl -sf -H "Host: external.example" http://localhost:3000/` → 200 (HTML with "Royal Chess Online")
- `curl -sf http://localhost:8000/api/leaderboard` → JSON array of players
- `curl -sf -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{"email":"chessplayer@gmail.com","password":"password123"}'` → token + user
- Preview shows the Chess Arena dashboard with leaderboard data from the API.
