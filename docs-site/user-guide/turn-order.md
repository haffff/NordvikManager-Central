---
sidebar_position: 4
title: Turn order
---

# Turn order

Each map has its own turn order (initiative tracker). Open it from **View → Turn order**. The panel shows the turn order of the map on screen.

## Setting it up (GM)

- **Add tokens:** right-click a token on the map and choose **Add to turn order**. The entry is named after the token.
- **Add free entries:** use the box at the bottom of the panel for things like *Lair action* or *Reinforcements*.
- **Initiative:** type it next to an entry, then click **Sort** (highest first). Entries with equal initiative keep their order, and entries without one go last. You can also drag entries to reorder them.
- **Hide from players:** use the eye on an entry. Players don't see a hidden entry. On its turn they see "…".
- **Remove:** use the ✕ on an entry. Deleting a token from the map also removes its entry.

## Running it

- **Next turn / Previous turn:** after the last entry, the next round starts. Going back from the first entry returns to the previous round, but never below round 1.
- **▶ on an entry:** makes it that entry's turn.
- **Restart:** round 1, with the first entry.
- **On the map:** a ring marks the token whose turn it is. Click an entry to show its token on the map.

## Players

- **What they see:** the turn order, without hidden entries.
- **End my turn:** when it's the turn of a token they control, they get an **End my turn** button.
- **Changes:** only the GM can change the turn order (anyone with Edit on the map).

## For addons and scripts

- **Action steps:** *Add To Turn Order*, *Set Initiative*, *Next Turn* and the rest (see the action steps reference).
- **Hook:** **Turn Changed** fires on every new turn or round.
- **ClientMediator commands** (panel `TurnOrder`): `GetState`, `Add`, `Remove`, `SetInitiative`, `SetHidden`, `Reorder`, `Sort`, `Next`, `Previous`, `GoTo`, `EndTurn`, `Reset` and `Open`. They're listed with their arguments in the Run dialog, and the event `TurnOrder:Changed` carries the new state.
- **Cards:** a card may call `TurnOrder.GetState`, and receives `turnorder_` notices, e.g. to show "your turn" on a sheet.
