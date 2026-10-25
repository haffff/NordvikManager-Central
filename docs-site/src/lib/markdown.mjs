// Addon readmes (the registry's "readme", a markdown file on raw.githubusercontent.com) as
// HTML, with the same rules as the app's Addons panel (NordvikManagerFrontEnd
// src/helpers/markdown.js): no raw HTML, only http(s) links (opening in a new tab) and https
// images, relative ones resolved against the readme's folder as on GitHub. The page passes
// DOMPurify's sanitize as `sanitize`; tests check the rules without a browser.
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: false, linkify: true });

const RAW = /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.*)$/;

/** The folders relative URLs resolve against: raw files (images) and GitHub pages (links). */
export function readmeBases(sourceUrl) {
  const match = RAW.exec(typeof sourceUrl === 'string' ? sourceUrl : '');
  if (!match) return null;
  const [, owner, repo, ref, file] = match;
  const folder = file.includes('/') ? file.slice(0, file.lastIndexOf('/') + 1) : '';
  return {
    raw: `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${folder}`,
    page: `https://github.com/${owner}/${repo}/blob/${ref}/${folder}`,
  };
}

const isAbsolute = (url) => /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//');

function resolve(url, base) {
  if (!url) return null;
  if (isAbsolute(url)) return url;
  if (!base) return null;
  try { return new URL(url, base).href; } catch { return null; }
}

function httpUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}

/** The readme as HTML ("" for none). */
export function renderReadme(markdown, sourceUrl, { sanitize = (html) => html } = {}) {
  if (!markdown) return '';
  const bases = readmeBases(sourceUrl);
  const tokens = md.parse(markdown, {});

  const fix = (list) => {
    const out = [];
    const dropped = []; // link_open tokens that lost their target: drop their link_close too
    for (const token of list) {
      if (token.type === 'link_open') {
        const href = token.attrGet('href') ?? '';
        const target = href.startsWith('#') ? href : httpUrl(resolve(href, bases?.page) ?? '');
        if (!target) { dropped.push(true); continue; }
        dropped.push(false);
        token.attrSet('href', target);
        if (!target.startsWith('#')) {
          token.attrSet('target', '_blank');
          token.attrSet('rel', 'noopener noreferrer');
        }
      } else if (token.type === 'link_close') {
        if (dropped.pop()) continue;
      } else if (token.type === 'image') {
        const src = resolve(token.attrGet('src') ?? '', bases?.raw);
        if (!src || !/^https:\/\//i.test(src)) continue;
        token.attrSet('src', src);
      }
      if (token.children) token.children = fix(token.children);
      out.push(token);
    }
    return out;
  };

  return sanitize(md.renderer.render(fix(tokens), md.options, {}));
}
