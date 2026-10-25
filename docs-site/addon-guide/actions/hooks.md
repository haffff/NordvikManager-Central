---
sidebar_position: 2
title: Hooks
---

# Hooks

A hook runs every **enabled** action that uses it, whenever something happens in the game. Set the hook in
the action editor, or as the `hook` number in an addon's action JSON. Some hooks also take a
[hook filter](#hook-filter) that says which occurrences run the action.

Most hooks come from a change someone made (a player, or another action). They give the action:

- `Data`: the change's payload, e.g. the element, property or card that changed
- `Player`: who made the change (so `playerId`, `playerName`, … are filled in)
- `Command`: the full command, for advanced use

Read fields inside `Data` with a path, e.g. `%Data.id%` or `%Data.name%`.

| # | Hook | Fires when | Extra variables |
|---|---|---|---|
| 0 | None | Never; the action only runs when called by name | Arguments from the caller |
| 1 | Install | Once, when the addon is installed | `AddonKey`, `GameId`, `PlayerId` |
| 2 | Uninstall | Once, when the addon is uninstalled | `AddonKey`, `GameId`, `PlayerId` |
| 3 | Player Join | A player connects | `Player` |
| 4 | Player Leave | A player disconnects | `Data`, `Player` |
| 5 | Player Load | A player's board has finished loading | `Player` |
| 6 | Element Added | An element is placed on a map | `Data`, `Player` |
| 7 | Element Updated | An element changes (including moves) | `Data`, `Player` |
| 8 | Element Moved | An element is dragged, or moved by *MoveElement* | `Data`, `Player` |
| 9 | Element Removed | An element is deleted | `Data`, `Player` |
| 10 | Property Added | A property is added to anything | `Data`, `Player` |
| 11 | Property Updated | A property value changes | `Data`, `Player` |
| 12 | Property Removed | A property is deleted | `Data`, `Player` |
| 13 | Map Added | A map is created | `Data`, `Player` |
| 14 | Map Updated | A map's settings change | `Data`, `Player` |
| 15 | Map Removed | A map is deleted | `Data`, `Player` |
| 16 | Map Changed | A battle map view switches to another map | `Data` (`id` = battle map view, `mapId`), `Player` |
| 17 | Game Updated | The GM saves the game settings | `Data` (e.g. `name`), `Player` |
| 18 | Chat Message | Any chat message is posted | `Data`, `Player` |
| 19 | Chat Command | A chat command the action lists in its hook filter is typed | `ChatCommand`, `ChatArgs`, `ChatText`, `Player` |
| 20 | Card Added | A card is created | `Data`, `Player` |
| 21 | Card Updated | A card changes | `Data`, `Player` |
| 22 | Card Deleted | A card is deleted | `Data`, `Player` |
| 23 | Turn Changed | The turn passes to another entry of a map's turn order, or the round changes | `Data` (`mapId`, `round`, `currentEntryId`, `elementId`), `Player` |

## Hook filter

The `hookFilter` of an action (the **Hook filter** field in the action editor) says which occurrences of
its hook run it. What it holds depends on the hook:

| Hook | Hook filter |
|---|---|
| 19 Chat Command | **Required.** The commands the action handles, without `/`, separated by commas or spaces, e.g. `poll, vote`. Each name is 1 to 32 characters: letters a-z, digits, `_` or `-` (a leading `/` is dropped, case doesn't matter). At most 20 names, and none of the built-in commands (`r`, `roll`, `gr`, `w`, `gm`, `help`). |
| Every other hook | None yet: leave it out. |

The server checks it when an action is saved or an addon is installed, and refuses a filter that doesn't
fit its hook with a message saying why.

## Element Moved

`Data` holds the element id and its new position. The position sits inside the element's `object` text,
and a path reads it for you:

```json
{ "Type": "SendChat", "Data": {
    "Template": "Text", "Title": "Token moved",
    "Message": "%Data.id% is now at %Data.object.left%, %Data.object.top%" } }
```

Moving an element also fires **Element Updated**. An action on either hook that moves the **same** element
triggers itself again and never stops. Check a condition first, or move a different element.

## Turn Changed

Fires when **Next**, **Previous**, jumping to an entry, *End my turn*, a reset, or removing the current entry moves the turn or the round. It also fires when the first entries start round 1. `Data`:

| Field | Value |
|---|---|
| `mapId` | the map whose turn order changed |
| `round` | the round now |
| `currentEntryId` | whose turn it is, empty when that entry is hidden from players |
| `elementId` | the current token, empty for a free or hidden entry |

To start a token's turn, e.g. tick down a status: read `%Data.elementId%`, and use **GetTurnOrder** for the rest.

## Game Updated

The new game password is always removed from `Data` before your action sees it.

## Chat Command

Players can type their own commands in chat, e.g. `/cast fireball 3`:

| Variable | Value |
|---|---|
| `ChatCommand` | `cast` (without the slash) |
| `ChatArgs` | `fireball 3` (everything after the first space) |
| `ChatText` | `/cast fireball 3` |

- The action's [hook filter](#hook-filter) lists the commands it handles, e.g. `cast`. Only a listed
  command runs it, and a command no enabled action lists still gets "Wrong command".
- A command an action takes is shown only to its sender and isn't saved in the chat history.
- The built-in commands (`/r`, `/roll`, `/gr`, `/w`, `/gm`, `/help`) keep working and never reach this hook.
- `ChatCommand` is the command as typed (`Cast` stays `Cast`); an *If* compares text ignoring case anyway.
- Reply privately with *SendChat* and `Player` set to `%playerId%`.

```json
{
  "name": "cast", "prefix": "myaddon", "hook": 19, "hookFilter": "cast", "isEnabled": true,
  "content": [
    { "Type": "SendChat", "Data": { "Template": "Text", "Title": "Casting",
        "Message": "%playerName% casts %ChatArgs%", "Player": "%playerId%" } }
  ]
}
```

One action can handle several commands (`"hookFilter": "poll, vote"`): then an *If* on `ChatCommand`
picks the work for each, e.g. `'%ChatCommand%' = 'vote'`.
