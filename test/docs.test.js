'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const mountDocs = require('../routes/docs');

// A fake Docusaurus build: one page per section, assets, the 404 page, and a
// file the hosting keeps next to the docs that must not be served.
let docsDir;
let server;
let base;

function write(rel, content) {
  const file = path.join(docsDir, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

before(() => {
  docsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-'));
  write('quickstart/index.html', 'quickstart page');
  write('user-guide/layers/index.html', 'layers page');
  write('assets/js/main.js', 'js');
  write('img/favicon.ico', 'ico');
  write('ai/AGENTS.md', '# guide');
  write('404.html', 'not found page');
  write('.ftp-deploy-docs-state.json', '{}');
  write('secret.txt', 'secret');

  const app = express();
  mountDocs(app, docsDir);
  app.get('/api/meta', (req, res) => res.json({ ok: true }));
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  fs.rmSync(docsDir, { recursive: true, force: true });
});

test('serves a docs section with or without the trailing slash', async () => {
  const res = await fetch(`${base}/quickstart`);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'quickstart page');

  assert.equal(await (await fetch(`${base}/quickstart/`)).text(), 'quickstart page');
});

test('serves nested pages and the assets they load', async () => {
  assert.equal(await (await fetch(`${base}/user-guide/layers`)).text(), 'layers page');
  assert.equal((await fetch(`${base}/assets/js/main.js`)).status, 200);
  assert.equal((await fetch(`${base}/img/favicon.ico`)).status, 200);
});

test('serves the AI guide for addon developers at /ai/AGENTS.md', async () => {
  const res = await fetch(`${base}/ai/AGENTS.md`);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), '# guide');
});

test('an unknown docs page gets the docs 404 page', async () => {
  const res = await fetch(`${base}/user-guide/nope`);
  assert.equal(res.status, 404);
  assert.equal(await res.text(), 'not found page');
});

test('only the docs sections are served, not other files in the folder', async () => {
  assert.equal((await fetch(`${base}/secret.txt`)).status, 404);
  assert.equal((await fetch(`${base}/.ftp-deploy-docs-state.json`)).status, 404);
});

test('leaves the other routes alone', async () => {
  assert.deepEqual(await (await fetch(`${base}/api/meta`)).json(), { ok: true });
});

test('does nothing when the docs folder does not exist', async () => {
  const app = express();
  mountDocs(app, path.join(docsDir, 'missing'));
  app.get('/quickstart', (req, res) => res.send('fallback'));
  const s = app.listen(0);
  try {
    const res = await fetch(`http://127.0.0.1:${s.address().port}/quickstart`);
    assert.equal(await res.text(), 'fallback');
  } finally {
    s.close();
  }
});
