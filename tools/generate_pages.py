#!/usr/bin/env python3
"""Genereert alle (dunne) HTML-pagina's. De inhoud wordt door assets/js/main.js opgebouwd.

Gebruik:  python3 tools/generate_pages.py
Nieuwe regio: voeg hem toe aan REGIONS hieronder én aan assets/js/config.js.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# regio -> (code, spelnaam, index-bestand, html-lang, heeft uitrusting)
REGIONS = {
    'nl_NL': ('NL', 'Meldkamerspel', 'indexNL.html', 'nl', True),
    'de_DE': ('DE', 'Leitstellenspiel', 'indexDE.html', 'de', False),
    'en_UK': ('UK', 'MissionChief', 'indexUK.html', 'en', False),
    'en_US': ('US', 'MissionChief', 'indexUS.html', 'en', False),
    'en_AU': ('AU', 'MissionChief', 'indexAU.html', 'en', False),
    'es_ES': ('ES', 'Centro de Mando', 'indexES.html', 'es', False),
}

# pagina -> (bestand, titel)
SECTIONS = {
    'buildings': ('building_ids.html', 'Gebouwen'),
    'vehicles': ('vehicle_ids.html', 'Voertuigen'),
    'missions': ('mission_ids.html', 'Meldingen'),
    'events': ('alliance_event.html', 'Events'),
    'pois': ('pois.html', "POI's"),
    'equipment': ('equipments.html', 'Uitrusting'),
}

TEMPLATE = """<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="icon" href="{root}images/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap">
<link rel="stylesheet" href="{root}assets/css/app.css">
<script>try{{var t=localStorage.getItem('lss.theme');if(t==='light'||(!t&&matchMedia('(prefers-color-scheme: light)').matches))document.documentElement.dataset.theme='light'}}catch(e){{}}</script>
<script type="module" src="{root}assets/js/main.js"></script>
</head>
<body data-page="{page}" data-root="{root}"{region_attr}>
<noscript><p style="padding:20px">Deze website heeft JavaScript nodig. / This website requires JavaScript.</p></noscript>
</body>
</html>
"""

DESCRIPTION = 'Gebouwen, voertuigen, meldingen en POI\'s voor Meldkamerspel, Leitstellenspiel, MissionChief en Centro de Mando.'


def write(rel, page, root, title, lang='nl', region=None):
    html = TEMPLATE.format(
        lang=lang, title=f'{title} · LSS Information' if title else 'LSS Information',
        description=DESCRIPTION, root=root, page=page,
        region_attr=f' data-region="{region}"' if region else '',
    )
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(html, encoding='utf-8')
    return rel


def main():
    written = [
        write('index.html', 'home', './', ''),
        write('404.html', 'notfound', '/', 'Pagina niet gevonden'),
        write('gameversions/gameversionsinfo.html', 'versions', '../', 'Spelversies'),
        write('gameversions/contact.html', 'contact', '../', 'Contact'),
    ]
    for key, (code, game, index, lang, equipment) in REGIONS.items():
        base = f'gameversions/{key}/'
        written.append(write(base + index, 'region', '../../', f'{game} ({code})', lang, key))
        for page, (file, title) in SECTIONS.items():
            if page == 'equipment' and not equipment:
                continue
            written.append(write(base + file, page, '../../', f'{title} · {game} ({code})', lang, key))
    print(f'{len(written)} pagina\'s geschreven')


if __name__ == '__main__':
    main()
