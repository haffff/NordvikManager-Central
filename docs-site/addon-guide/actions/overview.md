---
sidebar_position: 1
title: Actions overview
---

# Actions

An **action** is a list of steps the GM server runs for you: roll dice, change a property, post to chat,
move a token, call a web API. Actions run on the GM's server, so they work the same for every player and
don't depend on anyone's browser.

An action runs when:

- a **hook** fires, e.g. a player joins, a token is moved, a chat command is typed (see [Hooks](./hooks.md)), or
- something **calls it by name**: a card button, a menu item, a roll's follow-up button, or another action.

## What an action looks like

Actions are edited in *Addons → Actions*, and addons ship them as JSON files in their `Actions/` folder:

```json
{
  "$schema": "https://raw.githubusercontent.com/haffff/NordvikManager-Addons/refs/heads/main/schemas/action.json",
  "name": "roll_attribute",
  "prefix": "dnd5e",
  "hook": 0,
  "isEnabled": false,
  "content": [
    {
      "Type": "GetPropertyValue",
      "Data": {
        "Label": "Read ability modifier",
        "ParentId": "%cardId%",
        "PropertyName": "%attribute%_mod",
        "Output": "modifier",
        "DefaultValue": "0"
      }
    },
    {
      "Type": "RollDice",
      "Data": {
        "DiceString": "1d20+(%modifier%)",
        "PrintToChat": true,
        "ChatTitle": "%attribute% Check"
      }
    }
  ]
}
```

- `prefix` + `name` identify the action. Call it as `dnd5e/roll_attribute`.
- `hook` is the number of the hook that triggers it, or `0` for none (see the [hook table](./hooks.md)).
- `isEnabled` only matters for hooks. Actions called by name run either way.
- `content` holds the steps, run top to bottom. `Type` picks the step and `Data` holds its arguments.
  Every step is listed in the [step reference](./steps.md). *If* and *For Each* hold steps of their own
  (see [Blocks](#blocks)).
- In an addon's files, `prefix` is replaced with the addon's key and `isEnabled` is ignored: addon actions
  are always enabled.
- The `$schema` line lets editors check the file: an unknown field, a misspelt `Type` key or a missing
  `Data` shows up before you install.

## The action editor

Open *Addons → Actions*. Actions are listed by prefix on the left; a ⚡ marks actions with a trigger.

- **New action.** Start empty, or from a template: an action on picked targets, an area effect the GM
  confirms, a random card placed on the map, or damage to every token on the map. Change it from there.
  Or pick **Paste JSON…** and paste an action: one exported with **Export JSON**, an action file from an
  addon, or one an AI assistant wrote (see [Developing with AI](../ai-guide.md#writing-single-actions)).
  The prefix and name come from the JSON unless you type them; a step that doesn't exist is named and
  nothing is created. A new action starts switched off: turn it on for its trigger to run it.
- **Steps tab.** Each step is one line that reads like a sentence, e.g. *Roll 1d20+(%modifier%) → roll*.
  Variables are highlighted, and a missing required value shows in red.
  - Under a step that stores something, you see what it will hold before anything runs, e.g.
    *→ targets: list of: id, name, x, y, cardId, mapId*.
  - *If* and *For Each* show their blocks (**Then**, **Else**, **Do**) under them, each with its own steps.
  - Click a step to edit it in the panel beside the list (or below it, when the panel is narrow).
  - Drag the grip to reorder within a list. Hover a step to duplicate or delete it.
  - Click **+** between steps, or **Add step**, and type what you want to do: "tokens", "ask",
    "damage", "monster"… finds the steps for it, not just by name.
  - *Execute Action* shows the action it runs, with a link that opens it.
- **Writing values.** Under the step's fields, **Variables here** lists every variable the step can use:
  built-ins, the trigger's, the inputs and what earlier steps (blocks included) set, with their fields.
  Click a field you're editing, then a variable or one of its fields to put its token in, e.g.
  `%targets[0].name%`. After a run, the values from that run are shown next to them. Typing `%` in a field
  offers the variables too. RunScript's script gets a code editor.
- **Inputs.** For an action without a trigger, names it uses but never sets (like `%cardId%`) are listed
  as its *inputs*: values the caller passes in.
- **Settings tab.** Name, prefix, description, trigger, permission, export and delete.
- **Saving.** `Ctrl+S` saves, `Ctrl+Z` / `Ctrl+Shift+Z` undo and redo. Switching to another action with
  unsaved changes asks first. If the panel is closed or the page reloads, the changes are kept and offered
  back the next time you open the action.
- **Running.** The run bar above the steps holds the values to run with (pre-filled from the inputs).
  **Run** (or **Save & run**) runs the action and marks each step ✓ or ✗ as it goes, steps in blocks too;
  hover ✗ for the error. **From map** lets you click a point and pick tokens on the battle map first, then
  runs the action as a map tool or menu click would (with `position`, `elementId`, `elementIds`,
  `battleMapId` and `mapId`). Select a step afterwards to see the variables as they were. Only the GM and
  players who may edit the game see this; it doesn't pause anything, unlike debug mode.

## Variables

Steps pass values to each other through **variables**. A step with an `Output` (or `OutputName`,
`OutputVariable`) argument stores its result under that name; later steps read it back with a token.

Every action starts with these variables:

| Variable | Value |
|---|---|
| `gameId`, `gmId` | The game and the GM's player id |
| `actionId`, `actionName`, `actionPrefix` | The running action |
| `playerId`, `playerName`, `playerColor`, `playerIsOwner` | The player who triggered it, when there is one |
| `playerIsGm` | `true` when that player is a GM: the owner, or a player with Edit on the game |
| `battleMapId`, `mapId` | The battle map view the player is looking at and the map it shows, when the action was run from a player's screen (a menu, a tool, a button, a card) |
| Hook variables | Depend on the hook, e.g. `Data`, `Player`, `ChatArgs`. See [Hooks](./hooks.md) |
| Arguments | Anything the caller passed, e.g. a card button's arguments |

The built-in values always win, so a caller can't fake `playerId` or `gameId` through its arguments.

**The map the player is looking at.** Steps that work on a map (*Find* tokens, the turn order steps,
*Show Marker*, *Add Element*, *Spawn Token*, *Change Map*) use it when you leave their map empty. With no
player's screen behind the action (a hook), they use the game's only battle map view, or else its first.

### Tokens

Tokens inside step arguments are replaced before the step runs. Each token is written between two `%`.
There are two kinds: **variables**, and **`%q:` queries** that read the game.

| Token | Replaced with |
|---|---|
| `%name%` | The variable's value. Text and numbers as they are; a list or object as JSON. An unknown variable is left as it is. |
| `%name.path%` | A value inside a variable. The path can go several levels deep and use list indexes: `%targets[0].name%`, `%output.ResponseBody.results[0].name%`. Text that holds JSON (like a web response body) is read as JSON. A missing part gives empty text. |
| `%q:type[name].prop%` | Property `prop` of the game's entity of that type with that name, e.g. `%q:card[Goblin].hp%`. |
| `%q:{varName}.prop%` | Property `prop` of the entity whose id is in a variable, or in a field of one: `%q:{cardId}.hp%`, `%q:{target.cardId}.hp%`. |
| `%q:<id>.prop%` | Property `prop` of the entity with that id, written out. |

To put text into a JSON argument, write its quotes yourself: `{"name": "%name%"}`. A list or object goes in
without quotes: `{"position": %position%}`.

### Reading properties with `%q:`

A `%q:` token reads a property of one of the game's entities: a card, a map, a player and so on. It names
the entity in one of three ways, then the property after a dot:

```text
%q:card[Goblin].hp%          by type and name
%q:{cardId}.hp%              by an id held in a variable (or a field: {target.cardId})
%q:3f2a…-…-….hp%             by an id written out
```

**By name**, the type is one of:

| Type | Finds | Example |
|---|---|---|
| `card` | A card (templates included) | `%q:card[5E Monster Template].id%` |
| `map` | A map | `%q:map[Dungeon].id%` |
| `player` | A player, by display name | `%q:player[Alice].id%` |
| `game` | The game itself | `%q:game[My Campaign].name%` |
| `action` | An action. `prefix/name` picks one addon's action; a bare name matches any prefix. | `%q:action[dnd5e/Roll].id%` |
| `resource` | A resource, by its key (an addon's resources are keyed `<addon key>_<file name>`), or else by its name | `%q:resource[myaddon_theme.css].id%` |

Everything between `[` and `]` is the name, so names with spaces, dots, dashes or brackets work as they
are: `%q:card[Mr. Smith].hp%`, `%q:card[Roll20 Sheet (internal)].id%`. A name can't contain `]`. In an
addon's JSON file nothing needs escaping:

```json
{ "Type": "CreateCard", "Data": { "TemplateId": "%q:card[5E Monster Template].id%" } }
```

**The property** after the dot is:

- `id`: the entity's id. Use it to hand the entity to a step, as above.
- `name`: the entity's name.
- anything else: the value of the entity's property with that name (the same values `GetPropertyValue`
  reads). Only cards, maps, map elements and the game have properties; players, actions and resources
  answer just `id` and `name`. For the player who triggered the action, use `%playerColor%` and the other
  built-in variables.

**Good to know:**

- Write names **exactly** as they are. Depending on the server's database, a name in different upper and
  lower case may or may not be found, so don't rely on either. The type (`card`, `Card`) doesn't care about case.
- If two entities share a name, any one of them may be found. Give templates and other entities you look
  up unique names, or keep the id in a variable.
- A property called `id` or `name` can't be read with `%q:`, because those words mean the entity's own id
  and name. Use `GetPropertyValue` for it.
- Only the game's own entities are found, and protected properties are never read.
- When nothing is found, the token becomes empty text. Try a token in the **Query Resolver** at the bottom of
  the Actions panel: it shows the result, and lists the tokens that found nothing.

### Tokens are filled in once

All tokens in an argument are filled in together, in a single pass. What a token turns into is never read as
tokens again. If a variable holds the text `%q:card[Goblin].hp%`, for example a chat message a player typed,
`%message%` gives exactly that text; the query inside it isn't run. To read a property whose name or entity
comes from a variable, use `%q:{varName}.prop%` or the `GetPropertyValue` step.

A few arguments are **not** filled in before the step runs, because the step fills them in itself at the
right moment:

- `DefaultValue` (SetVariable, GetPropertyValue): only used when the value comes out empty.
- `Then` / `Else` / `Do` in *If* and *For Each*: their steps are filled in when they run, with the
  variables of that moment (a loop's item, what earlier steps of the block set).
- `Properties` in *SetProperties*: split into lines first, so a value with line breaks stays one value.
- `Script` in *RunScript*: never filled in. Scripts read variables through `vars`.

### Blocks

*If* holds the steps to run in **Then** and **Else**, *For Each* the steps to run for each item in **Do**.
They are part of the action:

- They read and change the action's own variables: what a block sets is there after it. A loop can add up
  a total, a branch can set a value the steps after the *If* use.
- An *Exit* in a block stops the whole action.
- A step failing in a block fails the action.

```json
{ "Type": "ForEach", "Data": { "Collection": "targets", "ItemName": "target", "Do": [
    { "Type": "SetProperty", "Data": { "ParentId": "%target.id%", "PropertyName": "blessed", "PropertyValue": "true" } }
] } }
```

To run another action, use *Execute Action*. That action gets a **copy** of the variables: it reads
everything, but what it sets doesn't come back. Use it for actions several others share; keep the rest in
blocks.

## Stopping and errors

- The **Exit** step stops the action; any later steps don't run. In an action run by *Execute Action* it
  stops only that one. Give it a `Message` to leave a note in the event log.
- *Request User Input*, *Request Targets* and *Request Point* stop the action quietly when the player cancels, doesn't
  answer or isn't connected, unless their **Stop If Cancelled** is off.
- If a step fails (bad argument, missing variable, script error), the action stops and the error goes to
  the game **event log**, together with the action name and the step that failed.
- The **Log** step writes your own message to the event log. It's the quickest way to see a variable's value.
- For step-by-step debugging, turn on debug mode for the game. The server then pauses before each step and
  shows the current variables.
