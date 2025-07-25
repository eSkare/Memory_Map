// js/map.js - Fix for 'L is not defined'

// Import Leaflet. This loads the library and typically makes 'L' available globally.
import 'https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.esm.js';

console.log("[MAP.JS] map.js loaded successfully. Attempting to get Leaflet's 'L' object.");

// Explicitly get the global L object from the window.
// This ensures 'L' is in scope within this module after it's loaded by the import.
const Leaflet = window.L; 

if (typeof Leaflet === 'undefined') {
    console.error("[MAP.JS] Leaflet's global 'L' object is still not defined after import!");
    // You might want to add a fallback or throw an error here in a production app
} else {
    console.log("[MAP.JS] Leaflet 'L' object found successfully.");
}

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
        // Use our local 'Leaflet' variable instead of the assumed global 'L'
        mapInstance = Leaflet.map('map').setView([51.505, -0.09], 13); // Default view (London)

        Leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
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