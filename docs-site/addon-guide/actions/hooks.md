---
sidebar_position: 2
title: Hooks
---

# Hooks

A hook runs every **enabled** action that uses it, whenever something happens in the game. Set the hook in
the action editor, or as the `hook` number in an addon's action JSON.

Most hooks come from a change someone made (a player, or another action). They give the action:

- `Data`: the change's payload, e.g. the element, property or card that changed
- `Player`: who made the change (so `playerId`, `playerName`, … are filled in)
- `Command`: the full command, for advanced use

Read fields inside `Data` with `%v:`, e.g. `%v:Data.id%` or `%v:Data.name%`.

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
| 19 | Chat Command | A chat command that isn't built in is typed | `ChatCommand`, `ChatArgs`, `ChatText`, `Player` |
| 20 | Card Added | A card is created | `Data`, `Player` |
| 21 | Card Updated | A card changes | `Data`, `Player` |
| 22 | Card Deleted | A card is deleted | `Data`, `Player` |

## Element Moved

`Data` holds the element id and its new position. The position sits inside the element's `object` text,
and `%v:` reads it for you:

```json
{ "Type": "SendChat", "Data": {
    "Template": "Text", "Title": "Token moved",
    "Message": "%v:Data.id% is now at %v:Data.object.left%, %v:Data.object.top%" } }
```

Moving an element also fires **Element Updated**. An action on either hook that moves the **same** element
triggers itself again and never stops. Check a condition first, or move a different element.

## Game Updated

The new game password is always removed from `Data` before your action sees it.

## Chat Command

Players can type their own commands in chat, e.g. `/cast fireball 3`:

| Variable | Value |
|---|---|
| `ChatCommand` | `cast` (without the slash) |
| `ChatArgs` | `fireball 3` (everything after the first space) |
| `ChatText` | `/cast fireball 3` |

- The built-in commands `/r`, `/roll` and `/help` keep working and never reach this hook.
- Every Chat Command action gets every custom command, so start with an *If* on `ChatCommand`, e.g.
  `'%ChatCommand%' = 'cast'`.
- While at least one enabled action uses this hook, an unknown command no longer answers "Wrong command".
  The typed text is shown only to its sender and isn't saved in the chat history.
- Reply privately with *SendChat* and `Player` set to `%playerId%`.

An *If* branch runs a separate action, so put the real work in the branch:

```json
{
  "name": "on_command", "prefix": "myaddon", "hook": 19, "isEnabled": true,
  "content": [
    { "Type": "If", "Data": { "Condition": "'%ChatCommand%' = 'cast'", "ActionTrue": "myaddon/cast" } }
  ]
}
```

```json
{
  "name": "cast", "prefix": "myaddon", "hook": 0,
  "content": [
    { "Type": "SendChat", "Data": { "Template": "Text", "Title": "Casting",
        "Message": "%playerName% casts %ChatArgs%", "Player": "%playerId%" } }
  ]
}
```
