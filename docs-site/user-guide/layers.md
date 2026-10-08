---
sidebar_position: 3
title: Layers
---

# Layers

Every element on a battle map sits on a layer. There are three built-in layers, **Background**, **Token** and **Grid**, and the GM can add **custom layers** above or below them in **Game Settings → Layers**. The order there is the drawing order.

You work on one layer at a time. Clicks and selection rectangles only reach elements on that layer. Elements on other layers can't be selected, and clicks pass through them. Token bars and buttons count as part of the Token layer.

## Hiding layers

A custom layer can be in one of three states:

| State | GM | Players |
|---|---|---|
| **Visible** | sees it | see it |
| **GM only** | sees it faded, as a reminder players can't | don't see it |
| **Hidden** | doesn't see it | don't see it |

Use **GM only** for notes, traps and secret doors you want in view while running the game. Use **Hidden** for prepared content you'll reveal later: set it back to **Visible** and it appears for everyone at once, without a reload.

Set the state either:
- in **Game Settings → Layers**, with the eye button (Hidden) and the GM button (GM only) on the layer's row; or
- from the battle map's right-click menu (with nothing selected): **Layers → *layer name* → Visible / GM only / Hidden**.

**Move to layer** in the right-click menu marks GM-only and hidden layers, so you don't move something there by accident.

:::caution
Hiding happens in each player's browser: the elements of a GM-only or hidden layer are still sent to players, just not drawn. It keeps things out of sight, not secret from someone who inspects the page. Don't put anything there you couldn't live with a player finding.
:::

The built-in Background, Token and Grid layers are always visible.
