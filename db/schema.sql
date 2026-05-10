CREATE TABLE IF NOT EXISTS users (
    id           TEXT PRIMARY KEY,
    username     TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email        TEXT UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    is_admin     INTEGER NOT NULL DEFAULT 0,
    nickname     TEXT,
    avatar_url   TEXT,
    key_bindings TEXT NOT NULL DEFAULT '{}',
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invites (
    key         TEXT PRIMARY KEY,
    created_by  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TEXT NOT NULL,
    used        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS game_sessions (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    summary           TEXT,
    description       TEXT,
    image_data        TEXT,
    password_hash     TEXT,
    password_required INTEGER NOT NULL DEFAULT 0,
    is_public         INTEGER NOT NULL DEFAULT 0,
    owner_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS session_players (
    id         TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(session_id, user_id)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    token      TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    revoked    INTEGER NOT NULL DEFAULT 0
);
