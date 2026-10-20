---
sidebar_position: 13
title: Permissions
---

# Permissions

Almost everything in a game (maps, battle maps, tokens and other map elements, cards, templates, layouts, materials) has **permissions**: who may see it and what they may do with it. The game's owner always has full rights to everything.

## Levels

Each level includes the ones above it.

| Level | What a player can do |
|---|---|
| **None** | Nothing. They don't see it at all. |
| **See** | See it, but not change it. |
| **Execute** | Also use its actions, e.g. roll buttons. |
| **Control** | Also use it in play: move a token, place tokens on a map. |
| **Edit** | Also change it: draw on a map, edit a card's settings, resize things. |
| **All** | Also delete it. |

Examples:
- A player's own character token: **Control** for that player, so they can move it.
- A map players can drop their tokens on: **Control** for *Everyone*. Drawing on it still needs **Edit**.
- A secret door on the map: **None** for *Everyone*, so only the GM sees it. (For a whole set of hidden things, a [GM-only layer](./battle-map/layers.md) is easier.)

## Everyone and single players

Permissions are set per player, plus one row called **Everyone (default)**. *Everyone* applies to every player who has no row of their own, including players who join later. **Not set** means "use the default".

## Co-GMs: Edit on the game

The game itself has permissions too (**Game Settings → Permissions**). A player with **Edit** on the game is a co-GM: wherever this guide says "GM", it means them as well. They get the same menus and windows as the GM: game settings, addons, battle maps, playlists and the soundboard, layouts, managing players, GM-only layers, showing a battle map to players.

Edit on the game is about the game's menus and settings. It doesn't by itself give rights on the game's maps, tokens or cards: those still follow their own permissions, so give a co-GM what they need there too. GM-only addon content (hidden templates, actions only the GM may run) is set up for the owner when the addon is installed.

A few things stay with the game's **owner** (the player who created it):
- The game's own **Permissions** tab, so only the owner decides who is a co-GM.
- **Deleting** the game, and stopping its session.
- Co-GMs can't kick the owner or change the owner's permissions on anything.
- **Clear everyone's** sketches.

## The server's admin

The person who runs the server (its [admin](./getting-started-gm/installing-the-server.md#youre-the-servers-admin)) has two extra rights, whatever their role in a game:
- **Linking files from the server's disk** into [Materials](./materials.md#gm-storage-and-local-files). Nobody else can browse the server's computer, not even a game's GM.
- **Every game in the lobby:** the admin sees all games on the server and can rename or delete any of them, including games they aren't in.

## Where to set them

- **Quick:** most right-click menus and lists have a **Permissions** submenu with **See**, **Control**, **Edit** and **None** for each player and for **Everyone**. A tick shows the current level.
- **Full:** the **Permissions** tab of an item's settings (Map Settings, card settings, Game Settings) shows a level for each player. **Toggle advanced permissions** lets you set single bits.
- **Map permissions to its elements:** in Map Settings → Permissions, tick **Apply to all elements on this map** to give the same rights on everything already on the map.

:::note
Hidden things are filtered by the GM's server: a player's browser never receives cards, maps or elements they can't see. [GM-only and hidden layers](./battle-map/layers.md) are the exception; they're only hidden on screen.
:::
