// js/map.js - Updated to use global L (from index.html script tag)

// NO import statement for Leaflet here!

console.log("[MAP.JS] map.js loaded successfully.");

let mapInstance = null; // To store the map instance

export function initializeMap() {
    console.log("[MAP.JS] initializeMap called.");

    if (mapInstance) {
        console.warn("[MAP.JS] Map already initialized. Skipping.");
        return mapInstance;
    }

    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error("[MAP.JS] Map container #map not found!");
        return null;
    }

    try {
        // L should be globally available from the script tag in index.html
        mapInstance = L.map('map').setView([51.505, -0.09], 13); // Default view (London)

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(mapInstance);

        console.log("[MAP.JS] Map initialized successfully.");
        return mapInstance;
    } catch (e) {
        console.error("[MAP.JS] Error initializing map:", e);
        return null;
    }
}