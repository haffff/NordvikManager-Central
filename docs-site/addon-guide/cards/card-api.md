---
sidebar_position: 3
title: Card API
---

# Card API reference

Card code reaches the app only through `window.CardAPI`. Every call goes to the app and back, so
**methods that return something return a Promise**. Subscriptions and fire-and-forget calls (chat, actions,
`Close`) return nothing.

Wait for `cardapi:ready` before using it (see [Building a card](./building-a-card.md#how-the-page-is-put-together)).

## Identity

| Member | Value |
|---|---|
| `CardAPI.cardId` | This card's id. `null` until `cardapi:ready`. |
| `CardAPI.additionalArguments` | The value the card was opened with: a view's ShowView `Data`, or the card's `additionalArguments` property. `null` if none. |

## Properties: this card's data

Always this card's own properties. A property is an object like
`{ id, name, value, parentId }`. **`value` is always a string.**

| Method | Returns | Notes |
|---|---|---|
| `Get(name)` | property or `null` | |
| `GetMany(names)` | property[] | Names that don't exist are left out. The order isn't guaranteed. |
| `GetProperties()` | property[] | All of this card's properties. |
| `Set(name, value)` | | Creates the property if it's missing. Does nothing if the value is already the same. |
| `SetMany([{ name, value }])` | | `Set` for several at once. |
| `Init(name, value)` | | Creates the property only if it doesn't exist. Use it for defaults. |
| `InitMany([{ name, value }])` | | `Init` for several at once. |
| `Remove(name)` | | Does nothing if it doesn't exist. |
| `Subscribe(name, callback)` | (nothing) | `callback(property)` on every change, `callback(null)` when it's removed. |
| `Unsubscribe(name, callback)` | (nothing) | Pass the same function you subscribed. |

`Subscribe` fires for every change: this card's own `Set`, another player, the GM's settings panels,
an action's SetProperty. A card opened in two places stays in sync.

The first `Get` calls are fast: the app loads all of a card's properties when it opens.

### Properties.List: rows inside one property

For repeating rows (weapons, spells, inventory) without one property per row. The property's value is
a JSON array of `{ id, fields }`, and rows are addressed by a stable `id`.

| Method | Notes |
|---|---|
| `List.Add(name, fields, itemId?)` | Adds a row. Leave `itemId` out and the server picks one. Rejects if the property doesn't exist, so call `Init(name, "[]")` first. |
| `List.Update(name, itemId, fields)` | Replaces that row's fields. |
| `List.Remove(name, itemId)` | |
| `List.Reorder(name, orderedItemIds)` | |

Changes arrive through `Properties.Subscribe(name, …)` like any other change. Parse the value with
`JSON.parse`.

```js
await Api.Properties.Init('weapons', '[]');
await Api.Properties.List.Add('weapons', { name: 'Longsword', damage: '1d8' });
Api.Properties.Subscribe('weapons', (p) => render(JSON.parse(p?.value ?? '[]')));
```

### Properties.Global: anything's properties

The same methods with a `parentId` first: the id of the game, a map, an element or another card.

| Method |
|---|
| `Global.Get(parentId, name)`, `Global.GetMany(parentId, names)`, `Global.GetProperties(parentId)` |
| `Global.Set(parentId, name, value)`, `Global.SetMany(parentId, props)` |
| `Global.Init(parentId, name, value)`, `Global.InitMany(parentId, props)`, `Global.Remove(parentId, name)` |
| `Global.Subscribe(parentId, name, callback)`, `Global.Unsubscribe(parentId, name, callback)` |

The server checks every call: reading needs Read on that entity, writing needs Edit. `Global.Subscribe`
only hears about changes this player is allowed to see. Global reads always go to the server; nothing is
cached.

Game-wide settings are a common use: store them on the game.

```js
const gameId = await Api.ClientMediator.sendCommandAsync('Game', 'GetGameId');
await Api.Properties.Global.Init(gameId, 'dnd5e_config', JSON.stringify(defaults));
Api.Properties.Global.Subscribe(gameId, 'dnd5e_config', (p) => setConfig(JSON.parse(p.value)));
```

## Resources: files

Store images, JSON or any other file. Keys are this card's own: `Resources.Create('portrait', …)` is stored
as `<cardId>/portrait`, so two cards never collide.

| Method | Returns | Notes |
|---|---|---|
| `Create(key, data, name?, mimeType?)` | resource id | Rejects if the key already exists. |
| `Read(key)` | string, Blob or `null` | A string for `text/*` and `application/json`, a `Blob` for anything else, `null` if it doesn't exist. |
| `Update(key, data, mimeType?)` | | |
| `Delete(key)` | | |
| `Upsert(key, data, name?, mimeType?)` | resource id, or `null` when it updated | Create, or update if it exists. |

`data` can be a string, `Uint8Array`, `ArrayBuffer` or `Blob`. Without a `mimeType`, strings are stored as
`text/plain` and Blobs keep their own type.

`Resources.Global` has the same five methods, with keys that aren't tied to the card: resources the GM
uploaded, or ones shared between cards.

To show a stored image, make a `blob:` URL:

```js
const blob = await Api.Resources.Read('portrait');
img.src = blob ? URL.createObjectURL(blob) : placeholder;
```

### Big files: Open and Upload

A PDF, a book of data or a music track can be tens of megabytes. Open it as a file and read only what you
show: the app downloads just those bytes, in pieces it keeps in its cache, so the file opens at once and a
second visit downloads nothing. You never split, encode or chunk files yourself.

| Method | Returns | Notes |
|---|---|---|
| `Open(ref)` | a file, or `null` | `ref` is a game-wide key (`'myaddon_rules.pdf'`), `{ key }` or `{ id }`. |
| `Upload(data, options?, onProgress?)` | `{ id, key }` | Stores a file. Big files go up in parts; after a short drop the upload carries on where it was (reloading the page starts it again). |
| `List({ mimeType? })` | `[{ id, name, mimeType, key }]` | The game's files this player can see (all of them for a GM), e.g. PDFs from the Materials panel. |
| `ReadById(id)` | string, Blob or `null` | A file from `List`, whole. |

A file from `Open` has:

| Member | |
|---|---|
| `size`, `mimeType`, `version` | What it is when you opened it. If the file changes after that, `read` rejects: open it again for the new version. |
| `read(start, end)` | The bytes from `start` up to `end` (not included), as a `Uint8Array`. |
| `blob()`, `text()`, `json()` | All of it. |
| `mediaUrl()` | A `blob:` URL for an `<img>`, `<audio>` or `<video>` in the card (the whole file). |

`Upload` options: `key` (scoped to the card unless `global: true`; made up when you leave it out),
`name`, `mimeType`, `global`, and `storage: 'file'` to keep the file in the server's file storage, where
its parts are read without loading it whole. Asking for that needs **Edit** on the game for the player
using the card (a GM or co-GM); files over 32 MB go there anyway, whoever uploads them.
`onProgress(fraction)` follows the upload. `Resources.Global.Create(key, data, name?, mimeType?, options?)`
takes the same `storage` option. The server may limit how much a player (or the game's GMs) can upload into a
game: over it, `Upload` and `Create` reject with an error that says so; show its message.

```js
// show page 3 of a big PDF with pdf.js, reading only what it asks for
const file = await Api.Resources.Open({ id: pdfId });
const transport = new pdfjs.PDFDataRangeTransport(file.size, await file.read(0, 262144));
transport.requestDataRange = (begin, end) => file.read(begin, end).then((b) => transport.onDataRange(begin, b));
const pdf = await pdfjs.getDocument({ range: transport, disableAutoFetch: true, worker }).promise;

// store a file the user picked
const { key } = await Api.Resources.Upload(input.files[0], { global: true, storage: 'file' }, (f) => bar.value = f);
```

pdf.js needs its worker as a classic script: the card's frame has a null origin, where a module worker
started from a `blob:` URL never starts and the document never opens, without an error. Bundle it with
Vite as `import PdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker&inline'`, set `worker: { format: 'iife' }`
in `vite.config.js`, and give every document the same worker:
`const worker = new pdfjs.PDFWorker({ port: new PdfWorker() })`, then `pdfjs.getDocument({ ..., worker })`.
(With `GlobalWorkerOptions.workerPort` instead, destroying one document ends the worker for all of them.)

`ReadRange(ref, start, length)` is the primitive under `Open`; use `Open`.

## ClientMediator: the app's panels

`ClientMediator.sendCommandAsync(panel, command, data)` asks a part of the app something. Cards may call:

| Panel | Command | Returns |
|---|---|---|
| `Game` | `GetGameId` | The game's id. |
| `Game` | `GetIsGM` | `true` for a GM: the game's owner, or a co-GM (a player given **Edit** on the game). Use it to keep GM-only things out of players' lists. |
| `Game` | `GetCanEditGame` | The same as `GetIsGM`. |
| `Game` | `GetPlayers` | The game's players. |
| `Game` | `GetCurrentPlayer` | The player viewing the card. |
| `BattleMap` | `GetSelectedMap` | The open map. With several maps open, pass `{ contextId }` or you get a list. |
| `TurnOrder` | `GetState` | `{ mapId, round, currentEntryId, entries: [...], ... }` for the open map, `null` if no map is open. |
| `Chat` | `SendMessage` | Posts text to chat, the same as `SendChatMessage`. |
| `addon_…` | anything | A panel another card registered (below). |

Anything else rejects with `CardAPI: "Panel.Command" is not available to cards`. Use the `Properties`,
`Resources` and `Rolls` groups directly, not through the mediator. `sendCommand` is the same as
`sendCommandAsync`.

### Your own panel: register

A card can offer commands to the rest of the game: to actions (the **RunClientCommand** step) and to other
cards.

```js
const name = await Api.ClientMediator.register('addon_tracker', {
  Next: async ({ by }) => { advance(by); return current(); },
  Reset: () => reset(),
});
// name === 'addon_<cardId>_tracker': give this to whoever should call it
```

- The name must start with `addon_`. The app adds the card's id, so two cards never clash. Use the
  returned name to call it.
- Handlers run in your card. Their return value (or a Promise of it) is the answer, and a thrown error
  rejects the caller.
- The caller waits up to 10 seconds for an answer.
- Arguments and results must be plain data: no functions or DOM objects.
- Registering the same name again replaces its commands, which is what happens when the page reloads.
- `ClientMediator.unregister('addon_tracker')` removes it. Everything is removed when the card closes.

## Chat and actions

| Method | What it does |
|---|---|
| `SendChatMessage(text)` | Posts `text` to chat as this player. A leading `/` runs a chat command, e.g. `/r 1d20+5`. Text shows as text; it can't pretend to be a roll card. |
| `FireAction(action, args)` | Runs an action, e.g. `FireAction('dnd5e/roll_attribute', { attribute: 'strength' })`. `args` become variables; `cardId` is always set to this card. |
| `SendCustomCommandToServer(command, data)` | Sends `chat_push` or `execute_action` (`{ action, args }`). Anything else throws. Prefer the two methods above. |

## Rolls: roll now, post later

For a sheet that shows its own roll card. The server rolls; the card lays out the result; the numbers in
chat always come from the server, not from the card.

```js
const { rollId, results } = await Api.Rolls.Start([
  { key: 'attack', formula: '1d20+5' },
  { key: 'damage', formula: '1d8+3' },
]);
// results: [{ key: 'attack', roll: { result: 17, dices: [{ diceValue: 20, result: 12, kept: true }] } }, ...]

await Api.Rolls.Finish({
  rollId,
  title: 'Longsword',
  html: '<div class="card">Attack <b data-roll-key="attack"></b>, damage <b data-roll-key="damage"></b></div>',
  cssResourceKey: 'myaddon_rolls.css',
});
```

- `Start(formulas)` rolls up to 50 formulas without posting anything.
- `Finish({ rollId, html, title?, cssResourceKey? })` posts one chat message. Each `data-roll-key`
  element is filled with that roll's total, with the dice in its tooltip.
- Optional classes on those elements: `data-roll-crit-class`, `data-roll-fumble-class` and
  `data-roll-both-class` are added when a kept die rolled its maximum or a 1.
- `cssResourceKey` names a game resource with the message's CSS.
- Limits: formulas up to 500 characters, `html` up to 64 KB, `title` up to 200 characters.
- Finish rejects with "Unknown or expired roll." if the roll isn't known (or is too old).
- The message can't run scripts and can't load anything outside the allowed hosts (see
  [Sandbox and security](./sandbox.md)).

## Hearing about events

`SubscribeWebSocket(callback)` and `UnsubscribeWebSocket(callback)` deliver game events to the card as
`callback({ command, data })`. Only these kinds reach a card:

| Prefix | Examples |
|---|---|
| `chat_` | chat messages |
| `turnorder_` | the turn order changed |
| `action_` | actions were added, changed or removed |
| `property_` | rarely needed: property changes, including list rows, already reach `Properties.Subscribe` |
| `custom_` | custom panel and layer changes |

## Closing the card

`CardAPI.Close()` closes the panel the card is in, and its window if it was the last panel there. Useful
for a creator or wizard that is done.

## Errors and timeouts

- A call the app refuses rejects with an `Error` that says why.
- A call the app doesn't answer within 30 seconds rejects with "no answer from the app". Resource calls
  get 5 minutes, because uploads can be slow.
- Errors thrown by your `Subscribe` callbacks are caught and logged to the console; they don't stop other
  callbacks.
