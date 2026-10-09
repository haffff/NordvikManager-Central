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

The Central Server repository contains a sample config (`coturn/turnserver.conf`) and a Docker Compose file. Fill in `static-auth-secret` (generate it with `openssl rand -hex 32`), `realm` and `external-ip`. Then run coturn either as a systemd service or with Docker.

### Option A: systemd (Debian / Ubuntu)

Run these as root.

1. Install coturn. The package ships a `coturn.service` unit that runs as the `turnserver` user and reads `/etc/turnserver.conf`.

   ```bash
   apt update && apt install -y coturn
   ```

   On older packages (Ubuntu 20.04, Debian 11) also set `TURNSERVER_ENABLED=1` in `/etc/default/coturn`.

2. Install the config:

   ```bash
   cp /etc/turnserver.conf /etc/turnserver.conf.orig
   nano /etc/turnserver.conf    # paste coturn/turnserver.conf and fill in the <...> values
   ```

   `external-ip` is the VPS's public IPv4. If `ip -4 addr` shows only a private address (1:1 NAT), use `external-ip=<public-ip>/<private-ip>`.

3. Set up the certificate for `turns:`. Point a DNS `A` record for `turn.example.com` at the VPS, then get a certificate. With nothing listening on port 80:

   ```bash
   apt install -y certbot
   certbot certonly --standalone -d turn.example.com
   ```

   Let's Encrypt's private key is readable only by root, and coturn runs as `turnserver`. Install a deploy hook that copies the files for coturn and restarts it. coturn loads certificates only at startup, so the restart is needed on every renewal.

   ```bash
   cat > /etc/letsencrypt/renewal-hooks/deploy/coturn.sh <<'HOOK'
   #!/bin/sh
   set -e
   install -d -m 750 -o root -g turnserver /etc/coturn/certs
   install -m 640 -o root -g turnserver /etc/letsencrypt/live/turn.example.com/fullchain.pem /etc/coturn/certs/fullchain.pem
   install -m 640 -o root -g turnserver /etc/letsencrypt/live/turn.example.com/privkey.pem /etc/coturn/certs/privkey.pem
   systemctl restart coturn
   HOOK
   chmod +x /etc/letsencrypt/renewal-hooks/deploy/coturn.sh
   /etc/letsencrypt/renewal-hooks/deploy/coturn.sh    # run once now
   ```

   Without a certificate yet, comment out `tls-listening-port`, `cert` and `pkey`, and leave `turns:` out of `TURN_URLS`.

4. Raise the open-file limit. This is optional, but useful with many players.

   ```bash
   systemctl edit coturn
   # add:
   # [Service]
   # LimitNOFILE=65535
   ```

5. Open the firewall (here with `ufw`), then enable and start coturn:

   ```bash
   ufw allow 3478/udp && ufw allow 3478/tcp && ufw allow 5349/tcp && ufw allow 49160:49200/udp
   systemctl enable --now coturn
   systemctl status coturn
   journalctl -u coturn -f      # the sample config logs to stdout, which goes to the journal
   ```

   If the VPS provider also has a cloud firewall, open the same ports there.

6. Check that coturn is listening:

   ```bash
   ss -lunpt | grep turnserver
   ```

   After any config change, run `systemctl restart coturn`.

### Option B: Docker

Put `turnserver.conf` next to `coturn/docker-compose.yml`, copy the certificates to `/etc/coturn/certs` with a deploy hook like the one in step 3, and run `docker compose up -d`. In the hook, use `docker compose restart` instead of `systemctl`, and make the files readable by the container's user instead of the `turnserver` group.

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

1. While logged in, open `/api/ice-servers` on the Central Server and copy the TURN `username` and `credential`. To test coturn before Central is configured, generate a pair on the VPS:

   ```bash
   SECRET='<static-auth-secret>'
   USERNAME="$(( $(date +%s) + 3600 )):test"
   PASSWORD=$(printf '%s' "$USERNAME" | openssl dgst -sha1 -hmac "$SECRET" -binary | base64)
   echo "$USERNAME  $PASSWORD"
   ```
2. Enter them with a TURN URL in the WebRTC samples [Trickle ICE](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/) page and click *Gather candidates*. A `relay` candidate means coturn works.
3. In a game, `chrome://webrtc-internals` on the player shows which candidate pair is in use. If it is `relay`, the connection goes through TURN.

If no `relay` candidate appears, check the coturn log. `401` usually means `TURN_SECRET` and `static-auth-secret` differ, or the server clocks are off (the expiry is checked against coturn's clock).
