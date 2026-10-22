---
sidebar_position: 5
title: Packaging and release
---

# Packaging and release

An addon is a zip of its `addon_files/` folder, with built card scripts in `Resources/`. GMs install it
from the addon registry, from a file or from a URL (*Addons → Addons*).

## info.json

The addon's own description, at the root of the zip:

```json
{
  "$schema": "https://raw.githubusercontent.com/haffff/NordvikManager-Addons/refs/heads/main/schemas/addon.json",
  "key": "dnd5e",
  "name": "Fifth Edition (SRD)",
  "description": "Fifth edition rules support for Nordvik Manager.",
  "version": "0.0.4",
  "author": "haffff",
  "license": "MIT",
  "repositoryUrl": "https://github.com/haffff/NordvikManager-5E"
}
```

| Field | Rules |
|---|---|
| `key` | Required. Lowercase letters and digits only. It prefixes the addon's resources (`dnd5e_index.html`) and actions (`dnd5e/roll_attribute`), so never change it after release. |
| `name` | Letters, digits, spaces and `- ( ) . , : ' &`. |
| `version` | Semantic version, e.g. `1.2.0`. **Raise it with every release**, so games can tell they're out of date. |
| `dependencies` | Optional: `[{ "key": "dnd5e", "version": "0.0.4" }]`. Addons from the registry, installed first; leave `version` out for any version. |

The `$schema` line gives you checking and completion in editors that support JSON Schema. Templates and
views use `schemas/card.json`, actions `schemas/action.json` and token files `schemas/token.json`, from the
same place.

:::tip[Start from the template]
The [starter template](https://github.com/haffff/NordvikManager-Addons/tree/main/template) has this layout,
a working card and action, the pack script and the release workflow. Copy the folder, change `key` and
`name` in `info.json`, and rename `myaddon` in the files.
:::

## Packing

Put the built scripts into `Resources/` and zip the folder. The Fifth Edition addon's `pnpm run pack` does it
in three steps:

1. Copies `addon_files/` to `packed/`.
2. Runs `pnpm install` and `pnpm run build` in each card's project, then copies its
   `dist/assets/*.js` (and `*.css`, if there is one) to `packed/Resources/<card project>.js`.
3. Zips `packed/` into `packed.zip`.

Templates refer to those files as `<key>_<card project>.js`, for example `dnd5e_dnd5e-nordvikcard.js`.

To try it, install `packed.zip` in *Addons → Addons*, on the **Install** tab. To try a new build of an
addon that's already installed, uninstall it first (**Installed** tab); installing a file never replaces
an installed addon.

:::warning[Don't commit build output]
`packed/`, `packed.zip` and each card's `dist/` are build output. Keep them out of git.
:::

## Releasing

Addon repositories release with a shared GitHub workflow. Add `.github/workflows/release.yml`:

```yaml
name: Release

on:
  workflow_dispatch:

jobs:
  release:
    uses: haffff/NordvikManager-Addons/.github/workflows/release-addon.yml@main
    permissions:
      contents: write
    with:
      pack-command: pnpm run pack
      zip-path: packed.zip
      asset-name: myaddon_{version}.zip
      tag: '{version}'
```

Then, for every release:

1. Raise `version` in `addon_files/info.json` and merge it.
2. Run **Actions → Release → Run workflow**.

The workflow reads the key and version from `info.json`, refuses a version that's already released,
packs the addon, checks that the zip's `info.json` matches, and publishes a GitHub Release with the zip.

## Getting into the registry

The registry is [NordvikManager-Addons](https://github.com/haffff/NordvikManager-Addons): `addons.json`
lists every addon GMs can install from the app.

- **First release:** open a pull request that adds your addon's entry (key, name, categories, version,
  author, `repositoryUrl` and `releaseUrl`).
- **Later releases:** nothing to do. A daily job finds new releases and updates the entries.

`releaseUrl` must be the release asset, `https://github.com/<you>/<repo>/releases/download/<tag>/<file>.zip`.
GitHub's "Source code" zip doesn't work: it contains the whole repository, not the packed addon. The
registry's checks refuse it.
