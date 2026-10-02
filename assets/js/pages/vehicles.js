import { ctx, esc, num, h, richText, safeColor, pageHead, updatedPill, loadData, loadUpdated, regionLabel, hashParams, sectionUrl } from '../core.js';
import { createTable, searchBox, normalize } from '../table.js';

const state = { query: hashParams().get('q') || '', building: '', table: {} };

function kv(pairs) {
    const rows = pairs.filter(([, v]) => v !== undefined && v !== null && v !== '');
    if (!rows.length) return '';
    return `<dl class="kv">${rows.map(([k, v, cls]) => `<dt>${esc(k)}</dt><dd${cls ? ` class="${cls}"` : ''}>${v}</dd>`).join('')}</dl>`;
}

function trainings(schooling) {
    // { afdeling: { opleiding: { all: true } | { min: n } } }
    const out = [];
    for (const [dept, list] of Object.entries(schooling || {})) {
        for (const [name, rule] of Object.entries(list || {})) {
            const extra = rule?.all ? '' : rule?.min != null ? ` (min. ${rule.min})` : '';
            out.push({ dept, name: name + extra });
        }
    }
    return out;
}

function detail(v, vehicles, buildings) {
    const s = ctx.s.vehicles;
    const c = ctx.s.common;
    const blocks = [];
    const yes = ctx.s.common.yes;

    const specs = kv([
        [c.credits, num(v.credits)],
        [c.coins, num(v.coins)],
        [c.staff, `${num(v.staff?.min ?? v.minPersonnel)} – ${num(v.staff?.max ?? v.maxPersonnel)}`],
        [s.waterTank, v.waterTank != null ? `${num(v.waterTank)} l` : null],
        [s.foamTank, v.foamTank != null ? `${num(v.foamTank)} l` : null],
        [s.waterBonus, v.waterBonus != null ? `${num(v.waterBonus)} %` : null],
        [s.pumpCapacity, v.pumpCapacity != null ? `${num(v.pumpCapacity)} l/min` : null],
        [s.equipmentCapacity, v.equipmentCapacity != null ? num(v.equipmentCapacity) : null],
        [s.trailer, v.isTrailer ? yes : null, 'text'],
    ]);
    blocks.push(`<div class="dl-block"><h4>${esc(s.specs)}</h4>${specs}</div>`);

    const tr = trainings(v.schooling);
    if (tr.length) {
        blocks.push(`<div class="dl-block"><h4>${esc(s.training)}</h4><div class="chips">${tr.map(t =>
            `<span class="chip" title="${esc(t.dept)}">${esc(t.name)}</span>`).join('')}</div></div>`);
    }
    if (v.special) blocks.push(`<div class="dl-block"><h4>${esc(s.special)}</h4><p class="note">${richText(v.special)}</p></div>`);

    const bUrl = sectionUrl(ctx.regionKey, 'buildings');
    const pb = (v.possibleBuildings || []).map(Number);
    if (pb.length) {
        blocks.push(`<div class="dl-block"><h4>${esc(s.buildings)}</h4><div class="chips">${pb.map(id =>
            `<a class="chip" href="${bUrl}#q=${encodeURIComponent(buildings[id]?.caption ?? id)}">${esc(buildings[id]?.caption ?? id)}</a>`).join('')}</div></div>`);
    }
    const tv = (v.tractiveVehicles || []).map(id => vehicles[id]?.caption ?? id);
    if (tv.length) {
        blocks.push(`<div class="dl-block"><h4>${esc(s.tractive)}</h4><div class="chips">${tv.map(n => `<span class="chip">${esc(n)}</span>`).join('')}</div></div>`);
    }
    return `<div class="dl-grid">${blocks.join('')}</div>`;
}

export default {
    title: () => [ctx.s.sections.vehicles, regionLabel()],
    async load() {
        const [vehicles, buildings, updated] = await Promise.all([
            loadData(ctx.regionKey, 'vehicles'),
            loadData(ctx.regionKey, 'buildings'),
            loadUpdated(ctx.regionKey, 'updatedBuildings'),
        ]);
        const rows = Object.entries(vehicles).map(([id, v]) => {
            const pb = (v.possibleBuildings || []).map(Number);
            return { ...v, id, pb, buildingNames: pb.map(b => buildings[b]?.caption ?? b).join(', ') };
        });
        return { rows, vehicles, buildings, updated };
    },
    render(data) {
        const s = ctx.s;
        const cols = s.vehicles.cols;
        const filter = () => {
            const n = normalize(state.query);
            return data.rows.filter(v =>
                (!state.building || v.pb.includes(Number(state.building))) &&
                (!n || normalize(`${v.id} ${v.caption} ${v.buildingNames}`).includes(n)));
        };
        const table = createTable({
            state: state.table,
            rows: filter(),
            rowKey: v => v.id,
            columns: [
                { key: 'id', label: s.common.id, cls: 'id', value: v => Number(v.id), cell: v => esc(v.id) },
                { key: 'caption', label: cols.name, cls: 'name', cell: v => `${safeColor(v.color) ? `<span class="swatch" style="background:${safeColor(v.color)}"></span>` : ''}${esc(v.caption)}` },
                { key: 'credits', label: s.common.credits, cls: 'num', value: v => Number(v.credits) || null, cell: v => num(v.credits) },
                { key: 'coins', label: s.common.coins, cls: 'num', value: v => Number(v.coins) || null, cell: v => num(v.coins) },
                { key: 'staff', label: cols.staff, cls: 'num', value: v => v.staff?.max ?? v.maxPersonnel ?? null, cell: v => `${num(v.staff?.min ?? v.minPersonnel)}–${num(v.staff?.max ?? v.maxPersonnel)}` },
                { key: 'buildingNames', label: cols.buildings, cls: 'wrap', cell: v => esc(v.buildingNames) },
            ],
            detail: v => detail(v, data.vehicles, data.buildings),
        });

        const count = h('<span class="result-count"></span>');
        const refresh = () => {
            const rows = filter();
            table.update(rows);
            count.textContent = s.common.results.replace('{n}', rows.length).replace('{total}', data.rows.length);
        };
        count.textContent = s.common.results.replace('{n}', filter().length).replace('{total}', data.rows.length);

        const select = h(`<select class="select" aria-label="${esc(cols.buildings)}"><option value="">${esc(s.vehicles.allBuildings)}</option>${
            Object.entries(data.buildings).map(([id, b]) => `<option value="${esc(id)}"${String(state.building) === id ? ' selected' : ''}>${esc(b.caption)}</option>`).join('')}</select>`);
        select.addEventListener('change', () => { state.building = select.value; refresh(); });

        const el = h(`<div>${pageHead({
            eyebrow: regionLabel(), title: s.sections.vehicles, lede: s.sectionDesc.vehicles, meta: updatedPill(data.updated),
        })}<div class="toolbar"></div></div>`);
        el.querySelector('.toolbar').append(
            searchBox({ value: state.query, placeholder: s.common.search, onInput: q => { state.query = q; refresh(); } }),
            select, h('<span class="spacer"></span>'), count,
        );
        el.append(table.el);
        return el;
    },
};
