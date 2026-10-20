---
sidebar_position: 5
title: Chat
---

# Chat

The **Chat** window (**View → Chat**) is where the table talks: messages, dice rolls, whispers, and results posted by character sheets and addons. Chat is saved with the game, so the history is still there next session.

![The chat with a roll and a whisper to the GM](/img/user-guide/chat.png)

## Sending messages

Type in the box at the bottom and press **Enter**. **Shift+Enter** starts a new line. Messages show the sender's name and colour; your own are highlighted.

Scroll up to load older messages.

## Commands

Messages starting with `/` are commands. Type `/help` for the list.

| Command | Does | Example |
|---|---|---|
| `/r` or `/roll` | Rolls dice for everyone to see. See [Rolling dice](./rolling-dice.md). | `/r 1d20+5` |
| `/gr` | Rolls so that only you and the GM (and [co-GMs](./permissions.md#co-gms-edit-on-the-game)) see the result. | `/gr 1d20+5` |
| `/w` | Whispers to a player. The GM sees it too. | `/w Alice meet me at the inn` |
| `/gm` | A message only the GM (and co-GMs) sees. | `/gm can I search the room?` |
| `/help` | Lists the commands. Only you see the answer. | `/help` |
| `/c` | Runs a client command (for addon makers), with suggestions as you type. | `/c Chat.SendMessage` |

Addons can add their own commands.

## Whispers

A whisper is seen only by its sender, its recipient and the GM. It's marked above the bubble: *Whisper to Alice*, *Whisper from Bob*, *Whisper to the GM* or *GM roll*. The GM also sees whispers between players, marked *Alice → Bob*.

To answer a whisper, click the sender's name: the box fills in `/w Name ` for you.

## Rolls and cards in chat

- **Rolls** show the dice, the modifiers and the total.
- **Character sheets** post their rolls and results here, and some of them come with buttons, e.g. *Roll damage* after an attack.

## Searching

The **magnifier** next to the box searches the chat: text the message **Contains**, and who it's **From** (*Anyone* or a player). The search stays on after the box closes; the magnifier shows that the chat is filtered. Clear the search to see everything again.

## Rolling without commands

The **🎲 button** next to *Send* opens the dice roller, which builds the roll for you. See [Rolling dice](./rolling-dice.md).
