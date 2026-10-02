// Kern: taal, thema, data laden, hulpfuncties en de vaste paginaschil (topbar, regiobalk, footer).
import { REGIONS, SECTIONS, DATA, UI_LANGS, START_YEAR } from './config.js';
import { STRINGS, LOCALES } from './i18n.js';
import { icon } from './icons.js';

const body = document.body;
const ROOT = body.dataset.root || './';
const PAGE = body.dataset.page;
const REGION_KEY = body.dataset.region || null;

// ---------- opslag (kan geblokkeerd zijn: altijd in try/catch) ----------
const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* negeren */ } },
};

// ---------- context ----------
function initialLang() {
    const saved = store.get('lss.lang');
    if (UI_LANGS.includes(saved)) return saved;
    if (REGION_KEY) return REGIONS[REGION_KEY].lang;
    const nav = (navigator.language || 'nl').slice(0, 2);
    return UI_LANGS.includes(nav) ? nav : 'en';
}

export const ctx = {
    root: ROOT,
    page: PAGE,
    regionKey: REGION_KEY,
    region: REGION_KEY ? REGIONS[REGION_KEY] : null,
    lang: initialLang(),
    get s() { return STRINGS[this.lang]; },
    get locale() { return LOCALES[this.lang]; },
};

// ---------- hulpfuncties ----------

export function fmt(str, vars = {}) {
    return String(str).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
}

export function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
}

// Laat alleen eenvoudige opmaak-tags uit de brondata toe (zonder attributen)
const SAFE_TAGS = ['b', 'strong', 'i', 'em', 'code', 'sub', 'sup', 'br', 'u'];
export function richText(value) {
    let out = esc(value);
    for (const tag of SAFE_TAGS) {
        out = out.replace(new RegExp(`&lt;(/?)${tag}\\s*/?&gt;`, 'gi'), `<$1${tag}>`);
    }
    return out;
}

export function num(value) {
    if (value === null || value === undefined || value === '') return '–';
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString(ctx.locale) : esc(value);
}

export function dateTime(date) {
    return date.toLocaleString(ctx.locale, { dateStyle: 'medium', timeStyle: 'short' });
}

// Alleen echte kleurcodes uit de data doorlaten (gebruikt in style-attributen)
export function safeColor(value) {
    return /^#[0-9a-f]{3,8}$/i.test(String(value || '')) ? value : null;
}

export function humanize(key) {
    const s = String(key).replace(/_/g, ' ').trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export function h(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html.trim();
    return tpl.content.firstElementChild;
}

export function url(path) { return ROOT + path; }

export function sectionUrl(regionKey, page) {
    const r = REGIONS[regionKey];
    const sec = SECTIONS.find(s => s.page === page);
    const file = page === 'region' || !sec ? r.index : sec.file;
    return url(`gameversions/${regionKey}/${file}`);
}

export function availableSections(regionKey) {
    const r = REGIONS[regionKey];
    return SECTIONS.filter(s => !s.only || s.only(r));
}

// ---------- data ----------

const cache = new Map();
function fetchCached(path, as) {
    const key = `${as}:${path}`;
    if (!cache.has(key)) {
        const p = fetch(url(path)).then(res => {
            if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
            return as === 'json' ? res.json() : res.text();
        }).catch(e => { cache.delete(key); throw e; });
        cache.set(key, p);
    }
    return cache.get(key);
}

export function dataPath(regionKey, file) {
    return `gameversions/${regionKey}/${regionKey}-Data/${file}`;
}

export function loadData(regionKey, name) {
    const r = REGIONS[regionKey];
    const file = name === 'vehicles' ? r.files.vehicles : DATA[name];
    return fetchCached(dataPath(regionKey, file), 'json');
}

export async function loadUpdated(regionKey, which = 'updated') {
    try {
        const text = await fetchCached(dataPath(regionKey, DATA[which]), 'text');
        const d = new Date(text.trim());
        return isNaN(d) ? null : d;
    } catch {
        return null;
    }
}

export async function loadMissionTranslations(regionKey) {
    const r = REGIONS[regionKey];
    if (!r.translations) return {};
    try { return await fetchCached(`gameversions/${regionKey}/${r.translations}`, 'json'); } catch { return {}; }
}

// ---------- thema & taal ----------

function currentTheme() {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    store.set('lss.theme', theme);
}

const listeners = [];
export function onLangChange(fn) { listeners.push(fn); }

function setLang(lang) {
    if (lang === ctx.lang) return;
    ctx.lang = lang;
    store.set('lss.lang', lang);
    renderShell();
    listeners.forEach(fn => fn());
}

// ---------- toast ----------

export function toast(text) {
    document.querySelector('.toast')?.remove();
    const el = h(`<div class="toast" role="status">${esc(text)}</div>`);
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
}

// ---------- paginaschil ----------

const BRAND_MARK = `
<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
  <rect x="1" y="1" width="30" height="30" rx="9" fill="none" stroke="currentColor" stroke-opacity=".18"/>
  <path d="M9 21a7 7 0 0 1 14 0" fill="none" stroke="var(--red)" stroke-width="2.4" stroke-linecap="round"/>
  <rect x="7" y="21" width="18" height="4" rx="1.5" fill="currentColor"/>
  <path d="M16 6v3M8.5 9.5l2 2M23.5 9.5l-2 2" stroke="var(--blue)" stroke-width="2.2" stroke-linecap="round"/>
</svg>`;

function topbarHtml() {
    const s = ctx.s;
    const navItems = [
        ['home', 'index.html', PAGE === 'home'],
        ['versions', 'gameversions/gameversionsinfo.html', PAGE === 'versions' || !!REGION_KEY],
        ['contact', 'gameversions/contact.html', PAGE === 'contact'],
    ];
    const theme = currentTheme();
    return `
<a class="skip-link" href="#main">${esc(s.skip)}</a>
<header class="topbar">
  <div class="lightbar" aria-hidden="true"></div>
  <div class="container topbar-inner">
    <a class="brand" href="${url('index.html')}">${BRAND_MARK}<span>LSS <b>Information</b></span></a>
    <nav class="mainnav" id="mainnav" aria-label="Hoofdmenu">
      ${navItems.map(([k, href, cur]) => `<a href="${url(href)}"${cur ? ' aria-current="page"' : ''}>${esc(s.nav[k])}</a>`).join('')}
    </nav>
    <div class="topbar-actions">
      <div class="segmented" role="group" aria-label="${esc(s.language)}">
        ${UI_LANGS.map(l => `<button type="button" data-lang="${l}" aria-pressed="${l === ctx.lang}" lang="${l}">${l.toUpperCase()}</button>`).join('')}
      </div>
      <button type="button" class="icon-btn" data-theme-toggle title="${esc(theme === 'dark' ? s.theme.toLight : s.theme.toDark)}" aria-label="${esc(theme === 'dark' ? s.theme.toLight : s.theme.toDark)}">
        ${icon(theme === 'dark' ? 'sun' : 'moon')}
      </button>
      <button type="button" class="icon-btn menu-btn" data-menu aria-controls="mainnav" aria-expanded="false" aria-label="${esc(s.menu)}">${icon('menu')}</button>
    </div>
  </div>
</header>`;
}

function regionbarHtml() {
    if (!REGION_KEY) return '';
    const s = ctx.s;
    const r = ctx.region;
    const tabs = availableSections(REGION_KEY).map(sec =>
        `<a href="${sectionUrl(REGION_KEY, sec.page)}"${sec.page === PAGE ? ' aria-current="page"' : ''}>${icon(sec.icon)}${esc(s.sections[sec.page])}</a>`
    ).join('');
    const options = Object.entries(REGIONS).map(([k, reg]) =>
        `<option value="${k}"${k === REGION_KEY ? ' selected' : ''}>${esc(reg.game)} (${reg.code})</option>`
    ).join('');
    return `
<div class="regionbar">
  <div class="container regionbar-inner">
    <div class="region-id">
      <div style="display:flex;align-items:center;gap:12px">
        <img class="flag" src="${url(r.flag)}" alt="">
        <div><span class="eyebrow">${esc(s.region.eyebrow)} · ${r.code}</span><strong>${esc(r.game)}</strong></div>
      </div>
      <label class="sr-only" for="region-switch">${esc(s.region.switch)}</label>
      <select class="region-select" id="region-switch">${options}</select>
    </div>
    <nav class="tabs" aria-label="${esc(s.sections.region)}">${tabs}</nav>
  </div>
</div>`;
}

function footerHtml() {
    const s = ctx.s;
    const year = new Date().getFullYear();
    const years = year === START_YEAR ? `${year}` : `${START_YEAR} – ${year}`;
    return `
<footer class="site-footer">
  <div class="container">
    <div>${esc(fmt(s.footer.rights, { years }))}<br>${esc(s.footer.notice)}</div>
    <div>${esc(s.footer.data)} · <a href="${url('gameversions/contact.html')}">${esc(s.nav.contact)}</a></div>
  </div>
</footer>`;
}

let shellBuilt = false;
export const mainEl = document.createElement('main');
mainEl.id = 'main';
mainEl.className = 'container';
mainEl.tabIndex = -1;

export function renderShell() {
    document.documentElement.lang = ctx.lang;
    const top = h(`<div id="shell-top">${topbarHtml()}${regionbarHtml()}</div>`);
    const foot = h(`<div id="shell-foot">${footerHtml()}</div>`);
    if (!shellBuilt) {
        document.body.prepend(top);
        document.body.append(mainEl, foot);
        shellBuilt = true;
    } else {
        document.getElementById('shell-top').replaceWith(top);
        document.getElementById('shell-foot').replaceWith(foot);
    }

    top.querySelectorAll('[data-lang]').forEach(btn =>
        btn.addEventListener('click', () => setLang(btn.dataset.lang)));
    top.querySelector('[data-theme-toggle]').addEventListener('click', () => {
        setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
        renderShell();
    });
    const menuBtn = top.querySelector('[data-menu]');
    menuBtn.addEventListener('click', () => {
        const nav = top.querySelector('#mainnav');
        const open = nav.classList.toggle('open');
        menuBtn.setAttribute('aria-expanded', String(open));
    });
    top.querySelector('#region-switch')?.addEventListener('change', e => {
        // zelfde sectie in de andere regio (als die bestaat), zoekopdracht via hash niet meenemen
        const target = e.target.value;
        const page = availableSections(target).some(sec => sec.page === PAGE) ? PAGE : 'region';
        location.href = sectionUrl(target, page);
    });
}

// ---------- vaste blokken ----------

export function pageHead({ eyebrow, title, lede, meta = '' }) {
    return `
<section class="page-head">
  <div>
    ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
    <h1>${esc(title)}</h1>
    ${lede ? `<p class="lede">${esc(lede)}</p>` : ''}
  </div>
  ${meta ? `<div class="page-meta">${meta}</div>` : ''}
</section>`;
}

export function updatedPill(date) {
    const s = ctx.s.common;
    return date
        ? `<span class="pill"><span class="dot"></span>${esc(fmt(s.updated, { date: dateTime(date) }))}</span>`
        : `<span class="pill warn"><span class="dot"></span>${esc(s.updatedUnknown)}</span>`;
}

export function skeleton(rows = 8) {
    return `<div class="card table-card" aria-busy="true"><span class="sr-only">${esc(ctx.s.common.loading)}</span>
      <div class="skeleton">${'<div></div>'.repeat(rows)}</div></div>`;
}

export function errorBox(onRetry) {
    const el = h(`<div class="alert" role="alert">${icon('alert')}
      <div><p style="margin:0 0 10px">${esc(ctx.s.common.loadError)}</p>
      <button type="button" class="btn">${esc(ctx.s.common.retry)}</button></div></div>`);
    el.querySelector('button').addEventListener('click', onRetry);
    return el;
}

export function setTitle(...parts) {
    document.title = [...parts.filter(Boolean), 'LSS Information'].join(' · ');
}

export function regionLabel() {
    return ctx.region ? `${ctx.region.game} · ${ctx.region.code}` : '';
}

// hash-parameters (#q=...) voor deep links vanuit andere pagina's
export function hashParams() {
    return new URLSearchParams(location.hash.slice(1));
}
