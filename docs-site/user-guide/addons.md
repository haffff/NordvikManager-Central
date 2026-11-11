---
sidebar_position: 16
title: Addons
---

# Addons

:::note[GM only]
The **Addons** menu is the GM's. Players use what addons add (character sheets, tokens, menu entries, chat commands) without seeing this menu.
:::

An **addon** adds content and rules to a game: a game system's character sheets and monsters, a theme, extra tokens, automation. The built-in [Basics](./basics.md) addon is one. To make your own, see the [Addon guide](/addon-guide/).

The menu has three groups: **Addons** (installing), **Views** (templates and views) and **Code** (actions and debugging). Addons can add their own entries to these groups.

## Installing addons

**Addons → Addons → Addons Manage** has three tabs.

![Addons Manage, Browse tab](/img/user-guide/addons-manage.png)

- **Browse:** addons from the addon registry. Search (names, authors, descriptions), filter by category, sort, and click one to see its details and readme beside the list. **Also installs** lists the addons it needs that the game doesn't have yet, or has in an older version. Install it with a click; installed ones are marked, and **Update available** shows when there's a newer version.
- **Installed:** the game's addons, with their author, licence, website, readme, the addons each one needs (**Dependencies**) and the addons that need it (**Needed by**). Per addon:
  - **Enabled** switches it off without removing it. Addons that need it may not work while it's off; you get a warning naming them.
  - **Update** installs the newest version, along with newer versions of anything it needs.
  - **Uninstall** removes it. An addon other addons need can't be uninstalled until they are.
- **Install:** **Install from file** (drop the addon's `.zip`) or **Install from URL**.

Everyone can look through the same addons, with their readmes, on the public [addons page](/addons).

Installing can take a while for big addons; a progress message shows until it's done. Addons a new addon depends on are installed with it, or updated when the game has an older version. If one can't be fetched, the install stops before changing anything, and an update keeps the version you had.

:::caution
An addon can run code in the game, so only install addons you trust.
:::

## Templates

**Addons → Views → Templates** lists the card templates (see [Cards](./cards.md)): **UI Name**, **Key**, **Description**, its **Main Resource (HTML)** and **Additional Resources**, and its **Default Token**.
- **Hidden** leaves a template out of the template lists, e.g. one an addon uses only for its own windows.
- **New template** (the greyed row at the end of the list or of a folder, or the toolbar's **+**) makes one from your own files, and a template can be applied again to the cards made from it.
- Share a template with players by giving **Everyone** the **See** permission on it.

## Views

**Addons → Views → Views manager** lists **views**: windows made of addon code (a **Main Resource (JavaScript)** plus additional files), such as an item creator. Addons usually open their views from a menu entry or a button.

## Actions

**Addons → Code → Actions** is the action editor. An **action** is a list of steps the GM's server runs, e.g. *roll dice, read a value from a card, post the result to chat*.

![The Actions window with an action open](/img/user-guide/actions-editor.png)

- The list on the left groups actions by their **prefix** (usually the addon's name). **+** creates one.
- **Settings:** **Name**, **Prefix (group)**, **Description**, **Trigger** (run it on an event, a *hook*, or only when called by name) and **Permission for all players** (who may run it).
- **Steps:** add steps from the step picker (search for e.g. *roll*, *property*, *chat*), and fill in their fields. Each step has help.
- **Run** it with arguments to try it out, and see what each step did.
- **Save** (Ctrl+S); **Undo** / **Redo** (Ctrl+Z / Ctrl+Shift+Z). Unsaved edits are kept and offered back if the window closes.

For the steps and hooks, see [Actions](/addon-guide/actions/overview) in the Addon guide.

## Debugging

- **Addons → Code → Debug Console** shows actions as they run. Turn on **debug mode** to step through an action, **Inspect** a step's values, **Supply input** an action is waiting for, or **Kill** one that's stuck.
- **Addons → Code → Event Log** lists what happened in the game (hooks fired, actions run, errors). Filter it by level and category; **Inspect** shows an entry's details.
