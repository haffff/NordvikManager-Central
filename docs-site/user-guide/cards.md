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
- **Create a card:** **Add Item** (the **+**), or the greyed **New card** row at the end of the list or of an open folder (the card goes into that folder). Give it a **Name** and pick a **Template**. The GM also picks its **Owner**. Players can create cards only from templates the GM shared with them, and their cards belong to them.
- **Edit / Delete:** select a card for its **Edit** (card settings) and **Delete** buttons. Addons can add entries to a card's right-click menu.
- **Place its token:** drag a card onto the battle map (see [Tokens](./battle-map/tokens.md)).

### Folders (GM)

:::note[GM only]
The GM (anyone with Edit on the game) can organise the list into folders: **Add Folder**, then **Edit Folder** (name, colour, icon), **Delete Folder** and **Delete All**. Drag cards and folders by their grip to reorder them or move them into a folder. To move several at once, select them with **Ctrl**-click (**⌘** on a Mac) or **Shift**-click for a run of rows, then drag any one of them.
:::

### Copying, export and import (GM)

:::note[GM only]
Each card has **Duplicate** and **Export JSON** (in the toolbar and its right-click menu); the toolbar has **Import JSON**. The Maps, Templates, Custom Views, Playlists and Soundboard lists have them too.
:::

- **Duplicate** puts a copy, named *… (copy)*, right after the original. With several selected (Ctrl/Shift-click), the toolbar's **Duplicate** copies each of them.
- **Export JSON** downloads it as a file. Tick **Include files** to put the pictures, sounds and card pages it uses in too: the file gets bigger, but works in a game that doesn't have them.
- **Import JSON** takes such a file (pick it or paste its text) into the selected folder, in this game or another one. The files it uses are found in the game (an addon's files by their key, when the same addon is installed) or taken from the export. Whatever is still missing is left out and named in a message: a token shows the empty token picture, another image the empty image, and a card without its page opens blank.
- Who may see or use it comes along for players who are in that game. A card keeps its owner if they play there too.
- A **map's** export can **Include the tokens' cards**: in another game they're made too, in a Cards folder named after the map, and the tokens belong to them again. Without them, the tokens there have no card (and only the GM sees them).
- Dropping an exported file onto the battle map or into Materials asks whether to **Import** it or just add the file to Materials. An imported map then shows on that battle map; an imported card's token is placed where you dropped it.

## Card settings

**Edit** on a selected card opens its settings.

- **General:** **Card name**, **Character name**, and **Player owner** (the player it belongs to).
- **Token Settings:** the card's token: **Token Image**, **Token Size** (in grid squares) and **Token** (the token definition). **Update from template** takes the card's files and default token from its template again, e.g. after the addon was updated.
- **Permissions:** who may see, use and edit the card. See [Permissions](./permissions.md).
- **Properties:** the raw values stored on the card, mostly useful with addons.

## Who sees a card

- **The owner and the GM** always have full rights.
- **Other players** see a card only if they're given **See** on it (or on *Everyone*). Cards they can't see never reach their browser.
- **A card's files** (its page and scripts) come from its template. Only the GM changes them; a player who owns a card can rename it, fill it in and use **Update from template**.
- A **Note** is private to its author and the GM.

## Templates (GM)

:::note[GM only]
Templates come with addons. **Addons → Templates** lists them; see [Addons](./addons.md#templates).
:::

- **Share a template with players** so they can create cards from it: give **Everyone** the **See** permission on it.
- **Hidden** templates are left out of the template lists, e.g. ones an addon uses only for its own windows.
- A **Character sheet template** can be added automatically to every new player: see [Game settings](./game-settings.md).
