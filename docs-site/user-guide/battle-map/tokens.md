---
sidebar_position: 2
title: Tokens
---

# Tokens

A **token** is a playing piece on the map: a character, a monster, an object. Most tokens belong to a [card](../cards.md), such as a character sheet, and show values from it, like hit points on a bar. A [generic token](../basics.md#generic-token) belongs to no card and keeps its values on itself.

{/* SCREENSHOT: img/user-guide/token-selected.png — a selected token with its bars and settings button */}

## Placing a token

To place tokens on a map you need **Control** on it (see [Permissions](../permissions.md)).

- **From a card:** right-click the map, **Add → Token**, and pick the card. Only cards that have a token are listed; type in the search box to find one.
- **Drag a card:** drag it from the **Cards** window onto the map.
- **Generic token:** right-click the map, **Add → Generic token** (from the built-in Basics addon).

Addons can add more entries to **Add**, e.g. creating a monster's card and token in one go.

## Moving and selecting

- **Move:** drag it. You need **Control** on the token; a player usually has it on their own character.
- **Select:** click it. A selected token shows its full set of controls: bars, status icons, and buttons the addon put on it.
- **Turn:** during a fight a ring marks the token whose turn it is (see [Turn order](../turn-order.md)).

## Changing a token

- **⚙ next to a selected token** opens its settings: the values the token's addon lets you change, such as bar values and maximums or its image. Values that belong to a card change on the card too.
- **Manage Icons** (right-click menu) switches status icons on and off, for tokens whose addon has them.
- **Lock Scale/Rotate** (right-click menu) hides the resize and rotate handles, so the token can't be resized by accident when you move it. **Unlock Scale/Rotate** brings them back.
- **Picture and size:** for a card's token, set them in the card's settings, **Token Settings** tab: **Token Image**, and **Token Size** in grid squares (1–20). **Token** picks the token definition, which decides what the token shows; **Update from template** takes it from the card's template again.

## Showing token parts on a map (GM)

:::note[GM only]
**Map Settings → Token Elements** lists the parts that tokens on this map can show or hide, such as bars or name labels. For each one choose who sees it: everyone (**Visible**), only the GM, or nobody (**Hidden**). **Not set** means visible to everyone.
:::

The list comes from the tokens on the map, so the map has to be open in a battle map. Single tokens can override it where their addon allows.
