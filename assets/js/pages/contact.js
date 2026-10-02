import { CONTACT_DISCORD } from '../config.js';
import { ctx, esc, h, pageHead, toast } from '../core.js';
import { icon, DISCORD } from '../icons.js';

export default {
    title: () => [ctx.s.contact.title],
    render() {
        const s = ctx.s;
        const el = h(`<div>
${pageHead({ eyebrow: 'LSS Information', title: s.contact.title, lede: s.contact.lede })}
<div class="card card-pad contact-card" style="max-width:640px">
  <div class="ico">${DISCORD}</div>
  <div>
    <p class="eyebrow" style="margin-bottom:4px">${esc(s.contact.discord)}</p>
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <span class="handle">${esc(CONTACT_DISCORD)}</span>
      <button type="button" class="btn" data-copy>${icon('copy')}${esc(s.common.copy)}</button>
    </div>
  </div>
</div>
<p class="note" style="margin-top:18px">${esc(s.contact.note)}</p>
</div>`);
        el.querySelector('[data-copy]').addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(CONTACT_DISCORD);
                toast(s.common.copied);
            } catch { /* clipboard niet beschikbaar */ }
        });
        return el;
    },
};
