// Startpunt: bouwt de paginaschil, laadt de data van de pagina en rendert opnieuw bij taalwissel.
import { ctx, renderShell, mainEl, skeleton, errorBox, onLangChange, setTitle } from './core.js';

const page = (await import(`./pages/${ctx.page}.js`)).default;
renderShell();

let data = null;

function draw() {
    setTitle(...page.title());
    const out = page.render(data);
    if (typeof out === 'string') mainEl.innerHTML = out;
    else mainEl.replaceChildren(out);
    page.afterRender?.(data);
}

async function start() {
    setTitle(...page.title());
    mainEl.innerHTML = page.load ? skeleton() : '';
    try {
        data = page.load ? await page.load() : null;
    } catch (e) {
        console.error(e);
        mainEl.replaceChildren(errorBox(start));
        return;
    }
    draw();
}

onLangChange(() => (data !== null || !page.load ? draw() : start()));
start();
