import { renderOffers } from './offers.js';
import { renderPlaces } from './places.js';

export function setupFilters(state) {
    const searchInput = document.getElementById('searchInput');
    const categoryBtns = document.querySelectorAll('.category-chip');

    // Debounce function for search
    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            state.filters.search = e.target.value.toLowerCase();
            updateView(state);
        }, 300));
    }

    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Toggle active class
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            state.filters.category = btn.dataset.category;
            updateView(state);
        });
    });
}

function updateView(state) {
    // Re-render the current view to reflect filter changes
    // We also need to re-render the map markers!
    if (state.currentView === 'offers') {
        renderOffers(state);
    } else if (state.currentView === 'places') {
        renderPlaces(state);
    } else if (state.currentView === 'map') {
        // If in map view, we probably want to filter the markers based on what "would" be in the list?
        // Or maybe display all? User req: "Filter by Category... Live filtering". 
        // So yes, Map view should also reflect filters.
        // We'll default to reloading Offers on map if in map view, 
        // OR we can decide based on some toggle. 
        // For simplicity, Map View shows Offers by default.
        renderOffers(state);
    }
}
