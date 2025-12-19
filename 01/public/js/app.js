import { initMap, resizeMap } from './map.js';
import { loadOffers, renderOffers } from './offers.js';
import { loadPlaces, renderPlaces } from './places.js';
import { setupFilters } from './filters.js';

// Application State
const state = {
    currentView: 'map', // map, offers, places
    location: null, // { lat, lng }
    offers: [],
    places: [],
    filters: {
        search: '',
        category: 'all',
        distance: 1000 // default 1000km (basically all)
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize App
    console.log('App Initializing...');

    // Setup Navigation
    setupNavigation();

    // Setup Filters
    setupFilters(state);

    // Initial Load - Map View
    await initView();
});

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-item');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.dataset.view;
            switchView(view);

            // Update Active State
            navLinks.forEach(n => n.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

function switchView(view) {
    state.currentView = view;

    // Hide all sections
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

    // Show selected section
    const activeSection = document.getElementById(`${view}-view`);
    if (activeSection) {
        activeSection.classList.remove('hidden');
    }

    // View specific logic
    if (view === 'map') {
        resizeMap();
    } else if (view === 'offers') {
        renderOffers(state);
    } else if (view === 'places') {
        renderPlaces(state);
    }
}

async function initView() {
    // 1. Initialize Map (which gets location)
    // We pass a callback to update our state location when map determines it
    await initMap((lat, lng) => {
        state.location = { lat, lng };
        // Reload data sorted by distance if needed
    });

    // 2. Load Data
    state.offers = await loadOffers();
    state.places = await loadPlaces();

    // 3. Render initial view
    switchView('map');
}

export { state };
