// js/map.js - Updated to use global L (from index.html script tag)

// REMOVE THIS LINE:
// import 'https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.esm.js';

console.log("[MAP.JS] map.js loaded successfully.");

// We no longer need to explicitly get L from window.L here,
// as the global L should be available directly after the <script> tag loads it.
// Remove the 'const Leaflet = window.L;' line and the check for it.

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
        // Now, L should be globally available from the script tag in index.html
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