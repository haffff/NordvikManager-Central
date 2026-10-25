'use strict';

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// The addons page's readme rendering (docs-site/src/lib/markdown.mjs): the same rules as the
// app's Addons panel. In the browser its output also goes through DOMPurify; here the rules
// themselves are checked. Needs the docs site's packages (cd docs-site && npm install).
const SOURCE = 'https://raw.githubusercontent.com/haffff/NordvikManager-Extras/poll-0.1.0/poll/README.md';
let lib;

before(async () => {
  lib = await import(pathToFileURL(path.join(__dirname, '..', 'docs-site', 'src', 'lib', 'markdown.mjs')).href);
});

test('readmeBases: the raw folder for images, the GitHub page folder for links', () => {
  assert.deepEqual(lib.readmeBases(SOURCE), {
    raw: 'https://raw.githubusercontent.com/haffff/NordvikManager-Extras/poll-0.1.0/poll/',
    page: 'https://github.com/haffff/NordvikManager-Extras/blob/poll-0.1.0/poll/',
  });
  assert.equal(lib.readmeBases('https://example.com/x.md'), null);
});

test('renders markdown and resolves relative images and links against the readme', () => {
  const html = lib.renderReadme('# Poll\n\n![shot](img/shot.png) [guide](docs/guide.md)', SOURCE);
  assert.match(html, /<h1>Poll<\/h1>/);
  assert.match(html, /src="https:\/\/raw\.githubusercontent\.com\/haffff\/NordvikManager-Extras\/poll-0\.1\.0\/poll\/img\/shot\.png"/);
  assert.match(html, /href="https:\/\/github\.com\/haffff\/NordvikManager-Extras\/blob\/poll-0\.1\.0\/poll\/docs\/guide\.md"/);
});

test('links open in a new tab; raw HTML stays text; unsafe links and images are dropped', () => {
  const html = lib.renderReadme('[site](https://nordvikmanager.pl) <script>x()</script> [bad](javascript:alert(1)) ![bad](data:image/png;base64,AA)', SOURCE);
  assert.match(html, /<a href="https:\/\/nordvikmanager\.pl\/?" target="_blank" rel="noopener noreferrer">site<\/a>/);
  assert.doesNotMatch(html, /<script/);
  assert.doesNotMatch(html, /href="javascript/);
  assert.doesNotMatch(html, /src="data:/);
});

test('without a source, relative images go and relative links keep only their text', () => {
  const html = lib.renderReadme('![x](a.png) [y](b.md)', null);
  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /<a /);
  assert.match(html, /y/);
});

test('passes the result through the sanitizer it is given', () => {
  assert.equal(lib.renderReadme('hi', SOURCE, { sanitize: () => 'clean' }), 'clean');
  assert.equal(lib.renderReadme('', SOURCE), '');
});
