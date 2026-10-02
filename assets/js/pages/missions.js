import { ctx, esc, fmt, num, h, humanize, dateTime, pageHead, updatedPill, loadData, loadUpdated, loadMissionTranslations, regionLabel, hashParams, toast } from '../core.js';
import { createTable, searchBox, normalize } from '../table.js';
import { icon } from '../icons.js';

const XLSX_SRC = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

const state = { query: hashParams().get('q') || '', category: '', onlyEvents: false, compare: [], table: {} };
let tr = {}; // vertalingen van de spel-sleutels (alleen NL heeft er een bestand voor)

const label = key => tr[key] ? String(tr[key]).trim() : humanize(key);
const chanceLabel = key => label(key).replace(/^Benodigde\s+/i, '');
const catLabel = c => tr[`cat_${c}`] || humanize(c);

function isActiveEvent(m) {
    const a = m.additional || {};
    if (!a.date_start) return false;
    const now = Date.now();
    const start = Date.parse(a.date_start);
    const end = a.date_end ? Date.parse(a.date_end) : Infinity;
    return now >= start && now <= end;
}

// ---------- details ----------

function kvList(entries) {
    if (!entries.length) return '';
    return `<dl class="kv">${entries.map(([k, v, cls]) => `<dt>${esc(k)}</dt><dd${cls ? ` class="${cls}"` : ''}>${v}</dd>`).join('')}</dl>`;
}

function requirementEntries(m) {
    const out = [];
    for (const [k, v] of Object.entries(m.requirements || {})) {
        if (v && typeof v === 'object') {
            for (const [sub, n] of Object.entries(v)) out.push([`${label(k)}: ${sub}`, num(n)]);
        } else {
            out.push([label(k), num(v)]);
        }
    }
    return out;
}

const SKIP_ADDITIONAL = new Set(['filter_id', 'patient_specialization_ids', 'patient_specialization_captions', 'patient_specializations',
    'possible_patient', 'possible_patient_min', 'date_start', 'date_end', 'followup_missions_ids', 'subsequent_missions_ids',
    'expansion_missions_ids', 'duration_text', 'duration', 'min_possible_prisoners', 'max_possible_prisoners', 'vehicle_groups',
    'personnel_educations']);

function missionLinks(ids, byId) {
    return `<div class="chips">${ids.map(id => {
        const m = byId.get(String(id));
        return `<a class="chip" href="#q=${encodeURIComponent(id)}"><b>${esc(id)}</b>${m ? esc(m.name) : ''}</a>`;
    }).join('')}</div>`;
}

function detailBlocks(m, byId) {
    const s = ctx.s.missions;
    const a = m.additional || {};
    const blocks = [];

    const req = requirementEntries(m);
    if (req.length) blocks.push(`<div class="dl-block"><h4>${esc(s.requirements)}</h4>${kvList(req)}</div>`);

    const chances = Object.entries(m.chances || {});
    if (chances.length) blocks.push(`<div class="dl-block"><h4>${esc(s.chances)}</h4>${kvList(chances.map(([k, v]) => [chanceLabel(k), `${num(v)} %`]))}</div>`);

    const pre = Object.entries(m.prerequisites || {}).filter(([, v]) => typeof v !== 'object' && Number(v) !== 0);
    if (pre.length) blocks.push(`<div class="dl-block"><h4>${esc(s.prerequisites)}</h4>${kvList(pre.map(([k, v]) => [label(k), num(v)]))}</div>`);

    const patients = [];
    if (a.possible_patient_min != null) patients.push([s.minPatients, num(a.possible_patient_min)]);
    if (a.possible_patient != null) patients.push([s.maxPatients, num(a.possible_patient)]);
    const spec = a.patient_specializations || (a.patient_specialization_captions || []).join(', ');
    if (spec) patients.push([s.specializations, esc(spec), 'text']);
    if (patients.length) blocks.push(`<div class="dl-block"><h4>${esc(s.patients)}</h4>${kvList(patients)}</div>`);

    const other = [];
    if (a.duration_text) other.push([s.duration, esc(a.duration_text), 'text']);
    if (a.min_possible_prisoners != null || a.max_possible_prisoners != null) {
        other.push([s.prisoners, `${num(a.min_possible_prisoners ?? 0)} – ${num(a.max_possible_prisoners ?? 0)}`]);
    }
    if (a.date_start) {
        other.push([s.eventPeriod, `${esc(dateTime(new Date(a.date_start)))}${a.date_end ? ` – ${esc(dateTime(new Date(a.date_end)))}` : ''}`, 'text']);
    }
    for (const [k, v] of Object.entries(a)) {
        if (SKIP_ADDITIONAL.has(k) || v === null || typeof v === 'object') continue;
        other.push([label(k), typeof v === 'boolean' ? esc(v ? ctx.s.common.yes : ctx.s.common.no) : esc(v), 'text']);
    }
    if (other.length) blocks.push(`<div class="dl-block"><h4>${esc(s.other)}</h4>${kvList(other)}</div>`);

    if (m.mission_categories?.length) {
        blocks.push(`<div class="dl-block"><h4>${esc(s.categories)}</h4><div class="chips">${m.mission_categories.map(c => `<span class="chip">${esc(catLabel(c))}</span>`).join('')}</div></div>`);
    }
    const follow = [...(a.followup_missions_ids || []), ...(a.subsequent_missions_ids || [])];
    if (follow.length) blocks.push(`<div class="dl-block"><h4>${esc(s.followups)}</h4>${missionLinks(follow, byId)}</div>`);
    if (a.expansion_missions_ids?.length) blocks.push(`<div class="dl-block"><h4>${esc(s.expansions)}</h4>${missionLinks(a.expansion_missions_ids, byId)}</div>`);

    return `<div class="dl-grid">${blocks.join('')}</div>`;
}

// ---------- export ----------

function loadXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((resolve, reject) => {
        const sc = document.createElement('script');
        sc.src = XLSX_SRC;
        sc.onload = () => resolve(window.XLSX);
        sc.onerror = () => reject(new Error('xlsx kon niet geladen worden'));
        document.head.appendChild(sc);
    });
}

async function exportXlsx(missions, filename) {
    const s = ctx.s;
    try {
        const XLSX = await loadXlsx();
        const text = entries => entries.map(([k, v]) => `${k}: ${String(v).replace(/<[^>]*>/g, '')}`).join('\n');
        const rows = missions.map(m => ({
            [s.common.id]: m.id,
            [s.common.name]: m.name,
            POI: (m.place_array || []).join(', '),
            [s.missions.avgCredits]: m.average_credits ?? '',
            [s.missions.categories]: (m.mission_categories || []).map(catLabel).join(', '),
            [s.missions.requirements]: text(requirementEntries(m)),
            [s.missions.chances]: text(Object.entries(m.chances || {}).map(([k, v]) => [chanceLabel(k), `${v} %`])),
            [s.missions.prerequisites]: text(Object.entries(m.prerequisites || {}).filter(([, v]) => typeof v !== 'object' && Number(v) !== 0).map(([k, v]) => [label(k), v])),
        }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), s.missions.sheet);
        XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (e) {
        console.error(e);
        toast(s.common.loadError);
    }
}

// ---------- pagina ----------

export default {
    title: () => [ctx.s.sections.missions, regionLabel()],
    async load() {
        const [missions, translations, updated] = await Promise.all([
            loadData(ctx.regionKey, 'missions'),
            loadMissionTranslations(ctx.regionKey),
            loadUpdated(ctx.regionKey),
        ]);
        tr = translations;
        const rows = missions.map(m => ({ ...m, id: String(m.id), search: normalize(`${m.id} ${m.name} ${(m.place_array || []).join(' ')}`) }));
        const byId = new Map(rows.map(m => [m.id, m]));
        const categories = [...new Set(rows.flatMap(m => m.mission_categories || []))];
        return { rows, byId, categories, updated };
    },
    render(data) {
        const s = ctx.s;
        const ms = s.missions;
        const cats = [...data.categories].sort((a, b) => catLabel(a).localeCompare(catLabel(b), ctx.locale));
        const activeEvents = data.rows.filter(isActiveEvent).length;

        const filter = () => {
            const n = normalize(state.query);
            return data.rows.filter(m =>
                (!n || m.search.includes(n)) &&
                (!state.category || (m.mission_categories || []).includes(state.category)) &&
                (!state.onlyEvents || isActiveEvent(m)));
        };

        const table = createTable({
            state: state.table,
            rows: filter(),
            rowKey: m => m.id,
            initialSort: null,
            columns: [
                { key: 'id', label: s.common.id, cls: 'id', value: m => (Number.isFinite(Number(m.id)) ? Number(m.id) : m.id), cell: m => esc(m.id) },
                { key: 'name', label: ms.cols.name, cls: 'name', cell: m => `${esc(m.name)}${isActiveEvent(m) ? `<span class="badge event">${esc(ms.event)}</span>` : ''}` },
                { key: 'poi', label: ms.cols.poi, cls: 'wrap', value: m => (m.place_array || []).join(', ') || null, cell: m => esc((m.place_array || []).join(', ')) },
                { key: 'average_credits', label: ms.cols.credits, cls: 'num', value: m => m.average_credits ?? null, cell: m => num(m.average_credits) },
            ],
            rowExtra: m => {
                const on = state.compare.includes(m.id);
                return `<button type="button" class="compare-toggle" data-compare="${esc(m.id)}" aria-pressed="${on}" title="${esc(ms.addCompare)}" aria-label="${esc(ms.addCompare)}">${icon(on ? 'check' : 'columns')}</button> `;
            },
            detail: m => detailBlocks(m, data.byId),
        });

        const count = h('<span class="result-count"></span>');
        const refresh = () => {
            const rows = filter();
            table.update(rows);
            count.textContent = fmt(s.common.results, { n: rows.length.toLocaleString(ctx.locale), total: data.rows.length.toLocaleString(ctx.locale) });
        };

        // toolbar
        const search = searchBox({ value: state.query, placeholder: s.common.search, onInput: q => { state.query = q; refresh(); } });
        const catSelect = h(`<select class="select" aria-label="${esc(ms.categories)}"><option value="">${esc(ms.allCategories)}</option>${
            cats.map(c => `<option value="${esc(c)}"${c === state.category ? ' selected' : ''}>${esc(catLabel(c))}</option>`).join('')}</select>`);
        catSelect.addEventListener('change', () => { state.category = catSelect.value; refresh(); });
        const evBtn = h(`<button type="button" class="btn" aria-pressed="${state.onlyEvents}">${icon('flame')}${esc(ms.onlyEvents)} <span class="badge event" style="margin-left:2px">${activeEvents}</span></button>`);
        evBtn.addEventListener('click', () => {
            state.onlyEvents = !state.onlyEvents;
            evBtn.setAttribute('aria-pressed', String(state.onlyEvents));
            refresh();
        });
        const exportBtn = h(`<button type="button" class="btn">${icon('download')}${esc(ms.exportAll)}</button>`);

        const el = h(`<div>${pageHead({
            eyebrow: regionLabel(), title: s.sections.missions, lede: s.sectionDesc.missions, meta: updatedPill(data.updated),
        })}<div class="toolbar"></div></div>`);
        el.querySelector('.toolbar').append(search, catSelect, evBtn, h('<span class="spacer"></span>'), count, exportBtn);
        el.append(table.el);
        count.textContent = fmt(s.common.results, { n: filter().length.toLocaleString(ctx.locale), total: data.rows.length.toLocaleString(ctx.locale) });

        // ----- export-dialoog -----
        const dlg = h(`<dialog class="modal" aria-labelledby="exp-title">
  <div class="modal-head"><h2 id="exp-title">${esc(ms.exportTitle)}</h2><button type="button" class="icon-btn" data-close aria-label="${esc(s.common.close)}">${icon('x')}</button></div>
  <div class="modal-body"><p class="note" style="margin-bottom:14px">${esc(ms.exportHint)}</p>
    <div class="check-grid">${cats.map(c => `<label><input type="checkbox" value="${esc(c)}"> ${esc(catLabel(c))}</label>`).join('')}</div></div>
  <div class="modal-foot"><button type="button" class="btn" data-close>${esc(s.common.close)}</button><button type="button" class="btn primary" data-export>${icon('download')}${esc(ms.exportBtn)}</button></div>
</dialog>`);
        exportBtn.addEventListener('click', () => dlg.showModal());
        dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => dlg.close()));
        dlg.querySelector('[data-export]').addEventListener('click', () => {
            const chosen = [...dlg.querySelectorAll('input:checked')].map(i => i.value);
            const rows = chosen.length ? data.rows.filter(m => (m.mission_categories || []).some(c => chosen.includes(c))) : filter();
            exportXlsx(rows, `${ms.sheet}_${ctx.region.code}`);
            dlg.close();
        });
        el.append(dlg);

        // ----- vergelijken -----
        const bar = h('<div class="compare-bar" hidden></div>');
        const cmpDlg = h(`<dialog class="modal" aria-labelledby="cmp-title">
  <div class="modal-head"><h2 id="cmp-title">${esc(ms.compareTitle)}</h2><button type="button" class="icon-btn" data-close aria-label="${esc(s.common.close)}">${icon('x')}</button></div>
  <div class="modal-body"><div class="compare-grid"></div></div>
</dialog>`);
        cmpDlg.querySelector('[data-close]').addEventListener('click', () => cmpDlg.close());

        const renderBar = () => {
            bar.hidden = state.compare.length === 0;
            bar.innerHTML = `<span>${esc(fmt(ms.compareSelected, { n: state.compare.length }))}</span>
              <button type="button" class="btn" data-clear>${esc(ms.compareClear)}</button>
              <button type="button" class="btn primary" data-open ${state.compare.length < 2 ? 'disabled' : ''}>${icon('columns')}${esc(ms.compare)}</button>`;
            bar.querySelector('[data-clear]').addEventListener('click', () => {
                state.compare = [];
                table.refresh();
                renderBar();
            });
            bar.querySelector('[data-open]').addEventListener('click', () => {
                const [a, b] = state.compare.map(id => data.byId.get(id));
                cmpDlg.querySelector('.compare-grid').innerHTML = [a, b].map(m => `<div>
                  <p class="eyebrow">${esc(m.id)}</p><h3 style="font-size:18px">${esc(m.name)}</h3>
                  <p class="note">${esc(ms.avgCredits)}: <b>${num(m.average_credits)}</b></p>${detailBlocks(m, data.byId)}</div>`).join('');
                cmpDlg.showModal();
            });
        };
        table.el.addEventListener('click', e => {
            const btn = e.target.closest('[data-compare]');
            if (!btn) return;
            const id = btn.dataset.compare;
            if (state.compare.includes(id)) state.compare = state.compare.filter(x => x !== id);
            else state.compare = [...state.compare, id].slice(-2);
            table.refresh();
            renderBar();
        });
        renderBar();
        el.append(bar, cmpDlg);

        // links naar vervolgmeldingen (#q=ID) werken binnen de pagina
        window.onhashchange = () => {
            const q = hashParams().get('q');
            if (q === null) return;
            state.query = q;
            search.querySelector('input').value = q;
            refresh();
            search.scrollIntoView({ block: 'start', behavior: 'smooth' });
        };
        return el;
    },
};
