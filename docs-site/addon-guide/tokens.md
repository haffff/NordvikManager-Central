---
sidebar_position: 3
title: Tokens
---

# Tokens

A token definition is a JSON resource (schema: `schemas/token.json` in the addon registry). It sets the image object, the UI pieces drawn around the token (`additions`), the fields offered in its quick-edit panel (`editableProps`), and the status icons a player can toggle (`assignableIcons`).

## Where values come from: `source`

Every `propDeps`, `editableProps` and `assignableIcons` entry has a `source`:

| `source` | Values are read from and written to |
|---|---|
| `card` | the card the token was placed for |
| `element` | the token itself; each placed token has its own values |
| `map`, `game` | the current map or the game |

A token that isn't placed for a card must use `element` throughout. The built-in Basics addon's generic token (`basics_token_generic.json`) is a complete example.

## `editableProps`

Each entry is `{ name, dtoProperty, label, source, group?, type? }`.

- **`group`:** fields with the same `group` share a row in the quick-edit panel, e.g. a bar's value and max.
- **`type`:**
  - omitted: a short text field;
  - `"boolean"`: a checkbox;
  - **`"image"`:** a **Choose…** button that opens the material picker (jpeg/png) and saves the chosen material's id. Use `dtoProperty: "tokenImage"` with `source: "element"` to let players change a card-less token's picture.

## Placing tokens: `BattleMap_token.CreateToken`

Run it on the player's client, e.g. with a `RunClientCommand` step:

| Argument | |
|---|---|
| `contextId` | the battle map, e.g. `%battleMapId%` |
| `position` | `{ x, y }` on the map, e.g. `%position%` |
| `cardId` | place a token for this card. Its definition, name, size and image come from the card's `token`, `character_name`, `drop_token_size` and `tokenImage` properties. |
| `token` | **or**, with no card: the token definition's resource key (e.g. `myaddon_token.json`) or id |
| `image` | with `token`: the starting image (material id or key). Without it, the placeholder token image is used. |

A menu item with `Location: "battlemap_add"` appears under the map's right-click **Add** menu, and its action gets `%battleMapId%` and `%position%` (where the map was right-clicked). For example, Basics places its generic token like this:

```json
{
  "Type": "RunClientCommand",
  "Data": {
    "Panel": "BattleMap_token",
    "Command": "CreateToken",
    "Player": "%playerId%",
    "Data": "{\"contextId\": \"%battleMapId%\", \"token\": \"basics_token_generic.json\", \"position\": %position%}"
  }
}
```

**Permissions:** placing any token needs **Control** on the map; other elements need **Edit**.

## Templates players can use

A template with `"genericPermission": 1` (Read for everyone) shows up in every player's **Cards → Add Item**.
- **What the player gets:** their own card made from it, which the GM also has full rights to.
- **Without it:** only the GM can create cards from the template.
