---
sidebar_position: 3
---

# TURN relay (coturn)

Players connect to the GM's server over WebRTC. Usually the two sides find a direct path with the help of STUN servers. Some networks (strict NATs, corporate or school firewalls) block every direct path, and then the connection fails. A **TURN server** fixes this by relaying the traffic. NordvikManager uses [coturn](https://github.com/coturn/coturn).

TURN is optional. Without it, everything works as before, using STUN only.

## How credentials work

coturn and the Central Server share one secret. When a logged-in GM server or player client starts a WebRTC connection, it calls `GET /api/ice-servers` on the Central Server. The response contains a TURN username of the form `<expiry>:<userId>` and a password computed from it with the shared secret (coturn's `use-auth-secret` scheme). coturn checks the password with the same secret, so it needs no user database. The credentials expire after `TURN_TTL_SECONDS`, and only logged-in users can get them.

## 1. Set up coturn on a server

coturn needs a machine with a public IP and open UDP ports, such as a small VPS. It can't run on shared web hosting.

Open these ports in the firewall:

| Port | Protocol | Purpose |
|---|---|---|
| 3478 | UDP + TCP | TURN (`turn:` URLs) |
| 5349 | TCP | TURN over TLS (`turns:` URLs) |
| 49160–49200 | UDP | Relay range (`min-port`/`max-port` in the config) |

The Central Server repository contains a sample config and a Docker Compose file in `coturn/`:

1. Generate a secret: `openssl rand -hex 32`.
2. Copy `coturn/turnserver.conf` to the server. Fill in `static-auth-secret`, `realm`, `external-ip` and the certificate paths.
3. Start it: `docker compose up -d` (or install the `coturn` package and point it at the config).

For `turns:` you need a domain (e.g. `turn.example.com`) and a certificate for it, e.g. from Let's Encrypt. coturn must be able to read the private key. Certificate renewals take effect only after a coturn restart.

The sample config blocks relaying to private and loopback addresses, so the relay can't be used to reach the server's internal network. Keep those `denied-peer-ip` lines.

## 2. Configure the Central Server

Add to the Central Server's `.env` and restart it:

| Setting | Meaning |
|---|---|
| `TURN_URLS` | Comma-separated TURN URLs, e.g. `turn:turn.example.com:3478?transport=udp,turn:turn.example.com:3478?transport=tcp,turns:turn.example.com:5349?transport=tcp` |
| `TURN_SECRET` | The same value as coturn's `static-auth-secret`. |
| `TURN_TTL_SECONDS` | Credential lifetime. Default `86400` (24 h). |

TURN is enabled only when both `TURN_URLS` and `TURN_SECRET` are set. `STUN_SERVERS` keeps working as before.

## 3. Verify

1. While logged in, open `/api/ice-servers` on the Central Server and copy the TURN `username` and `credential`.
2. Enter them with a TURN URL in the WebRTC samples [Trickle ICE](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/) page and click *Gather candidates*. A `relay` candidate means coturn works.
3. In a game, `chrome://webrtc-internals` on the player shows which candidate pair is in use. If it is `relay`, the connection goes through TURN.

If no `relay` candidate appears, check the coturn log. `401` usually means `TURN_SECRET` and `static-auth-secret` differ, or the server clocks are off (the expiry is checked against coturn's clock).
