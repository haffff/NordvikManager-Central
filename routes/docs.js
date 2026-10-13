'use strict';

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');

// The docs site (docs-site/, built by Docusaurus) lives under these paths. Only they
// are served, so nothing else in the folder (e.g. the FTP deploy's state file, or
// whatever else the hosting keeps there) is reachable.
const DOCS_SECTIONS = ['/quickstart', '/user-guide', '/documentation', '/addon-guide', '/assets', '/img'];

/**
 * Serves the built docs site from `docsDir` (DOCS_DIR). Unknown pages under a docs
 * section get the site's own 404 page. Does nothing if the folder isn't there, so a
 * server without docs keeps working.
 */
function mountDocs(app, docsDir) {
  if (!docsDir || !fs.existsSync(docsDir)) return false;

  const notFoundPage = path.join(docsDir, '404.html');

  for (const section of DOCS_SECTIONS) {
    app.use(section, express.static(path.join(docsDir, section), { extensions: ['html'] }));
    app.use(section, (req, res) => {
      res.status(404);
      if (fs.existsSync(notFoundPage)) res.sendFile(notFoundPage);
      else res.send('Not found');
    });
  }
  return true;
}

module.exports = mountDocs;
