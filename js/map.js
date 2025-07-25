// js/map.js - Basic Map Initialization
// Imports Leaflet JS (ESM version)
import 'https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.esm.js';

console.log("[MAP.JS] map.js loaded successfully.");

let mapInstance = null; // To store the map instance

export function initializeMap() {
    console.log("[MAP.JS] initializeMap called.");

    if (mapInstance) {
        console.warn("[MAP.JS] Map already initialized. Skipping.");
        return mapInstance;
    }

    // Ensure the map container exists before initializing
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

        console.log("[MAP.JS] Map initialized successfully.");
        return mapInstance;
    } catch (e) {
        console.error("[MAP.JS] Error initializing map:", e);
        return null;
    }
}

// You can add other map-related functions here as we progress
// For now, keep it minimal to confirm it loads and displays.