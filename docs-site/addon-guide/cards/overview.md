---
sidebar_position: 1
title: Cards overview
---

# Cards

A **card** is a small web page that lives in the game: a character sheet, a monster stat block, a note, a
settings screen. Each card stores its data as **properties** (name → value pairs) on the GM's server, so
everyone who opens it sees the same values, live.

A card's page runs in a sandboxed frame and talks to the app only through the [Card API](./card-api.md).

## Templates, cards and views

| Kind | What it is | Where it comes from |
|---|---|---|
| **Template** | The blueprint: the page, its scripts and styles, and the default properties | An addon's `Templates/` folder, or *Addons → Templates* |
| **Card** | One sheet made from a template. It copies the template's page and properties, then keeps its own values | The Cards panel (*Add*), or the **CreateCard** action step |
| **View** | A page that isn't a sheet: settings, a creator wizard, a tool. There is one of it, not one per character | An addon's `Views/` folder, or *Addons → Views* |

Cards and views run the same way and get the same Card API. The only difference is how they open:

- **Cards** open from the Cards panel or from a token on the map.
- **Views** open with the **ShowView** step (`ViewKey`, optional `Data`), for one player or everyone. See
  [Steps](../actions/steps.md).

## Where cards live in an addon

```
addon_files/
├── info.json              the addon itself: key, name, version (see Packaging)
├── Templates/             one JSON file per template
├── Views/                 one JSON file per view
├── Resources/             the pages, scripts, styles and token files the cards use
└── Actions/               actions, e.g. what a card's buttons run
```

Every file in `Resources/` is installed as a game resource named `<addon key>_<file name>`. For example,
`index.html` in the `dnd5e` addon becomes `dnd5e_index.html`. Templates and views refer to resources by
that name.

## A template file

From the Fifth Edition addon, `Templates/character_template.json`:

```json
{
  "$schema": "https://raw.githubusercontent.com/haffff/NordvikManager-Addons/refs/heads/main/schemas/card.json",
  "name": "5E Character Template",
  "description": "A template for fifth edition characters.",
  "key": "character",
  "mainResource": "dnd5e_index.html",
  "additionalResources": ["dnd5e_dnd5e-nordvikcard.js", "dnd5e_shared.css"],
  "properties": [
    { "name": "token", "value": "dnd5e_token_character.json" }
  ]
}
```

| Field | Meaning |
|---|---|
| `name` | Shown in lists. Required. |
| `key` | A stable id. Actions find views by it (ShowView's `ViewKey`), so make it unique, e.g. `dnd5e_card_settings`. |
| `description` | Shown in lists. |
| `mainResource` | The HTML page. |
| `additionalResources` | Scripts (`.js`) and stylesheets (`.css`) added to the page, in this order. |
| `properties` | Default values. A card made from the template starts with a copy of them. |
| `hidden` | `true` keeps a template out of the lists players and the GM pick from. Actions can still use it by id or name. |
| `genericPermission` | What everyone may do with the template. `1` (Read) lets players create their own cards from it. |
| `gmPermission` | What the GM may do. Defaults to everything. |
| `owner` | The player who gets Read and Edit on the card. |

A view file has the same fields; its `properties` are usually empty. Start both with the `$schema` line
above: editors then check the file and point out unknown fields, and property values that aren't strings
(a number fails the install).

## Properties are the card's data

Everything a card shows and remembers is a property: `hp`, `strength_attribute`, a JSON list of
weapons, a note's text. Values are always **strings**, so convert numbers and parse JSON yourself.

- A card reads and writes its own properties with `CardAPI.Properties`, and hears about changes with
  `Properties.Subscribe`.
- Actions read and change the same properties (**GetPropertyValue**, **SetProperty**), so a button can
  hand the work to an action and the sheet updates itself.
- Tokens show properties too: bars and labels in a token file are bound to the card's properties.

Some property names have a meaning to the app:

| Property | Effect |
|---|---|
| `token` | The token file used when the card is dropped on a map. |
| `app_styles` | `"true"` gives the card the app's look (see [Building a card](./building-a-card.md#the-apps-look)). |
| `additionalArguments` | A value handed to the page when it opens. A view opened with `Data` gets that instead. |
| `template_id` | Set by the app: the template the card was made from. |

## Permissions

Who can open a card, change it or create cards from a template is decided on the GM's server, like
everything else in the game. A new card is private: its creator, its `owner` and the GM can see and edit it.
The Card API can't get around that: a player's card can only read what that player can read.

## Next

- [Building a card](./building-a-card.md): the page itself, plain HTML or React.
- [Card API](./card-api.md): everything a card can call.
- [Sandbox and security](./sandbox.md): what a card's page can and can't do.
- [Packaging and release](./packaging.md): from folder to installable addon.
