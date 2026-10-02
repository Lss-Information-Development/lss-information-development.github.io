import { ctx, esc, fmt, num, h, pageHead, updatedPill, loadData, loadUpdated, regionLabel, sectionUrl } from '../core.js';
import { createTable, searchBox, normalize } from '../table.js';

const state = { query: '', table: {} };

export default {
    title: () => [ctx.s.sections.events, regionLabel()],
    async load() {
        const [events, missions, updated] = await Promise.all([
            loadData(ctx.regionKey, 'events'),
            loadData(ctx.regionKey, 'missions'),
            loadUpdated(ctx.regionKey),
        ]);
        const names = new Map(missions.map(m => [String(m.id), m.name]));
        const rows = events.filter(Boolean).map(ev => ({
            ...ev,
            id: String(ev.id),
            missions: (ev.mission_type_ids || []).map(id => ({ id: String(id), name: names.get(String(id)) })),
        }));
        return { rows, updated };
    },
    render(data) {
        const s = ctx.s;
        const missionUrl = sectionUrl(ctx.regionKey, 'missions');
        const filter = () => {
            const n = normalize(state.query);
            return data.rows.filter(ev => !n || normalize(`${ev.id} ${ev.caption} ${ev.missions.map(m => m.name).join(' ')}`).includes(n));
        };
        const table = createTable({
            state: state.table,
            rows: filter(),
            rowKey: ev => ev.id,
            columns: [
                { key: 'id', label: s.common.id, cls: 'id', value: ev => Number(ev.id), cell: ev => esc(ev.id) },
                { key: 'caption', label: s.events.cols.name, cls: 'name', cell: ev => esc(ev.caption) },
                { key: 'count', label: s.events.cols.missions, cls: 'num', value: ev => ev.missions.length, cell: ev => num(ev.missions.length) },
            ],
            detail: ev => `<div class="dl-block" style="margin-top:14px"><h4>${esc(s.events.missionsIn)} · ${ev.missions.length}</h4><div class="chips">${
                ev.missions.map(m => `<a class="chip" href="${missionUrl}#q=${encodeURIComponent(m.id)}"><b>${esc(m.id)}</b>${esc(m.name ?? '')}</a>`).join('')}</div></div>`,
        });
        const count = h('<span class="result-count"></span>');
        const setCount = n => { count.textContent = fmt(s.common.results, { n, total: data.rows.length }); };
        setCount(filter().length);
        const el = h(`<div>${pageHead({ eyebrow: regionLabel(), title: s.sections.events, lede: s.sectionDesc.events, meta: updatedPill(data.updated) })}<div class="toolbar"></div></div>`);
        el.querySelector('.toolbar').append(
            searchBox({ value: state.query, placeholder: s.common.search, onInput: q => { state.query = q; const r = filter(); table.update(r); setCount(r.length); } }),
            h('<span class="spacer"></span>'), count);
        el.append(table.el);
        return el;
    },
};
