---
sidebar_position: 2
---

# Protocol versions

Players use the web client hosted on the Central Server (`/client`), while every GM runs their own NordvikManager server and updates it whenever they choose. To keep the two compatible, each GM server and each player client carry a **protocol version**, a plain whole number.

## How it works

1. When a GM starts a session, their server sends its protocol version to the Central Server.
2. When a player joins, the Central Server tells the player client which protocol the GM's server uses.
3. If it differs from the player client's own, the client reloads into the matching player build at `/client/p<N>/` before connecting. Players don't need to do anything; existing members are not asked for the game password again.
4. If no player build for that protocol is available, the player sees a message asking the GM to update their server.

The protocol version only goes up when the connection between player and GM server changes in a way an older client can't handle. Most releases keep the same number.

## For GMs

If starting a session shows *"Your NordvikManager server is outdated"*, this Central Server no longer supports your server's protocol version. Download and install the latest release.

## For Central Server administrators

| Setting | Meaning |
|---|---|
| `MIN_GM_PROTOCOL` (`.env`) | Lowest GM server protocol allowed to start a session. Default `1`. |
| `static/client/` | The latest player client (lobby). |
| `static/client/p<N>/` | Frozen player client for protocol `N`. |

Each player-client release is deployed both to `static/client/` and to `static/client/p<N>/` for its protocol. Older `p<N>` folders are left in place, so games on older GM servers keep working.

To retire an old protocol:

1. Raise `MIN_GM_PROTOCOL` and restart the Central Server. GM servers below it are asked to update.
2. Delete the `static/client/p<N>/` folders below the new minimum.

## For developers

- The backend's number is `ProtocolVersion.Current` (`DNDOnePlaceManager/WebRTC/ProtocolVersion.cs`); the frontend's is `src/protocol.json`. **Bump both together.** The GM release workflow fails if they differ.
- Prefer additive changes (new optional fields and messages) so the number rarely needs to change.
- Frozen older player builds share the browser's storage (localStorage, IndexedDB) with the latest one. When a stored format changes incompatibly, use a new key or database name instead of rewriting the old one.
