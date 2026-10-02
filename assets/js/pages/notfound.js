import { ctx, esc, url } from '../core.js';
import { icon } from '../icons.js';

export default {
    title: () => [ctx.s.notFound.title],
    render() {
        const s = ctx.s.notFound;
        return `<section class="notfound">
  <div class="code">404</div>
  <h1 style="margin-top:12px">${esc(s.title)}</h1>
  <p class="lede" style="margin-inline:auto">${esc(s.lede)}</p>
  <p style="margin-top:24px"><a class="btn primary" href="${url('index.html')}">${esc(s.home)} ${icon('arrow')}</a></p>
</section>`;
    },
};
