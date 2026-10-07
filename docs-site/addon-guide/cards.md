---
sidebar_position: 4
title: Cards and the app's styles
---

# Cards and the app's styles

A card's page (its template's `mainResource`, plus the CSS and JS in `additionalResources`) runs in a sandboxed frame. It's a document of its own, so the app's CSS and the game's custom stylesheets don't reach it. By default it looks exactly as its own CSS says.

## Opting in: `app_styles`

To make a card look like the app and follow the game's theme, give its template the property `app_styles` = `"true"`. Cards made from the template copy it.

```json
{
  "name": "Note",
  "mainResource": "myaddon_note.html",
  "additionalResources": ["myaddon_note.css"],
  "properties": [
    { "name": "app_styles", "value": "true" }
  ]
}
```

The app then puts the following into the card's `<head>`, in this order:

| | What | Purpose |
|---|---|---|
| 1 | `<link id="nm-app-base">` | A `:root` block with the current value of every `--nordvik-*` variable (a theme's included), `--nordvik-font` (the app's font), and the app's own `nm_` classes: `.nm_basePanel`, `.nm_dlistitem…`, `.nm_label`, `.nm_container`, `.nm_button`, plus body defaults |
| 2 | your template's CSS | lays the card out; use the variables for colours |
| 3 | `<link id="nm-app-theme">` | the game's custom stylesheets, as applied in the app (already stripped of outside `url()`s) |

The theme comes last, so it wins over your CSS just as it wins over the app's.

So:
- **Colours:** write them as `var(--nordvik-…, fallback)`.
- **Structure:** use the `nm_` classes for it (e.g. wrap the page in `.nm_basePanel`).
- **Themes:** a theme then restyles your card along with the rest of the app.

## Live updates

When the game's stylesheets change while the card is open, the app sends the page `{ type: "APP_STYLES", base, theme }`. The bridge script already in every card swaps the text of the two elements above, so the card restyles in place and you don't need to handle anything.

The Basics addon's Note (`basics_note_index.html`) is a complete example. It's a Quill editor whose toolbar and text take their colours from `--nordvik-*`.
