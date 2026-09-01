# Base44 Dev Environment — Royal Chess Online

## Stack
- **Backend**: FastAPI (Python 3.13) + MongoDB. Entry: `backend/server.py` (uvicorn, `--reload`).
- **Frontend**: Expo SDK 54 (React Native Web) served by Metro. Entry: `expo-router/entry`.
- **DB**: MongoDB 7 (compose service `mongodb`).

## Architecture (single-origin)
The Expo web dev server (port 3000) proxies `/api/*` to the FastAPI backend (port 8000)
via Metro's `enhanceMiddleware` in `frontend/metro.config.js`. The frontend's
`EXPO_PUBLIC_BACKEND_URL` defaults to `''` (empty), so all API calls are relative
(`/api/...`) and go through the Metro proxy. Do NOT set `EXPO_PUBLIC_BACKEND_URL` to
an absolute URL — that breaks the single-origin wiring.

## Running
```
docker compose -f docker-compose.base44.yml up -d
```
- Frontend: http://localhost:3000 (host port 3000)
- Backend: internal only (port 8000, not exposed to host — reached via Metro proxy)

## Environment
- `.env.base44-defaults` (repo, committed): local dev config — MongoDB URL, DB name,
  generated `JWT_SECRET` (>=32 chars, required at boot), optional `ADMIN_EMAILS` /
  `LEAGUE_CLAIM_URL`. These are app-internal, NOT user-supplied external secrets.
- `BASE44_PUBLIC_HOST_SUFFIX`: passed to the frontend container so `app.config.js`
  can add the preview origin to Expo's CORS allow-list (source maps / HMR).
- Google OAuth uses standard Google OAuth 2.0 (authorization code flow). Requires
  `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (from Google Cloud Console) delivered
  via `/run/base44/app.env`. Without them, the "Continue with Google" button returns
  a config error; guest and email/password login work without them.

## Dev notes
- Backend deps install on container start (apt-get gcc/g++, then `pip install`).
  `bcrypt`/`cryptography` may compile from source. Version pins in
  `backend/requirements.txt` were relaxed to `>=` ranges because several exact
  pins (`python-chess==1.10.0`, `pyjwt==2.8.1`) don't exist on PyPI for Python 3.13.
- Frontend uses **yarn** (packageManager in package.json). There is a `package-lock.json`
  (npm) but no `yarn.lock`; yarn resolves on each start. The `preinstall` cmd-guard hook
  validates package.json deps — it passes for the committed deps.
- Expo's `--host` flag only accepts `lan|tunnel|localhost` (NOT `0.0.0.0`). We use `--host lan`.
- The backend seeds several leaderboard bot players on startup. There is no demo account —
  users must register, log in, or use guest login.

## Verifying it works
- `curl -sf -H "Host: <external-host>" http://localhost:3000/` → HTML with `<div id="root">`
- `curl -sf -H "Host: <external-host>" http://localhost:3000/api/` → `{"message":"Hello World"}`
- Preview shows the Chess Arena auth screen (login / register / Google / guest).
