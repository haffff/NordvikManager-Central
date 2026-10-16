---
sidebar_position: 2
title: Building a card
---

# Building a card

A card's page is ordinary HTML, CSS and JavaScript. Use plain scripts for something small, or a build tool
such as Vite (with React or anything else) for a full sheet. Either way the page ends up as resources: one
HTML file plus the scripts and stylesheets listed in the template.

## How the page is put together

When a card opens, the app:

1. takes the template's `mainResource` (the HTML page);
2. adds every `.css` from `additionalResources` to `<head>`, in order;
3. adds the Card API script, then every `.js` from `additionalResources`, at the end of `<body>`, in
   order;
4. runs the page in a sandboxed frame (see [Sandbox and security](./sandbox.md));
5. once the page has loaded, tells it which card it is, and fires `cardapi:ready`.

So your scripts can see `window.CardAPI` straight away, but `CardAPI.cardId` is `null` until
`cardapi:ready`. Start your card from that event:

```js
function start(api) {
  // api === window.CardAPI; api.cardId is set
}

if (window.CardAPI?.cardId) start(window.CardAPI);
else window.addEventListener('cardapi:ready', (e) => start(e.detail), { once: true });
```

:::note[Scripts in the HTML itself]
A `<script>` written into the HTML page runs before the Card API script is added. It must wait for
`cardapi:ready` before touching `window.CardAPI`.
:::

## A plain HTML card

The built-in **Note** card (Basics addon) is one HTML page plus the Quill editor. Its template:

```json
{
  "name": "Note",
  "key": "note",
  "mainResource": "basics_note_index.html",
  "additionalResources": ["basics_quill.js", "basics_quill.snow.css"],
  "genericPermission": 1,
  "properties": [
    { "name": "note_text", "value": "" },
    { "name": "app_styles", "value": "true" }
  ]
}
```

The heart of its script: create the property if it's missing, show it, save after typing stops, and
pick up changes made elsewhere.

```js
const PROP = 'note_text';

async function start(api) {
  await api.Properties.Init(PROP, '');            // create it if the card has none yet
  const prop = await api.Properties.Get(PROP);
  show(prop?.value ?? '');

  editor.onChange(() => api.Properties.Set(PROP, editor.html()));

  // The same note open in another window, or by the GM.
  api.Properties.Subscribe(PROP, (changed) => show(changed?.value ?? ''));
}
```

## A React card with Vite

The [starter template](https://github.com/haffff/NordvikManager-Addons/tree/main/template) has one ready to
copy: an HP tracker in `card_sources/myaddon-hpcard/`. The Fifth Edition sheets are built the same way, one
Vite app per card type, all sharing one HTML page:

```html
<!-- addon_files/Resources/index.html -->
<div id="root"></div>
```

The entry point renders with a stand-in API during development and with the real one in the game:

```jsx
// src/main.jsx
const root = createRoot(document.getElementById('root'))
const render = (api) => root.render(<App Api={api} />)

if (import.meta.env.DEV) {
  // `pnpm dev`: no app around, so use the mock. This branch is left out of the build.
  import('../ApiMock.js').then(({ createApiMock }) => render(createApiMock({ properties: { hp: '8' } })))
} else if (window.CardAPI?.cardId) {
  render(window.CardAPI)
} else {
  window.addEventListener('cardapi:ready', (e) => render(e.detail), { once: true })
}
```

Components then read, write and subscribe:

```jsx
useEffect(() => {
  const onChange = (prop) => setScore(Number(prop?.value ?? 10));
  Api.Properties.Subscribe('strength_attribute', onChange);
  Api.Properties.Init('strength_attribute', '10').then(() => Api.Properties.Get('strength_attribute')).then(onChange);
  return () => Api.Properties.Unsubscribe('strength_attribute', onChange);
}, []);
```

**Building.** The app adds a card's scripts as classic `<script>` tags, not modules, so each card must build
to **one self-contained file**. The template's `vite.config.js` does it:

```js
build: {
  modulePreload: false,
  cssCodeSplit: false,           // CSS in its own file, added before the game's theme
  rollupOptions: { output: { format: 'iife' } },
},
```

Don't use top-level `await`, or `import()` outside the development branch. The addon's pack script copies
the built `.js` (and `.css`) into `Resources/` under a fixed name, for example `myaddon-hpcard.js`, and the
template lists that resource (`myaddon_myaddon-hpcard.js`). See [Packaging and release](./packaging.md).

:::tip[Developing without the app]
Run `pnpm dev` with the template's `ApiMock.js`. `createApiMock({ properties, globals, isGM, actions })`
returns an object with the same methods and rules as `CardAPI` (string values, change echoes, refused
calls), kept in memory. `Api.emit(command, data)` pretends a game event arrived, and `Api.sent` lists the
chat messages and actions the card sent.
:::

## Buttons that do things

A card asks the server to do work by running an [action](../actions/overview.md):

```js
// The sheet's "Strength check" button
Api.FireAction('dnd5e/roll_attribute', { attribute: 'strength' });
```

The action gets `attribute` as a variable and `cardId` (this card) automatically, so it can read the
card's properties, roll and post the result to chat. Rolls, chat, moving tokens, creating cards: anything
the steps can do, a card can trigger this way.

## Opening data: additionalArguments

`CardAPI.additionalArguments` is a value handed to the page when it opens:

- a view opened by **ShowView** gets that step's `Data`;
- otherwise it's the card's `additionalArguments` property, if it has one.

It's a string. Use JSON for anything structured.

## The app's look

Cards look like whatever their own CSS says; the app's styles don't reach into the sandbox. To match the
app instead, give the template the property `app_styles` = `"true"`. The card then gets:

- before its own CSS: the app's colour variables (`--nordvik-*`, `--nordvik-font`) and its panel classes
  (`nm_basePanel` and friends);
- after its own CSS: the game's theme, if the GM set one;
- live updates when the theme changes.

Use the variables with a fallback, so the page still works on its own:

```css
body { background: var(--nordvik-surface, #1e1e1e); color: var(--nordvik-text-color, #eee); }
```

Don't remove or rename the `nm-app-base` and `nm-app-theme` elements the app adds to `<head>`.

## Things to keep in mind

- **Keep state in properties.** The page can be reloaded at any time (moving a docked panel does it), and
  `cardapi:ready` fires again. Anything only in memory is lost. Anything in properties comes back.
- **Values are strings.** `Set('hp', 12)` stores `"12"`. Convert when you read.
- **Your own changes come back.** `Set` reaches your `Subscribe` callbacks too. Ignore the echo if it
  disturbs typing (the Note card skips updates while its editor has focus).
- **The page is small.** It runs in a panel the user can resize, and sometimes in its own window. Make it
  fit narrow widths.
