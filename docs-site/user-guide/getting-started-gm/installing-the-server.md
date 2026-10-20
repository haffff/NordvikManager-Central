---
sidebar_position: 2
title: Installing the server
---

# Installing the server

Players don't install anything; this is only for the GM.

## Download

Get the latest release from [GitHub Releases](https://github.com/haffff/NordvikManager/releases). Pick the zip for your system:

| System | File |
|---|---|
| Windows (most PCs) | `NordvikManager_<version>_win-x64.zip` |
| Windows on ARM | `NordvikManager_<version>_win-arm64.zip` |
| Older 32-bit Windows | `NordvikManager_<version>_win-x86.zip` |
| Linux | `NordvikManager_<version>_linux-x64.zip` |
| Linux on ARM (e.g. Raspberry Pi) | `NordvikManager_<version>_linux-arm.zip` |

The zip contains everything the server needs. You don't need to install .NET or a database.

## Start it

1. Unzip it into a folder of its own, somewhere you'll keep it, for example `Documents\NordvikManager`. Your games are saved in this folder (`data.db` and the `data` folder), so don't unzip it into a temporary place.
2. Run **`DNDOnePlaceManager.exe`** (on Linux: `./DNDOnePlaceManager`).
   - A console window opens and shows the server's log.
   - Keep it open while you play. Closing it stops the server.
3. Open **[http://localhost:8213](http://localhost:8213)** in your browser.

{/* SCREENSHOT: img/server-console.png — The server console window after starting. */}

:::tip[Windows warnings]
Windows may warn that the program is from an unknown publisher. Choose **More info → Run anyway**.

The first time players connect, Windows may also ask whether to allow the server through the firewall. Allow it on private networks.
:::

:::note[Open it on the same computer]
Log in at `localhost` on the computer running the server. Sign-in cookies are only sent over a secure connection, and `localhost` is the one address that browsers treat as secure without HTTPS.
:::

## Log in

The login page asks for your Nordvik Manager account. It's the same account you'd use to join someone else's game.
- **No account yet:** choose **Register**.
  - If registration asks for an **invite code**, the central server is invitation-only. Ask whoever gave you access for a code.
  - You can also open a registration link that already contains the code.

{/* SCREENSHOT: img/gm-login.png — The login page at localhost:8213. */}

### You're the server's admin

The **first account to log in** to a new server becomes its **admin**. The console prints a box saying so. The admin's lobby has two extra buttons:
- **Application Settings**: server-wide settings, such as [backups](#back-up-your-games).
- **User Management**: everyone who has joined a game on this server; see [Inviting players](./inviting-players.md#managing-players).

The admin also sees every game on the server in the lobby (and can rename or delete any of them), and is the only one who can link files from the server's disk into a game's Materials. See [Permissions](../permissions.md#the-servers-admin).

{/* SCREENSHOT: img/lobby-empty.png — The lobby of a fresh server: "Hello, <name>", Application Settings, User Management, Logout, and "Create new game". */}

If the wrong account became the admin, stop the server, delete the hidden `.localadmin` file next to `DNDOnePlaceManager.exe`, start the server again and log in with the right account first.

## Back up your games

Everything lives in the server's folder. **Application Settings → Backups** makes a backup of the whole server (database and uploaded files) in one click. You can also schedule backups there, and download a backup to keep it somewhere else.

## Updating

When a new version is out, the admin sees a notice in the lobby. To update:
1. Make a backup.
2. Stop the server.
3. Unzip the new release over the old folder, keeping `data.db`, the `data` folder and `.localadmin`. If you edited `appsettings.json`, keep a copy of it too: the release ships its own.
4. Start the server again. It upgrades the database by itself.

Next: [Create a game](./creating-a-game.md).
