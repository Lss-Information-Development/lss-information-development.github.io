// Spelversies en pagina's. Een nieuwe regio toevoegen = hier een regel + de HTML-pagina's
// (zie tools/generate_pages.py) + de data-sync in .github/workflows.

export const REGIONS = {
    nl_NL: {
        code: 'NL', game: 'Meldkamerspel', country: { nl: 'Nederland', de: 'Niederlande', en: 'Netherlands' },
        flag: 'images/flag_nl.gif', index: 'indexNL.html', lang: 'nl', url: 'https://www.meldkamerspel.com',
        files: { vehicles: 'Vehicles.json' }, translations: 'translations.json', equipment: true,
    },
    de_DE: {
        code: 'DE', game: 'Leitstellenspiel', country: { nl: 'Duitsland', de: 'Deutschland', en: 'Germany' },
        flag: 'images/flag_de.gif', index: 'indexDE.html', lang: 'de', url: 'https://www.leitstellenspiel.de',
        files: { vehicles: 'Vehicles.json' },
    },
    en_UK: {
        code: 'UK', game: 'MissionChief', country: { nl: 'Verenigd Koninkrijk', de: 'Vereinigtes Königreich', en: 'United Kingdom' },
        flag: 'images/flag_uk.gif', index: 'indexUK.html', lang: 'en', url: 'https://www.missionchief.co.uk',
        files: { vehicles: 'vehicles.json' },
    },
    en_US: {
        code: 'US', game: 'MissionChief', country: { nl: 'Verenigde Staten', de: 'Vereinigte Staaten', en: 'United States' },
        flag: 'images/flag_us.gif', index: 'indexUS.html', lang: 'en', url: 'https://www.missionchief.com',
        files: { vehicles: 'Vehicles.json' },
    },
    en_AU: {
        code: 'AU', game: 'MissionChief', country: { nl: 'Australië', de: 'Australien', en: 'Australia' },
        flag: 'images/flag_au.gif', index: 'indexAU.html', lang: 'en', url: 'https://www.missionchief-australia.com',
        files: { vehicles: 'vehicles.json' },
    },
    es_ES: {
        code: 'ES', game: 'Centro de Mando', country: { nl: 'Spanje', de: 'Spanien', en: 'Spain' },
        flag: 'images/flag_es.svg', index: 'indexES.html', lang: 'en', url: 'https://www.centro-de-mando.es',
        files: { vehicles: 'vehicles.json' },
    },
};

// Secties binnen een regio (volgorde = volgorde in de tabs)
export const SECTIONS = [
    { page: 'region', file: null, icon: 'grid' },
    { page: 'buildings', file: 'building_ids.html', icon: 'building' },
    { page: 'vehicles', file: 'vehicle_ids.html', icon: 'truck' },
    { page: 'missions', file: 'mission_ids.html', icon: 'siren' },
    { page: 'events', file: 'alliance_event.html', icon: 'calendar' },
    { page: 'pois', file: 'pois.html', icon: 'pin' },
    { page: 'equipment', file: 'equipments.html', icon: 'box', only: r => r.equipment },
];

export const DATA = {
    buildings: 'buildings.json',
    missions: 'einsaetze.json',
    pois: 'pois.json',
    events: 'alliance_event_types.json',
    equipment: 'equipments.json',
    updated: 'last_update.txt',            // meldingen + events
    updatedBuildings: 'last_update_buildings.txt', // gebouwen, voertuigen, POI's, uitrusting
};

export const UI_LANGS = ['nl', 'de', 'en'];
export const START_YEAR = 2024;
export const CONTACT_DISCORD = 'jr04.';
