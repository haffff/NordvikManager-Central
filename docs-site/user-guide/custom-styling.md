---
sidebar_position: 2
title: Custom styling
---

# Custom game styling

A game's look can be changed with ordinary CSS files uploaded as **materials**.

- **Game stylesheets** (GM): *Game Settings → Appearance*. Applied for every player, in the order listed.
- **My stylesheets** (any player): *Player Settings* on your own player. Only you see them, and they're
  remembered in this browser. They apply after the game's, so your rules win.

Upload a `.css` file in *Materials*, then add it in one of the lists above. Changes apply straight away
for everyone connected; there's no need to reload. If a stylesheet breaks the UI, open the game with
`?nostyles` added to the address (e.g. `https://…/?game=…&nostyles`) to turn all custom styling off.

## What a stylesheet can load

A GM's CSS runs on every player's computer, so any declaration that loads something from outside the game is
removed before the stylesheet is applied. Allowed:

- `data:` URIs: `background-image: url("data:image/png;base64,…")`
- this game's own materials, by their resource link (`…/api/Materials/Resource?id=<material id>`)
- files on this site: `url("/…")`

`@import` is ignored, and so is any `url(…)` or `image-set(…)` pointing anywhere else (fonts from Google Fonts
included; upload the font file as a material instead). The browser console lists how many declarations
were removed.

## Colours: override the variables

Your rules override the app's without `!important`: they come after everything else, outside the cascade
layers the UI library uses. The quickest way to restyle is to set the palette variables:

```css
:root {
  --nordvik-background-color: #1d1726;
  --nordvik-surface: #251d31;
  --nordvik-surface-raised: #30263f;
  --nordvik-border: #4a3a5e;
  --nordvik-text-color: #efe6ff;
  --nordvik-accent: #c9a227;
}
```

| Variable | Default | Used for |
|---|---|---|
| `--nordvik-background-color` | `rgb(30,30,30)` | page and panel background |
| `--nordvik-text-color` | `#f0f0f0` | main text |
| `--nordvik-secondary-color` | `#0b0b0b` | secondary backgrounds |
| `--nordvik-accent` | `rgb(189,24,24)` | the one highlight colour: selected items, the current window tab, the current turn, focus and drop targets. Text and thin lines use a lighter tint of it (`--nordvik-accent-text`) |
| `--nordvik-selection-color` | `--nordvik-accent` | selected items, if they should differ from the accent |
| `--nordvik-item-color` | `rgb(70,70,70)` | list items |
| `--nordvik-item-hover-color` | — | list items on hover |
| `--nordvik-button-color` / `-hover` / `-active` / `--nordvik-button-border-color` | dark greys | classic buttons |
| `--nordvik-surface-sunken` | `rgb(28,28,28)` | debug console and event log |
| `--nordvik-surface` | `rgb(38,38,38)` | panel content areas, chat input |
| `--nordvik-surface-card` | `rgb(42,42,42)` | action step cards |
| `--nordvik-surface-raised` | `rgb(48,48,48)` | chat messages, chat cards |
| `--nordvik-surface-hover` | `rgb(52,52,52)` | card headers |
| `--nordvik-border` | `rgb(65,65,65)` | borders |
| `--nordvik-divider` | `rgb(70,70,70)` | lines between a panel's header, list and footer |
| `--nordvik-control` / `-border` / `-hover` / `-strong` | greys | small buttons in the sound, playlist and view panels |
| `--nordvik-toolbar` | `black` | the main toolbar |
| `--nordvik-status-bar` / `--nordvik-status-bar-border` | dark blue-grey | connection bar at the bottom |
| `--nordvik-text-strong` / `-soft` / `-muted` / `-subtle` | 220 / 200 / 140 / 130 grey | titles, secondary and hint text |
| `--nordvik-accent-blue` / `-green` / `-red` / `-gold` | | statuses, log levels, links and `%variables%` (not highlights) |
| `--nordvik-chat-own` / `--nordvik-chat-own-border` | blue-grey | your own chat messages |
| `--nordvik-input-focus` | `rgb(100,120,180)` | focused chat input |
| `--nordvik-roll-crit` / `-fail` / `-normal` | green / red / grey | dice in roll results |
| `--nordvik-drop-zone` / `-hover` | translucent blue | file drop areas |
| `--nordvik-list-item` / `-hover` / `-text` | 50 / 60 grey, white | rows in lists such as Players and Permissions |
| `--nordvik-dock-void` / `-panel` | `#1a1a1a` / `#1e1e1e` | the space behind windows, and window backgrounds |
| `--nordvik-dock-border` / `-border-active` | `#333` / `#555` | window frames, and the frame of the focused window |
| `--nordvik-dock-tab` / `-tab-text` | `#272727` / `#e8e8e8` | window tabs |
| `--nordvik-dock-accent` / `-overlay` | `--nordvik-accent` / a translucent tint of it | the current tab's underline, divider and resize-handle hover, the drop preview while dragging a window |
| `--nordvik-dock-button-hover` / `-scrollbar` | `#3a3a3a` / `#555` | window buttons (hide, lock, close) on hover, tab-row scrollbar |

Buttons, inputs, tabs, menus and dialogs come from the UI library (Chakra UI). Their colours are the
`--chakra-colors-*` variables. Set them on `:root, .dark`, because the dark theme declares them on `.dark`:

```css
:root, .dark {
  --chakra-colors-bg-panel: #251d31;
  --chakra-colors-fg: #efe6ff;
  --chakra-colors-border: #4a3a5e;
}
```

Inspect an element in the browser's developer tools to see which variable it uses.

## Targeting parts of the UI

These class names and attributes are kept stable for stylesheets to use:

| Selector | What |
|---|---|
| `.nm_basePanel` | every panel's content |
| `.nm_basePanel[data-panel="ChatPanel"]` | one kind of panel: `ChatPanel`, `SoundboardPanel`, `PlaylistsPanel`, `MaterialsPanel`, `CardsPanel`, `PlayersPanel`, `GameSettingsPanel`, … |
| `.nm_toolbar` | the main toolbar |
| `.nm_statusBar` | the connection bar at the bottom |
| `.nm_chatMessage`, `.nm_chatMessage_own` | chat message bubbles, and your own |
| `.nm_chatInput` | the chat input |
| `.nm_list`, `.nm_dlistitem` | lists and their items |
| `.nm_label` | section labels |
| `.nm_container` | collapsible boxes inside panels |
| `.nm_dialog` | dialogs |

```css
.nm_basePanel[data-panel="ChatPanel"] { background: url("data:image/png;base64,…") center / cover; }
.nm_chatMessage_own { border-radius: 14px 14px 2px 14px; }
.nm_toolbar { border-bottom: 2px solid var(--nordvik-accent-gold); }
```

## Not covered

- **The battle map** is drawn on a canvas; CSS can't reach the grid, tokens or drawings.
- **Cards and addon views** run in their own sandboxed frames and keep their own styles.
