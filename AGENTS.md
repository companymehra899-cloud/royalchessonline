# Royal Chess Online — Base44 Dev Environment

Expo React Native (web mode) chess app + FastAPI/MongoDB backend.

## Architecture
- **Frontend** (`frontend/`): Expo SDK 54 / React Native 0.81, served on web via Metro (`expo start --web`). Expo Router (`app/`), Context API for auth/settings. Reachable on host port **3000** (container 8081).
- **Backend** (`backend/`): FastAPI (`server.py`) + `chess_engine.py` (python-chess AI). MongoDB via Motor. Reachable on host port **8000** (container 8001). All API routes under `/api`.
- **DB**: MongoDB 7 (compose service `mongodb`), credentials generated inline in compose.

## Running
```
docker compose -f docker-compose.base44.yml up -d
```
- Frontend: http://localhost:3000 (preview: https://3000-$BASE44_PUBLIC_HOST_SUFFIX)
- Backend:  http://localhost:8000/api/ (preview: https://8000-$BASE44_PUBLIC_HOST_SUFFIX/api/)
- `EXPO_PUBLIC_BACKEND_URL` (compose env, derived from `BASE44_PUBLIC_HOST_SUFFIX`) tells the browser where the API is. **Never hardcode the suffix** — it changes when the environment is recreated.

## Secrets
**None required.** MongoDB runs in compose with generated creds. Google OAuth (`auth.emergentagent.com` / `demobackend.emergentagent.com`) is optional and only triggered on user action, not at boot. The backend seeds a demo user `chessplayer@gmail.com` / `password123`; the frontend auto-logs in as this user for instant play.

## Non-obvious setup notes (gotchas)
1. **Backend deps**: `backend/requirements.txt` pulls a custom-wheel `litellm` + heavy AI/cloud SDKs (google-genai, boto3, pandas, numpy, stripe) that `server.py`/`chess_engine.py` never import. Use `backend/requirements.base44.txt` (trimmed, same pinned versions) instead — faster and avoids an unreachable wheel URL.
2. **Expo `--host`**: only accepts `lan`/`tunnel`/`localhost` (NOT `0.0.0.0`). Use `--host lan` so Docker's port mapping can reach the dev server.
3. **Expo dev-server CORS**: `@expo/cli`'s `CorsMiddleware` rejects the dynamic preview origin (only same-origin/localhost/`exp.extra.router.origin` allowed). The compose start command `sed`-patches it to allow any origin (dev-only; it still sets `Access-Control-Allow-Origin` to the requesting origin). The patch reruns on every start, so it survives reinstalls.
4. **Do NOT set `CI=true`** on the frontend — it puts Metro in CI mode and disables file watching (live reload). Expo auto-detects the non-TTY container and runs fine without it.
5. **Cross-origin auth**: the frontend uses Bearer tokens in the `Authorization` header (not cookies), so the backend's `allow_origins=["*"]` + `allow_credentials=True` works for the non-credentialed browser requests. Separate origins (port 3000 ↔ 8000) is the correct wiring here.
6. `frontend/node_modules` is persisted in a named compose volume (`frontend_node_modules`) so `yarn install` is fast on restart. The repo also ships a `package-lock.json` (npm); yarn ignores it and warns — harmless.

## Verifying it works
- `curl -sf http://localhost:8000/api/` → `{"message":"Hello World"}`
- `curl -sf -H "Host: <external>" http://localhost:3000/` → HTML with title "Royal Chess Online"
- In the preview: home screen shows "CHESS ARENA" / "Welcome back, ChessPlayer" / rating 1200; tabs (Home/Games/Puzzles/Profile/Settings) navigate; "Play Computer" starts a match vs AI.

## Live reload
Backend runs `uvicorn --reload`; frontend runs Metro in watch mode. Edits to `backend/` and `frontend/` appear without a rebuild. Use `reload_preview` only after a compose/env change or service restart.
