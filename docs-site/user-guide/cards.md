---
sidebar_position: 8
title: Cards
---

# Cards

A **card** is a window with content of its own: a character sheet, a monster's stat block, a handout, a note. What a card looks like and does comes from its **template**, which an addon provides; e.g. the built-in [Basics](./basics.md) addon has the *Note* template, and a game-system addon has character sheets. The values on a card (hit points, notes, inventory) are saved with the game.

![The Cards window with a Handouts folder](/img/user-guide/cards-panel.png)

## The Cards window

**View → Cards** lists the cards you can see. A player sees their own cards and the cards the GM shared with them.

- **Open a card:** click it. It opens as a floating window you can dock like any other.
- **Search:** type in the search box to filter the list.
- **Create a card:** **Add Item** (the **+**), give it a **Name** and pick a **Template**. The GM also picks its **Owner**. Players can create cards only from templates the GM shared with them, and their cards belong to them.
- **Edit / Delete:** select a card for its **Edit** (card settings) and **Delete** buttons. Addons can add entries to a card's right-click menu.
- **Place its token:** drag a card onto the battle map (see [Tokens](./battle-map/tokens.md)).

### Folders (GM)

:::note[GM only]
The GM (anyone with Edit on the game) can organise the list into folders: **Add Folder**, then **Edit Folder** (name, colour, icon), **Delete Folder** and **Delete All**. Drag cards and folders to reorder them or move them into a folder.
:::

## Card settings

**Edit** on a selected card opens its settings.

- **General:** **Card name**, **Character name**, and **Player owner** (the player it belongs to).
- **Token Settings:** the card's token: **Token Image**, **Token Size** (in grid squares) and **Token** (the token definition). **Update from template** takes the card's files and default token from its template again, e.g. after the addon was updated.
- **Permissions:** who may see, use and edit the card. See [Permissions](./permissions.md).
- **Properties:** the raw values stored on the card, mostly useful with addons.

## Who sees a card

- **The owner and the GM** always have full rights.
- **Other players** see a card only if they're given **See** on it (or on *Everyone*). Cards they can't see never reach their browser.
- A **Note** is private to its author and the GM.

## Templates (GM)

:::note[GM only]
Templates come with addons. **Addons → Templates** lists them; see [Addons](./addons.md#templates).
:::

- **Share a template with players** so they can create cards from it: give **Everyone** the **See** permission on it.
- **Hidden** templates are left out of the template lists, e.g. ones an addon uses only for its own windows.
- A **Character sheet template** can be added automatically to every new player: see [Game settings](./game-settings.md).
