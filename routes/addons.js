'use strict';

const express = require('express');

// The public addons page (docs-site /addons) reads these: the addon registry and each
// addon's readme. The server fetches them from GitHub and caches them, so the page needs no
// outside connections (the site's CSP has none) and GitHub isn't asked on every visit.
// A readme's URL only ever comes from the registry entry with that key, and must be a
// markdown file on raw.githubusercontent.com, as the registry schema requires.

const CACHE_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10 * 1000;
const MAX_README_BYTES = 512 * 1024;
const README_URL = /^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[^/]+\/.+\.md$/;

const ADDON_FIELDS = ['key', 'name', 'description', 'version', 'author', 'license', 'repositoryUrl', 'releaseUrl', 'readme', 'categories', 'dependencies'];
const CATEGORY_FIELDS = ['key', 'name', 'description'];

const pick = (source, fields) => Object.fromEntries(fields.filter((f) => source?.[f] !== undefined).map((f) => [f, source[f]]));

class UpstreamError extends Error {}

/**
 * Router for /api/addons. registryUrl: the raw addons.json; fetchImpl and now are for tests.
 */
function createAddonsRouter({ registryUrl, fetchImpl = fetch, now = Date.now }) {
  const router = express.Router();
  let registry = null; // { at, data }
  const readmes = new Map(); // url -> { at, markdown }

  async function get(url) {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers: { 'User-Agent': 'NordvikManager-Central' } });
    if (!response.ok) throw new UpstreamError(`${url} answered ${response.status}`);
    return response;
  }

  async function loadRegistry() {
    if (registry && now() - registry.at < CACHE_MS) return registry.data;
    try {
      const json = await (await get(registryUrl)).json();
      const data = {
        categories: (Array.isArray(json.categories) ? json.categories : []).map((c) => pick(c, CATEGORY_FIELDS)),
        addons: (Array.isArray(json.repository) ? json.repository : []).map((a) => pick(a, ADDON_FIELDS)),
      };
      registry = { at: now(), data };
      return data;
    } catch (error) {
      if (registry) return registry.data; // the last good copy beats nothing
      throw new UpstreamError(`The addon registry couldn't be read: ${error.message}`);
    }
  }

  async function loadReadme(url) {
    const cached = readmes.get(url);
    if (cached && now() - cached.at < CACHE_MS) return cached.markdown;
    const response = await get(url);
    const length = Number(response.headers.get('content-length'));
    if (length > MAX_README_BYTES) throw new UpstreamError('The readme is over 512 KB.');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_README_BYTES) throw new UpstreamError('The readme is over 512 KB.');
    const markdown = bytes.toString('utf8');
    readmes.set(url, { at: now(), markdown });
    return markdown;
  }

  router.get('/', async (req, res) => {
    try {
      res.set('Cache-Control', 'public, max-age=300');
      res.json(await loadRegistry());
    } catch (error) {
      res.status(502).json({ error: error.message });
    }
  });

  router.get('/:key/readme', async (req, res) => {
    try {
      const addon = (await loadRegistry()).addons.find((a) => a.key === req.params.key);
      if (!addon?.readme) return res.status(404).json({ error: `"${req.params.key}" has no readme.` });
      if (!README_URL.test(addon.readme)) {
        return res.status(502).json({ error: 'The readme isn\'t a markdown file on raw.githubusercontent.com.' });
      }
      res.set('Cache-Control', 'public, max-age=300');
      res.json({ key: addon.key, url: addon.readme, markdown: await loadReadme(addon.readme) });
    } catch (error) {
      res.status(502).json({ error: error instanceof UpstreamError ? error.message : 'The readme couldn\'t be read.' });
    }
  });

  return router;
}

module.exports = { createAddonsRouter, MAX_README_BYTES };
