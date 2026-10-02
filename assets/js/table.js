// Herbruikbare datatabel: sorteren, uitklapbare details, "toon meer" en kaartweergave op mobiel.
import { ctx, esc, fmt, h } from './core.js';
import { icon } from './icons.js';

/**
 * @param {object} opts
 * @param {Array<{key:string,label:string,cell:(row)=>string,value?:(row)=>any,cls?:string,sortable?:boolean}>} opts.columns
 * @param {Array} opts.rows
 * @param {(row)=>string} opts.rowKey
 * @param {(row)=>string|Node} [opts.detail]   lazy detail-inhoud
 * @param {(row)=>string} [opts.rowExtra]     extra knoppen in de actiekolom
 * @param {object} [opts.state]               blijft bewaard tussen renders (sortering, open rijen)
 * @param {number} [opts.pageSize]
 */
export function createTable(opts) {
    const { columns, rowKey, detail, rowExtra } = opts;
    const pageSize = opts.pageSize || 100;
    const state = opts.state || {};
    state.sort ??= opts.initialSort || null;
    state.open ??= new Set();
    state.limit ??= pageSize;
    let rows = opts.rows;

    const hasActions = !!detail || !!rowExtra;
    const s = ctx.s.common;
    const el = h(`
<div class="card table-card">
  <div class="table-scroll"><table class="data"><thead><tr></tr></thead><tbody></tbody></table></div>
  <div class="table-foot" hidden></div>
</div>`);
    const headRow = el.querySelector('thead tr');
    const tbody = el.querySelector('tbody');
    const foot = el.querySelector('.table-foot');

    const collator = new Intl.Collator(ctx.locale, { numeric: true, sensitivity: 'base' });
    function compare(a, b) {
        const an = a === null || a === undefined || a === '';
        const bn = b === null || b === undefined || b === '';
        if (an || bn) return an === bn ? 0 : an ? 1 : -1;
        if (typeof a === 'number' && typeof b === 'number') return a - b;
        return collator.compare(String(a), String(b));
    }

    function sortedRows() {
        if (!state.sort) return rows;
        const col = columns.find(c => c.key === state.sort.key);
        if (!col) return rows;
        const get = col.value || (r => r[col.key]);
        const dir = state.sort.dir === 'desc' ? -1 : 1;
        return [...rows].sort((a, b) => {
            const va = get(a), vb = get(b);
            const nullA = va === null || va === undefined || va === '';
            const nullB = vb === null || vb === undefined || vb === '';
            if (nullA || nullB) return compare(va, vb); // lege waarden altijd onderaan
            return compare(va, vb) * dir;
        });
    }

    function renderHead() {
        headRow.innerHTML = columns.map(c => {
            const sorted = state.sort?.key === c.key;
            const ariaSort = sorted ? ` aria-sort="${state.sort.dir === 'desc' ? 'descending' : 'ascending'}"` : '';
            const cls = c.cls ? ` class="${c.cls}"` : '';
            if (c.sortable === false) return `<th${cls}><span>${esc(c.label)}</span></th>`;
            return `<th${cls}${ariaSort}><button type="button" data-sort="${c.key}" title="${esc(fmt(s.sortBy, { col: c.label }))}">${esc(c.label)}${icon(sorted ? 'sortActive' : 'sort', 'sort')}</button></th>`;
        }).join('') + (hasActions ? `<th class="act"><span class="sr-only">${esc(s.details)}</span></th>` : '');
    }

    headRow.addEventListener('click', e => {
        const btn = e.target.closest('[data-sort]');
        if (!btn) return;
        const key = btn.dataset.sort;
        if (state.sort?.key !== key) state.sort = { key, dir: 'asc' };
        else if (state.sort.dir === 'asc') state.sort = { key, dir: 'desc' };
        else state.sort = opts.initialSort || null;
        renderHead();
        renderBody();
    });

    function detailRow(row) {
        const tr = document.createElement('tr');
        tr.className = 'detail';
        const td = document.createElement('td');
        td.colSpan = columns.length + (hasActions ? 1 : 0);
        const inner = document.createElement('div');
        inner.className = 'detail-inner';
        const content = detail(row);
        if (typeof content === 'string') inner.innerHTML = content; else inner.appendChild(content);
        td.appendChild(inner);
        tr.appendChild(td);
        return tr;
    }

    function rowEl(row) {
        const key = rowKey(row);
        const tr = document.createElement('tr');
        tr.className = 'row';
        tr.dataset.key = key;
        tr.innerHTML = columns.map(c => {
            const label = c.cls === 'name' ? '' : ` data-label="${esc(c.label)}"`;
            return `<td${c.cls ? ` class="${c.cls}"` : ''}${label}>${c.cell(row)}</td>`;
        }).join('') + (hasActions ? `<td class="act">${rowExtra ? rowExtra(row) : ''}${detail
            ? `<button type="button" class="expand-btn" aria-expanded="false">${esc(s.details)}${icon('chevron')}</button>` : ''}</td>` : '');
        return tr;
    }

    function toggle(tr, row) {
        const key = tr.dataset.key;
        const btn = tr.querySelector('.expand-btn');
        const open = !state.open.has(key);
        if (open) {
            state.open.add(key);
            tr.after(detailRow(row));
        } else {
            state.open.delete(key);
            if (tr.nextElementSibling?.classList.contains('detail')) tr.nextElementSibling.remove();
        }
        tr.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', String(open));
    }

    let visible = [];
    function renderBody() {
        const all = sortedRows();
        visible = all.slice(0, state.limit);
        const frag = document.createDocumentFragment();
        for (const row of visible) {
            const tr = rowEl(row);
            frag.appendChild(tr);
            if (detail && state.open.has(tr.dataset.key)) {
                tr.classList.add('open');
                tr.querySelector('.expand-btn').setAttribute('aria-expanded', 'true');
                frag.appendChild(detailRow(row));
            }
        }
        tbody.replaceChildren(frag);

        if (!all.length) {
            tbody.innerHTML = `<tr><td colspan="${columns.length + (hasActions ? 1 : 0)}"><div class="empty">${icon('inbox')}${esc(s.noResults)}</div></td></tr>`;
        }
        const rest = all.length - visible.length;
        foot.hidden = rest <= 0;
        if (rest > 0) {
            foot.innerHTML = `<button type="button" class="btn">${esc(fmt(s.showMore, { n: rest.toLocaleString(ctx.locale) }))}</button>`;
            foot.querySelector('button').addEventListener('click', () => {
                state.limit += pageSize * 2;
                renderBody();
            });
        }
    }

    tbody.addEventListener('click', e => {
        const btn = e.target.closest('.expand-btn');
        if (!btn) return;
        const tr = btn.closest('tr.row');
        const row = visible.find(r => rowKey(r) === tr.dataset.key);
        if (row) toggle(tr, row);
    });

    renderHead();
    renderBody();

    return {
        el,
        update(newRows) {
            rows = newRows;
            state.limit = pageSize;
            renderBody();
        },
        refresh: renderBody,
    };
}

// Zoekveld met '/'-sneltoets
export function searchBox({ value, placeholder, onInput, id = 'search' }) {
    const el = h(`
<div class="search">
  ${icon('search')}
  <label class="sr-only" for="${id}">${esc(placeholder)}</label>
  <input id="${id}" type="search" autocomplete="off" placeholder="${esc(placeholder)}" value="${esc(value || '')}">
  <kbd aria-hidden="true">/</kbd>
</div>`);
    const input = el.querySelector('input');
    let timer;
    input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => onInput(input.value), 120);
    });
    return el;
}

document.addEventListener('keydown', e => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const input = document.querySelector('.search input');
    if (input) { e.preventDefault(); input.focus(); input.select(); }
});

export function normalize(str) {
    return String(str ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
