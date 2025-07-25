// js/map.js - Updated for marker management and display

console.log("[MAP.JS] map.js loaded successfully.");

let mapInstance = null; // To store the map instance
let mapClickCallback = null; // To store the callback for map clicks
let currentMapMarkers = []; // Array to keep track of Leaflet markers

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
        // Set initial view to a more central location or user's last known location
        mapInstance = L.map('map').setView([60.3913, 5.3221], 11); // Initial view: Bergen, Norway

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

// NEW: Function to clear all markers from the map
export function clearAllMapMarkers() {
    console.log("[MAP.JS] Clearing all markers.");
    currentMapMarkers.forEach(marker => {
        if (mapInstance && mapInstance.hasLayer(marker)) {
            mapInstance.removeLayer(marker);
        }
    });
    currentMapMarkers = []; // Reset the array
}

// NEW: Function to add a single marker to the map with custom color and popup
export function addMarkerToMap(lat, lng, title, description, color = '#007bff') {
    if (!mapInstance) {
        console.error("[MAP.JS] Cannot add marker: Map not initialized.");
        return null;
    }

    // Create a custom icon with the specified color
    const markerHtmlStyles = `
        background-color: ${color};
        width: 1.5rem;
        height: 1.5rem;
        display: block;
        left: -0.75rem;
        top: -0.75rem;
        position: relative;
        border-radius: 1.5rem 1.5rem 0;
        transform: rotate(45deg);
        border: 1px solid #FFFFFF; /* Optional border */
    `;
    const icon = L.divIcon({
        className: "my-custom-pin",
        iconAnchor: [0, 24],
        popupAnchor: [0, -36],
        html: `<span style="${markerHtmlStyles}" />`
    });

    const marker = L.marker([lat, lng], { icon: icon }).addTo(mapInstance);
    
    // Create popup content
    let popupContent = `<strong>${title}</strong>`;
    if (description) {
        popupContent += `<br>${description}`;
    }
    marker.bindPopup(popupContent); // Bind a popup with title and description

    currentMapMarkers.push(marker); // Keep track of the marker
    console.log(`[MAP.JS] Added marker "${title}" at [${lat}, ${lng}] with color ${color}.`);
    return marker;
}
/*
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
*/