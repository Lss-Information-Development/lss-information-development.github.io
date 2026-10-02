import { ctx, esc, fmt, h, pageHead, updatedPill, sectionUrl, availableSections, loadData, loadUpdated, regionLabel } from '../core.js';
import { icon } from '../icons.js';

function countOf(data) {
    if (!data) return null;
    return Array.isArray(data) ? data.filter(Boolean).length : Object.keys(data).length;
}

const SMALL = ['buildings', 'vehicles', 'pois', 'events', 'equipment'];

export default {
    title: () => [ctx.s.sections.region, regionLabel()],
    async load() {
        const k = ctx.regionKey;
        const sections = availableSections(k).map(sec => sec.page);
        const counts = {};
        await Promise.all(SMALL.filter(p => sections.includes(p)).map(async p => {
            try { counts[p] = countOf(await loadData(k, p)); } catch { counts[p] = null; }
        }));
        return { counts, updated: await loadUpdated(k) };
    },
    render(data) {
        const s = ctx.s;
        const r = ctx.region;
        const tiles = availableSections(ctx.regionKey).filter(sec => sec.page !== 'region').map(sec => `
  <a class="card tile" href="${sectionUrl(ctx.regionKey, sec.page)}">
    <div class="ico">${icon(sec.icon)}</div>
    <div class="count" data-count="${sec.page}">${data.counts[sec.page]?.toLocaleString(ctx.locale) ?? '–'}</div>
    <h3>${esc(s.sections[sec.page])}</h3>
    <p>${esc(s.sectionDesc[sec.page])}</p>
  </a>`).join('');
        const el = h(`<div>
${pageHead({
    eyebrow: `${s.region.eyebrow} · ${r.code}`,
    title: r.game,
    lede: fmt(s.region.lede, { game: r.game, code: r.code }),
    meta: `${updatedPill(data.updated)}<a class="pill" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(s.version.play)} ${icon('external')}</a>`,
})}
<div class="grid grid-3">${tiles}</div>
</div>`);
        el.querySelectorAll('.pill svg').forEach(svg => { svg.style.width = '13px'; svg.style.height = '13px'; });
        // meldingen-aantal apart (groot bestand) zodat de pagina direct zichtbaar is
        loadData(ctx.regionKey, 'missions').then(m => {
            const c = el.querySelector('[data-count="missions"]');
            if (c) c.textContent = m.length.toLocaleString(ctx.locale);
        }).catch(() => {});
        return el;
    },
};
