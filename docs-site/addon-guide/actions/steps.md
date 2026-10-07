---
sidebar_position: 3
title: Step reference
---

# Step reference

Each step is `{ "Type": "<step>", "Data": { ...arguments } }`. All arguments are text and accept
[tokens](./overview.md#tokens) unless noted. The action editor shows the same list, with a description for
every argument.

## Conditions and expressions

*If*, *Calculate* and *FilterCollection* use .NET `DataTable` expression syntax:

- Compare with `=`, `<>`, `<`, `>`, `<=`, `>=`.
- Combine with `AND`, `OR`, `NOT`.
- Put text in single quotes: `'%ChatCommand%' = 'cast'`.
- Use `+ - * / %` for arithmetic.
- The only functions are `IIF`, `LEN`, `ISNULL`, `SUBSTRING`, `TRIM` and `CONVERT`.

If you need `floor`, `min`, `max`, lists or text handling, use [RunScript](./run-script.md).

## Control flow

| Step | What it does | Arguments |
|---|---|---|
| **If** | Evaluates `Condition`, then runs `ActionTrue` or `ActionFalse` (either may be empty) | `Condition`, `ActionTrue`, `ActionFalse`, `OutputName` |
| **ForEach** | Runs `Action` once per item of a list variable, with the item in `ItemName` | `Collection`, `ItemName`, `Action` |
| **ExecuteAction** | Runs another action by name (`prefix/name`) | `Value` |
| **SetVariable** | Sets a variable, optionally converted to `int`, `long`, `float`, `double` or `bool` | `Name`, `Value`, `DefaultValue`, `Type` |
| **Assign Variables** (`QueryData`) | Sets several variables at once: one `name=value` per line | `Assignments` |
| **RequestUserInput** | Asks one player for text and waits (default 1 minute) | `UserName` or `UserID`, `Message`, `ShowDialog`, `DefaultInput`, `Timeout`, `Output` |
| **Delay** | Waits before the next step | `Milliseconds` (max 60000) |
| **Exit** | Stops the current action | `Message` (optional, goes to the event log) |
| **Log** | Writes a message to the game event log | `Message`, `Level` (`Info`, `Warning`, `Error`) |

**If → `OutputName`**: stores the condition's result (`True`/`False`) before the branch runs, so the branch
action can read it too. Leave both branches empty to just compute the value.

**Sub-actions** (If, ForEach, ExecuteAction) work on a copy of the variables. See
[Sub-actions get a copy](./overview.md#sub-actions-get-a-copy).

## Script

| Step | What it does | Arguments |
|---|---|---|
| **RunScript** | Runs a short sandboxed JavaScript snippet: calculations, lists, text, JSON | `Script`, `Output` |

See [RunScript](./run-script.md).

## Math and collections

| Step | What it does | Arguments |
|---|---|---|
| **Calculate** | Evaluates `Expression` and stores the result | `Expression`, `OutputName` |
| **FilterCollection** | Keeps the list items for which `Condition` is true | `Collection`, `ItemName`, `Condition`, `OutputName` |

**FilterCollection**: the condition is checked once per item, with the current item in `ItemName`:

```json
{ "Type": "FilterCollection", "Data": {
    "Collection": "cards", "ItemName": "c", "Condition": "%v:c.hp% > 0", "OutputName": "alive" } }
```

`%q:` / `%qn:` tokens don't work inside `Condition`. Read those values into a variable first.

## Properties

| Step | What it does | Arguments |
|---|---|---|
| **SetProperty** | Creates or updates one property on an entity (card, element, map, game) | `ParentId`, `PropertyName`, `PropertyValue` |
| **SetProperties** | Creates or updates several properties on one entity | `ParentId`, `Properties` |
| **GetPropertyValue** | Reads one property, or `DefaultValue` when it doesn't exist | `ParentId`, `PropertyName`, `Output`, `DefaultValue` |
| **QueryProperties** | Reads properties by parent ids and names, or by property ids | `ParentIds`, `PropertyNames`, `Ids`, `Output` |
| **DeleteProperty** | Deletes a property by entity and name. Does nothing if it doesn't exist. | `ParentId`, `PropertyName` |
| **AddPropertyListItem** | Adds a row to a list property | `ParentId`, `PropertyName`, `Fields`, `Output` |
| **UpdatePropertyListItem** | Changes fields of one row | `ParentId`, `PropertyName`, `ItemId`, `Fields` |
| **RemovePropertyListItem** | Removes one row | `ParentId`, `PropertyName`, `ItemId` |

**SetProperties** takes one `propertyName=value` per line, split at the first `=`:

```json
{ "Type": "SetProperties", "Data": {
    "ParentId": "%newCardId%",
    "Properties": "item_name=%name%\nitem_rarity=%rarity%\nitem_description=%description%" } }
```

Lines are split **before** tokens are filled in, so a value may contain line breaks or `=` characters.

## Data

| Step | What it does | Arguments |
|---|---|---|
| **CreateCard** | Creates a card from a template and stores its id | `Name`, `TemplateId`, `Owner`, `IsTemplate`, `Output` |
| **DeleteCard** | Permanently deletes a card and its properties | `CardId` |
| **GetData** | Reads entities (e.g. cards, maps) by type, name or id | `Type`, `Name`, `Id`, `PropertyName`, `SingleElement`, `Output` |
| **GetDetail** / **SetDetail** | Reads or writes a field of an object variable or an element | `Input`, `DetailName`, `Value`, `Type`, `IsElement`, `Output` |
| **GetConnectedPlayers** | Stores the list of connected players | `Value` (variable name) |
| **SetResource** | Creates or overwrites a text resource by key | `Key`, `Name`, `Content`, `MimeType`, `FolderId`, `OutputVariable` |
| **ReadResource** | Reads a text resource | `Key` or `ResourceId`, `OutputVariable` |
| **UpdateResource** | Overwrites a text resource (creates it if missing) | `Key` or `ResourceId`, `Content`, `MimeType` |
| **DeleteResource** | Deletes a resource | `Key` or `ResourceId` |

## Map

These run on the server, so they work from hooks even when no one has the map open. Players see the
change right away.

| Step | What it does | Arguments |
|---|---|---|
| **MoveElement** | Moves an element (e.g. a token); players see it glide like a drag | `ElementId`, `X`, `Y` |
| **DeleteElement** | Removes an element from its map | `ElementId` |
| **ChangeMap** | Switches a battle map view to another map, for everyone | `MapId`, `BattleMapId` |

- `X` / `Y` are canvas pixels (the element's left/top), written with a dot for decimals: `12.5`.
- *MoveElement* fires the **Element Moved** and **Element Updated** hooks. See the
  [loop warning](./hooks.md#element-moved).
- *ChangeMap*: leave `BattleMapId` empty when the game has a single battle map view. Otherwise pass the
  view's id, e.g. `%v:Data.id%` from a **Map Changed** hook.

## Dice

| Step | What it does | Arguments |
|---|---|---|
| **RollDice** | Rolls dice, stores the result and optionally posts it to chat | `DiceString`, `OutputVariable`, `SimpleOutput`, `PrintToChat`, `ChatTitle`, `ChatMessage`, `ChatColor`, `ChatBorderColor`, `FollowUpActionName`, `FollowUpActionLabel`, `FollowUpActionArgs` |

Supported notation:

| Notation | Example |
|---|---|
| Dice and arithmetic | `2d6+3`, `(1d8+2)*2` |
| Keep / drop highest or lowest | `2d20kh1` (advantage), `2d20kl1` (disadvantage), `4d6dl1` |
| Exploding | `3d6!` |
| Success / failure counting | `6d10cs>7`, `6d10cf<2` |
| Fudge / Fate dice | `4dF` |

`FollowUpActionName` adds a button under the chat roll card. Clicking it runs that action with
`FollowUpActionArgs` (one `name=value` per line). Use it for things like "Roll damage" after an attack.

## Chat and client

| Step | What it does | Arguments |
|---|---|---|
| **SendChat** | Posts a card to chat: `Text`, `BigNumber`, or `Roll` (after a RollDice) | `Template`, `Title`, `Message`, `Number`, `RollVariable`, `Color`, `BorderColor`, `Player` |
| **ShowView** | Shows a view (hidden panel) to one player or everyone | `ViewKey`, `Player`, `Data` |
| **AddMenuItem** | Adds a menu entry that runs an action | `Name`, `UiName`, `Icon`, `Action`, `Location`, `OnlyOwner`, `SubMenuId`, `SubMenuName`, `ActionArgs` |
| **AddToolbarButton** | Adds a toolbar button that runs an action | `Name`, `UiName`, `Icon`, `Action`, `Location`, `OnlyOwner`, `MenuId`, `MenuName`, `ActionArgs` |
| **FireClientMediator** | Sends an event to the players' browsers | `EventName`, `Payload`, `Player` |
| **RunClientCommand** | Runs a panel command in one player's browser | `Panel`, `Command`, `Player`, `Data` |
| **SendCommand** | Sends a raw lobby command (advanced) | The command itself |

**SendChat → `Player`** (whisper): set a player's name, id or `%playerId%` to send the message to that
player only. Whispers aren't saved in the chat history. Leave it empty to post to everyone.

## Audio

| Step | What it does | Arguments |
|---|---|---|
| **PlaySound** / **StopSound** | Plays or stops a soundboard sound for one player or everyone | `ResourceId`, `Player` |
| **PlayPlaylist** / **PausePlaylist** / **StopPlaylist** | Controls a music playlist for everyone | `PlaylistId` |

## Turn order

Each map has its own turn order. `MapId` may be left empty when the game has a single battle map view; its current map is used. The steps act as the system, then tell everyone and fire **Turn Changed** like a player's change would.

| Step | What it does | Arguments |
|---|---|---|
| **AddToTurnOrder** | Adds a token (by `ElementId`) or a free entry (by `Name`). The first entry starts round 1. | `MapId`, `ElementId`, `Name`, `Initiative`, `Hidden`, `Output` (the new entry's id) |
| **RemoveFromTurnOrder** | Removes an entry, or a token's entry. If it was its turn, the turn passes on. | `MapId`, `EntryId` or `ElementId` |
| **SetInitiative** | Sets (or, when empty, clears) an initiative, and can sort right after | `MapId`, `EntryId` or `ElementId`, `Initiative`, `Sort` |
| **NextTurn** / **PreviousTurn** | Passes the turn on or back. After the last entry the next round starts; back from the first goes to the previous round, never below 1. | `MapId` |
| **SortTurnOrder** | Highest initiative first; ties keep their place, entries without one go last | `MapId` |
| **ResetTurnOrder** | Round 1 with the first entry, or (`Clear`) removes every entry | `MapId`, `Clear` |
| **GetTurnOrder** | Reads the whole turn order, hidden entries too | `MapId`, `Output` |

*GetTurnOrder* stores `{ MapId, Round, CurrentEntryId, Entries: [{ Id, Name, Initiative, ElementId, Hidden }] }`.
For example, roll initiative for a token with **RollDice**, then **SetInitiative** with `Sort` = `true`.

## Network and security

| Step | What it does | Arguments |
|---|---|---|
| **SendRequest** | Calls a web API. Protected properties can go in the body or as a Bearer token, and are never returned. | `TargetUrl`, `HttpMethod`, `ParentId`, `IncludeProtectedPropertyNames`, `BearerTokenPropertyName`, `ExtraBodyVariable`, `Output` |
| **RequirePermission** | Checks that the triggering player has a permission on an entity. Stores the result or stops the action. | `EntityId`, `Permission`, `Output`, `StopIfDenied` |

*SendRequest* stores `Success`, `StatusCode` and `ResponseBody`. Read into a JSON response with `%v:`:
`%v:output.ResponseBody.results[0].name%`.
