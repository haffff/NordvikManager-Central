---
sidebar_position: 4
title: RunScript
---

# RunScript

**RunScript** runs a short piece of JavaScript inside an action. Use it for anything that would otherwise
take a long chain of steps: arithmetic with rounding, min/max, filtering and sorting lists, building text,
or reading JSON.

A script computes, and acts on the game through [`game`](#the-game-object): find tokens, read and change
properties, roll, post to chat, place tokens. It can't read files or reach the network.

## How it works

- The script is the body of a function. Variables are available read-only as `vars`.
- Whatever it `return`s comes back as variables:
  - **Without `Output`**: return an object, and each key becomes a variable.
  - **With `Output`**: the whole return value is stored in that one variable.
  - **No `return`**: nothing changes.
- Numbers, text and true/false come back as plain values, so `%name%` and *If* work with them. Lists and
  objects stay lists and objects: read them with a path (`%result.total%`, `%list[0].name%`) or loop
  over them with *ForEach*.
- `%name%` tokens are **not** filled into the script. Use `vars.name` instead. (`%` is the remainder
  operator here: `17 % 5` is `2`.)

```json
{ "Type": "RunScript", "Data": {
    "Script": "const hp = Math.max(0, vars.hp - vars.damage);\nreturn { hp, downed: hp === 0 };" } }
```

After this step, `%hp%` and `%downed%` are available to later steps.

## Examples

**Damage with resistance, rounded down**

```js
const dmg = Number(vars.damage);
const taken = vars.resistant === 'true' ? Math.floor(dmg / 2) : dmg;
return { taken, hpLeft: Math.max(0, Number(vars.hp) - taken) };
```

**Pick a random entry from a table**

```js
const loot = ['Potion', 'Rope', '12 gp', 'Rusty dagger'];
return { item: loot[Math.floor(Math.random() * loot.length)] };
```

**Read a web response** (after a *SendRequest* with `Output` = `output`)

```js
const data = JSON.parse(vars.output.ResponseBody);
const names = data.results.filter(r => r.level <= 3).map(r => r.name);
return { spellList: names.join(', '), spellCount: names.length };
```

**List of names from the connected players** (after *GetConnectedPlayers* into `players`)

```js
return { names: vars.players.map(p => p.Name).sort().join(', ') };
```

## The `game` object

`game` runs the action's steps for the script: the same steps as in the editor, with the same results.
Like the steps, it acts **as the system**: it finds what the triggering player can't see and changes what
they couldn't. Check with *RequirePermission* before the script when that matters.

| Function | Does | Returns |
|---|---|---|
| `game.find(what, options)` | *Find*. `options` takes the step's arguments in camelCase: `{ name, property, mapId, allMaps, withCard, near, radius, includeTemplates, first }` | The list (or with `first`, one item or `null`), with the fields of [Find](./steps.md#finding-things) |
| `game.getProperty(id, name, fallback)` | *GetPropertyValue* | The value, or `fallback` |
| `game.setProperty(id, name, value)` | *SetProperty* | — |
| `game.roll(formula)` | *RollDice* (not posted to chat) | The roll: `{ result, … }` |
| `game.chat(text, { title, to })` | *SendChat* with the Text template; `to` whispers to a player | — |
| `game.log(message)` | *Log* | — |
| `game.moveElement(id, x, y)` / `game.deleteElement(id)` | *MoveElement* / *DeleteElement* | — |
| `game.spawnToken({ cardId, x, y, mapId })` | *SpawnToken* | The new token's id |
| `game.showMarker({ shape, x, y, radius, color, duration })` | *ShowMarker* | The marker's id |
| `game.addElement({ shape, x, y, radius, color, text })` | *AddElement* | The new element's id |
| `game.createCard({ name, templateId })` | *CreateCard* | The new card's id |
| `game.step(type, data)` | Any other step, e.g. `game.step('NextTurn', {})` | The variables the step set: `game.step('GetTurnOrder', { Output: 'o' }).o` |

The `options` objects take the step's argument names, starting with a small or capital letter. `%`
tokens in them are not filled in: build the values in JavaScript.

Steps that ask a player or run other steps (*RequestUserInput*, *RequestTargets*, *RequestPoint*, *If*, *ForEach*,
*ExecuteAction*, *RunScript*, *Exit*, *Delay*) can't be called: put them before or after the script.

Protected property values (API keys and the like) are never returned to a script.

```js
// Damage every creature within 4 squares of the clicked point, half on a save.
const hit = game.find('tokens', { near: vars.position, radius: 4, withCard: true });
const damage = Number(vars.damage);
for (const t of hit) {
  const hp = Number(game.getProperty(t.cardId, 'hp', 0));
  const save = game.roll('1d20+' + game.getProperty(t.cardId, 'dex_save', 0)).result;
  const taken = save >= 15 ? Math.floor(damage / 2) : damage;
  game.setProperty(t.cardId, 'hp', Math.max(0, hp - taken));
}
game.chat(hit.length + ' creatures caught in the blast', { title: 'Fireball' });
return { hitCount: hit.length };
```

## Shared code: `Include`

Functions several actions use can live in a JavaScript resource, e.g. an addon's `Resources/rules.js`
(key `myaddon_rules.js`). List its key in `Include` (several: one per line or separated by commas), and
it is put before the script:

```json
{ "Type": "RunScript", "Data": { "Include": "myaddon_rules.js", "Script": "return { mod: abilityMod(vars.str) };" } }
```

A key that doesn't exist stops the action with `RunScript: no script file '…' to include.`

## Limits

Scripts run on the GM's server, so they are kept small and safe:

| Limit | Value |
|---|---|
| Run time | 5 seconds, `game` calls included |
| `game` calls | 200 per script |
| Memory | 16 MB |
| Statements | 100,000 |
| Nesting (recursion) | 64 calls |
| Array length | 100,000 items |
| One regular expression | 1 second |
| `eval`, `new Function` | Disabled |
| .NET / server / files / network | No access |

When a limit is hit, or the script throws or has a syntax error, the action stops. The event log shows the
reason, e.g. `RunScript: ReferenceError: x is not defined (line 2).`

Things to know:

- `vars` is read-only. Assigning to it (`vars.hp = 5`) is an error and stops the action. Changing something
  nested inside it (`vars.cards[0].hp = 5`) is allowed but only changes the script's own copy. Use `return`
  to hand values back.
- A variable that can't be turned into JSON is left out of `vars`.
- Numbers from other steps often arrive as text (`"10"`). Convert with `Number(vars.hp)` before doing maths.
- The 16 MB memory limit is checked between statements. A single call that builds a huge string at
  once (like `'x'.repeat(1e9)`) can use more memory before it's stopped, so avoid that.
