let map = null;
let userMarker = null;
let markersLayer = null;

// Default to New York if geolocation fails
const DEFAULT_COORDS = [40.7128, -74.0060];
const DEFAULT_ZOOM = 13;

export async function initMap(onLocationFound) {
    // 1. Initialize Map
    map = L.map('map', {
        zoomControl: false // We can add custom zoom controls if needed, or keep default
    }).setView(DEFAULT_COORDS, DEFAULT_ZOOM);

    // 2. Add Tile Layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // 3. Create Layer Group for markers
    markersLayer = L.layerGroup().addTo(map);

    // 4. Try Geolocation
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const userPos = [latitude, longitude];

                // Update map view
                map.setView(userPos, 14);

                // Add User Marker
                addUserMarker(userPos);

                // Callback
                if (onLocationFound) onLocationFound(latitude, longitude);
            },
            (error) => {
                console.warn("Geolocation failed or denied, using default.", error);
                // Still call callback with default
                if (onLocationFound) onLocationFound(DEFAULT_COORDS[0], DEFAULT_COORDS[1]);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    } else {
        console.warn("Geolocation not supported.");
        if (onLocationFound) onLocationFound(DEFAULT_COORDS[0], DEFAULT_COORDS[1]);
    }
}

function addUserMarker(latlng) {
    if (userMarker) userMarker.remove();

    const userIcon = L.divIcon({
        className: 'user-marker-icon',
        html: '<div style="background-color: #2196F3; width: 15px; height: 15px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    userMarker = L.marker(latlng, { icon: userIcon }).addTo(map);
    userMarker.bindPopup("You are here").openPopup();
}

export function flyTo(lat, lng) {
    if (map) {
        map.flyTo([lat, lng], 16, {
            animate: true,
            duration: 1.5
        });
    }
}

export function resizeMap() {
    if (map) {
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }
}

export function clearMarkers() {
    if (markersLayer) markersLayer.clearLayers();
}

export function addOfferMarker(offer) {
    if (!map || !markersLayer) return;

    // Determine Icon based on Premium
    // Using FontAwesome icons inside Leaflet DivIcon
    const isPremium = offer.isPremium;
    const color = isPremium ? '#ffca28' : '#6200ea'; // Amber vs Purple
    const zIndex = isPremium ? 1000 : 500; // Premium on top

    const iconHtml = `
        <div style="
            background-color: ${color};
            width: 30px;
            height: 30px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 3px 6px rgba(0,0,0,0.3);
            border: 2px solid white;">
            <i class="fas fa-tag" style="transform: rotate(45deg); color: white; font-size: 14px;"></i>
        </div>
    `;

    const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: iconHtml,
        iconSize: [30, 42],
        iconAnchor: [15, 42], // Tip at bottom
        popupAnchor: [0, -40]
    });

    const marker = L.marker([offer.latitude, offer.longitude], {
        icon: customIcon,
        zIndexOffset: zIndex
    });

    // Valid Till Date formatting
    const validDate = offer.validTill ? new Date(offer.validTill.seconds * 1000).toLocaleDateString() : 'N/A';

    const popupContent = `
        <div style="min-width: 200px;">
            <div style="
                height: 100px; 
                background-image: url('${offer.imageUrl || 'https://via.placeholder.com/200x100?text=Offer'}'); 
                background-size: cover; 
                border-radius: 8px 8px 0 0;
                margin-bottom: 8px;">
            </div>
            ${isPremium ? '<span style="background:#ffca28; font-size:10px; padding:2px 6px; border-radius:4px; font-weight:bold;">PREMIUM</span>' : ''}
            <h3 style="margin: 4px 0; font-size: 16px;">${offer.title}</h3>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${offer.businessName || 'Business'}</p>
            <p style="margin: 0; color: #6200ea; font-weight: bold;">${offer.discount || 'Special Deal'}</p>
            <p style="font-size: 11px; color: #999; margin-top: 5px;">Valid till: ${validDate}</p>
        </div>
    `;

    marker.bindPopup(popupContent);
    markersLayer.addLayer(marker);
}

export function addPlaceMarker(place) {
    if (!map || !markersLayer) return;

    const iconHtml = `
        <div style="
            background-color: #00bfa5;
            width: 30px;
            height: 30px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 3px 6px rgba(0,0,0,0.3);
            border: 2px solid white;">
            <i class="fas fa-store" style="transform: rotate(45deg); color: white; font-size: 14px;"></i>
        </div>
    `;

    const customIcon = L.divIcon({
        className: 'custom-place-marker',
        html: iconHtml,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -40]
    });

    const marker = L.marker([place.latitude, place.longitude], {
        icon: customIcon
    });

    const popupContent = `
        <div style="min-width: 200px;">
            <div style="
                height: 100px; 
                background-image: url('${place.imageUrl || 'https://via.placeholder.com/200x100?text=Place'}'); 
                background-size: cover; 
                border-radius: 8px 8px 0 0;
                margin-bottom: 8px;">
            </div>
            <h3 style="margin: 4px 0; font-size: 16px;">${place.name}</h3>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${place.address || ''}</p>
            <div style="display:flex; align-items:center; gap:4px; color:#fbc02d; font-weight:bold; font-size:12px;">
                <i class="fas fa-star"></i> ${place.rating || 'N/A'}
                <span style="color:#999; font-weight:normal;">(${place.category || 'General'})</span>
            </div>
        </div>
    `;

    marker.bindPopup(popupContent);
    markersLayer.addLayer(marker);
}
