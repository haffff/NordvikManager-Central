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
```

There is no test runner configured yet.

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

After connecting, a client must emit `authenticate { token, sessionId, role }` (role is `'gm'` or `'player'`). On success the socket joins room `session:<sessionId>`. All subsequent signaling events (`webrtc-offer`, `webrtc-answer`, `ice-candidate`) carry a `targetPeerId` and are forwarded only if sender and target are in the same room. See `signaling/events.js` for all event name constants.

In-memory state lives in `services/signalingService.js` (a plain `Map`). It is lost on restart — clients are expected to reconnect and re-authenticate.

### Database

SQLite via `better-sqlite3` (synchronous API). All queries use prepared statements. Schema is in `db/schema.sql`; migrations run on startup via `db/migrations/001_initial.js`.

All primary keys are UUID strings generated with `crypto.randomUUID()`. Boolean columns are stored as `INTEGER 0/1`. Dates are ISO8601 strings via SQLite `datetime('now')`.

### API response shapes

The `/api/user/*` and `/api/gamelist/*` shapes must stay compatible with the React frontend. Key constraints:
- `GET /api/user/userinfo` returns `{ admin, userName, email }` — note lowercase `admin`, camelCase `userName`
- Paginated endpoints return `{ data, page, total, count }`

Full spec is visible at `GET /api-docs` when `NODE_ENV` is not `production`. The spec source is `swagger/spec.js`.

### Environment variables

All vars are loaded and validated in `config/config.js`. Required: `JWT_SECRET`, `REFRESH_TOKEN_SECRET`. See `.env.example` for the full list. `isProduction` is derived from `NODE_ENV === 'production'` and gates Swagger UI, log format (JSON in prod), and cookie `secure` behaviour.
