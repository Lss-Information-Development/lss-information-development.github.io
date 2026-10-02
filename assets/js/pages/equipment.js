import { ctx, esc, fmt, num, h, richText, pageHead, updatedPill, loadData, loadUpdated, regionLabel } from '../core.js';
import { createTable, searchBox, normalize } from '../table.js';

const state = { query: '', table: {} };

export default {
    title: () => [ctx.s.sections.equipment, regionLabel()],
    async load() {
        const [eq, updated] = await Promise.all([loadData(ctx.regionKey, 'equipment'), loadUpdated(ctx.regionKey, 'updatedBuildings')]);
        const rows = (Array.isArray(eq) ? eq : Object.values(eq)).filter(Boolean).map(e => ({ ...e, id: String(e.id) }));
        return { rows, updated };
    },
    render(data) {
        const s = ctx.s;
        const filter = () => {
            const n = normalize(state.query);
            return data.rows.filter(e => !n || normalize(`${e.id} ${e.name} ${e.special || ''}`).includes(n));
        };
        const table = createTable({
            state: state.table,
            rows: filter(),
            rowKey: e => e.id,
            columns: [
                { key: 'name', label: s.equipment.cols.name, cls: 'name', cell: e => `${esc(e.name)}<div class="id" style="font:12px var(--font-mono);color:var(--muted)">${esc(e.id)}</div>` },
                { key: 'size', label: s.equipment.cols.size, cls: 'num', value: e => e.size ?? null, cell: e => num(e.size) },
                { key: 'credits', label: s.common.credits, cls: 'num', value: e => e.credits ?? null, cell: e => num(e.credits) },
                { key: 'coins', label: s.common.coins, cls: 'num', value: e => e.coins ?? null, cell: e => num(e.coins) },
            ],
            detail: e => `<div class="dl-block" style="margin-top:14px"><h4>${esc(s.equipment.special)}</h4><p class="note">${e.special ? richText(e.special) : esc(s.common.none)}</p></div>`,
        });
        const count = h('<span class="result-count"></span>');
        const setCount = n => { count.textContent = fmt(s.common.results, { n, total: data.rows.length }); };
        setCount(filter().length);
        const el = h(`<div>${pageHead({ eyebrow: regionLabel(), title: s.sections.equipment, lede: s.sectionDesc.equipment, meta: updatedPill(data.updated) })}<div class="toolbar"></div></div>`);
        el.querySelector('.toolbar').append(
            searchBox({ value: state.query, placeholder: s.common.search, onInput: q => { state.query = q; const r = filter(); table.update(r); setCount(r.length); } }),
            h('<span class="spacer"></span>'), count);
        el.append(table.el);
        return el;
    },
};
