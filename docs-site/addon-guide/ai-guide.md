---
sidebar_position: 4
title: Developing with AI
---

# Developing with AI

AI coding assistants (Claude Code, Codex, Cursor, Copilot and others) don't know NordvikManager's rules:
that cards run in a sandbox, that property values are strings, that scripts can't come from a CDN. Left to
guess, they write code that breaks in the game.

**[AGENTS.md](pathname:///ai/AGENTS.md)** is a short guide written for them: the addon layout, the Card API,
actions, the development loop and a list of what not to do. Put it in your addon's repository and the
assistant reads it before it writes anything.

## Setting it up

1. Download [AGENTS.md](pathname:///ai/AGENTS.md) and save it in the root of your addon's repository.
2. For **Claude Code**, also add a `CLAUDE.md` next to it containing one line:
   ```
   @AGENTS.md
   ```
   Add `@README.md` on a second line if your README describes your own addon.
3. Many other assistants (Codex, Cursor, GitHub Copilot and others) read `AGENTS.md` directly. For one
   that doesn't, point it at the file in its own instructions file.

The [starter template](https://github.com/haffff/NordvikManager-Addons/tree/main/template) already has
both files.

:::note[Keep it current]
The guide changes when the platform does. Its first line links back here: download it again now and then,
especially after a NordvikManager update.
:::

## Writing single actions

To get just an action (a spell, a chat command, a GM tool) without building an addon, use
**[ACTIONS.md](pathname:///ai/ACTIONS.md)** with any AI chat assistant:

1. Download [ACTIONS.md](pathname:///ai/ACTIONS.md) and attach it to the chat (or paste its text), then
   describe the action: what starts it, what it asks, what it changes. Tell it your sheet's property names
   (`hp`, `ac`…), so it doesn't have to guess them.
2. It answers with one JSON block per action. In the game open *Addons → Actions*, click **+**, set
   **Start from** to **Paste JSON…**, paste the block and click **Create**.
3. An action with a trigger (a hook) starts switched off: turn on the switch next to its name and **Save**.

If a step doesn't exist, the paste names it and creates nothing: tell the assistant, and it can fix it.
ACTIONS.md lists every step with every argument, so it also helps an assistant working on an addon's
actions.

## Getting good results

- **Start from the template.** It has the folder layout, a working card, an action, the pack script, the
  release workflow and a Card API mock. Ask the assistant to change it rather than build from nothing.
- **Keep the `$schema` lines** in every JSON file. Editors and assistants check templates, views and actions
  against them, so a misspelt field shows up before you install.
- **Run the card with the mock first** (`pnpm dev` in the card's folder), then pack and install it in a game.
  The browser console names anything the sandbox blocked.
- **Review what it writes against the docs.** If the assistant uses a Card API method, step or hook you can't
  find in this guide, it made it up.
