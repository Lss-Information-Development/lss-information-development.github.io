import { ctx, esc, fmt, h, pageHead, updatedPill, loadData, loadUpdated, regionLabel } from '../core.js';
import { createTable, searchBox, normalize } from '../table.js';

const state = { query: '', table: {} };

export default {
    title: () => [ctx.s.sections.pois, regionLabel()],
    async load() {
        const [pois, updated] = await Promise.all([loadData(ctx.regionKey, 'pois'), loadUpdated(ctx.regionKey, 'updatedBuildings')]);
        // lijst (index = ID) of object { id: naam }
        const rows = Object.entries(pois).map(([id, name]) => ({ id, name }));
        return { rows, updated };
    },
    render(data) {
        const s = ctx.s;
        const filter = () => {
            const n = normalize(state.query);
            return data.rows.filter(p => !n || normalize(`${p.id} ${p.name}`).includes(n));
        };
        const table = createTable({
            state: state.table,
            rows: filter(),
            rowKey: p => p.id,
            columns: [
                { key: 'id', label: s.common.id, cls: 'id', value: p => Number(p.id), cell: p => esc(p.id) },
                { key: 'name', label: s.pois.cols.name, cls: 'name', cell: p => esc(p.name) },
            ],
        });
        const count = h('<span class="result-count"></span>');
        const setCount = n => { count.textContent = fmt(s.common.results, { n, total: data.rows.length }); };
        setCount(filter().length);
        const el = h(`<div>${pageHead({ eyebrow: regionLabel(), title: s.sections.pois, lede: s.sectionDesc.pois, meta: updatedPill(data.updated) })}<div class="toolbar"></div></div>`);
        el.querySelector('.toolbar').append(
            searchBox({ value: state.query, placeholder: s.common.search, onInput: q => { state.query = q; const r = filter(); table.update(r); setCount(r.length); } }),
            h('<span class="spacer"></span>'), count);
        el.append(table.el);
        return el;
    },
};
