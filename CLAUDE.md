# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# First-time setup
cp .env.example .env        # fill in JWT_SECRET and REFRESH_TOKEN_SECRET at minimum
npm install
npm run seed                # creates the first admin account from ADMIN_USERNAME/ADMIN_PASSWORD env vars

# Development
npm run dev                 # nodemon, restarts on file change
npm start                   # plain node, no restart

# Inspect the database directly
npx better-sqlite3 data/nordvik.db  # opens a REPL; or use any SQLite GUI

# Tests (Node's built-in runner, no extra dependencies)
npm test
```

Tests live in `test/*.test.js` and must `require('./setupEnv')` first — it sets the required secrets and an in-memory `DB_PATH` before `config/config.js` loads.

## Architecture

This is a Node.js/Express (v5) CommonJS server. It is one of three components in the NordvikManager system:

- **This server** — central auth, game session registry, WebRTC signaling
- **GM Local Server** (`NordvikManager-Backend`, C# .NET 8) — game state, WebSocket handlers for the admin UI
- **Frontend** (`NordvikManagerFrontEnd`, React) — shared codebase for both Player and GM modes

### Request path

```
index.js
  → db/migrations/001_initial.js   (runs schema.sql idempotently on every startup)
  → routes/index.js                (mounts routers; also mounts swagger-ui-express at /api-docs in non-production)
      /api/user/*    → routes/user.js
      /api/gamelist/* → routes/gamelist.js
      /webrtc/*      → routes/webrtc.js
  → signaling/signalingServer.js   (Socket.io, same HTTP server)
```

### Auth flow

Access tokens are short-lived JWTs (default 15 min) issued as an `Authorization` **HttpOnly cookie** (`SameSite: None; Secure`). This matches what the React frontend expects — it uses `credentials: "include"` on all fetches and never reads the cookie value directly.

`middleware/auth.js` reads `req.cookies['Authorization']`, calls `authService.verifyAccessToken`, and attaches `req.user = { id, username, email, isAdmin }`.

Refresh tokens are UUID strings stored in the `refresh_tokens` table with a `revoked` flag. `POST /api/user/refresh` rotates them (revokes old, issues new).

### WebRTC signaling

Socket.io is attached to the same HTTP server at path `/socket.io`. It is a **pure relay** — it never participates in the WebRTC handshake itself.

After connecting, a client must emit `authenticate { token, sessionId, role }` (role is `'gm'` or `'player'`). A GM must own the session; a player must own it or have joined it through `gamelist/join` (which checks the password) — the GM backend creates whoever connects as a player, so this check is the game's password gate. On success the socket joins room `session:<sessionId>`. All subsequent signaling events (`webrtc-offer`, `webrtc-answer`, `ice-candidate`) carry a `targetPeerId` and are forwarded (`signaling/relay.js`) only between the session's current GM socket and one of its players: offers player → GM, answers GM → player, ICE either way, never player ↔ player. `gamelist/join` is rate-limited on failed tries (per user and per IP). GM signaling tickets carry the user's `ticket_generation`; logout and admin password reset bump it, ending older tickets. See `signaling/events.js` for all event name constants.

**Protocol version.** The GM backend sends `protocol` (integer) in its `authenticate`. `services/protocol.js` validates it; below `MIN_GM_PROTOCOL` the GM gets an `auth-error` telling it to update. Players receive it as `gmProtocol` in `session-info` and switch to the matching frozen player build at `/client/p<N>/` before connecting. The protocol number only goes up on breaking player↔backend changes; bump it in Backend (`ProtocolVersion.Current`) and Frontend (`src/protocol.json`) together.

**Addons page.** `GET /api/addons` (public) returns the addon registry (`ADDON_REGISTRY_URL`, default the main addons.json on GitHub) as `{ categories, addons }`, and `GET /api/addons/:key/readme` an addon's markdown readme, read from the URL in its registry entry (raw.githubusercontent.com `.md` only, ≤ 512 KB). Both are cached for 10 minutes (`routes/addons.js`). `GET /api/addons/:key/package` (authenticated, 30 per user per 10 minutes) downloads a registry addon's release file for the browser-hosted GM backend, whose page (the host build at `/client/host/`) may only connect to this origin: by key only, the `releaseUrl` must be a GitHub release asset (`https://github.com/<o>/<r>/releases/download/<tag>/<file>.zip`) and the download must end on GitHub's hosts, at most 16 MB counted as it's read. The docs site's `/addons` page (`docs-site/src/pages/addons.js`) shows them.

**Landing page.** `/` is `static/landing/index.html`; its CSS, JS and images are served under `/landing/` (absolute paths — `/img` belongs to the docs). No inline scripts or `on*` attributes (CSP), so all behaviour lives in `static/landing/landing.js`. Feature screenshots come from the docs build (`/img/user-guide/*`). The Download section reads `GET /api/releases/latest` (public, `routes/releases.js`): the newest stable GitHub release of `RELEASES_REPO`, else the newest pre-release, server zips only (each with the `sha256` GitHub publishes), cached 10 minutes; optional `GITHUB_TOKEN` raises GitHub's rate limit. GM servers' updaters use it too: `?channel=dev` (servers that opted into dev builds) returns the newest release, pre-release or not.

**ICE servers.** `GET /api/ice-servers` (authenticated) returns the `RTCIceServer[]` both peers use: STUN from `STUN_SERVERS`, plus TURN with short-lived coturn `use-auth-secret` credentials when `TURN_URLS` + `TURN_SECRET` are set (`services/iceServers.js`). The unauthenticated `/api/meta` never carries TURN details. Sample coturn config is in `coturn/`.

In-memory state lives in `services/signalingService.js` (a plain `Map`). It is lost on restart — clients are expected to reconnect and re-authenticate.

### Database

SQLite via `better-sqlite3` (synchronous API). All queries use prepared statements. Schema is in `db/schema.sql`; migrations run on startup via `db/migrations/001_initial.js`.

All primary keys are UUID strings generated with `crypto.randomUUID()`. Boolean columns are stored as `INTEGER 0/1`. Dates are ISO8601 strings via SQLite `datetime('now')`.

**Cleanup** (`services/cleanupService.js`, at startup and hourly): deletes revoked/expired refresh tokens, invites expired more than 30 days ago, and game sessions whose GM backend last connected (`game_sessions.last_gm_seen_at`, set on GM `authenticate` and for every live GM each run) more than `SESSION_EXPIRY_DAYS` (default 90, 0 = off) ago. A GM backend whose session is gone gets 404 from `updategame` on its next start and creates a new one. `updategame` also takes an optional `password` (the backend sends the game's), which heals sessions created with `password_required` but no hash; joining such a session answers 503 instead of crashing.

### API response shapes

The `/api/user/*` and `/api/gamelist/*` shapes must stay compatible with the React frontend. Key constraints:
- `GET /api/user/userinfo` returns `{ admin, userName, email }` — note lowercase `admin`, camelCase `userName`
- Paginated endpoints return `{ data, page, total, count }`

Full spec is visible at `GET /api-docs` when `NODE_ENV` is not `production`. The spec source is `swagger/spec.js`.

### Environment variables

All vars are loaded and validated in `config/config.js`. Required: `JWT_SECRET`, `REFRESH_TOKEN_SECRET`. See `.env.example` for the full list. `isProduction` is derived from `NODE_ENV === 'production'` and gates Swagger UI, log format (JSON in prod), and cookie `secure` behaviour.
