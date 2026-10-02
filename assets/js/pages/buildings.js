import { ctx, esc, num, h, richText, safeColor, pageHead, updatedPill, loadData, loadUpdated, regionLabel, hashParams, sectionUrl } from '../core.js';
import { createTable, searchBox, normalize } from '../table.js';

const state = { query: hashParams().get('q') || '', table: {} };

function vehicleIndex(vehicles) {
    // gebouw-ID -> voertuigen die daar geplaatst kunnen worden
    const map = new Map();
    for (const [id, v] of Object.entries(vehicles)) {
        for (const b of (v.possibleBuildings || []).map(Number)) {
            if (!map.has(b)) map.set(b, []);
            map.get(b).push({ id, ...v });
        }
    }
    return map;
}

function kv(pairs) {
    const rows = pairs.filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length));
    if (!rows.length) return '';
    return `<dl class="kv">${rows.map(([k, v, cls]) => `<dt>${esc(k)}</dt><dd${cls ? ` class="${cls}"` : ''}>${v}</dd>`).join('')}</dl>`;
}

function detail(b, vehicles, byBuilding) {
    const s = ctx.s.buildings;
    const c = ctx.s.common;
    const vehUrl = sectionUrl(ctx.regionKey, 'vehicles');
    const blocks = [];

    blocks.push(`<div class="dl-block"><h4>${esc(s.general)}</h4>${kv([
        [c.credits, num(b.credits)],
        [c.coins, num(b.coins)],
        [s.maxLevel, b.maxLevel != null ? num(b.maxLevel) : null],
        [s.startPersonnel, b.startPersonnel != null ? num(b.startPersonnel) : null],
        [s.parkingLots, b.startParkingLots != null ? num(b.startParkingLots) : null],
        [s.beds, b.startBeds != null ? num(b.startBeds) : null],
        [s.cells, b.startCells != null ? num(b.startCells) : null],
        [s.classrooms, b.startClassrooms != null ? num(b.startClassrooms) : null],
        [s.maxBuildings, b.maxBuildings != null ? esc(b.maxBuildings) : null, 'text'],
    ])}</div>`);

    if (b.startVehicles?.length) {
        blocks.push(`<div class="dl-block"><h4>${esc(s.startVehicles)}</h4><div class="chips">${b.startVehicles.map(v => `<span class="chip">${esc(v)}</span>`).join('')}</div></div>`);
    }
    if (b.special) {
        blocks.push(`<div class="dl-block"><h4>${esc(s.special)}</h4><p class="note">${richText(b.special)}</p></div>`);
    }

    const exts = (b.extensions || []).filter(Boolean);
    if (exts.length) {
        blocks.push(`<div class="dl-block wide"><h4>${esc(s.extensions)} · ${exts.length}</h4><div class="sub-cards">${exts.map(ext => {
            const req = (ext.requiredExtensions || []).map(i => b.extensions[i]?.caption ?? i);
            const unlocks = (ext.unlocksVehicleTypes || []).map(id => vehicles[id]?.caption ?? id);
            return `<div class="sub-card"><h5>${esc(ext.caption)}</h5>${kv([
                [c.credits, num(ext.credits)],
                [c.coins, num(ext.coins)],
                [s.duration, ext.duration != null ? esc(ext.duration) : null, 'text'],
                [s.required, req.length ? esc(req.join(', ')) : null, 'text'],
                [s.unlocks, unlocks.length ? esc(unlocks.join(', ')) : null, 'text'],
            ])}</div>`;
        }).join('')}</div></div>`);
    }

    const vs = byBuilding.get(Number(b.id)) || [];
    if (vs.length) {
        blocks.push(`<div class="dl-block wide"><h4>${esc(s.vehicles)} · ${vs.length}</h4><div class="chips">${vs.map(v =>
            `<a class="chip" href="${vehUrl}#q=${encodeURIComponent(v.caption)}">${esc(v.caption)} <b>${num(v.credits)}</b></a>`).join('')}</div></div>`);
    }

    const storage = Object.values(b.storageUpgrades || {});
    if (storage.length) {
        blocks.push(`<div class="dl-block wide"><h4>${esc(s.storage)} · ${storage.length}</h4><div class="sub-cards">${storage.map(st => {
            const req = (st.requiredStorageUpgrades || []).map(k => b.storageUpgrades[k]?.caption ?? k);
            return `<div class="sub-card"><h5>${esc(st.caption)}</h5>${kv([
                [c.credits, num(st.credits)],
                [c.coins, num(st.coins)],
                [s.duration, st.duration != null ? esc(st.duration) : null, 'text'],
                [s.extraStorage, num(st.additionalStorage)],
                [s.required, req.length ? esc(req.join(', ')) : null, 'text'],
            ])}</div>`;
        }).join('')}</div></div>`);
    }
    return `<div class="dl-grid">${blocks.join('')}</div>`;
}

export default {
    title: () => [ctx.s.sections.buildings, regionLabel()],
    async load() {
        const [buildings, vehicles, updated] = await Promise.all([
            loadData(ctx.regionKey, 'buildings'),
            loadData(ctx.regionKey, 'vehicles'),
            loadUpdated(ctx.regionKey, 'updatedBuildings'),
        ]);
        const byBuilding = vehicleIndex(vehicles);
        const rows = Object.entries(buildings).map(([id, b]) => ({
            ...b, id,
            extCount: (b.extensions || []).filter(Boolean).length,
            vehCount: (byBuilding.get(Number(id)) || []).length,
        }));
        return { rows, vehicles, byBuilding, updated };
    },
    render(data) {
        const s = ctx.s;
        const cols = s.buildings.cols;
        const filter = q => {
            const n = normalize(q);
            return data.rows.filter(b => !n || normalize(`${b.id} ${b.caption}`).includes(n));
        };
        const table = createTable({
            state: state.table,
            rows: filter(state.query),
            rowKey: b => b.id,
            columns: [
                { key: 'id', label: s.common.id, cls: 'id', value: b => Number(b.id), cell: b => esc(b.id) },
                { key: 'caption', label: cols.name, cls: 'name', cell: b => `${safeColor(b.color) ? `<span class="swatch" style="background:${safeColor(b.color)}"></span>` : ''}${esc(b.caption)}` },
                { key: 'credits', label: cols.credits, cls: 'num', value: b => Number(b.credits) || null, cell: b => num(b.credits) },
                { key: 'coins', label: cols.coins, cls: 'num', value: b => Number(b.coins) || null, cell: b => num(b.coins) },
                { key: 'extCount', label: cols.ext, cls: 'num', cell: b => num(b.extCount) },
                { key: 'vehCount', label: cols.veh, cls: 'num', cell: b => num(b.vehCount) },
            ],
            detail: b => detail(b, data.vehicles, data.byBuilding),
        });
        const count = h(`<span class="result-count"></span>`);
        const setCount = rows => { count.textContent = s.common.results.replace('{n}', rows.length).replace('{total}', data.rows.length); };
        setCount(filter(state.query));

        const el = h(`<div>${pageHead({
            eyebrow: regionLabel(), title: s.sections.buildings, lede: s.sectionDesc.buildings,
            meta: updatedPill(data.updated),
        })}<div class="toolbar"></div></div>`);
        const toolbar = el.querySelector('.toolbar');
        toolbar.append(searchBox({
            value: state.query, placeholder: s.common.search,
            onInput: q => { state.query = q; const rows = filter(q); table.update(rows); setCount(rows); },
        }), h('<span class="spacer"></span>'), count);
        el.append(table.el);
        return el;
    },
};
