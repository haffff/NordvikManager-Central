---
sidebar_position: 4
title: RunScript
---

# RunScript

**RunScript** runs a short piece of JavaScript inside an action. Use it for anything that would otherwise
take a long chain of steps: arithmetic with rounding, min/max, filtering and sorting lists, building text,
or reading JSON.

A script can only **compute**. It can't change the game, read files or reach the network. Pass its results
to the other steps (SetProperty, SendChat, MoveElement, …) to act on them.

## How it works

- The script is the body of a function. Variables are available read-only as `vars`.
- Whatever it `return`s comes back as variables:
  - **Without `Output`**: return an object, and each key becomes a variable.
  - **With `Output`**: the whole return value is stored in that one variable.
  - **No `return`**: nothing changes.
- Numbers, text and true/false come back as plain values, so `%name%`, *If* and *Calculate* work with
  them. Lists and objects come back as JSON; read them with `%v:`, *ForEach* or *FilterCollection*.
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

## Limits

Scripts run on the GM's server, so they are kept small and safe:

| Limit | Value |
|---|---|
| Run time | 2 seconds |
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
