import React, { useEffect, useMemo, useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { useHistory, useLocation } from '@docusaurus/router';
import DOMPurify from 'dompurify';
import { renderReadme } from '../lib/markdown.mjs';
import styles from './addons.module.css';

// The public list of addons: the registry (addons.json), read through Central's /api/addons
// (fetched from GitHub and cached there), with search, categories and a page per addon
// (?addon=<key>) showing its readme. Rendered in the browser: the list is always current.

const categoryName = (key, categories) => categories.find((c) => c.key === key)?.name || key;
const text = (value) => String(value ?? '').toLowerCase();

function browse(addons, { search, category, sort }, categories) {
  const query = search.trim().toLowerCase();
  const list = addons.filter((a) =>
    (!query || [a.name, a.author, a.description, a.key].some((v) => text(v).includes(query))) &&
    (category === 'all' || (a.categories ?? []).includes(category)));
  const firstCategory = (a) => (a.categories ?? []).map((k) => categoryName(k, categories)).sort()[0] ?? '￿';
  const pick = sort === 'author' ? (a) => a.author || '￿' : sort === 'category' ? firstCategory : (a) => a.name;
  return [...list].sort((a, b) => text(pick(a)).localeCompare(text(pick(b))) || text(a.name).localeCompare(text(b.name)));
}

function useRegistry() {
  const [state, setState] = useState({ status: 'loading' });
  useEffect(() => {
    let live = true;
    fetch('/api/addons')
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => live && setState({ status: 'ready', categories: data.categories ?? [], addons: data.addons ?? [] }))
      .catch((error) => live && setState({ status: 'error', error: error.message }));
    return () => { live = false; };
  }, []);
  return state;
}

function useReadme(addon) {
  const [state, setState] = useState({ status: 'idle' });
  useEffect(() => {
    if (!addon?.readme) { setState({ status: 'none' }); return undefined; }
    let live = true;
    setState({ status: 'loading' });
    fetch(`/api/addons/${encodeURIComponent(addon.key)}/readme`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => live && setState(body?.markdown ? { status: 'ready', ...body } : { status: 'none' }))
      .catch(() => live && setState({ status: 'error' }));
    return () => { live = false; };
  }, [addon?.key, addon?.readme]);
  return state;
}

const Badges = ({ addon, categories }) => (
  <span className={styles.badges}>
    {addon.version && <span className={styles.badge}>v{addon.version}</span>}
    {(addon.categories ?? []).map((c) => <span key={c} className={`${styles.badge} ${styles.category}`}>{categoryName(c, categories)}</span>)}
  </span>
);

function AddonPage({ addon, categories }) {
  const readme = useReadme(addon);
  const html = useMemo(
    () => (readme.status === 'ready' ? renderReadme(readme.markdown, readme.url, { sanitize: (h) => DOMPurify.sanitize(h, { ADD_ATTR: ['target'] }) }) : ''),
    [readme]
  );
  return (
    <article>
      <p><Link to="/addons">← All addons</Link></p>
      <h1>{addon.name}</h1>
      <Badges addon={addon} categories={categories} />
      <dl className={styles.meta}>
        {addon.author && <><dt>Author</dt><dd>{addon.author}</dd></>}
        {addon.license && <><dt>License</dt><dd>{addon.license}</dd></>}
        <dt>Key</dt><dd><code>{addon.key}</code></dd>
        {addon.repositoryUrl && <><dt>Source</dt><dd><a href={addon.repositoryUrl} target="_blank" rel="noopener noreferrer">{addon.repositoryUrl.replace(/^https:\/\//, '')}</a></dd></>}
      </dl>
      <div className={styles.install}>
        <strong>Install it</strong> in your game: <em>Addons → Browse</em>, find <em>{addon.name}</em>, then <em>Install</em>.
        {' '}It's added to that game only; your other games stay as they are.
      </div>
      {readme.status === 'loading' && <p className={styles.muted}>Loading the readme…</p>}
      {readme.status === 'ready' && <div className={styles.readme} dangerouslySetInnerHTML={{ __html: html }} />}
      {(readme.status === 'none' || readme.status === 'error') && (
        <>
          {addon.description && <p>{addon.description}</p>}
          {readme.status === 'error' && <p className={styles.muted}>The readme couldn't be loaded.</p>}
        </>
      )}
    </article>
  );
}

function AddonList({ addons, categories, onOpen }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('name');
  const used = useMemo(() => {
    const keys = new Set(addons.flatMap((a) => a.categories ?? []));
    return [...categories.filter((c) => keys.has(c.key)),
      ...[...keys].filter((k) => !categories.some((c) => c.key === k)).map((key) => ({ key, name: key }))];
  }, [addons, categories]);
  const listed = useMemo(() => browse(addons, { search, category, sort }, categories), [addons, search, category, sort, categories]);

  return (
    <>
      <div className={styles.controls}>
        <input className={styles.search} type="search" placeholder="Search addons…" value={search}
          onChange={(e) => setSearch(e.target.value)} aria-label="Search addons" />
        {used.length > 0 && (
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            <option value="all">All categories</option>
            {used.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
          </select>
        )}
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
          <option value="name">Sort: name</option>
          <option value="category">Sort: category</option>
          <option value="author">Sort: author</option>
        </select>
      </div>
      {listed.length === 0 ? (
        <p className={styles.muted}>No addons match your search.</p>
      ) : (
        <div className={styles.grid}>
          {listed.map((addon) => (
            <button key={addon.key} type="button" className={styles.card} onClick={() => onOpen(addon.key)}>
              <span className={styles.cardTitle}>{addon.name}</span>
              <Badges addon={addon} categories={categories} />
              {addon.description && <span className={styles.description}>{addon.description}</span>}
              {addon.author && <span className={styles.muted}>by {addon.author}</span>}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export default function AddonsPage() {
  const registry = useRegistry();
  const location = useLocation();
  const history = useHistory();
  const key = new URLSearchParams(location.search).get('addon');
  const open = (addonKey) => history.push(`/addons?addon=${encodeURIComponent(addonKey)}`);
  const addon = registry.status === 'ready' && key ? registry.addons.find((a) => a.key === key) : null;

  return (
    <Layout title={addon ? `${addon.name} · Addons` : 'Addons'} description="Addons for NordvikManager: game systems, themes and tools.">
      <main className={`container margin-vert--lg ${styles.page}`}>
        {!key && (
          <>
            <h1>Addons</h1>
            <p>
              Game systems, themes and tools for NordvikManager, from the addon registry. Install them from inside a
              game (<em>Addons → Browse</em>). Want to make one? See the <Link to="/addon-guide">Addon Guide</Link>.
            </p>
          </>
        )}
        {registry.status === 'loading' && <p className={styles.muted}>Loading the addons…</p>}
        {registry.status === 'error' && (
          <p className={styles.muted}>
            The addon list couldn't be loaded ({registry.error}). It comes from this site's server, so it doesn't show
            when the docs run on their own (<code>npm start</code>).
          </p>
        )}
        {registry.status === 'ready' && key && !addon && (
          <p>There is no addon <code>{key}</code>. <Link to="/addons">See all addons</Link>.</p>
        )}
        {addon && <AddonPage addon={addon} categories={registry.categories} />}
        {registry.status === 'ready' && !key && <AddonList addons={registry.addons} categories={registry.categories} onOpen={open} />}
      </main>
    </Layout>
  );
}
