# Base44 Dev Environment — Royal Chess Online

## Stack
- **Backend**: FastAPI (`backend/server.py`) on port 8000, MongoDB via `motor`, local
  minimax chess engine (`backend/chess_engine.py`). Requires `JWT_SECRET` (>=32 chars)
  at boot or it refuses to start. Seeds a demo account `chessplayer@gmail.com` / `password123`.
- **Frontend**: Expo (React Native) web app, Expo Router, served by Metro on port 3000.

## Wiring (single-origin)
Only host port 3000 is public. Metro (`frontend/metro.config.js`) proxies `/api/*`
requests to the backend (`EXPO_PUBLIC_BACKEND_TARGET=http://backend:8000`) over the
compose network. The frontend uses same-origin relative `/api/...` URLs
(`EXPO_PUBLIC_BACKEND_URL` is empty), so no CORS or second public port is needed.

## Run
```
docker compose -f docker-compose.base44.yml up -d --build
docker compose -f docker-compose.base44.yml ps
```
- Backend deps install on first start via pip (cached in the `pip-cache` volume).
- Frontend deps install on first start via npm (cached in `frontend-node-modules` volume).
- Both run with live reload (`uvicorn --reload`, `expo start --web`); edits appear
  without rebuilds. Expo web needs `--host 0.0.0.0` to accept the preview's external hostname.

## Expo web + preview origin (non-obvious)
Expo's dev-server `CorsMiddleware` rejects cross-origin requests whose `Origin`
host isn't localhost, same-origin, or listed in `extra.router.origin`. The Base44
preview proxy forwards with a `Host` that differs from `Origin`, so requests 401.
`frontend/app.config.js` derives `extra.router.origin` from `BASE44_PUBLIC_HOST_SUFFIX`
(passed into the `web` service) so the allowed origin tracks the changing preview host.
Expo's `--host` flag only accepts `lan|tunnel|localhost` — do NOT pass `0.0.0.0` there;
the dev server already binds all interfaces by default.

## Secrets
No external-service credentials are required to boot. `JWT_SECRET` is a generated
app-internal dev secret set inline in `docker-compose.base44.yml` (not a user secret).
Google OAuth session exchange is optional and frontend-driven (no server-side Google
secret). Stripe / OpenAI / boto3 are in `requirements.txt` but not imported at runtime.

## Verify
- `curl -sf -H "Host: external.preview.example" http://localhost:3000/` returns the app.
- `curl -sf http://localhost:8000/api/` returns `{"message":"Chess Arena API"}` (via backend).
- `/api/leaderboard` proxied through port 3000 returns JSON.

## Tests
Backend: `cd backend && pytest` (uses pytest-xdist, `-n 2 --dist loadscope`).
