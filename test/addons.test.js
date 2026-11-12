'use strict';

require('./setupEnv'); // the auth middleware (package downloads) reads the config
const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createAddonsRouter, MAX_README_BYTES, MAX_PACKAGE_BYTES } = require('../routes/addons');

// The public addons page's API: the registry (addons.json) and each addon's readme, fetched
// from GitHub by the server and cached, so the page needs no outside connections.
const REGISTRY = 'https://raw.githubusercontent.com/haffff/NordvikManager-Addons/main/addons.json';
const README = 'https://raw.githubusercontent.com/haffff/NordvikManager-Extras/poll-0.1.0/poll/README.md';

const registry = {
  name: 'Main',
  categories: [{ key: 'tools', name: 'Tools', description: 'Helpers' }],
  repository: [
    {
      key: 'poll', name: 'Poll', description: 'Votes', version: '0.1.0', author: 'haffff', license: 'AGPL-3.0-only',
      repositoryUrl: 'https://github.com/haffff/NordvikManager-Extras',
      releaseUrl: 'https://github.com/haffff/NordvikManager-Extras/releases/download/poll-0.1.0/poll.zip',
      readme: README, categories: ['tools'], dependencies: [], somethingElse: 'not passed on',
    },
    { key: 'dnd5e', name: '5E Edition', version: '0.0.7', categories: [] },
    { key: 'evil', name: 'Evil', readme: 'https://example.com/README.md' },
    { key: 'big', name: 'Big', readme: 'https://raw.githubusercontent.com/h/X/t/BIG.md' },
  ],
};

let answers;
let requests;
let clock;
const servers = [];

const fakeFetch = async (url) => {
  requests.push(url);
  const answer = answers[url];
  if (answer instanceof Error) throw answer;
  if (!answer) return new Response('missing', { status: 404 });
  const response = new Response(answer.body, { status: answer.status ?? 200 });
  // Where a redirect ended up (fetch follows them): GitHub's release downloads move to another host.
  if (answer.url) Object.defineProperty(response, 'url', { value: answer.url });
  return response;
};

// requireAuth: the real middleware unless a test passes its own (x-user header = logged in as that user).
const fakeAuth = (req, res, next) => {
  if (!req.headers['x-user']) return res.status(401).json({ error: 'Authentication required' });
  req.user = { id: req.headers['x-user'] };
  next();
};

async function start(options = {}) {
  const app = express();
  app.use(require('cookie-parser')()); // as index.js: the auth middleware reads the cookie
  app.use('/api/addons', createAddonsRouter({ registryUrl: REGISTRY, fetchImpl: fakeFetch, now: () => clock, ...options }));
  const server = app.listen(0);
  servers.push(server);
  await new Promise((resolve) => server.once('listening', resolve));
  return `http://127.0.0.1:${server.address().port}/api/addons`;
}

beforeEach(() => {
  clock = 1_000_000;
  requests = [];
  answers = {
    [REGISTRY]: { body: JSON.stringify(registry) },
    [README]: { body: '# Poll\nVote!' },
    'https://raw.githubusercontent.com/h/X/t/BIG.md': { body: 'x'.repeat(MAX_README_BYTES + 1) },
  };
});

after(() => servers.forEach((s) => s.close()));

test('lists the categories and addons, with only the fields the page uses', async () => {
  const base = await start();
  const res = await fetch(base);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.categories, [{ key: 'tools', name: 'Tools', description: 'Helpers' }]);
  assert.equal(body.addons.length, 4);
  assert.equal(body.addons[0].readme, README);
  assert.equal(body.addons[0].releaseUrl, registry.repository[0].releaseUrl);
  assert.equal(body.addons[0].somethingElse, undefined);
});

test('fetches the registry once per 10 minutes', async () => {
  const base = await start();
  await fetch(base);
  await fetch(base);
  assert.equal(requests.filter((u) => u === REGISTRY).length, 1);
  clock += 11 * 60 * 1000;
  await fetch(base);
  assert.equal(requests.filter((u) => u === REGISTRY).length, 2);
});

test('keeps serving the last good registry when GitHub fails, and says so when there is none', async () => {
  const base = await start();
  answers[REGISTRY] = new Error('offline');
  assert.equal((await fetch(base)).status, 502);

  answers[REGISTRY] = { body: JSON.stringify(registry) };
  await fetch(base);
  clock += 11 * 60 * 1000;
  answers[REGISTRY] = { status: 500, body: 'down' };
  const res = await fetch(base);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).addons.length, 4);
});

test('gives an addon\'s readme by its key', async () => {
  const base = await start();
  const res = await fetch(`${base}/poll/readme`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { key: 'poll', url: README, markdown: '# Poll\nVote!' });
});

test('readme: unknown key or none is 404', async () => {
  const base = await start();
  assert.equal((await fetch(`${base}/nope/readme`)).status, 404);
  assert.equal((await fetch(`${base}/dnd5e/readme`)).status, 404);
});

test('readme: only markdown files on raw.githubusercontent.com are fetched, and only small ones', async () => {
  const base = await start();
  assert.equal((await fetch(`${base}/evil/readme`)).status, 502);
  assert.ok(!requests.includes('https://example.com/README.md'), 'a foreign URL is never fetched');
  assert.equal((await fetch(`${base}/big/readme`)).status, 502);
});

test('readme: cached for 10 minutes', async () => {
  const base = await start();
  await fetch(`${base}/poll/readme`);
  await fetch(`${base}/poll/readme`);
  assert.equal(requests.filter((u) => u === README).length, 1);
});


// ── Packages: the browser-hosted GM backend (the host build, served by this Central) installs
// registry addons through here. Its page may only connect to this origin (CSP), and GitHub's
// release downloads don't allow other origins anyway.
const POLL_ZIP = registry.repository[0].releaseUrl;
const ASSET = 'https://release-assets.githubusercontent.com/github-production-release-asset/1/poll.zip';
const zipBytes = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from(' a small zip')]);

test("package: a registry addon's release file, by key, for a logged-in user", async () => {
  answers[POLL_ZIP] = { body: zipBytes, url: ASSET };
  const base = await start({ requireAuth: fakeAuth });
  const res = await fetch(`${base}/poll/package`, { headers: { 'x-user': 'u1' } });

  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/zip');
  assert.equal(res.headers.get('x-addon-version'), '0.1.0');
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), zipBytes);
  assert.ok(requests.includes(POLL_ZIP));
});

test('package: only for a logged-in user (the real auth middleware by default)', async () => {
  answers[POLL_ZIP] = { body: zipBytes };
  const base = await start();
  assert.equal((await fetch(`${base}/poll/package`)).status, 401);
  assert.ok(!requests.includes(POLL_ZIP));
});

test('package: unknown key, or an addon without a release file, is 404', async () => {
  const base = await start({ requireAuth: fakeAuth });
  assert.equal((await fetch(`${base}/nope/package`, { headers: { 'x-user': 'u1' } })).status, 404);
  assert.equal((await fetch(`${base}/dnd5e/package`, { headers: { 'x-user': 'u1' } })).status, 404);
});

test('package: only GitHub release assets are fetched, and only where GitHub sends them', async () => {
  const evil = { ...registry, repository: [
    { key: 'elsewhere', releaseUrl: 'https://example.com/addon.zip' },
    { key: 'moved', releaseUrl: 'https://github.com/o/r/releases/download/1.0/a.zip' },
  ] };
  answers[REGISTRY] = { body: JSON.stringify(evil) };
  answers['https://github.com/o/r/releases/download/1.0/a.zip'] = { body: zipBytes, url: 'https://example.com/a.zip' };
  const base = await start({ requireAuth: fakeAuth });

  assert.equal((await fetch(`${base}/elsewhere/package`, { headers: { 'x-user': 'u1' } })).status, 502);
  assert.ok(!requests.includes('https://example.com/addon.zip'), 'a URL that is no release asset is never fetched');
  assert.equal((await fetch(`${base}/moved/package`, { headers: { 'x-user': 'u1' } })).status, 502);
});

test('package: over the size limit is refused, whatever the length header says', async () => {
  answers[POLL_ZIP] = { body: Buffer.alloc(MAX_PACKAGE_BYTES + 1) };
  const base = await start({ requireAuth: fakeAuth });
  const res = await fetch(`${base}/poll/package`, { headers: { 'x-user': 'u1' } });

  assert.equal(res.status, 502);
  assert.match((await res.json()).error, /MB/);
});

test('package: GitHub failing is a 502 saying so', async () => {
  answers[POLL_ZIP] = { status: 404, body: 'gone' };
  const base = await start({ requireAuth: fakeAuth });
  const res = await fetch(`${base}/poll/package`, { headers: { 'x-user': 'u1' } });

  assert.equal(res.status, 502);
  assert.match((await res.json()).error, /poll/);
});
