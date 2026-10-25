'use strict';

const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createAddonsRouter, MAX_README_BYTES } = require('../routes/addons');

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
  return new Response(answer.body, { status: answer.status ?? 200 });
};

async function start() {
  const app = express();
  app.use('/api/addons', createAddonsRouter({ registryUrl: REGISTRY, fetchImpl: fakeFetch, now: () => clock }));
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
