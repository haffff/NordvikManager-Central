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
  Every step is listed in the [step reference](./steps.md).

## The action editor

Open *Addons → Actions*. Actions are listed by prefix on the left; a ⚡ marks actions with a trigger.

- **Steps tab.** Each step is one line that reads like a sentence, e.g. *Roll 1d20+(%modifier%) → roll*.
  Variables are highlighted, and a missing required value shows in red.
  - Click a step to edit it in the panel beside the list (or below it, when the panel is narrow).
  - Drag the grip to reorder. Hover a step to duplicate or delete it.
  - Click **+** between steps, or **Add step** at the end, and type to search for a step.
  - Steps that run another action (If, For Each, Execute Action) show the target under the step, with a link
    that opens it.
- **Writing values.** Type `%` in a field to pick from the variables available at that step: built-ins,
  the trigger's variables, and values created by earlier steps. A variable that isn't defined anywhere
  before the step is pointed out under the field. RunScript's script gets a code editor.
- **Inputs.** For an action without a trigger, names it uses but never sets (like `%cardId%`) are listed
  as its *inputs*: values the caller passes in.
- **Settings tab.** Name, prefix, description, trigger, permission, export and delete.
- **Saving.** `Ctrl+S` saves, `Ctrl+Z` / `Ctrl+Shift+Z` undo and redo. Switching to another action with
  unsaved changes asks first. If the panel is closed or the page reloads, the changes are kept and offered
  back the next time you open the action.
- **Running.** The run bar above the steps holds the values to run with (pre-filled from the inputs).
  **Run** (or **Save & run**) runs the action and marks each step ✓ or ✗ as it goes; hover ✗ for the error.
  Select a step afterwards to see the variables as they were after it ran. If a step runs another action
  and that action fails, the step shows ✗ with that action's error. Only the GM and players who may edit
  the game see this; it doesn't pause anything, unlike debug mode.

## Variables

Steps pass values to each other through **variables**. A step with an `Output` (or `OutputName`,
`OutputVariable`) argument stores its result under that name; later steps read it back with a token.

Every action starts with these variables:

| Variable | Value |
|---|---|
| `gameId`, `gmId` | The game and the GM's player id |
| `actionId`, `actionName`, `actionPrefix` | The running action |
| `playerId`, `playerName`, `playerColor`, `playerIsOwner` | The player who triggered it, when there is one |
| Hook variables | Depend on the hook, e.g. `Data`, `Player`, `ChatArgs`. See [Hooks](./hooks.md) |
| Arguments | Anything the caller passed, e.g. a card button's arguments |

The built-in values always win, so a caller can't fake `playerId` or `gameId` through its arguments.

### Tokens

Tokens inside step arguments are replaced before the step runs:

| Token | Replaced with |
|---|---|
| `%name%` | The variable's value as text. An unknown variable is left as it is. |
| `%dto:name%` | The variable as JSON (objects, lists, quoted strings), for building a JSON argument |
| `%v:name.path%` | A value inside an object variable. The path can go several levels deep and use list indexes: `%v:output.ResponseBody.results[0].name%`. Text that holds JSON (like a web response body) is read as JSON. Missing parts give empty text. |
| `%q:{varName}.prop%` / `%q:<guid>.prop%` | Property `prop` of the entity whose id is in `varName` (or the literal id). `.name` and `.id` also work. |
| `%qn:card-"Goblin".hp%` | Property `hp` of the card named *Goblin*. Types: `card`, `map`, `player`, `game`, `action` |
| `%qn:resource-"myaddon_theme.css".id%` | Id of a resource, found by its key (an addon's resources are keyed `<addon key>_<file name>`) or else by its name. Type `resource` |

A few arguments are **not** filled in before the step runs, because the step fills them in itself at the
right moment:

- `DefaultValue` (SetVariable, GetPropertyValue): only used when the value comes out empty.
- `Condition` in *FilterCollection*: filled in once per item. `%q:` tokens are not supported there.
- `Properties` in *SetProperties*: split into lines first, so a value with line breaks stays one value.
- `Script` in *RunScript*: never filled in. Scripts read variables through `vars`.

### Sub-actions get a copy

*If*, *ForEach* and *ExecuteAction* run another action. That action gets a **copy** of the current
variables. It can read everything, but nothing it sets comes back to the caller. For calculations that
need to hand results back, use a [RunScript](./run-script.md) step instead.

## Stopping and errors

- The **Exit** step stops the current action; any later steps don't run. Inside a sub-action it stops only
  that sub-action. Give it a `Message` to leave a note in the event log.
- If a step fails (bad argument, missing variable, script error), the action stops and the error goes to
  the game **event log**, together with the action name and the step that failed.
- The **Log** step writes your own message to the event log. It's the quickest way to see a variable's value.
- For step-by-step debugging, turn on debug mode for the game. The server then pauses before each step and
  shows the current variables.
