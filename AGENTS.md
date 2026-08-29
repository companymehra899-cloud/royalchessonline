# Royal Chess Online — Base44 Dev Environment

## Stack
- **Frontend**: Expo (React Native Web) app, Metro bundler, served on port `8081` (mapped to host `3000`). Source in `frontend/`.
- **Backend**: FastAPI app (`backend/server.py`) on port `8000` (internal to the compose network, not host-mapped). Uses MongoDB via `motor`.
- **DB**: MongoDB 7 (compose service `mongo`).

## Running it
```
docker compose -f docker-compose.base44.yml up -d
```
- Frontend: `docker compose -f docker-compose.base44.yml logs -f frontend`
- Backend: `docker compose -f docker-compose.base44.yml logs -f backend`

## Architecture / wiring (single-origin)
- The frontend talks to the backend with **same-origin** `/api/*` requests (`BACKEND_URL` defaults to `''`).
- `frontend/metro.config.js` has a reverse proxy: any `/api/*` request is forwarded to `EXPO_PUBLIC_BACKEND_TARGET` (set to `http://backend:8000` in compose). So the browser never talks to port 8000 directly.
- Backend CORS is already `allow_origins=["*"]`.

## Non-obvious things
- **No external secrets required.** MongoDB credentials are local (compose `environment:`). `JWT_SECRET`, `MONGO_URL`, `DB_NAME` have working defaults. Google OAuth calls an external demo auth endpoint (`demobackend.emergentagent.com`) that needs no key from us — it is optional functionality.
- **Trimmed backend deps:** `backend/requirements.base44.txt` installs only the packages `server.py`/`chess_engine.py` actually import. The full `backend/requirements.txt` contains many unused heavy packages and a custom-URL `litellm` wheel — do **not** use it for the dev image.
- **Seeded demo account:** `chessplayer@gmail.com` / `password123` (created on backend startup). Use it to log in.
- **Expo dev-server CORS:** Expo's `CorsMiddleware` only allows same-origin / localhost / `exp.extra.router.origin`. The preview is served from an external hostname (`https://3000-$BASE44_PUBLIC_HOST_SUFFIX`) that changes when the environment is recreated, so `frontend/app.config.js` reads `BASE44_PUBLIC_HOST_SUFFIX` (passed into the frontend container via compose) and sets `expo.extra.router.origin` to allowlist it. Without this the dev server returns "Unauthorized request from ...".
- **Metro bind:** `config.server.host = '0.0.0.0'` is set in `metro.config.js` so the dev server is reachable through Docker port mapping. Do **not** pass `--host 0.0.0.0` to `expo start` — Expo's CLI only accepts `lan|tunnel|localhost` and will crash.
- **No `yarn.lock`** exists (only `package-lock.json`); the compose command falls back from `--frozen-lockfile` to a plain `yarn install`. The `preinstall` cmd-guard hook passes (no deprecated packages are present).

## Verifying it works
- `curl -H "Host: 3000-$BASE44_PUBLIC_HOST_SUFFIX" http://localhost:3000/` → Expo HTML (HTTP 200).
- `curl -H "Host: 3000-$BASE44_PUBLIC_HOST_SUFFIX" http://localhost:3000/api/leaderboard` → JSON array of players.
- Login: `POST /api/auth/login` with `{"email":"chessplayer@gmail.com","password":"password123"}` → JWT + user.
