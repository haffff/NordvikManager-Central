---
sidebar_position: 1
title: Using the battle map
---

# Using the battle map

The **battle map** window shows a map: a background image, drawings, text and tokens on a grid. Everyone in the game sees the same map, and changes appear for everyone at once.

![A battle map with a room, a table and two tokens](/img/user-guide/battle-map.png)

## Maps and battle maps

- A **map** is the content: its size, grid, background and everything drawn on it.
- A **battle map** is a window that shows one map at a time. A game can have several battle maps, e.g. one for the world map and one for fights, and the GM can switch which map each one shows.

New games start with one battle map and one map, both called *Default*.

## Moving around

- **Pan:** drag with the middle mouse button, or pick **Drag** in the Tools window and drag with the left button.
- **Zoom:** the mouse wheel zooms in and out around the pointer.

## The Tools window

**View → Tools** (in the default layout it's the narrow strip left of the map). What you see depends on your rights on the map: players who can only see it get the select, drag and measure tools.

| Group | Tools |
|---|---|
| **Select** | **Select** picks things up: click, or drag a box around several. **Drag** pans the map. |
| **Layer** | Which [layer](./layers.md) you're working on. Only things on that layer can be selected. *Needs Edit on the map.* |
| **Draw** | **Rectangle**, **Circle** and **Text**: click to place one, or drag to size it (a rectangle corner to corner, a circle from its centre, text by its height). **Paint** draws freehand. *Needs Edit on the map.* |
| **Measure** | **Line**, **Radius** and **Cone** measure distances in the map's units. **Sketch** draws temporary marks (see below). Everyone can use these. |
| **Addon tools** | Tools added by addons: click the map to use them. |
| **Align** | How things snap to the grid: by their **Corners**, their **Center**, or **None**. |

While a tool is active, its options appear under it, with **Exit** to go back to selecting.
- **Measure options:** **Visible to others** shows your measurement to everyone; **Don't disappear** keeps it after you let go; **Clean** removes the ones you kept.
- **Sketch:** freehand marks anyone may draw, even without Edit on the map, e.g. to point out a route. They're shown to everyone but never saved: a reload, or joining later, starts without them. **Undo** and **Clean** remove your own; the GM can also clear everyone's.

Grid snapping while moving and resizing can be changed per browser in **Settings → Keyboard Shortcuts → Battle Map Grid Snapping**: always **Snap**, **Only while holding** a key, or **Never**.

## Adding things to the map

- **Draw:** use the Draw tools above.
- **Images:** drop image files from your computer onto the map. They're uploaded to the game's [materials](../materials.md) and placed where you dropped them. You can also drag an image from the Materials window.
- **Tokens:** see [Tokens](./tokens.md).

## The right-click menu

Right-click the map for a menu that depends on what's selected.

**With nothing selected:**
- **Add:** **Token** places a token for one of your cards (with a search box when there are many). Addons add more here, e.g. **Generic token** from [Basics](../basics.md). *Needs Control on the map.*
- **Paste:** pastes what you copied, where you clicked. *Needs Edit.*
- **Battle Map → Tools** opens the Tools window. **Battle Map → Show** (GM) opens this battle map on every player's screen, or on one player's.
- **Layers** (GM): show or hide custom layers, see [Layers](./layers.md#hiding-layers).
- **Switch Map:** shows another map in this battle map, or **Add Map** for a new one. *Needs Edit.*
- **Map Settings** and **Edit Grid** (see [Map settings](./map-settings.md)). *Needs Edit.*

**With something selected:**
- **Delete**, **Copy**, **Paste**.
- **Add to turn order** (tokens; see [Turn order](../turn-order.md)).
- **More Actions:** **Move Up** / **Move Down** within its layer, and **Ungroup** a group. *Needs Edit.*
- **Move to layer:** puts it on another layer. *Needs Edit.*
- **Properties:** the raw values stored on it, mostly useful with addons.
- Token entries: **Manage Icons** and **Lock Scale/Rotate**, see [Tokens](./tokens.md).
- **Permissions** (GM): who may see, control or edit it, see [Permissions](../permissions.md).

Addons can add their own entries to this menu.

## Keyboard

| Key | Does |
|---|---|
| **Ctrl+C** / **Ctrl+V** | Copy / paste the selection |
| **Delete** | Delete the selection |
| **Shift+G** / **Shift+U** | Group / ungroup the selection |

Change them in **Settings → Keyboard Shortcuts**.

## Several battle maps (GM)

:::note[GM only]
**View → Battle Maps** lists the game's battle maps.
:::

For each battle map:
- **Open** shows it in a new window; one that's already open is ticked.
- **Map Selector** (open ones) lists the game's maps. Click a map to show it in this battle map, **+** adds a map, and each map has **Settings** and **Remove**. You can also drag a map from here onto a battle map. **Duplicate** copies a map with everything on it, and **Export JSON** / **Import JSON** move one to another game (see [Cards](../cards.md#copying-export-and-import-gm)).
- **Switch Map** changes the map it shows.
- **Delete** (closed ones only) and **Permissions**.

**Add new** creates a battle map: give it a name and pick the map it starts with.
