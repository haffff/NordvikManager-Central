'use strict';

// NordvikManager landing page. Everything here enhances a page that already works without
// it: the slider track scrolls on its own, and Download links to GitHub's releases page.
// Loaded from a file (the site's CSP allows no inline scripts or on* attributes).

document.documentElement.classList.add('js');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const scrollBehavior = () => (reducedMotion.matches ? 'auto' : 'smooth');

document.addEventListener('DOMContentLoaded', () => {
  setUpNav();
  setUpReveal();
  document.querySelectorAll('[data-slider]').forEach(setUpSlider);
  setUpDownload();
});

// ---------- Mobile menu ----------

function setUpNav() {
  const toggle = document.querySelector('.bar__toggle');
  const nav = document.getElementById('nav');
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
  };
  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
}

// ---------- Reveal on scroll ----------

function setUpReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -10% 0px' });
  items.forEach((el) => observer.observe(el));
}

// ---------- Feature slider ----------

function setUpSlider(root) {
  const track = root.querySelector('.slider__track');
  const slides = [...track.querySelectorAll('.slide')];
  const tabsBox = root.querySelector('.slider__tabs');
  const prev = root.querySelector('[data-prev]');
  const next = root.querySelector('[data-next]');
  const current = root.querySelector('[data-current]');
  const total = root.querySelector('[data-total]');
  const pad = (n) => String(n).padStart(2, '0');
  let index = 0;

  const tabs = slides.map((slide, i) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'slider__tab';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', slide.id);
    tab.innerHTML = `<span>${pad(i + 1)}</span>${slide.dataset.title}`;
    tab.addEventListener('click', () => go(i));
    tabsBox.appendChild(tab);
    return tab;
  });
  total.textContent = pad(slides.length);

  function show(i) {
    index = i;
    tabs.forEach((tab, t) => {
      tab.setAttribute('aria-selected', String(t === i));
      tab.tabIndex = t === i ? 0 : -1;
    });
    slides.forEach((slide, s) => slide.setAttribute('aria-hidden', String(s !== i)));
    current.textContent = pad(i + 1);
    prev.disabled = i === 0;
    next.disabled = i === slides.length - 1;
  }

  function go(i) {
    const target = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo({ left: slides[target].offsetLeft - track.offsetLeft, behavior: scrollBehavior() });
    show(target);
  }

  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));

  // Arrow keys only while the slider has focus, so they never hijack the page
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); focusTabIfOnTabs(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); focusTabIfOnTabs(); }
  });
  function focusTabIfOnTabs() {
    if (tabsBox.contains(document.activeElement)) tabs[index].focus();
  }

  // Swipes and trackpad scrolls snap natively; keep the tabs in step with what's shown
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) show(slides.indexOf(entry.target));
    }
  }, { root: track, threshold: 0.6 });
  slides.forEach((slide) => observer.observe(slide));

  show(0);
}

// ---------- Download ----------

const PLATFORM_NAMES = { windows: 'Windows', linux: 'Linux', macos: 'macOS' };

/** The visitor's platform and arch, or null where we have no build to offer (phones, Macs). */
function detectPlatform() {
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return null;
  const hint = navigator.userAgentData?.platform || ua;
  const arm = /arm|aarch64/i.test(ua);
  if (/Win/i.test(hint)) return { platform: 'windows', arch: arm ? 'arm64' : 'x64' };
  if (/Linux|X11/i.test(hint) && !/CrOS/i.test(ua)) return { platform: 'linux', arch: arm ? 'arm64' : 'x64' };
  return null;
}

const formatSize = (bytes) => `${Math.round(bytes / (1024 * 1024))} MB`;
const assetLabel = (a) => `${PLATFORM_NAMES[a.platform] ?? a.platform} ${a.arch}`;

async function setUpDownload() {
  const box = document.querySelector('[data-download]');
  if (!box) return;

  let release;
  try {
    const response = await fetch('/api/releases/latest');
    if (!response.ok) return; // the static GitHub link stays
    release = await response.json();
  } catch {
    return;
  }
  if (!release.assets?.length) return;

  const date = new Date(release.date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  const releaseLine = box.querySelector('[data-release]');
  releaseLine.textContent = `${release.prerelease ? 'Dev build' : 'Version'} ${release.version}`;
  const small = document.createElement('small');
  small.textContent = release.prerelease
    ? `Released ${date}. A development build: newest features, rough edges.`
    : `Released ${date}.`;
  releaseLine.appendChild(small);

  const detected = detectPlatform();
  const match = detected && (
    release.assets.find((a) => a.platform === detected.platform && a.arch === detected.arch)
    ?? release.assets.find((a) => a.platform === detected.platform && a.arch === 'x64'));

  if (match) {
    const primary = box.querySelector('[data-primary]');
    const button = document.createElement('a');
    button.className = 'btn btn--primary';
    button.href = match.url;
    button.textContent = `Download for ${assetLabel(match)}`;
    const size = document.createElement('span');
    size.className = 'muted';
    size.textContent = `${formatSize(match.size)} zip`;
    primary.append(button, size);
    primary.hidden = false;
  }

  const list = box.querySelector('[data-assets]');
  for (const asset of release.assets) {
    if (asset === match) continue;
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = asset.url;
    const label = document.createElement('span');
    label.textContent = assetLabel(asset);
    const size = document.createElement('span');
    size.className = 'size';
    size.textContent = formatSize(asset.size);
    link.append(label, size);
    item.appendChild(link);
    list.appendChild(item);
  }
  list.hidden = !list.children.length;

  const notes = box.querySelector('[data-all-releases]');
  notes.href = release.url;
  notes.textContent = 'Release notes on GitHub';
}
