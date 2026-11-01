---
sidebar_position: 3
title: Tokens
---

# Tokens

A token definition is a JSON resource (schema: `schemas/token.json` in the addon registry). It sets the image object, the UI pieces drawn around the token (`additions`), the fields offered in its quick-edit panel (`editableProps`), and the status icons a player can toggle (`assignableIcons`).

## The token editor

The [token editor](pathname:///client/tokens/) builds a token file without writing JSON by hand, and shows the token as a game draws it. It runs in your browser only: nothing is uploaded. Open a file (or start from a blank token or the dnd5e example), change it, then **Download** `token_<name>.json` into your addon's `Resources/`.

| In the editor | In the file |
|---|---|
| **Parts** (bars, labels, buttons, status icons, ring, shapes) | `additions`; each part is one or more additions |
| A part's **Visibility switch** | `tokenData.maskGroup` + `label`: one setting the GM flips in a game's map and token settings to show, make GM-only or hide every part on it. No switch: always shown. |
| A part's or the picture's **Rules** | `propDeps`: each sets one property (`opacity`, `fill`, `visible`, `text`…) from a game property |
| **Quick-edit fields** | `editableProps` |
| Status icons offered in the picker | `assignableIcons` |
| **Picture** | the stamper makes a round picture with transparent corners; picture rules are the root `tokenData.propDeps` |

**From a game:** a GM can open a game's token file in the editor with **Edit in token editor**, on a JSON resource in Resources or next to a card's or template's token. The editor opens in a new tab with that file; **Save to game** writes it back. Tokens already on a map keep what they were built from; tokens placed after the save use the new file. A token file installed by an addon is replaced when the addon updates, so change an addon's tokens in the addon itself.

**Sample values** lists every property the token reads; change them to see the preview follow. **Token file** shows the JSON and checks it against the schema.

:::note[Current client]
`fitToToken`, a value table's (`Enum`) default and stacking icons off the top-right corner (`tokenData.stack`) need the current player client. A frozen client for an older protocol (`/client/p<N>/`) draws those parts without them.
:::

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

A template with `"genericPermission": 1` (Read for everyone) shows up in every player's **Cards → Add Item**. To make its cards follow the game's theme, see [Cards and the app's styles](./cards.md).
- **What the player gets:** their own card made from it, which the GM also has full rights to.
- **Without it:** only the GM can create cards from the template.
