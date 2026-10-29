'use strict';

// Cache headers for the player client (/client, its frozen /client/p<N>/ builds, the demo and the dev build).
// Vite names its build assets after their content (assets/index-3f9aB1cd.js), so a file of
// that name never changes: browsers may keep it for a year without asking again. That turns
// a reload into a handful of requests instead of dozens, which matters behind a host that
// rate-limits bursts (429). The pages themselves are always revalidated, so a new deploy
// reaches players on their next load.
const HASHED_ASSET = /\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.(js|css|woff2?|png|svg|jpe?g|webp|gif)$/;

function setClientCacheHeaders(res, filePath) {
  const path = filePath.split('\\').join('/'); // Windows paths too
  if (HASHED_ASSET.test(path)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache');
  }
}

module.exports = { setClientCacheHeaders };
