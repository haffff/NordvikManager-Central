'use strict';

const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createReleasesRouter, parseAsset, pickRelease } = require('../routes/releases');

// The landing page's Download section: the newest GM server release, fetched from GitHub by
// the server and cached, so the page needs no outside connections.
const LIST = 'https://api.github.com/repos/o/r/releases?per_page=20';

const asset = (name, size = 100) => ({
  name,
  size,
  digest: 'sha256:ab12',
  browser_download_url: `https://github.com/o/r/releases/download/v1/${name}`,
  somethingElse: 'not passed on',
});

const release = (tag, { prerelease = false, draft = false, assets = [] } = {}) => ({
  tag_name: tag,
  name: `Release ${tag}`,
  prerelease,
  draft,
  published_at: '2026-10-25T17:23:03Z',
  html_url: `https://github.com/o/r/releases/tag/${tag}`,
  body: 'not passed on',
  assets,
});

let answer;
let requests;
let clock;
const servers = [];

const fakeFetch = async (url, init) => {
  requests.push({ url, init });
  if (answer instanceof Error) throw answer;
  return new Response(JSON.stringify(answer.body), { status: answer.status ?? 200, headers: answer.headers });
};

async function start(options = {}) {
  const app = express();
  app.use('/api/releases', createReleasesRouter({ repo: 'o/r', fetchImpl: fakeFetch, now: () => clock, ...options }));
  const server = app.listen(0);
  servers.push(server);
  await new Promise((resolve) => server.once('listening', resolve));
  return `http://127.0.0.1:${server.address().port}/api/releases/latest`;
}

beforeEach(() => {
  clock = 1_000_000;
  requests = [];
  answer = {
    body: [release('v0.0.1-dev.abc', {
      prerelease: true,
      assets: [asset('NordvikManager_0.0.1-dev.abc_win-x64.zip', 151), asset('notes.txt', 1)],
    })],
  };
});

after(() => servers.forEach((s) => s.close()));

test('parseAsset reads platform and arch from the release zip name', () => {
  assert.deepEqual(parseAsset('NordvikManager_0.0.1-dev.0c6110f_win-x64.zip'), { platform: 'windows', arch: 'x64' });
  assert.deepEqual(parseAsset('NordvikManager_1.2.0_win-arm64.zip'), { platform: 'windows', arch: 'arm64' });
  assert.deepEqual(parseAsset('NordvikManager_1.2.0_linux-arm.zip'), { platform: 'linux', arch: 'arm' });
  assert.deepEqual(parseAsset('NordvikManager_1.2.0_osx-arm64.zip'), { platform: 'macos', arch: 'arm64' });
  assert.equal(parseAsset('checksums.txt'), null);
});

test('pickRelease prefers the newest stable release and skips drafts', () => {
  const list = [release('v3', { draft: true }), release('v2-dev', { prerelease: true }), release('v1')];
  assert.equal(pickRelease(list).tag_name, 'v1');
});

test('pickRelease falls back to the newest pre-release when there is no stable one', () => {
  const list = [release('v2-dev', { prerelease: true }), release('v1-dev', { prerelease: true })];
  assert.equal(pickRelease(list).tag_name, 'v2-dev');
  assert.equal(pickRelease([]), null);
});

test('pickRelease on the dev channel takes the newest release, pre-release or not', () => {
  const list = [release('v3', { draft: true }), release('v2-dev', { prerelease: true }), release('v1')];
  assert.equal(pickRelease(list, 'dev').tag_name, 'v2-dev');
  assert.equal(pickRelease([release('v1')], 'dev').tag_name, 'v1');
});

test('GET /latest maps the release to the page format, server zips only', async () => {
  const res = await fetch(await start());

  assert.equal(res.status, 200);
  assert.match(res.headers.get('cache-control'), /max-age=/);
  assert.deepEqual(await res.json(), {
    version: '0.0.1-dev.abc',
    name: 'Release v0.0.1-dev.abc',
    prerelease: true,
    date: '2026-10-25T17:23:03Z',
    url: 'https://github.com/o/r/releases/tag/v0.0.1-dev.abc',
    assets: [{
      name: 'NordvikManager_0.0.1-dev.abc_win-x64.zip',
      platform: 'windows',
      arch: 'x64',
      size: 151,
      sha256: 'ab12',
      url: 'https://github.com/o/r/releases/download/v1/NordvikManager_0.0.1-dev.abc_win-x64.zip',
    }],
  });
});

// The GM server's updater checks the downloaded zip against sha256.
test('GET /latest leaves sha256 null when GitHub has no digest for the file', async () => {
  answer.body[0].assets = [{ ...asset('NordvikManager_1_win-x64.zip'), digest: undefined }];
  const res = await fetch(await start());
  assert.equal((await res.json()).assets[0].sha256, null);
});

test('GET /latest?channel=dev offers the newest pre-release over an older stable one', async () => {
  answer = { body: [release('v2-dev', { prerelease: true }), release('v1')] };
  const url = await start();

  assert.equal((await (await fetch(url)).json()).version, '1');
  assert.equal((await (await fetch(`${url}?channel=dev`)).json()).version, '2-dev');
  assert.equal(requests.length, 1, 'both channels come from one cached GitHub answer');
});

test('GET /latest treats an unknown channel as stable', async () => {
  answer = { body: [release('v2-dev', { prerelease: true }), release('v1')] };
  const res = await fetch(`${await start()}?channel=nightly`);
  assert.equal((await res.json()).version, '1');
});

test('GET /latest asks GitHub for the configured repo, with the token when set', async () => {
  await fetch(await start({ token: 't0ken' }));

  assert.equal(requests[0].url, LIST);
  assert.equal(requests[0].init.headers.Authorization, 'Bearer t0ken');
  assert.ok(requests[0].init.headers['User-Agent']);
});

test('GET /latest sends no Authorization header without a token', async () => {
  await fetch(await start());
  assert.equal(requests[0].init.headers.Authorization, undefined);
});

test('GET /latest caches for 10 minutes', async () => {
  const url = await start();
  await fetch(url);
  clock += 10 * 60 * 1000 - 1;
  await fetch(url);
  assert.equal(requests.length, 1);

  clock += 1;
  answer = { body: [release('v2')] };
  assert.equal((await (await fetch(url)).json()).version, '2');
  assert.equal(requests.length, 2);
});

test('GET /latest serves the last good copy when GitHub fails', async () => {
  const url = await start();
  await fetch(url);
  clock += 60 * 60 * 1000;
  answer = { status: 500, body: {} };

  const res = await fetch(url);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).version, '0.0.1-dev.abc');
});

test('GET /latest answers 502 with the releases page when GitHub fails and nothing is cached', async () => {
  answer = new Error('offline');
  const res = await fetch(await start());

  assert.equal(res.status, 502);
  assert.equal((await res.json()).fallbackUrl, 'https://github.com/o/r/releases');
});

test('GET /latest answers 502 when the repo has no releases', async () => {
  answer = { body: [release('v9', { draft: true })] };
  const res = await fetch(await start());

  assert.equal(res.status, 502);
  assert.equal((await res.json()).fallbackUrl, 'https://github.com/o/r/releases');
});

// GitHub refusing (its hourly limit for a server without a token is 60 requests) must not
// be asked again on every page view and every GM server's check: that keeps the limit spent.
test('GET /latest asks GitHub nothing more until its rate limit resets', async () => {
  const url = await start();
  answer = { status: 403, body: { message: 'API rate limit exceeded' }, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(clock / 1000 + 300) } };

  assert.equal((await fetch(url)).status, 502);
  assert.equal((await fetch(url)).status, 502);
  assert.equal(requests.length, 1);

  clock += 301_000;
  answer = { body: [release('v0.0.2', { assets: [asset('NordvikManager_0.0.2_win-x64.zip')] })] };
  assert.equal((await fetch(url)).status, 200);
  assert.equal(requests.length, 2);
});

test('GET /latest waits as long as a 429 says', async () => {
  const url = await start();
  answer = { status: 429, body: {}, headers: { 'retry-after': '120' } };

  await fetch(url);
  clock += 100_000;
  await fetch(url);
  assert.equal(requests.length, 1);

  clock += 21_000;
  await fetch(url);
  assert.equal(requests.length, 2);
});

test('GET /latest waits a minute after any other failure', async () => {
  const url = await start();
  answer = new Error('network down');

  await fetch(url);
  await fetch(url);
  assert.equal(requests.length, 1);

  clock += 61_000;
  await fetch(url);
  assert.equal(requests.length, 2);
});
