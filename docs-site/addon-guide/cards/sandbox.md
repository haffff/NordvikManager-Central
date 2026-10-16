---
sidebar_position: 4
title: Sandbox and security
---

# Sandbox and security

A card's page runs in a sandboxed frame, cut off from the app. It can't read the player's login, change the
app's page, or call the game server except through the [Card API](./card-api.md), which only allows what a
card needs and checks permissions on the server. This page lists what that means for your code.

## What a card's page can't do

The frame is sandboxed with scripts allowed and almost nothing else:

| Not available | Instead |
|---|---|
| `localStorage`, `sessionStorage`, IndexedDB, cookies | Keep data in properties or resources. |
| `alert`, `confirm`, `prompt` | Show your own dialog in the page. |
| Popups and new tabs (`window.open`, `target="_blank"`) | Show links as text, or open things in the page. |
| Forms that submit to a URL | Handle the form in JavaScript. |
| File downloads | Store a resource, or show the content for copying. |
| Reaching the app's page or other cards | `ClientMediator` (an `addon_` panel) and properties. |

## Which hosts a card can reach

The page can load styles, fonts and images, and `fetch` data, only from:

- the GM's server itself, and
- the hosts the GM allows: `Security:SandboxAllowedOrigins` in the GM server's `appsettings.json`.

By default those are:

```
https://raw.githubusercontent.com
https://api.github.com
https://fonts.googleapis.com
https://fonts.gstatic.com
```

So Google Fonts and data files on GitHub work out of the box. A card that needs another host must ask the
GM to add it, so say so in the addon's description. When something is blocked, the browser console names
the host.

The GM's list applies to everyone: the GM and every player. Html chat messages (from `Rolls.Finish`) follow
the same list.

Scripts are stricter. A card can't load a script from any other host, even an allowed one. **Ship your
scripts as resources** (`additionalResources`), bundled, not from a CDN.

:::note[For GMs]
Change the list in `appsettings.json` and restart the server. Each entry must be an `https://` origin, such as
`https://cdn.example.com` or `https://*.example.com`; anything else is ignored. Players pick up the change
when they rejoin.

```json
"Security": {
  "SandboxAllowedOrigins": [
    "https://raw.githubusercontent.com",
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
    "https://cdn.example.com"
  ]
}
```
:::

## Resources in the page

- Only `.css` and `.js` resources are added to the page (as stylesheets and scripts). Images, fonts and
  JSON listed in `additionalResources` aren't.
- To use them, read them with `Resources.Global.Read('<addon key>_<file name>')` and make a `blob:` URL
  for images, or `JSON.parse` the text.
- Small images and fonts can also go straight into your CSS as `data:` URLs.
- Paths starting with `/` in the HTML page (`src="/…"`, `href="/…"`) point at the GM's server. That doesn't
  apply to URLs built in JavaScript.

## What the Card API protects

- Every property and resource call is checked by the GM's server against the player's permissions. A card
  open for a player can only do what that player could do.
- A card can only call the [ClientMediator commands](./card-api.md#clientmediator-the-apps-panels)
  listed for cards, and send chat messages and actions to the server. Nothing else gets through.
- Chat a card sends shows as text. Only the server's own rolls (chat commands, actions,
  `Rolls.Finish`) show as roll cards.
- Messages between the app and a card carry a secret only that card's frame knows, so other cards can't
  feed it fake answers.

## Installing an addon is still trusting it

The sandbox limits what a card can reach, but a card still sees what it shows: the sheet's values, and
whatever the player can read through the Card API. A browser can also open direct peer-to-peer
connections that no host list can block. **Install addons from authors you trust**, as you would any
software that sees your game.
