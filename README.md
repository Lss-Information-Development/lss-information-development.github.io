# LSS Information

Overzichten (gebouwen, voertuigen, meldingen, events, POI's, uitrusting) voor Meldkamerspel, Leitstellenspiel, MissionChief en Centro de Mando.

## Structuur

| Pad | Inhoud |
|-----|--------|
| `index.html`, `gameversions/**.html` | Dunne HTML-pagina's (gegenereerd). De inhoud wordt door JavaScript opgebouwd. |
| `assets/css/app.css` | Volledige styling (donker + licht thema, responsive). |
| `assets/js/config.js` | Spelversies (regio's), secties en databestanden. |
| `assets/js/i18n.js` | Alle UI-teksten in NL / DE / EN. |
| `assets/js/core.js` | Paginaschil (menu, regiobalk, footer), taal, thema, data laden. |
| `assets/js/table.js` | Datatabel: sorteren, zoeken, uitklappen, kaartweergave op mobiel. |
| `assets/js/pages/*.js` | Eén module per paginatype. |
| `gameversions/<regio>/<regio>-Data/` | Data, bijgewerkt door de GitHub Actions in `.github/workflows`. |
| `tools/generate_pages.py` | Genereert alle HTML-pagina's opnieuw. |

## Lokaal bekijken

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Nieuwe spelversie toevoegen

1. Regio toevoegen in `assets/js/config.js` en `tools/generate_pages.py`.
2. `python3 tools/generate_pages.py` draaien.
3. Data-download toevoegen aan de workflow.
