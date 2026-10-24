---
sidebar_position: 3
title: Step reference
---

# Step reference

Each step is `{ "Type": "<step>", "Data": { ...arguments } }`. All arguments are text and accept
[tokens](./overview.md#tokens) unless noted. The action editor shows the same list, with a description for
every argument and what each step stores.

## Conditions

*If* uses .NET `DataTable` expression syntax:

- Compare with `=`, `<>`, `<`, `>`, `<=`, `>=`.
- Combine with `AND`, `OR`, `NOT`.
- Put text in single quotes: `'%ChatCommand%' = 'cast'`.
- Use `+ - * / %` for arithmetic.
- The only functions are `IIF`, `LEN`, `ISNULL`, `SUBSTRING`, `TRIM` and `CONVERT`.

For anything else (`floor`, `min`, `max`, sums, lists, text handling) use [RunScript](./run-script.md).

## Control flow

| Step | What it does | Arguments |
|---|---|---|
| **If** | Evaluates `Condition`, then runs the steps in `Then` or in `Else` (either may be empty) | `Condition`, `Then`, `Else`, `OutputName` |
| **ForEach** | Runs the steps in `Do` once per item of a list variable, with the item in `ItemName` | `Collection`, `ItemName`, `Do` |
| **ExecuteAction** | Runs another action by name (`prefix/name`), on a copy of the variables | `Value` |
| **SetVariable** | Sets a variable, optionally converted to `int`, `long`, `float`, `double` or `bool` | `Name`, `Value`, `DefaultValue`, `Type` |
| **Delay** | Waits before the next step | `Milliseconds` (max 60000) |
| **Exit** | Stops the action | `Message` (optional, goes to the event log) |
| **Log** | Writes a message to the game event log | `Message`, `Level` (`Info`, `Warning`, `Error`) |

`Then`, `Else` and `Do` are lists of steps, written like `content`. They share the action's variables:
see [Blocks](./overview.md#blocks).

```json
{ "Type": "If", "Data": { "Condition": "%playerIsGm% = true",
  "Then": [ { "Type": "SendChat", "Data": { "Template": "Text", "Message": "Hello, GM" } } ],
  "Else": [ { "Type": "Exit", "Data": { "Message": "GMs only" } } ] } }
```

**If → `OutputName`** stores the condition's result (`True`/`False`). Leave both blocks empty to just
compute the value.

## Asking players

| Step | What it does | Arguments |
|---|---|---|
| **RequestTargets** | Lets a player pick tokens (or any elements) on the battle map, and waits (default 2 minutes) | `Player`, `Message`, `Target`, `Min`, `Max`, `Candidates`, `Timeout`, `StopIfCancelled`, `Output` |
| **RequestPoint** | Lets a player point at a place on the battle map, with a marker following the cursor, and waits (default 2 minutes) | `Player`, `Message`, `Shape`, `Radius`, `Width`, `Height`, `Color`, `Text`, `SnapToGrid`, `From`, `MaxDistance`, `HighlightTokens`, `ShowToOthers`, `MapId`, `Timeout`, `StopIfCancelled`, `Output` |
| **RequestUserInput** | Asks a player for text, or to pick one of a few answers, and waits (default 1 minute) | `UserID` or `UserName`, `Message`, `ShowDialog`, `DefaultInput`, `Options`, `Timeout`, `StopIfCancelled`, `Output` |

**RequestTargets**: the player sees a bar on the battle map with the message and *picked/needed*. They
click tokens to pick them (again to unpick), then **Done**. `Player` empty means the player who ran the
action.

- `Target`: `token` (default) or `element`: any element on the map (a shape, a picture, a wall, a token),
  never a token's bars or icons. Picked elements come in the same shape as tokens.
- `Min` / `Max` (both default 1): how many may be picked. **Done** works once `Min` are picked.
- `Candidates`: only these tokens can be picked; the rest are dimmed. A list of tokens or of ids, e.g.
  `%inRange%` from a *Find*. The server checks the answer too: a token that isn't a candidate is refused.
- `Output` holds the picked tokens, in the order they were picked, with the same fields as *Find* tokens:
  `[{ id, name, x, y, w, h, cardId, mapId }]`.

**RequestPoint**: the player gets a crosshair and a bar with the message and **Cancel** (or Esc). The
area follows the cursor, and a click chooses the place. Use it to aim an area (a Fireball, Burning
Hands, a Lightning Bolt), to pick where something appears, or wherever a map tool would otherwise be
needed.

- `Shape`, `Radius`, `Width`, `Height`, `Angle` (an [area](#areas)), `Color`, `Text`: what follows the
  cursor. `none` asks for a bare point.
- A `line` or `cone` starts at `From` (the caster's token, e.g. `%caster%`) and is `Radius` long: the
  player only aims it. `Output`'s `x`, `y` is then the end of its axis and `from` its start, so the
  next steps are *Find* with **Near** `%caster%`, **Toward** `%point%`, and *ShowMarker* with **At**
  `%point.from%`, **Toward** `%point%`.
- `SnapToGrid`: `none` (default), `center` (the middle of a square) or `corner` (where grid lines cross,
  as for a D&D spell's point of origin).
- Circle and rect: `From` and `MaxDistance` (in squares) limit how far the point may be. `From` is a
  token or a point; from a token the range counts from its edge, like *Find*'s **Near**. The range shows
  as a dashed ring; outside it the area is faded and dashed with a red outline, and a click does nothing.
  The server checks the answer too.
- `HighlightTokens` (on by default): tokens the area covers glow while the player aims. They are the ones
  *Find* gives for the same area.
- `ShowToOthers` (on by default): everyone looking at the map sees the area and the range move.
- `Output` holds `{ x, y, mapId, from }` (map pixels; `from` only for a line or cone). The area goes away
  once the player clicks; to keep showing it while the GM decides, add *ShowMarker* with **Until Action
  Ends** at `%point%`.

**RequestUserInput → `Options`**: one answer per line (`yes`, `half`, `no`). The player gets a button for
each instead of a text box, and `Output` holds the one they clicked.

**`StopIfCancelled`** (all three steps, on by default): when the player cancels, doesn't answer in time or
isn't connected, the action stops quietly. Turn it off to carry on with an empty answer (an empty list
for *RequestTargets*, nothing for *RequestPoint*) and handle that yourself.

## Script

| Step | What it does | Arguments |
|---|---|---|
| **RunScript** | Runs a short sandboxed JavaScript snippet: calculations, lists, text, JSON | `Script`, `Output` |

See [RunScript](./run-script.md).

## Properties

| Step | What it does | Arguments |
|---|---|---|
| **SetProperty** | Creates or updates one property; with `Protected`, a secret nothing can read back | `Of`, `ParentId`, `PropertyName`, `PropertyValue`, `Protected` |
| **SetProperties** | Creates or updates several properties on one entity | `Of`, `ParentId`, `Properties` |
| **GetPropertyValue** | Reads one property, or `DefaultValue` when it doesn't exist | `Of`, `ParentId`, `PropertyName`, `Output`, `DefaultValue` |
| **DeleteProperty** | Deletes a property by entity and name. Does nothing if it doesn't exist. | `Of`, `ParentId`, `PropertyName` |
| **AddPropertyListItem** | Adds a row to a list property | `Of`, `ParentId`, `PropertyName`, `Fields`, `Output` |
| **UpdatePropertyListItem** | Changes fields of one row | `Of`, `ParentId`, `PropertyName`, `ItemId`, `Fields` |
| **RemovePropertyListItem** | Removes one row | `Of`, `ParentId`, `PropertyName`, `ItemId` |

**`Of`** says whose property it is:

| `Of` | The property of |
|---|---|
| empty | the entity whose id is in `ParentId`: a card, a map element, a map or the game |
| `tokenCard` | the card of the token in `ParentId`. A token's hit points and stats usually live on its card, so this is the one to use with a token from *Find* or *RequestTargets*. |
| `map` | the map in `ParentId`, or, when that's empty, the map the player is looking at |
| `game` | the game (`ParentId` is not needed) |

```json
{ "Type": "SetProperty", "Data": { "Of": "tokenCard", "ParentId": "%target.id%", "PropertyName": "blessed", "PropertyValue": "true" } }
```

**SetProperties** takes one `propertyName=value` per line, split at the first `=`:

```json
{ "Type": "SetProperties", "Data": {
    "ParentId": "%newCardId%",
    "Properties": "item_name=%name%\nitem_rarity=%rarity%\nitem_description=%description%" } }
```

Lines are split **before** tokens are filled in, so a value may contain line breaks or `=` characters.

### Protected properties

**SetProperty** with `Protected` = `true` stores a secret, such as an API token a settings view saves. After
that, nothing reads it back: not players, cards, `%q:` tokens, *GetPropertyValue* or *RunScript*, and its
value is never sent to anyone's browser. Only *SendRequest* and *DownloadResource* use it, as the bearer token
(`BearerTokenPropertyName`) or in the request body (`IncludeProtectedPropertyNames`).

A protected property stays protected: a later *SetProperty* on it (with or without `Protected`) changes the
value and keeps it secret.

```json
[
  { "Type": "RequirePermission", "Data": { "EntityId": "%gameId%", "Permission": "Edit", "StopIfDenied": true } },
  { "Type": "SetProperty", "Data": { "ParentId": "%gameId%", "PropertyName": "myaddon_token", "PropertyValue": "%token%", "Protected": true } }
]
```

Start such an action with *RequirePermission*: any player can fire an action by name.

## Finding things

**Find** looks things up in the game and stores what it found: a list, or with `First` a single one (or
nothing). It replaces looking things up by hand: it is the step for "the tokens on this map", "the tokens
within 4 squares", "the cards marked *monster*".

| Argument | Used for | Meaning |
|---|---|---|
| `What` | all | `tokens`, `elements`, `cards`, `maps`, `battleMaps`, `players`, `actions` or `layouts` |
| `Id`, `Name` | all | Only the one with this id / these with this name |
| `Property` | cards, maps, tokens, elements | Only those that have a property with this name, e.g. `monster` |
| `MapId` | tokens, elements | The map to look on. Empty: the map the player is looking at |
| `AllMaps` | tokens, elements | Look on every map of the game instead |
| `WithCard` | tokens | Only tokens linked to a card |
| `Near` + `Radius` | tokens, elements | Only those within `Radius` squares of a point (`{x, y}`, e.g. `%point%`) or of a token (its id, or `%target%`). Counted to the token's edge; the token itself isn't included. |
| `Shape`, `Width`, `Height`, `Angle`, `Toward` | tokens, elements | Only those in another [area](#areas): a rect, a line or a cone at `Near` |
| `IncludeTemplates` | cards | Card templates too |
| `First` | all | Store the first one found (or nothing) instead of a list |
| `Output` | all | The variable |

What each item holds:

| `What` | Fields |
|---|---|
| `tokens` | `id`, `name`, `x`, `y` (the centre, in map pixels), `w`, `h`, `cardId`, `mapId` |
| `elements` | `id`, `name`, `type`, `isToken`, `x`, `y`, `w`, `h`, `cardId`, `mapId`, `object` (the element as drawn) |
| `cards` | `id`, `name`, `key`, `isTemplate`, `isHidden` |
| `maps` | `id`, `name`, `gridSize`, `width`, `height` |
| `battleMaps` | `id`, `name`, `mapId` |
| `players` | `id`, `name`, `color`, `isOwner` |
| `actions` | `id`, `name`, `prefix`, `hook` |
| `layouts` | `id`, `name` |

*Find* runs as the system, so it also finds what the triggering player can't see (hidden elements, other
players' cards). Check permissions with *RequirePermission* when that matters.

```json
{ "Type": "Find", "Data": { "What": "tokens", "Near": "%point%", "Radius": "4", "WithCard": true, "Output": "inBlast" } }
{ "Type": "Find", "Data": { "What": "tokens", "Near": "%caster%", "Shape": "cone", "Radius": "3", "Toward": "%point%", "Output": "burnt" } }
```

### Areas

*Find*, *ShowMarker*, *AddElement* and *RequestPoint* describe an area the same way, so an area shown on
the map and the tokens found in it always match:

| Argument | circle | rect | line | cone |
|---|---|---|---|---|
| `Shape` | `circle` (default) | `rect` | `line` | `cone` |
| the place: `Near` (*Find*), `At` (markers), `From` (*RequestPoint*) | centre | centre | start | tip |
| `Radius` (squares) | radius | — | length | length |
| `Width` / `Height` (squares) | — | width / height | width (default 1) | — |
| `Angle` (degrees) | — | — | — | how wide it spreads (default 53, as the ruler) |
| `Toward` | — | — | the point or token it points at | the point or token it points at |

- A place is a point (`{x, y}`, `"x,y"`, `%point%`, `%position%`) or a token: its id, a token from *Find*
  (`%target%`), or the list of one that *RequestTargets* with **Max** 1 gives (`%caster%`).
- **What an area covers**: a token counts when it touches the area, counted to its edge (for a circle:
  within the radius plus half the token). It's the same rule on the server (*Find*) and on the map (the
  tokens that glow while aiming or measuring).
- **Colours**: a marker's `Color` is its fill. Without one it takes the colour of the player whose action
  it is, see-through inside, as their measuring does. Areas being aimed or measured, and the tokens they
  light up, are in the player's colour too; a theme can set the default with the CSS variable
  `--nm-area-color`, else it is orange.

## Cards and resources

| Step | What it does | Arguments |
|---|---|---|
| **CreateCard** | Creates a card from a template and stores its id. `Folder` (e.g. `Lore/Trilium`) puts it in that folder of the Cards panel (Templates, for a template), made if missing | `Name`, `TemplateId`, `Owner`, `IsTemplate`, `Folder`, `Output` |
| **DeleteCard** | Permanently deletes a card and its properties | `CardId` |
| **GetConnectedPlayers** | Stores the list of connected players | `Value` (variable name) |
| **SetResource** | Creates or overwrites a text resource by key | `Key`, `Name`, `Content`, `MimeType`, `FolderId`, `OutputVariable` |
| **ReadResource** | Reads a text resource | `Key` or `ResourceId`, `OutputVariable` |
| **UpdateResource** | Overwrites a text resource (creates it if missing) | `Key` or `ResourceId`, `Content`, `MimeType` |
| **DeleteResource** | Deletes a resource | `Key` or `ResourceId` |

## Map

These run on the server, so they work from hooks even when no one has the map open (the GM included).
Players see the change right away. A `MapId` left empty means the map the player is looking at (see
[the map the player is looking at](./overview.md#variables)).

| Step | What it does | Arguments |
|---|---|---|
| **SpawnToken** | Places a token of a card, or a plain token, on a map | `CardId` or `Token` + `Image`, `X`, `Y`, `MapId`, `Output` (the token's id) |
| **AddElement** | Adds a shape to a map, saved like one drawn by hand | `Shape`, `At`, `Toward`, `Radius`, `Width`, `Height`, `Angle`, `Color`, `Text`, `Layer`, `MapId`, `Output` (the element's id) |
| **ShowMarker** | Shows a shape on a map for a while, to everyone; never saved | `Shape`, `At`, `Toward`, `Radius`, `Width`, `Height`, `Angle`, `Color`, `Text`, `Duration`, `UntilActionEnds`, `MapId`, `Output` |
| **MoveElement** | Moves an element (e.g. a token); players see it glide like a drag | `ElementId`, `X`, `Y` |
| **DeleteElement** | Removes an element from its map | `ElementId` |
| **ChangeMap** | Switches a battle map view to another map, for everyone | `MapId`, `BattleMapId` |

- *AddElement* and *ShowMarker* take an [area](#areas) (or `text`): `At` is a point or a token, e.g.
  `%point%`, the centre of a circle, rect or text, where a line or cone starts. *SpawnToken* and
  *MoveElement* take `X` / `Y`, map pixels of the **top-left corner**, written with a dot for decimals:
  `12.5`.
- Sizes (`Radius`, `Width`, `Height`) are in **squares** of the map's grid: a 20 ft Fireball on a 5 ft
  grid is `Radius` = `4`.
- `Color` is any CSS colour, e.g. `rgba(255,80,0,0.35)`; empty, the player's colour (see [areas](#areas)).
- **SpawnToken** with a `CardId` uses the card's `token` property (its token file) and picture, sized
  from the card, like dragging the card onto the map. Without a card, give a token file in `Token` (e.g.
  `basics_token_generic.json`) and a picture in `Image`.
- **ShowMarker** stays for `Duration` seconds (default 10), or with `UntilActionEnds` until the action
  ends, e.g. while the GM decides on a *RequestUserInput*.
- *MoveElement* fires the **Element Moved** and **Element Updated** hooks. See the
  [loop warning](./hooks.md#element-moved).
- *ChangeMap*: leave `BattleMapId` empty to use the view the player is looking at (or the game's only
  one). Otherwise pass the view's id, e.g. `%Data.id%` from a **Map Changed** hook.

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
| **AddMenuItem** | Adds a menu entry that runs an action, in the menu named by `Location` (see [Menu locations](#menu-locations)) | `Name`, `UiName`, `Action`, `Location`, `OnlyTriggeringPlayer`, `GmOnly`, `SubMenuId`, `SubMenuName`, `ActionArgs` |
| **AddToolbarButton** | Adds a button at the end of the main toolbar that runs an action, or with `MenuId` a dropdown menu | `Name`, `UiName`, `Action`, `OnlyTriggeringPlayer`, `GmOnly`, `MenuId`, `MenuName`, `ActionArgs` |
| **AddMapTool** | Adds a tool to the Tools panel; clicking the map with it runs an action (see [Map tools](#map-tools)) | `Name`, `UiName`, `Action`, `Hint`, `Target`, `StayActive`, `OnlyTriggeringPlayer`, `GmOnly`, `ActionArgs` |
| **FireClientMediator** | Sends an event to the players' browsers | `EventName`, `Payload`, `Player` |
| **RunClientCommand** | Runs a panel command in one player's browser | `Panel`, `Command`, `Player`, `Data` |

**SendChat → `Player`** (whisper): set a player's name, id or `%playerId%` to send the message to that
player only. Whispers aren't saved in the chat history. Leave it empty to post to everyone.

**Who gets it** (AddMenuItem, AddToolbarButton, AddMapTool): every connected player, unless
`OnlyTriggeringPlayer` (just the player who triggered the action, e.g. the one whose game just loaded) or
`GmOnly` (just the GMs: the game's owner and players with Edit on the game) is on.

`Icon` (both steps) and AddToolbarButton's `Location` are accepted but not used yet: menu items and
toolbar buttons are text only, and buttons always go at the end of the main toolbar.

### Menu locations

AddMenuItem's `Location` is the id of the menu the item goes into. The action editor offers these in
a list; you can also type one.

| Location | Menu | Who sees it |
|---|---|---|
| `game` (or empty) | **Game** menu | everyone |
| `views` | **View** | everyone |
| `views_battlemaps` | View → **Battle Maps** | GM |
| `layouts` | **Layouts** | everyone |
| `settings` | **Settings** | everyone |
| `addons` | **Addons** | GM |
| `addons_addons` / `addons_views` / `addons_code` | Addons → **Addons** / **Views** / **Code** | GM |
| `battlemap_add` | Map right-click → **Add** | anyone who can place tokens on the map |
| `battlemap` | Map right-click on empty space | everyone |
| `battlemap_element` | Map right-click on a token or element | anyone who can right-click it |
| `cards_item` | Cards panel: right-click on a card | anyone who can see the card |

Right-click menus pass what was clicked to the action as variables:

| Location | Variables |
|---|---|
| `battlemap_add`, `battlemap` | `battleMapId`, `mapId`, `position` (`{ x, y }` on the map) |
| `battlemap_element` | `battleMapId`, `mapId`, `position`, `elementId`, `elementIds` (every selected element's id) |
| `cards_item` | `cardId` |

Players can open these menus too, and a player's click runs the action as that player. If the action
should only work for some players, check it with a **RequirePermission** step first (e.g. `Control`
on `%elementId%`).

**Your own menu:** make a toolbar dropdown with AddToolbarButton and a `MenuId` (e.g. `myaddon_menu`),
then add items to it with AddMenuItem and that id as `Location`. To group items inside an existing
menu instead, give them a `SubMenuId` (and `SubMenuName`): the submenu is created the first time.
`Name` identifies an item within its menu; sending the same `Name` again doesn't add a duplicate.

### Map tools

**AddMapTool** adds a tool to the Tools panel, under **Addon tools**. While a player has it active,
a left click on the map runs the tool's `Action` with these variables (plus `ActionArgs`):

| Variable | Value |
|---|---|
| `battleMapId`, `mapId` | the battle map view and the map that was clicked |
| `position` | `{ x, y }` of the click on the map |
| `elementId` | the clicked token or element, if any |

- `Target` decides which clicks count: `point` (anywhere, the default), `token` or `element`.
  Other clicks are ignored.
- `Hint` is shown on the map while the tool is active, with a **Stop** button.
- With `StayActive` off, the tool turns itself off after one use; with it on, it stays until Stop.
- Tools, like menu items, last until the player leaves the game, so add them from a hook that runs
  when the game starts.

Example: a *Teleport* tool. Add it from a game-start hook:

```json
{ "Type": "AddMapTool", "Data": { "Name": "teleport", "UiName": "Teleport", "Action": "myaddon/teleport",
  "Target": "token", "StayActive": true, "Hint": "Click a token to move it to the map's top-left corner." } }
```

and in `myaddon/teleport`, move the clicked token:

```json
{ "Type": "MoveElement", "Data": { "ElementId": "%elementId%", "X": "0", "Y": "0" } }
```

## Audio

| Step | What it does | Arguments |
|---|---|---|
| **PlaySound** / **StopSound** | Plays or stops a soundboard sound for one player or everyone | `ResourceId`, `Player` |
| **PlayPlaylist** / **PausePlaylist** / **StopPlaylist** | Controls a music playlist for everyone | `PlaylistId` |

## Turn order

Each map has its own turn order. Leave `MapId` empty for the map the player is looking at (or the game's only battle map view's). The steps act as the system, then tell everyone and fire **Turn Changed** like a player's change would.

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
| **DownloadResource** | Downloads a URL (e.g. an image) and saves it as a game resource. A protected property can be the Bearer token. | `TargetUrl`, `Key`, `Name`, `MimeType`, `FolderId`, `ParentId`, `BearerTokenPropertyName`, `Output` |
| **RequirePermission** | Checks that the triggering player has a permission on an entity. Stores the result or stops the action. | `EntityId`, `Permission`, `Output`, `StopIfDenied` |
| **SetPermission** | Shares a card, token or map with a player or everyone, or lets a player move a token; or takes it back | `EntityId`, `Player`, `Permission`, `Revoke` |

*SendRequest* stores `Success`, `StatusCode` and `ResponseBody`. Read into a JSON response with a path:
`%output.ResponseBody.results[0].name%`.

*DownloadResource* saves the file under `Key`, replacing a resource with that key, and stores `success`,
`statusCode`, `resourceId`, `mimeType` and `size` (bytes). Nothing is saved when the download fails. Cards
read the file with `Resources.Global.Read('<key>')`.

### Private and local hosts

*SendRequest* and *DownloadResource* can't reach the server's own computer or its network (`localhost`,
`192.168.x.x`, `10.x.x.x` and the like) unless the server's admin allows that host in
**Application Settings → Server → Local network access**, as a host or `host:port` (for example
`localhost:8080`). Everything else private stays blocked, also after a redirect. A response may be at most
20 MB and take at most 30 seconds.

An addon that talks to something on the GM's own network should say in its description which host to
allow.

### SetPermission

*SetPermission* lets an action share something with players, for example a handout the story has reached.
It is deliberately narrow, so it can't do more than its caller could in the Permissions dialog:

- **`Permission`** is `Read` (see it) or `Control` (move a token). Nothing else: never Edit, Remove or
  Execute. Empty means Read.
- **`EntityId`** is a card, a token or other map element, or a map of this game. Templates, views, actions,
  properties, resources and the game itself are refused.
- **`Player`** is one player (name, id or `%variable%`). Empty means everyone, and everyone can only get
  Read.
- **`Revoke`** = `true` takes the right back. It never lowers a player who can edit the entity, and never
  touches the game owner's rights.
- The player who triggered the action must have **Edit** on the entity and hold the right they give. An
  action run by a hook with no player is refused.

Sharing a card puts it in the players' Cards panel at once, and taking it back removes it. Every change is
written to the game's event log.

```json
[
  { "Type": "RequirePermission", "Data": { "EntityId": "%gameId%", "Permission": "Edit", "StopIfDenied": true } },
  { "Type": "SetPermission", "Data": { "EntityId": "%cardId%", "Permission": "Read" } },
  { "Type": "ShowView", "Data": { "ViewKey": "myaddon_handout", "Data": "{ \"cardId\": \"%cardId%\" }" } }
]
```

## Removed steps

These steps are gone. An action that still uses one skips that step and logs "Unknown step type" in the
event log (and as ✗ in the editor).

| Step | Use instead |
|---|---|
| **GetData** | *Find* |
| **GetDetail** / **SetDetail** | A path token (`%target.name%`) / *RunScript* |
| **Calculate** | *SetVariable* with `Type`, or *RunScript* |
| **FilterCollection** | *Find* with its filters, or *RunScript* (`vars.list.filter(...)`) |
| **Assign Variables** (`QueryData`) | One *SetVariable* per value, or *RunScript* returning an object |
| **QueryProperties** | *GetPropertyValue*, or `%q:` tokens |
| **SendCommand** | The step for what you want to do |

*If* and *ForEach* no longer take an action name (`ActionTrue`, `ActionFalse`, `Action`): put the steps in
`Then`, `Else` and `Do`, or an *ExecuteAction* step there.
