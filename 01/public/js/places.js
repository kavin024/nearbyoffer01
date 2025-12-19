import { db, collection, getDocs } from './firebase.js';
import { addPlaceMarker, clearMarkers } from './map.js';

// Reuse distance calc logic or import it if I made it a util.
// For simplicity I'll duplicate the simple function or attach it to window/state.
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
}

const MOCK_PLACES = [
    {
        id: 'p1',
        name: 'Central Mall',
        category: 'shopping',
        latitude: 40.7150,
        longitude: -74.0090,
        imageUrl: 'https://images.unsplash.com/photo-1519567241046-7f570eee3d9b?w=500&q=80',
        rating: 4.5,
        address: '123 Main St, New York'
    },
    {
        id: 'p2',
        name: 'City Park',
        category: 'entertainment',
        latitude: 40.7100,
        longitude: -74.0000,
        imageUrl: 'https://images.unsplash.com/photo-1577740266014-cb30ab0b5934?w=500&q=80',
        rating: 4.8,
        address: 'Park Ave, New York'
    }
];

export async function loadPlaces() {
    try {
        const querySnapshot = await getDocs(collection(db, "places"));
        let places = [];
        querySnapshot.forEach((doc) => {
            places.push({ id: doc.id, ...doc.data() });
        });

        if (places.length === 0) return MOCK_PLACES;
        return places;

    } catch (error) {
        console.error("Error loading places:", error);
        return MOCK_PLACES;
    }
}

export function renderPlaces(state) {
    const listContainer = document.getElementById('places-list');
    if (!listContainer) return;

    let filtered = state.places.filter(place => {
        const searchMatch = !state.filters.search ||
            place.name.toLowerCase().includes(state.filters.search) ||
            place.category.toLowerCase().includes(state.filters.search);

        const catMatch = state.filters.category === 'all' ||
            place.category.toLowerCase() === state.filters.category;

        let distMatch = true;
        if (state.location && place.latitude && place.longitude) {
            const dist = calculateDistance(
                state.location.lat,
                state.location.lng,
                place.latitude,
                place.longitude
            );
            place.distance = dist;
            distMatch = dist <= state.filters.distance;
        } else {
            place.distance = 999;
        }

        return searchMatch && catMatch && distMatch;
    });

    filtered.sort((a, b) => a.distance - b.distance);

    if (state.currentView === 'places') {
        updateMapMarkers(filtered);
    }

    if (filtered.length === 0) {
        listContainer.innerHTML = '<p class="text-center p-4">No places found.</p>';
        return;
    }

    listContainer.innerHTML = filtered.map(place => `
        <div class="card" onclick="focusOnMarker(${place.latitude}, ${place.longitude})">
            <div class="card-image" style="background-image: url('${place.imageUrl || 'assets/placeholder_place.jpg'}');"></div>
            <div class="card-content">
                <div class="card-subtitle">
                    <span class="rating"><i class="fas fa-star"></i> ${place.rating}</span>
                    <span>${place.distance < 900 ? place.distance + ' km' : ''}</span>
                </div>
                <h3 class="card-title">${place.name}</h3>
                <p style="font-size:12px; color:#757575; margin-bottom:8px;">${place.address}</p>
                 <div class="card-footer">
                    <span>${place.category}</span>
                    <span class="btn-small">View Map</span>
                </div>
            </div>
        </div>
    `).join('');
}

function updateMapMarkers(places) {
    clearMarkers();
    places.forEach(place => addPlaceMarker(place));
}
