---
sidebar_position: 2.5
title: Hosting from your browser
---

# Hosting from your browser

You can host a game without installing anything. Open **[the browser version](pathname:///client/host/)**, log in with your account, and create or start a game: the game host, which is normally [the local server](./installing-the-server) on your computer, runs inside that browser tab instead. Players join the same way as for any other game.

It's good for trying NordvikManager out and for short sessions. For regular play, the local server is more dependable: it doesn't stop when a tab closes, it backs your games up, and it does a few things a browser can't (below).

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
| Updates | The program updates itself | The page is always the latest |

## What to expect

When you start the browser version it shows these, until you choose **Don't remind me again**. The **Host** button (at the right of the toolbar) shows them again any time.

- **Keep the tab open.** The game runs in that tab (see above).
- **Games are kept in this browser.** Your games and their files are stored in this browser profile only, in its private file storage: they don't follow you to another browser or computer, clearing this site's data deletes them, and there is no backup. Unless the browser grants the site persistent storage, it may also clear them when the disk is nearly full (see [Keeping your games safe](#keeping-your-games-safe)).
- **One tab hosts at a time.** A second tab of the site says your games are open in another tab, instead of opening them.
- **Log in again after a reload.** The host keeps your login only while its tab is open. After a reload, log in and you're back in the game you were in, on the same session: your players reconnect by themselves.
- **No thumbnails.** Images are sent to players at full size, so they load more slowly than from a local server. The Materials panel shows an eye instead of a preview; hover it to see the image.
- **Addons come from Central's registry.** You can browse and install the addons Central lists; they're downloaded through Central. Another registry can't be set. An addon you have as a file still installs from the file.
- **Addons can't reach other services.** A browser page may only connect to the site it came from, so addons that talk to other programs or websites (such as Trilium or Obsidian notes) and actions that download a file from a link don't work.
- **An upload cut off by a reload starts over.** A file still uploading when the tab closes or reloads has to be uploaded again. Finished uploads, big ones included, are kept with your games.
- **Fixed upload limits.** 500 MB per game for GMs and 100 MB per player; they can't be changed.

## Only on the local server

- **Backups** of the whole server, and restoring them.
- **Linking files and folders on your disk** into a game, and moving resources between the database and files on disk.
- **Server settings** (upload limits, the addon registry, allowed hosts for cards and proxies).
- **Updates** of the program (the browser version is updated with the page).

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
