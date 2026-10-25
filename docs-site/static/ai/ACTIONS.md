<!-- Source: https://nordvikmanager.pl/ai/ACTIONS.md. Refresh this file from there when the platform changes. -->

# Writing NordvikManager actions: guide for AI assistants

You are helping someone write an **action** for **NordvikManager**, a web app for tabletop RPGs: the GM runs a server, players join in the browser. An action is a list of steps the GM's server runs: roll dice, ask a player to pick tokens, change a property, post to chat, put a marker on the map. The person will paste what you write into the game. Follow this file. **Never guess a step, field, hook or token. If it isn't here, it doesn't exist:** say so and suggest a way with the steps that do.

Full docs: https://nordvikmanager.pl/addon-guide/actions/overview
Step reference: https://nordvikmanager.pl/addon-guide/actions/steps
Building a whole addon (cards, themes, several actions shipped together): https://nordvikmanager.pl/ai/AGENTS.md

## 1. What to give back

**One JSON object per action, in its own ```json block**, ready to paste into *Addons → Actions → + → Start from: Paste JSON…*:

```json
{
  "prefix": "mytools",
  "name": "roll_check",
  "description": "Rolls a d20 check for the card it runs from.",
  "hook": 0,
  "content": [
    { "Type": "GetPropertyValue", "Data": { "ParentId": "%cardId%", "PropertyName": "name", "Output": "cardName", "DefaultValue": "Someone" } },
    { "Type": "RollDice", "Data": { "DiceString": "1d20", "PrintToChat": true, "ChatTitle": "%cardName%: check" } }
  ]
}
```

- `name`: short, e.g. `roll_check`. `prefix` groups actions in the editor; other actions call this one as `prefix/name` (or just `name` without a prefix). Keep one prefix for everything you write for the same person, and not the key of an addon they have installed (e.g. not `dnd5e`): ask, or use something like `my`.
- `hook`: when it runs by itself (section 4). `0`: only when called by name, from a menu item, a toolbar button, a map tool, a card or another action.
- `hookFilter`: which occurrences of the hook run it; its meaning depends on the hook (section 4). Hook 19 (Chat Command) **needs** it: the commands the action handles, e.g. `"cast"` or `"poll, vote"`. Other hooks take none: leave it out.
- `content`: the steps, run top to bottom. Each step is `{ "Type": "<step>", "Data": { ... } }` with the exact casing of section 5. A step may have `"Label"` in `Data`: a short name the editor shows.
- Leave out `id`, `isEnabled` and `gmPermission`. The editor fills them in.
- Several actions (e.g. a setup action that adds a menu item, and the action the item runs): one JSON block each. The user can paste the whole reply at once: every block becomes an action.
- After the JSON, tell the user in one or two lines how to start it, and for a hooked action that they must **turn on the switch next to its name** in the editor and **Save**: a new action starts switched off, and a switched-off action never runs from its hook. Running by name works either way.

The paste checks the step types and refuses unknown ones, naming them. If the user reports such an error, fix the step; don't rename it to something else that also isn't in section 5.

## 2. Values and variables

- **Values are text.** Write numbers as strings: `"Max": "3"`, `"PropertyValue": "10"`. Only arguments marked *true/false* in section 5 take `true` / `false`, blocks take a list of steps and `ActionArgs` takes an object of strings.
- **Variables:** a step's `Output` (or `OutputVariable`, `Value` on GetConnectedPlayers) names a variable to store its result in. Later steps read it with a token.
- **Built-in variables:** `gameId`, `gmId`, `actionId`, `actionName`, `actionPrefix`, `playerId`, `playerName`, `playerColor`, `playerIsOwner`, `playerIsGm`, `battleMapId` / `mapId` (the player's current battle map, when run from their screen). Run from a right-click menu or a map tool: `position` (`{x, y}`), `elementId`, `elementIds`. Run from a card: `cardId`. Plus the hook's variables (section 4) and the caller's arguments (`ActionArgs`). Built-ins always win over arguments with the same name.
- **Tokens, two forms only:**
  - `%name%` / `%name.path[0].x%`: a variable, or a value inside it. Lists and objects come out as JSON; text holding JSON is read as JSON.
  - `%q:type[name].prop%`: a property of the entity with that name. Type: `card`, `map`, `player`, `game`, `action`, `resource`. E.g. `%q:card[Goblin].hp%`. By id: `%q:{var}.prop%`, `%q:{var.field}.prop%`, `%q:<guid>.prop%`. `.id` and `.name` give the entity's own; only cards, maps, elements and the game have other properties.
  - Write names exactly; a miss gives empty text. Tokens are filled in once: a value is never read as tokens again. There is no `%v:` or `%dto:`.
- **Where a token's stats live:** on its card. Property steps take `Of`: empty (the entity in `ParentId`), `tokenCard` (the card of the token in `ParentId`), `map`, `game`. So a token's HP is `GetPropertyValue` with `ParentId: "%target.id%"`, `Of: "tokenCard"`, `PropertyName: "hp"`. Property names depend on the game's sheets: **ask the user** what they're called (`hp`, `HP`, `hit_points`…) instead of guessing.
- **Conditions** (If): .NET `DataTable` expressions. `=`, `<>`, `<`, `>`, `<=`, `>=`, `AND`, `OR`, `NOT`, `+ - * / %`; text in single quotes: `'%ChatCommand%' = 'cast'`. Functions: only `IIF`, `LEN`, `ISNULL`, `SUBSTRING`, `TRIM`, `CONVERT`.
- **Calculations:** one **RunScript** step (JavaScript), not long chains of steps. `vars` holds the variables; return an object and each of its fields becomes a variable. E.g. `"Script": "return { half: Math.floor(vars.damage / 2) };"`. Limits: 5 s, 200 `game` calls, 16 MB, no network, no files, no `eval`. Scripts can act through `game`: `find(what, options)`, `getProperty(id, name, fallback)`, `setProperty(id, name, value)`, `roll(formula)`, `chat(text, { title, to })`, `log`, `moveElement`, `deleteElement`, `spawnToken`, `showMarker`, `addElement`, `createCard`, `step(type, data)`. They run as the system and can't ask players. Docs: https://nordvikmanager.pl/addon-guide/actions/run-script
- **Blocks:** If's `Then` / `Else` and ForEach's `Do` hold their steps inline and share the action's variables (what they set is there after them). **Exit** in a block stops the whole action. **ExecuteAction** runs another action on a *copy* of the variables: use it only for an action several others share.

## 3. Patterns

- **Targets:** RequestTargets (the player clicks tokens; `Output` is a list like Find's tokens: `[{ id, name, x, y, w, h, cardId, mapId }]`), then ForEach over it.
- **Areas:** RequestPoint (the player aims a circle/rect/line/cone that follows the cursor; covered tokens glow), then Find with `What: "tokens"`, `Near: "%point%"` and the same `Shape`/`Radius`/`Width`/`Height`. A line or cone starts at `From` (e.g. the caster's token) and is only aimed: then Find with `Near: "%caster%"`, `Toward: "%point%"`.
- **Tokens vs cards:** `%cardId%` (an action run from a card) is a card, not a token on the map. Steps that want a token or a point (`From`, `Near`, `At`, `ElementId`) don't take it. For the caster's token use RequestTargets (`Max: "1"`, then `%caster[0].id%`), `%elementId%` (run from a token's right-click menu), or the card's token on the player's map from a RunScript: `return { caster: game.find('tokens', { withCard: true }).find(t => t.cardId === vars.cardId) };` (then `%caster.id%`).
- **Asking:** RequestUserInput with `ShowDialog: true` (without it only an addon's own page gets the question) and `Options` (one per line, e.g. `"yes
half
no"`, shown as buttons). RequestTargets, RequestPoint and RequestUserInput stop the action when the player cancels unless `StopIfCancelled` is false.
- **The GM's say:** RequestUserInput with `UserID: "%gmId%"`, then `If` on `'%answer%' = 'yes'`.
- **Menus and tools:** AddMenuItem / AddToolbarButton / AddMapTool in an action with hook 5 (Player Load) and `OnlyTriggeringPlayer: true`: each player gets them every time they load the game. They run another action by `prefix/name`.
- **GM-only actions:** `GmOnly` only hides a menu entry. Start the action with **RequirePermission** (`EntityId: "%gameId%"`, `Permission: "Edit"`, `StopIfDenied: true`): only GMs have Edit on the game.
- **Chat commands:** hook 19 with `"hookFilter": "cast"` (the commands, without `/`); `ChatArgs` holds the rest of the line. Only the listed commands run the action, and any other unknown command still gets "Wrong command". An action listing several (`"poll, vote"`) picks the work with `If` on `'%ChatCommand%' = 'vote'`.
- **Debugging:** errors stop the action and appear in the game's event log with the step. Add **Log** steps to see values.

## 4. Hooks

The `hook` number. A hooked action runs every time it happens, only while switched on.

| # | Hook | Extra variables | Hook filter |
|---|---|---|---|
| 0 | None: only called by name | the caller's arguments | |
| 3 | Player Join | `Player` | |
| 4 | Player Leave | `Data`, `Player` | |
| 5 | Player Load (a player's board finished loading) | `Player` | |
| 6 / 7 / 8 / 9 | Element Added / Updated / Moved / Removed | `Data` (the element), `Player` | |
| 10 / 11 / 12 | Property Added / Updated / Removed | `Data` (the property), `Player` | |
| 13 / 14 / 15 | Map Added / Updated / Removed | `Data`, `Player` | |
| 16 | Map Changed (a battle map view switched map) | `Data` (`id`, `mapId`), `Player` | |
| 17 | Game Updated | `Data`, `Player` | |
| 18 | Chat Message | `Data`, `Player` | |
| 19 | Chat Command (a `/command` the action lists) | `ChatCommand`, `ChatArgs`, `ChatText`, `Player` | **required**: the commands, e.g. `poll, vote` |
| 20 / 21 / 22 | Card Added / Updated / Deleted | `Data`, `Player` | |
| 23 | Turn Changed | `Data` (`mapId`, `round`, `currentEntryId`, `elementId`: the token whose turn it is) | |

Hooks 1 (Install) and 2 (Uninstall) are for addons only. Read inside `Data` with a path: `%Data.id%`. Docs: https://nordvikmanager.pl/addon-guide/actions/hooks

## 5. Steps

Every step there is, with its arguments. Arguments are text and take tokens unless marked. *only for Shape …*: the argument means something only for those shapes. *variable name*: write the name of a variable to create, not a token.

### Control Flow

**Delay**: Waits before running the next step (up to 60 seconds).

- `Milliseconds`: How long to wait before the next step, in milliseconds (max 60000).

**ExecuteAction**: Runs another action, then continues with the next step. The other action gets a copy of the current variables; variables it sets don't come back.

- `Value`: Action to run, as 'prefix/name'. It gets a copy of the current variables.

**Exit**: Stops the current action without running its remaining steps. Inside a branch/loop action it stops only that sub-action.

- `Message`: Optional message written to the game event log when the action stops. Leave empty to stop silently.

**ForEach**: Runs the Do steps once for each item of a list variable (e.g. the tokens Find found). In them the current item is the variable named in Item Name; they work on the action's own variables.

- `Collection`: Name of the variable holding the collection to iterate over.
- `ItemName` (variable name): Name used for the current item in each iteration, readable in the steps of Do.
- `Do` (list of steps): Steps to run for each item. They use the action's variables: what they set is there after the loop.

**If**: Evaluates a true/false condition and runs the Then steps when it is true, the Else steps when it is false. They work on the action's own variables.

- `Condition`: Boolean expression to evaluate. Use %varName% to insert a variable, e.g. '%HP% > 0' or '%q:{playerId}.health% >= 10'. Supports standard math and comparison operators.
- `Then` (list of steps): Steps to run when the condition is true. They use the action's variables: what they set is there after the If.
- `Else` (list of steps): Steps to run when the condition is false.
- `OutputName` (variable name): Name of the variable where the boolean result will be stored. Leave empty to skip.

**Log**: Writes a message to the game event log — useful for debugging actions.

- `Message`: Text written to the game event log. Supports %variable% substitution.
- `Level`: 'Info' (default), 'Warning' or 'Error'.

**RequestPoint**: Asks a player to point at a place on the map (e.g. where a Fireball goes off, or which way Burning Hands goes) and waits. The area follows the cursor for everyone to see, and tokens it covers glow. Cancelling stops the action unless Stop If Cancelled is off.

- `Player`: Who points. Empty: the player who ran the action.
- `Message`: What the player is told, e.g. 'Where does the Fireball go off?'.
- `Shape`: The area that follows the cursor: circle (default), rect, line, cone, text or none (just a point). A line or cone starts at From and the player only aims it.
- `Radius` (only for Shape circle, line, cone): Circle: its radius, in squares (e.g. 4 for a 20 ft Fireball on a 5 ft grid); line, cone: its length.
- `Width` (only for Shape rect, line): Rect: its width, in squares; line: its width (default 1).
- `Height` (only for Shape rect): Rect: its height, in squares.
- `Angle` (only for Shape cone): Cone: how wide it spreads, in degrees (default 53).
- `Color`: Fill colour, e.g. rgba(255,80,0,0.35); text: its colour. Empty: the colour of the player who points.
- `Text` (only for Shape text): Text to show (text shape).
- `SnapToGrid`: none (default), center (the middle of a square) or corner (where grid lines cross).
- `From`: Line, cone: where it starts (the caster's token: its id, or a token from Find / Request Targets; or a point, e.g. %position%). Circle, rect: where MaxDistance counts from; from a token it counts from its edge, like Find's Near.
- `MaxDistance` (only for Shape circle, rect, text, none): Circle, rect: how far from From the point may be, in squares (e.g. 30 for 150 ft). Empty: anywhere.
- `HighlightTokens` (true/false; default true; only for Shape circle, rect, line, cone): Tokens the marker covers glow while the player aims (the ones Find with Near and Radius would give).
- `ShowToOthers` (true/false; default true): Everyone looking at the map sees the marker and the range move. Off: only the player who points.
- `MapId`: The map to point on. Empty: the map the player is looking at.
- `Timeout` (time, e.g. "00:02:00"): How long to wait for the player (default 2 minutes).
- `StopIfCancelled` (true/false; default true): Stop the action when the player cancels, doesn't answer or isn't connected. Off: carry on with an empty Output.
- `Output` (variable name): Variable for the point, in map pixels: { x, y, mapId, from }. A line or cone: x, y is the end of its axis and from its start (else from is empty).

**RequestTargets**: Asks a player to pick tokens (or, with Target element, any elements) on the map (e.g. up to 3 creatures to bless) and waits. Candidates limits what can be picked. Cancelling stops the action unless Stop If Cancelled is off.

- `Player`: Who picks. Empty: the player who ran the action.
- `Target`: What can be picked: token (default) or element (any element on the map: a shape, a picture, a token).
- `Message`: What the player is told, e.g. 'Pick up to 3 creatures to bless'.
- `Min`: Fewest to pick (default 1).
- `Max`: Most to pick (default 1).
- `Candidates`: Only these can be picked: a list of tokens or ids, e.g. %inRange% from a Find. Empty: any token the player can see.
- `Timeout` (time, e.g. "00:02:00"): How long to wait for the player (default 2 minutes).
- `StopIfCancelled` (true/false; default true): Stop the action when the player cancels, doesn't answer or isn't connected. Off: carry on with an empty list.
- `Output` (variable name): Variable for the picked tokens (or elements), in the order they were picked.

**RequestUserInput**: Asks one connected player a question and waits for the answer (up to Timeout, 1 minute by default): typed text, or one of Options as buttons. When the player cancels, doesn't answer or isn't connected the action stops, unless Stop If Cancelled is off (then the answer is empty).

- `UserName`: Username of the player to request input from. Supports %variable% substitution (e.g. %playerId%).
- `UserID`: Player to request input from. Pick one, or type an ID / %variable%. Takes precedence over UserName if both are set.
- `Message`: Message or prompt displayed to the user when requesting input. Supports %variable% substitution.
- `ShowDialog` (true/false): When enabled, the targeted player is shown a built-in modal with a text box, so they can answer without a custom addon frontend. When disabled, only addons subscribed to the 'request_input' command handle this step.
- `DefaultInput` (only for ShowDialog true): Pre-fills the built-in dialog's text box. Supports %variable% substitution. Leave empty for a blank box.
- `Options`: Answers to choose from, one per line (e.g. yes / half / no). The dialog shows them as buttons instead of a text box.
- `StopIfCancelled` (true/false; default true): Stop the action when the player cancels, doesn't answer in time or isn't connected. Off: carry on with an empty answer.
- `Timeout` (time, e.g. "00:02:00"): Maximum time to wait for user input before the step times out.
- `Output` (variable name): Name of the variable where the user's input will be stored.

**SetVariable**: Sets a variable to a value, with optional type casting and a default fallback when the value is empty.

- `Name` (variable name): Name of the variable to create or overwrite.
- `Value`: Value to assign to the variable. Supports %variable% and %q:...% substitution.
- `DefaultValue`: Fallback value used when Value resolves to empty string (e.g. property not found). Supports %variable% substitution.
- `Type`: Data type to cast the value to: 'string' (default), 'int', 'long', 'float', 'double', 'bool'.

### Script

**RunScript**: Runs a short sandboxed JavaScript snippet for calculations, lists, text and JSON. Reads variables through `vars`, returns new values. It cannot change the game directly — use the other steps for that.

- `Script` (JavaScript): JavaScript function body. Action variables are available read-only as `vars` (e.g. vars.hp, vars.output.StatusCode). Use `return` to hand values back, e.g. `return { hp: Math.max(0, vars.hp - vars.damage) };`. %var% tokens are NOT substituted here — use vars instead.
- `Include`: Optional. Shared script files to put before the script (resource keys, one per line or comma-separated), e.g. myaddon_rules.js: functions several actions use.
- `Output` (variable name): Optional. When set, the whole return value is stored in this variable. When empty, the script must return an object and each of its keys becomes a variable.

### Properties

**AddPropertyListItem**: Appends a new row to a list-typed property (the property must already exist).

- `Of`: Whose property: empty for the entity in ParentId; tokenCard for the card of the token in ParentId; map for the map in ParentId (empty: the one the player is looking at); game for the game.
- `ParentId`: GUID of the parent entity that owns the list property. Supports %variable% substitution.
- `PropertyName`: Name of the list-typed property (must already exist — use a Set Property step with Value "[]" to create it first).
- `Fields`: New row's fields as a JSON object, e.g. {"name":"Hunt","value":"2"}. Supports %variable% substitution.
- `Output` (variable name): Optional — name of the variable where the new row's generated id will be stored.

**DeleteProperty**: Deletes a named property from an entity. Does nothing if the property doesn't exist.

- `Of`: Whose property: empty for the entity in ParentId; tokenCard for the card of the token in ParentId; map for the map in ParentId (empty: the one the player is looking at); game for the game.
- `ParentId`: GUID of the entity that owns the property.
- `PropertyName`: Name of the property to delete. Nothing happens if it doesn't exist.

**GetPropertyValue**: Reads a single named property's value for one entity, falling back to DefaultValue when it doesn't exist.

- `Of`: Whose property: empty for the entity in ParentId; tokenCard for the card of the token in ParentId; map for the map in ParentId (empty: the one the player is looking at); game for the game.
- `ParentId`: GUID of the entity whose property to read, e.g. %Data.id% or %playerId%.
- `PropertyName`: Name of the property to read.
- `Output` (variable name): Name of the variable where the property's value will be stored.
- `DefaultValue`: Value to store when the property doesn't exist. Not substituted like other fields.

**RemovePropertyListItem**: Removes a row from a list-typed property by its id.

- `Of`: Whose property: empty for the entity in ParentId; tokenCard for the card of the token in ParentId; map for the map in ParentId (empty: the one the player is looking at); game for the game.
- `ParentId`: GUID of the parent entity that owns the list property. Supports %variable% substitution.
- `PropertyName`: Name of the list-typed property.
- `ItemId`: Id of the row to remove. Supports %variable% substitution.

**UpdatePropertyListItem**: Merges fields into an existing row of a list-typed property, identified by its id.

- `Of`: Whose property: empty for the entity in ParentId; tokenCard for the card of the token in ParentId; map for the map in ParentId (empty: the one the player is looking at); game for the game.
- `ParentId`: GUID of the parent entity that owns the list property. Supports %variable% substitution.
- `PropertyName`: Name of the list-typed property.
- `ItemId`: Id of the row to update. Supports %variable% substitution.
- `Fields`: Fields to merge into the row, as a JSON object, e.g. {"value":"3"}. Only the supplied keys change. Supports %variable% substitution.

### Data

**CreateCard**: Creates a new card from a template, storing the new card's id in a variable.

- `Name`: Display name for the new card.
- `TemplateId`: Id of the template card to create from (e.g. resolved via %q:card[Template Name].id%). Determines the card's bundle (MainResource/AdditionalResources) and seeds its initial properties.
- `Owner`: Player to grant Edit permission on the new card. Pick one, or type an ID / %variable%. Leave empty to skip.
- `Output` (variable name): Name of the variable where the new card's id will be stored.
- `IsTemplate` (true/false): If true, the new card is created as a reusable Template (IsTemplate=true) instead of a regular Instance — e.g. for an addon that imports/generates a new card blueprint at runtime. Defaults to false (a normal instance).
- `Folder`: Folder of the Cards panel (or Templates, for a template) to put the new card in, e.g. "Lore/Trilium". Folders are found by name, ignoring case, and made where missing. Leave empty for the top level.

**DeleteCard**: Permanently deletes a card and its properties.

- `CardId`: GUID of the card to delete (with its properties).

**DeleteResource**: Permanently deletes a resource identified by key or ID. Also removes any associated tree entries.

- `Key`: Key of the resource to delete. Takes priority over ResourceId when both are set.
- `ResourceId`: Resource to delete. Pick one, or type a GUID / %variable%. Used when Key is not set.

**Find**: Finds the game's tokens, cards, maps, players… and stores them as a list (or the first one). Tokens are looked for on the map the player is looking at unless you say otherwise.

- `What`: What to find: tokens, elements, cards, maps, battleMaps, players, actions or layouts.
- `Id`: Only the one with this id.
- `Name`: Only those with this name.
- `Property`: Only those that have a property with this name (cards, maps, tokens, elements), e.g. 'hostile'.
- `MapId`: Tokens and elements: the map to look on. Empty: the map the player is looking at.
- `AllMaps` (true/false): Tokens and elements: look on every map of the game.
- `WithCard` (true/false): Tokens: only those linked to a card.
- `Near`: Tokens and elements: only those in an area at this point ({x, y}, e.g. %point%) or token (its id, or %target%): its centre (circle, rect) or start (line, cone)…
- `Shape`: …of this shape: circle (default), rect, line or cone. A token counts when it touches the area.
- `Radius` (only for Shape circle, line, cone): Circle: its radius, in squares; line, cone: its length.
- `Width` (only for Shape rect, line): Rect: its width, in squares; line: its width (default 1).
- `Height` (only for Shape rect): Rect: its height, in squares.
- `Angle` (only for Shape cone): Cone: how wide it spreads, in degrees (default 53).
- `Toward` (only for Shape line, cone): Line, cone: the point or token it points at, e.g. %point%.
- `IncludeTemplates` (true/false): Cards: include templates too.
- `First` (true/false): Give only the first one found (or nothing), instead of a list.
- `Output` (variable name): Variable to store the result in.

**GetConnectedPlayers**: Stores the list of players connected right now (each with Id and Name) in a variable, e.g. to loop over them with For Each.

- `Value` (variable name): Name of the variable that receives the list of connected players.

**ReadResource**: Reads a text resource by key or ID and stores its content in a variable.

- `Key`: Key of the resource to read. Takes priority over ResourceId when both are set.
- `ResourceId`: Resource to read. Pick one, or type a GUID / %variable%. Used when Key is not set.
- `OutputVariable` (variable name): Variable name to store the retrieved text content in.

**SetProperties**: Creates or updates several properties on one entity. Each line in Properties is 'propertyName=value'.

- `Of`: Whose property: empty for the entity in ParentId; tokenCard for the card of the token in ParentId; map for the map in ParentId (empty: the one the player is looking at); game for the game.
- `ParentId`: GUID of the entity whose properties will be set. Supports %variable% substitution (e.g. %newCardId%).
- `Properties`: One property per line as 'propertyName=value', e.g. 'item_name=%name%'. Values support %variable%, %variable.field% and %q:% tokens; they are substituted after the lines are split, so a value may safely contain line breaks or '='.

**SetProperty**: Creates or updates a named property on any entity, identified by its ID.

- `Of`: Whose property: empty for the entity in ParentId; tokenCard for the card of the token in ParentId; map for the map in ParentId (empty: the one the player is looking at); game for the game.
- `ParentId`: GUID of the parent entity whose property will be set. Supports %variable% substitution (e.g. %playerId%, %q:card[My card].id%).
- `PropertyName`: Name of the property to set on the entity.
- `PropertyValue`: Value to assign to the property. Supports %variable% substitution.
- `Protected` (true/false): Store it as a protected property, e.g. an API key a settings view saves for Send Request's bearer token: no player, card or later step can read it back. A protected property stays protected.

**SetResource**: Creates or updates a text resource identified by a unique key. If the key already exists the content is overwritten; otherwise a new resource is created.

- `Key`: Unique string key for the resource (e.g. 'myaddon.config'). Must be unique within the game.
- `Name`: Display name for the resource. Used only when creating a new resource.
- `Content`: Text content to store (JSON, plain text, etc.). Supports %variable% substitution.
- `MimeType`: MIME type of the resource (e.g. 'application/json', 'text/plain'). Defaults to None when not set.
- `FolderId` (id): ID of the folder tree entry to place the resource in. Created at root when not set.
- `OutputVariable` (variable name): Optional variable name to store the resource's GUID in after the operation.

**UpdateResource**: Overwrites the content of an existing text resource identified by key or ID. Creates the resource if it does not exist.

- `Key`: Key of the resource to update. Takes priority over ResourceId when both are set.
- `ResourceId`: Resource to update. Pick one, or type a GUID / %variable%. Used when Key is not set.
- `Content`: New text content to store. Supports %variable% substitution.
- `MimeType`: MIME type to set on the resource (e.g. 'application/json', 'text/plain'). Left unchanged when not set.

### Map

**AddElement**: Adds a circle, rectangle, line, cone or text to a map, saved like one a player drew (e.g. a wall of fire). For a shape that only shows for a while, use Show Marker.

- `Shape`: circle (default), rect, line, cone or text.
- `At`: Where: a point ({x, y}, e.g. %point%) or a token (its id, or %target%). The centre of a circle, rect or text; where a line or cone starts.
- `Toward` (only for Shape line, cone): Line, cone: the point or token it points at.
- `Radius` (only for Shape circle, line, cone): Circle: its radius, in squares (e.g. 4 for a 20 ft Fireball on a 5 ft grid); line, cone: its length.
- `Width` (only for Shape rect, line): Rect: its width, in squares; line: its width (default 1).
- `Height` (only for Shape rect): Rect: its height, in squares.
- `Angle` (only for Shape cone): Cone: how wide it spreads, in degrees (default 53).
- `Color`: Fill colour, e.g. rgba(255,80,0,0.35); text: its colour. Empty: the colour of the player whose action it is.
- `Text` (only for Shape text): Text to show (text shape).
- `Layer`: Layer number (default: the map layer, under tokens).
- `MapId`: The map to add it to. Empty: the map the player is looking at.
- `Output` (variable name): Variable for the new element's id (e.g. to remove it later with Delete Element).

**ChangeMap**: Switches a battle map view to another map for everyone in the game.

- `MapId`: GUID of the map to show.
- `BattleMapId`: GUID of the battle map view to switch. Leave empty for the view the player is looking at (or the game's first one).

**DeleteElement**: Removes an element (e.g. a token) from its map.

- `ElementId`: GUID of the element to remove from its map.

**MoveElement**: Moves an element (e.g. a token) to a new position; clients animate it like a drag. Also fires Element Updated / Element Moved hooks — an action on those hooks that moves the same element will loop.

- `ElementId`: GUID of the element (token, shape, ...) to move. E.g. %Data.id% in an Element hook.
- `X`: New horizontal position (canvas 'left') in pixels.
- `Y`: New vertical position (canvas 'top') in pixels.

**ShowMarker**: Shows a circle, rectangle, line, cone or text on the map to everyone for a while (e.g. where a Fireball goes off). It is never saved.

- `Shape`: circle (default), rect, line, cone or text.
- `At`: Where: a point ({x, y}, e.g. %point%) or a token (its id, or %target%). The centre of a circle, rect or text; where a line or cone starts.
- `Toward` (only for Shape line, cone): Line, cone: the point or token it points at.
- `Radius` (only for Shape circle, line, cone): Circle: its radius, in squares (e.g. 4 for a 20 ft Fireball on a 5 ft grid); line, cone: its length.
- `Width` (only for Shape rect, line): Rect: its width, in squares; line: its width (default 1).
- `Height` (only for Shape rect): Rect: its height, in squares.
- `Angle` (only for Shape cone): Cone: how wide it spreads, in degrees (default 53).
- `Color`: Fill colour, e.g. rgba(255,80,0,0.35); text: its colour. Empty: the colour of the player whose action it is.
- `Text` (only for Shape text): Text to show (text shape).
- `Duration`: How long it stays, in seconds (default 10).
- `UntilActionEnds` (true/false): Stays until the action ends instead (e.g. while the GM decides), then goes away.
- `MapId`: The map to show it on. Empty: the map the player is looking at.
- `Output` (variable name): Variable for the marker's id.

**SpawnToken**: Places a token of a card (or from a token file) on a map. Works from hooks too: no player's browser is needed.

- `CardId`: The card to place a token of (it needs a "token" property naming its token file), e.g. %copy%.
- `Token`: Without a card: the token file (resource key), e.g. basics_token_generic.json.
- `Image`: Without a card: the picture (resource key or id).
- `X`: Where, in map pixels: the token's top-left corner, e.g. %position.x%.
- `Y`: Where, in map pixels: the token's top-left corner, e.g. %position.y%.
- `MapId`: The map. Empty: the map the player is looking at.
- `Output` (variable name): Variable for the new token's id.

### Roll

**RollDice**: Rolls dice using standard notation (e.g. '2d6+3'). Also supports keep/drop ('2d20kh1' advantage, '4d6dl1'), exploding ('3d6!'), success counting ('6d10cs>7') and Fudge dice ('4dF'). Stores the result and optionally prints it to chat.

- `DiceString`: Dice notation to roll, e.g. '1d20', '2d6+3'. Supports %variable% substitution.
- `OutputVariable` (variable name): Name of the variable where the result is stored. Leave empty to skip storing.
- `SimpleOutput` (true/false): When true, stores only the integer total in OutputVariable. When false (default), stores the full roll object — fields accessible via %OutputVariable.Result% and %OutputVariable.Rolled% in subsequent steps.
- `PrintToChat` (true/false): When true, broadcasts the roll result to the game chat using the options below.
- `ChatTitle` (only for PrintToChat true): Title shown on the chat roll card. Supports %variable% substitution. Default: 'Roll'. Note: the current roll's result is not yet available here — use a separate SendChat step after this one if you need %var.Result% in the title.
- `ChatMessage` (only for PrintToChat true): Additional message shown below the roll result in chat. Supports %variable% substitution.
- `ChatColor` (only for PrintToChat true): Background colour of the chat card (CSS colour, e.g. '#1a1a2e'). Leave empty for default.
- `ChatBorderColor` (only for PrintToChat true): Border colour of the chat card (CSS colour, e.g. '#e94560'). Leave empty for default.
- `FollowUpActionName` (only for PrintToChat true): Name of an action to offer as a follow-up button under the roll (e.g. 'dnd5e.roll_damage'). Leave empty for no button.
- `FollowUpActionLabel` (only for PrintToChat true): Label shown on the follow-up button. Supports %variable% substitution.
- `FollowUpActionArgs` (only for PrintToChat true): Arguments baked into the follow-up button, sent as-is when clicked. One 'name=value' per line, supports %variable% substitution. Example:
  damage=%damage%
  damageType=%damageType%

### Client

**AddMapTool**: Adds a tool to the Tools panel ('Addon tools'). While it is active, clicking the map runs an action with the clicked position and element, e.g. a 'Teleport' tool that moves the clicked token.

- `Name`: Id of this tool. Running the step again with the same Name does not add a duplicate.
- `UiName`: Label shown in the Tools panel under 'Addon tools'. Defaults to Name when empty.
- `Action`: Action to run when the tool is used on the map, as 'prefix/name'. It gets the variables battleMapId, mapId, position ({x, y} on the map) and elementId (the clicked element, if any), plus ActionArgs.
- `Hint`: Text shown on the map while the tool is active, e.g. 'Click a token to teleport it'.
- `Target`: Which clicks use the tool: 'point' (anywhere, default), 'token' (only on a token) or 'element' (on any element). Clicks that don't match are ignored.
- `StayActive` (true/false): If true, the tool stays active after a click until the player presses Stop or picks another tool. Otherwise it goes back to Select after one use.
- `OnlyTriggeringPlayer` (true/false): Only the player who triggered this action gets the tool (e.g. the player whose game just loaded). Otherwise every connected player does.
- `GmOnly` (true/false): Only GMs get the tool: the game's owner and players with Edit on the game.
- `ActionArgs` (object, e.g. {"radius": "4"}): Optional key/value arguments passed to the action when the tool is used. Accessible as variables in that action.

**AddMenuItem**: Adds an item that runs an action to one of the app's menus (Game, View, Settings, map right-click > Add, ...) or to a toolbar dropdown made with Add Toolbar Button. Pick the menu in Location.

- `Name`: Id of this menu item, unique within its menu. Running the step again with the same Name does not add a duplicate.
- `UiName`: Text shown in the menu. Defaults to Name when empty.
- `Action`: Action to run when the item is clicked, as 'prefix/name'. It receives ActionArgs as variables.
- `Location`: Menu to add the item to: pick a built-in menu, or type the Menu Id of a toolbar dropdown made with Add Toolbar Button. Empty = the Game menu. Right-click menus pass what was clicked as variables: 'battlemap_add' (map > Add) and 'battlemap' (empty map space) give battleMapId and position, 'battlemap_element' (a token/element) also elementId, 'cards_item' (a card in the Cards panel) gives cardId. Players can open these menus too, so check permissions in the action (Require Permission).
- `OnlyTriggeringPlayer` (true/false): Only the player who triggered this action gets the item (e.g. the player whose game just loaded). Otherwise every connected player does.
- `GmOnly` (true/false): Only GMs get the item: the game's owner and players with Edit on the game.
- `SubMenuId`: If non-empty, places this item inside a submenu with this viewId. Example: 'addons.myaddon'. The submenu is created on the client if it does not yet exist.
- `SubMenuName`: Display name for the submenu (used only when SubMenuId is set and the submenu does not yet exist).
- `ActionArgs` (object, e.g. {"radius": "4"}): Optional key/value arguments passed to the action when the menu item is clicked. Accessible as variables in the triggered action.

**AddToolbarButton**: Adds a button to the main toolbar that runs an action, or, with a Menu Id, a dropdown menu that Add Menu Item steps can fill.

- `Name`: Unique identifier for the toolbar button.
- `UiName`: Display label for the button.
- `Action`: Action to run when the button is clicked, as 'prefix/name'. It receives ActionArgs as variables. Not used when MenuId is set (the button then opens a menu).
- `OnlyTriggeringPlayer` (true/false): Only the player who triggered this action gets the button (e.g. the player whose game just loaded). Otherwise every connected player does.
- `GmOnly` (true/false): Only GMs get the button: the game's owner and players with Edit on the game.
- `MenuId`: If set, the button opens a dropdown menu with this id instead of running an action. Fill it with Add Menu Item steps that use this id as their Location, e.g. 'myaddon_menu'.
- `MenuName`: Display name for the dropdown menu button (used when MenuId is set).
- `ActionArgs` (object, e.g. {"radius": "4"}): Optional key/value arguments passed to the action when the button is clicked. Accessible as variables in the triggered action.

**FireClientMediator**: Fires a client-side mediator event, allowing addons to trigger frontend event bus messages. The frontend sandbox must restrict which events are permitted.

- `EventName`: Name of the client mediator event to fire.
- `Payload`: JSON payload to pass with the event. Supports %variable% substitution.
- `Player`: Player to target. Pick one, or type a name / ID / %variable%. Leave empty to broadcast to all.

**RunClientCommand**: Runs a targeted ClientMediator command (panel + command + data) on a specific player's client.

- `Panel`: ClientMediator panel name to dispatch to (e.g. "BattleMap_token").
- `Command`: ClientMediator command name to run on that panel (e.g. "CreateToken").
- `Player`: Player to send the command to. Pick one, or type a name / ID / %variable%. Leave empty to broadcast to all — beware duplicated client-side effects (e.g. token creation) if every connected client would run the same command.
- `Data`: JSON data to pass as the command's payload. Supports %variable% substitution — embed object/array variables unquoted since they're already valid JSON.

**SendChat**: Sends a formatted message to the game chat. Use Template='Roll' after a RollDice step to display a styled roll card, 'BigNumber' for a large value, or 'Text' for a plain message.

- `Template`: Template type: 'Roll', 'BigNumber', or 'Text'.
- `RollVariable` (only for Template Roll): Variable name (without %) holding the RollDefinition from a previous RollDice step.
- `Number` (only for Template BigNumber): The number to display prominently. Supports %variable% substitution (e.g. %rollResult.Result%).
- `Title`: Title shown on the chat card. Supports %variable% substitution (e.g. %rollResult.Result%).
- `Message`: Message body shown below the main content. Supports %variable% substitution.
- `Color`: Background colour of the chat card (CSS colour, e.g. '#1a1a2e'). Leave empty for default.
- `BorderColor`: Border colour of the chat card (CSS colour, e.g. '#e94560'). Leave empty for default.
- `Player`: Whisper: send only to this player (name / ID / %variable%). The message is not stored in chat history. Leave empty to post to everyone.

**ShowView**: Shows a view (hidden UI panel/card) to a specific player or broadcasts it to all players.

- `ViewKey`: Key of the view to show, as declared in the addon's view JSON (e.g. "dnd5e_character_sheet").
- `Player`: Player to send the view to. Pick one, or type a name / ID / %variable%. Leave empty to broadcast to all.
- `Data`: Optional JSON data to pass to the view. Supports %variable% substitution.

### Turn order

**AddToTurnOrder**: Adds a token (or a free entry, by name) to a map's turn order. The first entry starts round 1.

- `ElementId`: Token (element) on that map to add. Leave empty to add a free entry with just a Name.
- `Name`: Name shown in the turn order. For a token it defaults to the token's name.
- `Initiative`: Initiative (a number), optional. Sort Turn Order puts the highest first.
- `Hidden`: "true" to hide the entry from players (the GM still runs its turn).
- `Output` (variable name): Name of the variable where the new entry's id will be stored.
- `MapId`: Map whose turn order to change, e.g. %Data.mapId% in a Turn Changed hook. Leave empty for the map the player is looking at (or the game's first battle map view).

**GetTurnOrder**: Reads a map's turn order (all entries, hidden ones too) into a variable.

- `Output` (variable name): Name of the variable for the turn order: { MapId, Round, CurrentEntryId, Entries: [{ Id, Name, Initiative, ElementId, Hidden }] }.
- `MapId`: Map whose turn order to change, e.g. %Data.mapId% in a Turn Changed hook. Leave empty for the map the player is looking at (or the game's first battle map view).

**NextTurn**: Passes the turn to the next entry of a map's turn order; after the last one, the next round starts.

- `MapId`: Map whose turn order to change, e.g. %Data.mapId% in a Turn Changed hook. Leave empty for the map the player is looking at (or the game's first battle map view).

**PreviousTurn**: Gives the turn back to the previous entry (into the previous round from the first one, never below round 1).

- `MapId`: Map whose turn order to change, e.g. %Data.mapId% in a Turn Changed hook. Leave empty for the map the player is looking at (or the game's first battle map view).

**RemoveFromTurnOrder**: Removes an entry (or a token's entry) from a map's turn order. If it was its turn, the turn passes on.

- `EntryId`: Id of the entry to remove. Or leave empty and give ElementId.
- `ElementId`: Token whose entry to remove.
- `MapId`: Map whose turn order to change, e.g. %Data.mapId% in a Turn Changed hook. Leave empty for the map the player is looking at (or the game's first battle map view).

**ResetTurnOrder**: Starts a map's turn order again at round 1 with the first entry, or (Clear) removes every entry.

- `Clear`: "true" to remove every entry; otherwise the entries stay and round 1 starts again with the first one.
- `MapId`: Map whose turn order to change, e.g. %Data.mapId% in a Turn Changed hook. Leave empty for the map the player is looking at (or the game's first battle map view).

**SetInitiative**: Sets (or clears) the initiative of an entry or a token's entry, optionally sorting the turn order afterwards.

- `EntryId`: Id of the entry. Or leave empty and give ElementId.
- `ElementId`: Token whose entry to change.
- `Initiative`: New initiative (a number). Leave empty to clear it.
- `Sort`: "true" to sort the turn order afterwards (highest initiative first).
- `MapId`: Map whose turn order to change, e.g. %Data.mapId% in a Turn Changed hook. Leave empty for the map the player is looking at (or the game's first battle map view).

**SortTurnOrder**: Orders a map's turn order by initiative, highest first (ties keep their place, entries without one go last).

- `MapId`: Map whose turn order to change, e.g. %Data.mapId% in a Turn Changed hook. Leave empty for the map the player is looking at (or the game's first battle map view).

### Audio

**PausePlaylist**: Pauses a currently playing music playlist for everyone in the game.

- `PlaylistId`: Music playlist. Pick one from the list, or type a playlist ID / %variable%.

**PlayPlaylist**: Starts (or resumes, if paused) a music playlist for everyone in the game.

- `PlaylistId`: Music playlist. Pick one from the list, or type a playlist ID / %variable%.

**PlaySound**: Plays a one-shot soundboard sound (an audio material) for a player or for everyone in the game.

- `ResourceId`: Audio material to play. Pick one from the list, or type a resource ID / %variable%. You can copy an ID from the Materials panel (the "Copy ID" button).
- `Player`: Player to play the sound for. Pick one, or type a name / ID / %variable%. Leave empty to play it for everyone connected to the game.

**StopPlaylist**: Stops a music playlist for everyone in the game and clears its playback state.

- `PlaylistId`: Music playlist. Pick one from the list, or type a playlist ID / %variable%.

**StopSound**: Stops a currently playing one-shot soundboard sound for a player or for everyone in the game.

- `ResourceId`: Audio material to stop. Pick one from the list, or type a resource ID / %variable%. Must match the ID used by the Play Sound step / soundboard.
- `Player`: Player to stop the sound for. Pick one, or type a name / ID / %variable%. Leave empty to stop it for everyone connected to the game.

### Network

**DownloadResource**: Downloads a URL (e.g. an image) and saves it as a game resource. A protected property can be sent as the Bearer token; it is never returned.

- `TargetUrl`: The URL to download, e.g. an image. Private or local addresses (localhost, 192.168.x.x) work only when the server's owner allows the host in Application Settings → Local network access (or Security:ProxyAllowedPrivateHosts in appsettings).
- `ParentId`: Parent entity ID used to scope the protected-property lookup. Accepts a literal Guid or a variable name holding a Guid. Defaults to the current game ID when not provided.
- `BearerTokenPropertyName`: Name of a protected property whose value is sent as the Bearer token in the Authorization header (e.g. an API token). It is never returned.
- `Key`: Key of the resource to save it as (e.g. 'myaddon_map.png'). An existing resource with this key is replaced.
- `Name`: Display name for a new resource. Empty: the key.
- `MimeType`: MIME type to save it with, e.g. image/png. Empty: the type the server sends.
- `FolderId` (id): ID of the folder tree entry to place a new resource in. Created at root when not set.
- `Output` (variable name): Variable for the result: success, statusCode, resourceId (the saved resource), mimeType (empty when resources don't know the type, e.g. SVG) and size in bytes. Nothing is saved when the download fails.

**SendRequest**: Sends an HTTP request to an external URL. Protected properties can be injected into the body or used as a Bearer token. Protected values are never returned to the caller.

- `TargetUrl`: The URL to send the request to. Private or local addresses (localhost, 192.168.x.x) work only when the server's owner allows the host in Application Settings → Local network access (or Security:ProxyAllowedPrivateHosts in appsettings).
- `HttpMethod`: HTTP method to use: GET, POST, PUT, PATCH, DELETE. Defaults to POST.
- `ParentId`: Parent entity ID used to scope the protected-property lookup. Accepts a literal Guid or a variable name holding a Guid. Defaults to the current game ID when not provided.
- `IncludeProtectedPropertyNames`: Comma-separated names of protected properties whose values will be injected into the request body.
- `BearerTokenPropertyName`: Name of a protected property whose value will be used as the Bearer token in the Authorization header. The token is never included in the body or returned in the output.
- `ExtraBodyVariable`: Name of the variable holding a Dictionary<string,object> of extra key/value pairs to merge into the request body alongside the protected properties.
- `Output` (variable name): Name of the variable where the response will be stored. The response object has Success (bool), StatusCode (int) and ResponseBody (string).

### Security

**RequirePermission**: Checks if the player who triggered the action has the required permission on an entity. Can store the result in a variable or stop the action if denied.

- `EntityId`: ID of the entity to check permissions on.
- `Permission`: Permission to require: Read, Execute, Control, Edit, Remove, All.
- `Output` (variable name): Variable name to store the boolean result. Leave empty to skip storing.
- `StopIfDenied` (true/false): If true, stops the action execution when permission is denied.

**SetPermission**: Shares a card, token or map with a player or everyone (Read), or lets a player move a token (Control); or takes it back. Only by a player who has that right; never Edit.

- `EntityId`: The card, token or map, by id (e.g. %cardId%, %q:card[The Old Mill].id%). Templates, views, actions and the game can't be changed this way.
- `Player`: Player to give it to (or take it from). Pick one, or type a name / ID / %variable%. Leave empty for everyone (Read only).
- `Permission`: Read (see it: a card in the Cards panel, a map) or Control (move a token). Nothing else can be given by an action. Defaults to Read.
- `Revoke` (true/false): Take it back instead. Never lowers a player who can edit it, the game's owner or the system.

## 6. Don't

| Don't | Do instead |
|---|---|
| Invent steps, arguments, hooks, tokens or built-in variables | Only what's in this file. If something can't be done with these steps, say so |
| Give a text argument a JSON number: `"Max": 3` | A string: `"Max": "3"`. Only *true/false* arguments take `true` / `false` |
| Guess property names (`hp`, `HP`, `hit_points`) | Ask the user what their sheet calls them |
| Long chains of SetVariable / If for arithmetic or text | One RunScript step |
| Roll with `Math.random()` in a script for game results | RollDice, or `game.roll(formula)` in a script |
| A Chat Command action (hook 19) without `hookFilter`, or one `If` chain for every command | `"hookFilter": "cast"`: only the listed commands reach it |
| Rely on GmOnly to protect a GM action | RequirePermission on `%gameId%`, Edit, `StopIfDenied: true` |
| Put API keys or passwords in steps | Nothing in an action is secret: other GMs can open it. Let a settings view save it with SetProperty `Protected: true` (after RequirePermission), and send it with SendRequest's `BearerTokenPropertyName` |
| Use GetData, GetDetail, SetDetail, Calculate, FilterCollection, QueryData, QueryProperties, SendCommand, `%v:`, `%dto:` | They no longer exist; see Find, the property steps, RunScript and section 2 |
