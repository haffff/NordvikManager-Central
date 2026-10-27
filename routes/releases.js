'use strict';

const express = require('express');

// The landing page's Download section reads this: the newest GM server release on GitHub.
// The server fetches it and caches it, so the page needs no outside connections (the site's
// CSP has none) and GitHub's API (60 requests an hour without a token) isn't asked on every
// visit. Until there is a stable release, the newest pre-release is offered instead.

const CACHE_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10 * 1000;

// Release zips are named NordvikManager_<version>_<rid>.zip (see the GM release workflow).
const ASSET_NAME = /_(win|linux|osx)-(x64|x86|arm64|arm)\.zip$/;
const PLATFORMS = { win: 'windows', linux: 'linux', osx: 'macos' };

/** Platform and arch of a release zip, or null for anything that isn't a server build. */
function parseAsset(name) {
  const match = ASSET_NAME.exec(name);
  return match ? { platform: PLATFORMS[match[1]], arch: match[2] } : null;
}

/**
 * The newest stable release (GitHub lists newest first), else the newest pre-release. On the
 * "dev" channel (GM servers that opted into dev builds) simply the newest release.
 */
function pickRelease(releases, channel = 'stable') {
  const published = releases.filter((r) => !r.draft);
  if (channel === 'dev') return published[0] ?? null;
  return published.find((r) => !r.prerelease) ?? published[0] ?? null;
}

// GitHub gives "sha256:<hex>"; the GM server's updater checks its download against the hex.
const sha256Of = (digest) => (typeof digest === 'string' && digest.startsWith('sha256:') ? digest.slice(7) : null);

function toPageFormat(release) {
  return {
    version: release.tag_name.replace(/^v/, ''),
    name: release.name,
    prerelease: release.prerelease,
    date: release.published_at,
    url: release.html_url,
    assets: release.assets
      .map((a) => ({
        name: a.name,
        ...parseAsset(a.name),
        size: a.size,
        sha256: sha256Of(a.digest),
        url: a.browser_download_url,
      }))
      .filter((a) => a.platform),
  };
}

/**
 * Router for /api/releases. repo: "owner/name"; token: optional GitHub token (raises the
 * API rate limit); fetchImpl and now are for tests.
 */
function createReleasesRouter({ repo, token = null, fetchImpl = fetch, now = Date.now }) {
  const router = express.Router();
  const fallbackUrl = `https://github.com/${repo}/releases`;
  let cached = null; // { at, releases }: GitHub's list, shared by both channels

  async function loadReleases() {
    if (cached && now() - cached.at < CACHE_MS) return cached.releases;
    try {
      const headers = { 'User-Agent': 'NordvikManager-Central', Accept: 'application/vnd.github+json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetchImpl(`https://api.github.com/repos/${repo}/releases?per_page=20`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers,
      });
      if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
      const releases = await response.json();
      if (!pickRelease(Array.isArray(releases) ? releases : [], 'dev')) throw new Error('There are no releases yet');
      cached = { at: now(), releases };
      return releases;
    } catch (error) {
      if (cached) return cached.releases; // the last good copy beats nothing
      throw error;
    }
  }

  // ?channel=dev: GM servers that opted into dev builds; anything else is the stable channel.
  router.get('/latest', async (req, res) => {
    try {
      const channel = req.query.channel === 'dev' ? 'dev' : 'stable';
      const data = toPageFormat(pickRelease(await loadReleases(), channel));
      res.set('Cache-Control', 'public, max-age=300');
      res.json(data);
    } catch (error) {
      res.status(502).json({ error: `The latest release couldn't be read: ${error.message}`, fallbackUrl });
    }
  });

  return router;
}

module.exports = { createReleasesRouter, parseAsset, pickRelease };
