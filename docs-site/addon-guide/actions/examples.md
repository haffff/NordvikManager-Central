---
sidebar_position: 5
title: Examples
---

# Examples

Four complete actions, each built the simplest way the steps allow, with why it is built that way.
They come as one small addon: [download sanity.zip](pathname:///examples/sanity.zip) and install it in
*Addons → Addons*, on the **Install** tab. Then open *Addons → Actions*, prefix `sanity`, to see them in the
editor, run them with **Run** or **From map**, and change them.

The editor's **New action → template** starts from the same shapes, so you don't need the addon to
begin.

| Action | Shows | How it's started |
|---|---|---|
| `setup` | Adding tools and menus for a player when they load the game; GM-only entries | Hook **Player Load** |
| `bless` | Letting a player pick tokens, then doing something to each | *Sanity → Bless* in the toolbar |
| `fireball` | Tokens in an area, a marker on the map, asking the GM, applying it | The *Fireball* map tool |
| `random_enemy` | Picking a random card, copying it and placing its token, from the server | Map right-click → *Random monster here* (GM) |
| `damage_all` | Every token on the map the GM is looking at | *Sanity → Random damage* (GM) |
| `damage_target` | Shared by `fireball` and `damage_all`: lowers one token's HP | Run by the other two |

Steps are shown below as the editor shows them, one line each. Indented lines are inside a block.

## Setup: tools and menus

```text
Add map tool Fireball → sanity/fireball           (Only the triggering player)
Add toolbar button Sanity (menu sanity_menu)      (Only the triggering player)
Add menu item Bless → sanity/bless                (Only the triggering player)
Add menu item Random damage → sanity/damage_all   (Only the triggering player, GM only)
Add menu item Random monster here → sanity/random_enemy, in battlemap  (Only the triggering player, GM only)
```

- **Why the Player Load hook.** Tools and menu items last until the player leaves, so each player needs
  them again every time they load the game. **Only the triggering player** gives them to the player
  who just loaded, not again to everyone already in the game.
- **Why GM only.** It hides the entry from players. It doesn't protect the action: anyone who knows its
  name can still run it. So `damage_all` and `random_enemy` start with *RequirePermission* (Edit on
  `%gameId%`, which only GMs have).
- The map tool passes `ActionArgs` (`radiusSquares` = `4`, `dice` = `8d6`), so the same Fireball action
  could be a 30 ft one from another tool.

## Bless: the player picks targets

```text
Request targets: Pick up to 3 creatures to bless (max 3) → targets
For each target in targets
    Set property sanity_blessed of %target.id% = true
Run script → names
Send chat: %playerName%: Bless on %names%
```

- **Request Targets** asks the player who used the menu to click up to 3 tokens on the battle map. If they
  cancel, the action just stops (**Stop If Cancelled** is on by default), so nothing below needs to
  check for that.
- **For Each** runs its block once per picked token, with the token in `target`: `%target.id%`,
  `%target.name%`, `%target.cardId%`. The editor's **Variables here** lists these fields.
- The property goes on the token itself. To put it on the token's card instead (where a sheet would read
  it), set **Of** to `tokenCard`.
- **RunScript** makes the list of names: `vars.targets.map(t => t.name).join(", ")`. Text handling like
  this is what scripts are for.

## Fireball: an area, a marker and the GM's say

```text
Find tokens near %position% within %radiusSquares% → hit
Show marker circle at %position.x%, %position.y%, radius %radiusSquares% (until the action ends)
Roll %dice% → fireDamage   (posted to chat)
Run script → hitCount, hitNames
Request user input from %gmId%: … Apply it?  [yes / half / no] → answer   (Stop If Cancelled: off)
Run script → damage, apply, result
If %apply% = 1
    For each target in hit
        Execute action sanity/damage_target
Send chat: %result%
```

- **Find** with **Near** and **Radius** gives the tokens in the blast: within 4 squares of the clicked
  point, counted to each token's edge. The map is the one the player clicked.
- **Show Marker** with **Until Action Ends** shows everyone the blast for as long as the GM takes to
  decide, and removes it when the action ends. Nothing is saved on the map.
- **Request User Input** with **Options** gives the GM three buttons. **Stop If Cancelled** is off here on
  purpose: if the GM doesn't answer, the action carries on with an empty answer, and the next script turns
  that into "no damage", so the player still gets told what happened.
- **If** with a **Then** block, and a **For Each** inside it: blocks can nest, and they all use the same
  variables, so `damage` set by the script is there inside the loop.
- **Execute Action** runs `damage_target` for each token. It's a separate action because `damage_all`
  uses it too. It gets a copy of the variables, `target` and `damage` included.

## Random monster: a card copy, placed by the server

```text
Require permission Edit on %gameId%
Find cards with potworny → pool
Run script → poolSize
If %poolSize% = 0
    Send chat to %playerId%: No card has the property 'potworny'…
    Exit
Roll 1d%poolSize% → pick
Run script → picked
Create card %picked.name% from %picked.id% → monster
Delete property potworny of %monster%
Spawn token of %monster% at %position.x%, %position.y% → monsterToken
Send chat: A wild %picked.name% appears!
```

- **Find cards with a property** is how an addon (or a GM) marks cards to choose from: any card with a
  property named `potworny`, whatever its value.
- **If … Exit**: the early way out. When nothing can be placed, the GM is told why and the action stops;
  the steps below never deal with an empty pool.
- **Create Card** from the picked card copies it with its properties, so each placed monster has its own
  hit points. The copy's `potworny` is deleted, so copies aren't picked later.
- **Spawn Token** places the copy's token on the server, the same token dragging the card would give. It
  works from a hook too, with no one's browser involved, the GM's included.

## Damage everything on the map

```text
Require permission Edit on %gameId%
Find tokens → tokens
For each target in tokens
    Roll %dice% → damage
    Execute action sanity/damage_target
```

- **Find tokens** with no map looks on the map the GM is looking at. From a hook, with no one's screen
  behind it, it's the game's only battle map view, or else its first.
- Each token rolls its own damage, because the **Roll** is inside the loop.

## Damage one token

```text
Run script → hpOf, hpName
Get property %hpName% of %hpOf% → hp
Run script → hasHp, newHp, report
If %hasHp% = 1
    Set property %hpName% of %hpOf% = %newHp%
Send chat to %gmId%: %report%
```

- A token linked to a card keeps its hit points on the card (`hp`); a token without one, on its own
  Bar 1 (`bar1_value`). The first script picks which, so one action works for both.
- The second script does the maths (`Math.max(0, hp - damage)`) and writes the report.
- The report goes to the GM only (**Player** = `%gmId%`): hit points can be secret.

## The same with a script

When an action is mostly maths over lists, a single **RunScript** with [`game`](./run-script.md#the-game-object)
can be shorter than a chain of steps. Fireball without asking the GM:

```js
const hit = game.find('tokens', { near: vars.position, radius: Number(vars.radiusSquares), withCard: true });
const damage = game.roll(vars.dice).result;
for (const t of hit) {
  const hp = Number(game.getProperty(t.cardId, 'hp', 0));
  game.setProperty(t.cardId, 'hp', Math.max(0, hp - damage));
}
game.chat(`${damage} fire damage to ${hit.length} creature(s)`, { title: 'Fireball' });
return {};
```

Steps that ask someone (*Request Targets*, *Request User Input*) can't run inside a script: keep them as
steps before or after it.
