---
sidebar_position: 10
title: Materials
---

# Materials

**Materials** are the files a game uses: map backgrounds, token pictures, handouts, music and sounds, stylesheets. They're stored on the GM's server, and sent to players when needed (and cached in their browser, so they don't download twice).

**View → Materials** opens them.

![The Materials window with folders of pictures](/img/user-guide/materials.png)

## Uploading

- **Drop files** on *Drop files or click to upload*, or click it to pick files. Dropping files anywhere on the Materials window works too.
- **Drop images on the battle map** to upload them and place them on the map in one go.

Everyone can upload. Your Materials list shows your own uploads; the GM sees everyone's. Anything you put on the map or a card is of course shown to whoever sees that.

## Using materials

- **On the map:** drag an image from the list onto the battle map.
- **For tokens and cards:** pickers like a token's **Image → Choose…** list the materials you can see.
- **Sounds:** audio files go into [playlists and soundboards](./sound.md).
- **Stylesheets:** CSS files can restyle the game, see [Custom styling](./custom-styling.md).

## Managing materials

Select a material for its buttons:
- **Copy ID** / **Copy link** — for actions, addons and stylesheets that refer to a file.
- **Edit** — **Resource Name**; **Key**, an optional short name actions can use instead of the ID (unique in the game); and for audio, its **Volume (%)**.
- **Delete**.

The GM (anyone with Edit on the game) can organise the list into folders and drag files between them, as in the Cards window.

## GM: storage and local files

:::note[GM only]
The GM's Materials window has two tabs: **My Materials**, and **All Resources**, every player's uploads grouped by player.
:::

A material is stored in one of three ways, shown by its icon:

| Storage | Meaning |
|---|---|
| **Stored in database** | Inside the game's database. |
| **Stored as a file on disk** | A file the server keeps in its own folder. |
| **Linked to a file on disk (not copied)** | A file elsewhere on the server's computer, e.g. your music folder. It's read from there, never copied or changed. |

- **Link local file or folder…** browses the server's computer and links files or whole folders, without uploading copies. Useful for large music libraries.
- **Store as file on disk** / **Store in database** move a material between the two. For a linked file, **Adopt as …** makes a copy the server owns.
- Deleting a linked material only **Unlinks** it: the file on disk is kept.
