// js/map.js - Updated to handle map clicks

console.log("[MAP.JS] map.js loaded successfully.");

let mapInstance = null; // To store the map instance
let mapClickCallback = null; // To store the callback for map clicks

// Export a function to set the map click callback
export function setMapClickCallback(callback) {
    mapClickCallback = callback;
    console.log("[MAP.JS] Map click callback set.");
    if (mapInstance) {
        mapInstance.off('click', onMapClick); // Remove existing listener to prevent duplicates
        mapInstance.on('click', onMapClick);
        console.log("[MAP.JS] Map click listener activated.");
    }
}

// Internal function to handle map clicks
function onMapClick(e) {
    if (mapClickCallback) {
        console.log("[MAP.JS] Map clicked at:", e.latlng.lat, e.latlng.lng);
        mapClickCallback(e.latlng.lat, e.latlng.lng);
    }
}

export function initializeMap() {
    console.log("[MAP.JS] initializeMap called.");

    if (mapInstance) {
        console.warn("[MAP.JS] Map already initialized. Skipping.");
        // If map is already initialized, ensure click listener is active
        if (mapClickCallback) {
            mapInstance.off('click', onMapClick); // Remove old one to prevent duplicates
            mapInstance.on('click', onMapClick);
            console.log("[MAP.JS] Re-activated map click listener.");
        }
        return mapInstance;
    }

    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error("[MAP.JS] Map container #map not found!");
        return null;
    }

    try {
        mapInstance = L.map('map').setView([51.505, -0.09], 13); // Default view (London)

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(mapInstance);

        // Attach click listener immediately if callback is already set (unlikely on first init)
        if (mapClickCallback) {
            mapInstance.on('click', onMapClick);
            console.log("[MAP.JS] Map click listener activated on init.");
        }

        console.log("[MAP.JS] Map initialized successfully.");
        return mapInstance;
    } catch (e) {
        console.error("[MAP.JS] Error initializing map:", e);
        return null;
    }
}