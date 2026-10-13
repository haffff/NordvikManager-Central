---
sidebar_position: 1
title: How it fits together
---

# How it fits together

Nordvik Manager runs in the browser. Who needs what:

| | Game Master (GM) | Players |
|---|---|---|
| **Installs** | The Nordvik Manager server, on their own computer | Nothing |
| **Opens** | `http://localhost:8213` on that computer | The invite link the GM sends |
| **Account** | A Nordvik Manager account | A Nordvik Manager account |

**The GM's computer hosts the game.** Maps, tokens, cards, chat history and uploaded files are stored on it. Players' browsers connect straight to it, so you don't need port forwarding or a public address. The Nordvik Manager central server (nordvikmanager.pl) only handles accounts and introduces players' browsers to the GM's server. Game data doesn't go through it. The exception: when a network blocks direct connections, the connection is relayed through a TURN server, still encrypted end to end.

That means **players can only join while the GM's server is running and the GM has opened the game.** Opening a game starts its session. Leaving it for the lobby, or stopping the server, ends the session for everyone.

{/* SCREENSHOT: img/overview-diagram.png — Optional: GM's computer in the middle, players' browsers around it, the central server off to the side for login only. */}

## Setting up your first game

1. [Install and start the server](./installing-the-server.md) (GM).
2. [Create a game](./creating-a-game.md) (GM).
3. [Invite your players](./inviting-players.md) (GM).
4. [Join the game](./joining-a-game.md) (players).
