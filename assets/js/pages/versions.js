import { ctx, pageHead } from '../core.js';
import { versionCards, loadAllUpdated } from '../versions-grid.js';

export default {
    title: () => [ctx.s.nav.versions],
    load: loadAllUpdated,
    render(updated) {
        const s = ctx.s;
        return pageHead({ eyebrow: 'LSS Information', title: s.versions.title, lede: s.versions.lede }) + versionCards(updated);
    },
};
