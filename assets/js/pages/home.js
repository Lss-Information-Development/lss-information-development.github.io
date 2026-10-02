import { REGIONS } from '../config.js';
import { ctx, esc, url, h, sectionUrl } from '../core.js';
import { versionCards, loadAllUpdated } from '../versions-grid.js';
import { icon } from '../icons.js';

let clockTimer;

function relative(date) {
    if (!date) return '–';
    const rtf = new Intl.RelativeTimeFormat(ctx.locale, { numeric: 'auto' });
    const mins = Math.round((date - Date.now()) / 60000);
    if (Math.abs(mins) < 60) return rtf.format(mins, 'minute');
    const hours = Math.round(mins / 60);
    if (Math.abs(hours) < 48) return rtf.format(hours, 'hour');
    return rtf.format(Math.round(hours / 24), 'day');
}

export default {
    title: () => [],
    load: loadAllUpdated,
    render(updated) {
        const s = ctx.s;
        const el = h(`<div>
<section class="hero">
  <div class="hero-copy">
    <p class="eyebrow">${esc(s.home.eyebrow)}</p>
    <h1>${s.home.title}</h1>
    <p class="lede">${esc(s.home.lede)}</p>
    <div class="hero-actions">
      <a class="btn primary" href="#versies">${esc(s.home.ctaVersions)} ${icon('arrow')}</a>
      <a class="btn" href="${url('gameversions/contact.html')}">${esc(s.home.ctaContact)}</a>
    </div>
  </div>
  <aside class="card console" aria-label="${esc(s.home.console)}">
    <div class="console-head"><span>${esc(s.home.console)}</span><span class="live">${esc(s.home.live)}</span></div>
    <div class="console-clock"><div class="time" data-time>--:--:--</div><div class="date" data-date></div></div>
    <div class="console-head" style="border-top:1px solid var(--line)"><span>${esc(s.home.dataStatus)}</span></div>
    <ul class="console-list">
      ${Object.entries(REGIONS).map(([k, r]) => `<li><img src="${url(r.flag)}" alt=""><a href="${sectionUrl(k, 'region')}">${esc(r.game)} ${r.code}</a><span class="when">${esc(relative(updated[k]))}</span></li>`).join('')}
    </ul>
  </aside>
</section>
<section id="versies" style="margin-bottom:44px">
  <div class="section-head"><h2>${esc(s.home.versionsTitle)}</h2><span class="result-count">${esc(s.home.versionsSub)}</span></div>
  ${versionCards(updated)}
</section>
<section class="card card-pad">
  <h2 style="margin-bottom:8px">${esc(s.home.aboutTitle)}</h2>
  <p class="note" style="font-size:15px;max-width:820px">${esc(s.home.about)}</p>
</section>
</div>`);
        const tick = () => {
            const now = new Date();
            el.querySelector('[data-time]').textContent = now.toLocaleTimeString(ctx.locale);
            el.querySelector('[data-date]').textContent = now.toLocaleDateString(ctx.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        };
        clearInterval(clockTimer);
        tick();
        clockTimer = setInterval(tick, 1000);
        return el;
    },
};
