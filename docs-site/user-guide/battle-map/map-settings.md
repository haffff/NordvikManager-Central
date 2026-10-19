---
sidebar_position: 3
title: Map settings
---

# Map settings

Each map has its own size, grid and distance units. Open its settings by right-clicking an empty spot on the map and choosing **Map Settings**, or from the **Map Selector** (GM). You need **Edit** on the map.

![The Map Settings window](/img/user-guide/map-settings.png)

## Settings

| Setting | What it does |
|---|---|
| **Name** | The map's name, shown in the Map Selector and Switch Map. |
| **Map Width** / **Map Height** | The size of the map in pixels. |
| **Size of Grid** | The size of one grid square in pixels. Used for snapping, token sizes and distances. |
| **Show Grid** / **Grid Color** | Whether the grid lines are drawn, and in what colour. |
| **Use Custom Unit System** | Use this map's own distance settings below instead of the game's (*Game Settings → Grid Settings*). |
| **Realistic Distance (Diagonal)** | On: diagonal steps cost more, as in real distance. Off: every neighbouring square costs the same. |
| **Distance per Square** / **Distance Unit Label** | What one square is worth when measuring, e.g. `5` and `ft`. |

## Other tabs

- **Token Elements:** which parts of tokens (bars, labels…) everyone, only the GM, or nobody sees on this map. See [Tokens](./tokens.md#showing-token-parts-on-a-map-gm).
- **Permissions:** who may see, control and edit the map. **Apply to all elements on this map** copies the rights to everything already on it. See [Permissions](../permissions.md).
- **Properties:** extra values stored on the map, mostly for addons.

## Lining up the grid

To match the grid to a map picture, right-click an empty spot and choose **Edit Grid**. The grid gets selected with a handle on its first square: drag the handle until the squares match the picture's, and **Size of Grid** changes with it. Click elsewhere when you're done. The grid always starts at the map's top-left corner, so place the picture to fit it.

## Snapping

How things snap to the grid is set per browser, not per map: **Settings → Keyboard Shortcuts → Battle Map Grid Snapping**. For moving and for scaling, choose **Snap** (unless you hold the key), **Only while holding** the key, or **Never**. The **Align** buttons in the Tools window choose whether things snap by their corners or their centre.
