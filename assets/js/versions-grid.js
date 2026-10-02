// Kaarten per spelversie (gebruikt op home en spelversie-pagina)
import { REGIONS } from './config.js';
import { ctx, esc, url, sectionUrl, dateTime, loadUpdated } from './core.js';
import { icon } from './icons.js';

export async function loadAllUpdated() {
    const keys = Object.keys(REGIONS);
    const dates = await Promise.all(keys.map(k => loadUpdated(k)));
    return Object.fromEntries(keys.map((k, i) => [k, dates[i]]));
}

export function versionCards(updated) {
    const s = ctx.s;
    return `<div class="grid grid-3">${Object.entries(REGIONS).map(([key, r]) => `
  <a class="card version-card" href="${sectionUrl(key, 'region')}">
    <div class="top">
      <img class="flag" src="${url(r.flag)}" alt="">
      <div><h3>${esc(r.game)} <span class="badge muted">${r.code}</span></h3><div class="sub">${esc(r.country[ctx.lang])}</div></div>
    </div>
    <div class="sub">${updated?.[key] ? esc(s.common.updated.replace('{date}', dateTime(updated[key]))) : '&nbsp;'}</div>
    <div class="go"><span>${esc(s.version.open)}</span>${icon('arrow')}</div>
  </a>`).join('')}</div>`;
}
