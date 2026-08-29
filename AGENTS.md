# Base44 Dev Environment

## Stack
- **Frontend**: Expo (React Native) app served as **web** via `expo start --web` on port 3000. Source under `frontend/`. Metro (`frontend/metro.config.js`) proxies any `/api/*` request to the backend (`EXPO_PUBLIC_BACKEND_TARGET`), so the browser talks single-origin to the API — no CORS needed, no `EXPO_PUBLIC_BACKEND_URL` required (it defaults to `''`).
- **Backend**: FastAPI (`backend/server.py`) on port 8000, `uvicorn server:app --reload`. Depends on `chess_engine.py` (local minimax engine, no external AI calls at boot).
- **DB**: MongoDB 7 (`mongo` service). Auth enabled; credentials generated in compose.

## Running
```
docker compose -f docker-compose.base44.yml up -d --build
```
- Frontend deps install at container start (`npm install --ignore-scripts` — the repo's `preinstall` cmd-guard is a policy check, skipped during install).
- Backend deps install at container start (`pip install -r requirements.txt`).
- Live reload: backend via `--reload`; frontend via Expo/Metro HMR.

## Secrets
None required to boot. `MONGO_URL`, `DB_NAME`, `JWT_SECRET` are all defaulted in compose. Google OAuth / external integrations in `server.py` are optional runtime paths only triggered on user login.

## Verify
- `curl -sf http://localhost:3000/` returns the Expo web app.
- `curl -sf http://localhost:8000/api/status` returns backend status JSON.
- External-host check: `curl -sf -H "Host: external-preview.example.com" http://localhost:3000/` must also return the app.

## Notes
- `frontend/package.json` declares `packageManager: yarn@1.22.22` but the repo ships a `package-lock.json` (npm). We install with npm.
- `backend/pytest.ini` forces `pytest-xdist` (`-n 2 --dist loadscope`); run tests inside the backend container.
- **Expo `--host` only accepts `lan`/`tunnel`/`localhost`** — `--host 0.0.0.0` crashes the web container. We use `--host lan`.
- **Preview origin / CORS**: the base44 preview proxy rewrites the `Host` header, so Expo's `CorsMiddleware` (which runs *before* the metro `/api/` proxy in `enhanceMiddleware`) blocks JS fetches carrying an `Origin` header with "Unauthorized request from …". Navigation/page loads pass (no Origin header) but `/api/*` POSTs fail with a "network error". Fix: `frontend/app.config.js` registers the live preview origin (`https://3000-${BASE44_PUBLIC_HOST_SUFFIX}`) as `extra.router.origin`, and compose passes `BASE44_PUBLIC_HOST_SUFFIX` into the `web` service. If the suffix ever changes, this auto-adapts.
- Backend `requirements.txt` pins private/unused packages (`emergentintegrations`, `litellm`, …) not importable here; `backend/requirements.base44.txt` is the trimmed runtime set used by compose.
