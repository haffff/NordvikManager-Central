---
sidebar_position: 13
title: Permissions
---

# Permissions

Almost everything in a game (maps, battle maps, tokens and other map elements, cards, templates, layouts, materials) has **permissions**: who may see it and what they may do with it. The GM always has full rights to everything.

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

## Where to set them

- **Quick:** most right-click menus and lists have a **Permissions** submenu with **See**, **Control**, **Edit** and **None** for each player and for **Everyone**. A tick shows the current level.
- **Full:** the **Permissions** tab of an item's settings (Map Settings, card settings, Game Settings) shows a level for each player. **Toggle advanced permissions** lets you set single bits.
- **Map permissions to its elements:** in Map Settings → Permissions, tick **Apply to all elements on this map** to give the same rights on everything already on the map.

:::note
Hidden things are filtered by the GM's server: a player's browser never receives cards, maps or elements they can't see. [GM-only and hidden layers](./battle-map/layers.md) are the exception; they're only hidden on screen.
:::
