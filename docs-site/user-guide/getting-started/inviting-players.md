---
sidebar_position: 4
title: Inviting players
---

# Inviting players

*For the GM.*

## Send the invite link

1. In the lobby, choose the **gear** button on the game's card.
2. Under **Player Invite Link**, choose the **copy** button.
3. Send the link to your players however you like: chat, e-mail, Discord.

{/* SCREENSHOT: img/invite-link.png — The game settings dialog with the Player Invite Link field and its copy button. */}

The link looks like `https://nordvikmanager.pl/client/?game=<session id>`.
- **One link for the whole group:** everyone uses the same link, and it doesn't expire.
- **Password-protected game:** the link also makes the player's browser ask for the password. Send the password separately, not in the same message as the link.

The part after `game=` is the game's **session ID**. A player can also paste it into **Join by ID** in their lobby.

:::note Who can join
Anyone with the link (and the password, if you set one) can join. If the link leaks, set a password, or ban the account that shouldn't be there (see [Managing players](#managing-players)).

A **Public** game needs no link at all: it's listed for every registered player under *Public Games*.
:::

## What your players need

- **A browser:** a recent Chrome, Edge, Firefox or Safari. They don't install anything.
- **A Nordvik Manager account:** they create one the first time they open the link. If the central server is invitation-only, they also need an **invite code** to register.
- **Your game to be running:** they can only connect while your server is running and you've opened the game (see [Open the game](./creating-a-game.md#open-the-game)).

Point them to [Joining a game](./joining-a-game.md).

## When they arrive

Once a player joins, they appear in the game's player list, and you can give them things to see and control: maps, their character's card and token.

{/* SCREENSHOT: img/player-joined.png — The game with a player connected: their name in the player list. */}

## Managing players

As the server's admin, **User Management** in the lobby lists everyone who has joined a game on your server. Players are grouped by account. One account can play a character in several games.

{/* SCREENSHOT: img/player-management.png — The Player Management dialog with one account expanded to show its characters. */}

| Action | Effect |
|---|---|
| **Kick** (on a character) | Removes that character from its game. The player can join again with the link. |
| **Remove** (on an account) | Removes the account and all its characters from this server. |
| **Ban** | Removes the account from this server and stops it joining any game here. **Unban** lets it back in. |

Bans and removals only affect **your** server. The player's account keeps working everywhere else.
