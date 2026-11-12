---
sidebar_position: 2.5
title: Hosting from your browser
---

# Hosting from your browser

You can host a game without installing anything. Open **[the browser version](pathname:///client/host/)**, log in with your account, and create or start a game: the game host, which is normally [the local server](./installing-the-server) on your computer, runs inside that browser tab instead. Players join the same way as for any other game.

It's good for trying NordvikManager out and for short sessions. For regular play, the local server is more dependable: it doesn't stop when a tab closes, it backs your games up, and it has [features a browser can't offer](#features-of-the-local-server).

:::warning[The tab is the server]
While a game runs, keep the tab open. Closing or reloading it disconnects every player until you start the session again, and a background tab the browser puts to sleep can drop them too. The page asks before you leave it while a game is running.
:::

## Browser version or local server?

| | Local server | Browser version |
|---|---|---|
| Install | A zip for Windows or Linux | Nothing |
| Runs | While the program runs | While its tab is open |
| Where your games are kept | The `data` folder next to the program | This browser, on this computer |
| Backups | Yes | No |
| Thumbnails | Yes | No: images reach players at full size |
| Addons | From any addon registry, or a file | From Central's registry, or a file |
| Addons that reach other services (Trilium, Obsidian notes) | Yes | No |
| Linking files and folders on your disk | Yes | No |
| Upload limits | Yours to set | 500 MB per game for GMs, 100 MB per player |
| An upload cut off midway | Continues where it stopped | Starts over |
| Updates | The program updates itself | The page is always the latest |

## What to expect

When you start the browser version it shows the first six of these, until you choose **Don't remind me again**. The **Host** button (at the right of the toolbar) shows them again any time.

- **Keep this tab open.** The game runs in that tab (see above).
- **Your games can be lost.** They exist only in this browser's storage, with no backup. Unless the browser grants the site persistent storage, it may delete them without asking when the disk gets full. Clearing the site's data deletes them too, and another browser, another computer or a private window doesn't have them. See [Keeping your games safe](#keeping-your-games-safe).
- **No connections to other services.** A browser page may only connect to the site it came from, so addons that work with other programs or websites (such as Trilium or Obsidian notes) don't work, and nor do actions that download a file from a link.
- **Upload limits are fixed.** Uploads are capped at 500 MB per game for you and 100 MB per player, and can't be raised. On the local server you set them.
- **Images load slower for players.** There are no small previews: players download every image (maps, tokens, handouts) at full size, so on a slow connection they appear later than from the local server. Your Materials panel shows an eye instead of a preview; hover it to see the image.
- **Host from one tab only.** Your games open in one tab of the site at a time. A second tab won't open them: close it and use the first one.
- **Interrupted uploads start over.** If the host's tab closes or reloads while a file is uploading (yours or a player's), it has to be uploaded again from the start. The local server continues an interrupted upload where it stopped.
- **Log in again after a reload.** The host keeps your login only while its tab is open. After a reload, log in and you're back in the game you were in, on the same session: your players reconnect by themselves.
- **Addons come from Central's registry.** You can browse and install the addons Central lists, downloaded through Central; another registry can't be set. An addon you have as a file still installs from the file.

## Features of the local server

- **Backups.** Back up the whole server, games and files, on a schedule, and restore it.
- **Files from your computer.** Link files and whole folders on your disk (music, map packs) into a game without uploading them.
- **Your own settings.** Upload limits, the addon registry, and which outside sites cards and addons may use.
- **Updates.** The program updates itself when a new version is out.

## Keeping your games safe

Your games live in the browser's storage for this site. To keep them:

- **Get persistent storage.** Without it the browser may delete the site's data to free space. When it hasn't been granted, the **Host** button shows an orange **!** and a banner explains it.
  - **Chrome and Edge** don't ask you; they decide. Installing the page as an app (**Install as app** on the banner, or the install icon in the address bar) is what makes them most likely to agree; a bookmark helps too. Then choose **Ask again**.
  - **Firefox** asks you: choose **Allow** when it offers to keep the site's data.
  - **Safari** keeps the data of sites added to the Dock or the Home Screen.
- **Don't use a private window.** Everything it stores is deleted when it closes.
- **Don't clear this site's data** (cookies and site data) in the browser's settings.
- **Use the same browser and profile** each time: another browser, or another computer, doesn't have your games.

The **Host** button's panel shows how much space your games use, out of what the browser allows the site.

## When something goes wrong

The **Host** button's panel has a **Logs** tab: what the host did, newest last, with warnings and errors marked. A red number on the button counts errors since you last looked. **Copy** puts the lines on the clipboard, for a bug report; they don't contain your password or login tokens. If the host stops, the page says so and shows the log; reload the page to start it again (your games are kept).
