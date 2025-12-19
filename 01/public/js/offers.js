import { db, collection, getDocs, query, where, orderBy } from './firebase.js';
import { addOfferMarker, clearMarkers } from './map.js';

// Haversine Formula for Distance (in km)
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;

    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return parseFloat(d.toFixed(1));
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// MOCK DATA (Fallback if Firestore is empty/unconfigured)
const MOCK_OFFERS = [
    {
        id: '1',
        title: '50% Off Pizza',
        businessName: 'Dominos',
        description: 'Get half price on all medium pizzas',
        discount: '50% OFF',
        category: 'food',
        latitude: 40.7128,
        longitude: -74.0060, // NYC
        isPremium: true,
        validTill: { seconds: Date.now() / 1000 + 86400 * 5 }, // 5 days
        imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80',
        popularity: 100
    },
    {
        id: '2',
        title: 'BOGO Coffee',
        businessName: 'Starbucks',
        description: 'Buy one get one free on all lattes',
        discount: 'Buy 1 Get 1',
        category: 'food',
        latitude: 40.7200,
        longitude: -74.0100,
        isPremium: false,
        validTill: { seconds: Date.now() / 1000 + 86400 * 2 },
        imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&q=80',
        popularity: 80
    },
    {
        id: '3',
        title: 'Summer Sale',
        businessName: 'H&M',
        description: 'Flat 30% off on summer collection',
        discount: '30% OFF',
        category: 'shopping',
        latitude: 40.7300,
        longitude: -73.9900,
        isPremium: true,
        validTill: { seconds: Date.now() / 1000 + 86400 * 10 },
        imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&q=80',
        popularity: 95
    }
];

export async function loadOffers() {
    try {
        const q = query(collection(db, "offers")); // Fetch all, filter locally
        const querySnapshot = await getDocs(q);

        let offers = [];
        querySnapshot.forEach((doc) => {
            offers.push({ id: doc.id, ...doc.data() });
        });

        if (offers.length === 0) {
            console.log("No offers in Firestore, using mock data.");
            return MOCK_OFFERS;
        }

        return offers;

    } catch (error) {
        console.error("Error loading offers:", error);
        return MOCK_OFFERS; // Fallback to mock on error (e.g. auth fail)
    }
}

export function renderOffers(state) {
    const listContainer = document.getElementById('offers-list');
    if (!listContainer) return;

    // 1. Filter & Sort
    let filtered = state.offers.filter(offer => {
        // Search Filter
        const searchMatch = !state.filters.search ||
            offer.title.toLowerCase().includes(state.filters.search) ||
            offer.businessName.toLowerCase().includes(state.filters.search) ||
            offer.category.toLowerCase().includes(state.filters.search);

        // Category Filter
        const catMatch = state.filters.category === 'all' ||
            offer.category.toLowerCase() === state.filters.category;

        // Distance Filter (Requires user location)
        let distMatch = true;
        if (state.location && offer.latitude && offer.longitude) {
            const dist = calculateDistance(
                state.location.lat,
                state.location.lng,
                offer.latitude,
                offer.longitude
            );
            offer.distance = dist; // Attach distance for sorting
            distMatch = dist <= state.filters.distance;
        } else {
            offer.distance = 999;
        }

        return searchMatch && catMatch && distMatch;
    });

    // Sort: Premium First, then Distance, then Popularity
    filtered.sort((a, b) => {
        if (a.isPremium !== b.isPremium) return b.isPremium ? 1 : -1; // Premium first
        if (a.distance !== b.distance) return a.distance - b.distance; // Nearest first
        return (b.popularity || 0) - (a.popularity || 0); // Popularity fallback
    });

    // 2. Clear Markers (if Map view is essentially syncing with this data)
    // Note: If we want markers to persist across views, we might not want to clear them here.
    // But usually, the map shows what's in the list? 
    // The requirement says "Map (Default View)". 
    // Let's re-add markers for filtered offers whenever we render (or when state changes).
    // Actually, markers should be managed when state changes. 
    // We'll call a helper to update map markers from here.
    updateMapMarkers(filtered);

    // 3. Render HTML
    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align:center; padding:40px; color:#757575;">
                <i class="fas fa-search" style="font-size:40px; margin-bottom:16px; color:#ddd;"></i>
                <p>No offers found matching your criteria.</p>
            </div>`;
        return;
    }

    listContainer.innerHTML = filtered.map(offer => {
        const validDate = offer.validTill ? new Date(offer.validTill.seconds * 1000).toLocaleDateString() : 'N/A';

        return `
        <div class="card" onclick="focusOnMarker(${offer.latitude}, ${offer.longitude})">
            <div class="card-image" style="background-image: url('${offer.imageUrl || 'assets/placeholder.jpg'}');">
                ${offer.isPremium ? `
                <div class="premium-badge">
                    <i class="fas fa-crown"></i> Premium
                </div>` : ''}
            </div>
            <div class="card-content">
                <div class="card-subtitle">
                    <span>${offer.businessName}</span>
                    <span>${offer.distance < 900 ? offer.distance + ' km' : ''}</span>
                </div>
                <h3 class="card-title">${offer.title}</h3>
                <div class="deal-text">${offer.discount}</div>
                <div class="card-footer">
                    <span><i class="far fa-clock"></i> Valid till ${validDate}</span>
                    <span class="btn-small">View Map</span>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function updateMapMarkers(offers) {
    clearMarkers();
    offers.forEach(offer => addOfferMarker(offer));
}

// Make `focusOnMarker` available globally for the onclick handler in string literal
window.focusOnMarker = (lat, lng) => {
    // Switch to map view
    const navItem = document.querySelector('[data-view="map"]');
    if (navItem) navItem.click(); // Simulate click to trigger view switch

    // Pan map
    // We need to access the map instance. 
    // Since map.js doesn't export the map instance directly but functions, we might need a jumpTo function.
    // For now, I'll rely on global `map` variable if exposed, or better, add a function to `map.js`.
    // Actually, `map.js` module scope `map` variable is not global.
    // I should add `flyTo` in map.js
    import('./map.js').then(module => {
        if (module.flyTo) module.flyTo(lat, lng);
    });
};
