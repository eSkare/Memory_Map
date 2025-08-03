// js/map.js - Updated for marker management and display

//Web
import { popupDeleteMarker, popupEditMarker, popupViewMarker } from '/Memory_Map/js/collections_v5.js';

//Local, Live server
//import { popupDeleteMarker, popupEditMarker, popupViewMarker } from '/js/collections_v5.js';


let mapInstance = null; // To store the map instance
let mapClickCallback = null; // To store the callback for map clicks
let currentMapMarkers = []; // Array to keep track of Leaflet markers
let userLocationMarker = null; // A variable to hold the marker, so we can update or remove it later
const userLocationLoadingIndicator = document.getElementById('user-location-loading');


// Export function to set the map click callback
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
        mapInstance = L.map('map').setView([60.3913, 5.3221], 11);

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

export function clearAllMapMarkers() {
    console.log("[MAP.JS] Clearing all markers.");
    currentMapMarkers.forEach(marker => {
        if (mapInstance && mapInstance.hasLayer(marker)) {
            mapInstance.removeLayer(marker);
        }
    });
    currentMapMarkers = []; // Reset the array
}

export function addMarkerToMap(markerData) {
    if (!mapInstance) {
        console.error("[MAP.JS] Cannot add marker: Map not initialized.");
        return null;
    }
    //console.log("Markerdata", markerData)
    const { color, created_at, description, id, latitude, longitude, name, user_id} = markerData;
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

    const marker = L.marker([latitude, longitude], { icon: icon }).addTo(mapInstance);
    
    let popupContent = `
        <div class="custom-popup-content">
            <strong>${name || 'Unnamed Location'}</strong>
            ${description ? `<br>${description}` : ''}
            <div class="popup-buttons">
                <button class="btn btn-sm btn-info view-details-btn" data-location-id="${id}">View</button>
                <button class="btn btn-sm btn-warning edit-btn" data-location-id="${id}">Edit</button>
                <button class="btn btn-sm btn-danger delete-btn" data-location-id="${id}">Delete</button>
            </div>
        </div>
    `;
    marker.bindPopup(popupContent); // Bind a popup with title and description
        // --- Attach Event Listener for Popup Open ---
    marker.on('popupopen', function() {
        // Get the actual DOM element of the popup content
        const popupContentDiv = marker.getPopup().getElement();

        // Get references to the buttons inside the popup
        const viewBtn = popupContentDiv.querySelector('.view-details-btn');
        const editBtn = popupContentDiv.querySelector('.edit-btn');
        const deleteBtn = popupContentDiv.querySelector('.delete-btn');

        // Extract the location ID from the button's data attribute
        const clickedLocationId = viewBtn.dataset.locationId; // Assuming all buttons have the same data-location-id

        // Attach click handlers
        if (viewBtn) {
            viewBtn.onclick = () => popupViewMarker(clickedLocationId);
        }
        if (editBtn) {
            editBtn.onclick = () => popupEditMarker(clickedLocationId);
        }
        if (deleteBtn) {
            // For delete, you might also want to pass the marker itself to remove it from the map immediately
            deleteBtn.onclick = () => popupDeleteMarker(clickedLocationId, marker);
        }
    });

    currentMapMarkers.push(marker); // Keep track of the marker
    //console.log(`[MAP.JS] Added marker "${title}" at [${lat}, ${lng}] with color ${color}.`);
    return marker;
}

/* export function recenterMap(){
    if (mapInstance) {
        mapInstance.setView([60.3913, 5.3221], 11); 
        setTimeout(() => {
            mapInstance.invalidateSize();
        }, 300); // 300ms delay for a typical CSS transition
        console.log("Map re-centered to fixed location after user login.");
    } else {
        console.error("Map instance not available to set view after login.");
    }
} */

//Only map, not database
export function removeMarkerFromMap(marker, locationId){
    if (marker && mapInstance) {
        mapInstance.removeLayer(marker);
        console.log(`Marker with ID ${locationId} removed from map.`);
    }
    if (currentMapMarkers && Array.isArray(currentMapMarkers)) {
        currentMapMarkers = currentMapMarkers.filter(m => m._leaflet_id !== marker._leaflet_id);
    }
}

export function showUserLocationOnMap() {
    if (userLocationLoadingIndicator) {
        userLocationLoadingIndicator.classList.remove('hidden');
    }
    // Check if the browser supports the Geolocation API
    if ("geolocation" in navigator) {
        // Request the user's current position
        navigator.geolocation.getCurrentPosition(
            // Success Callback: this function runs if the user grants permission
            (position) => {
                if (userLocationLoadingIndicator) {
                    userLocationLoadingIndicator.classList.add('hidden');
                }
                const { latitude, longitude } = position.coords;
                const userLatLng = [latitude, longitude];

                console.log(`[MAP.JS] User location found at: Lat ${latitude}, Lng ${longitude}`);
                
                // Clear any previous user location marker
                if (userLocationMarker) {
                    mapInstance.removeLayer(userLocationMarker);
                }

                // Create a new marker for the user's location
                userLocationMarker = L.marker(userLatLng)
                    .addTo(mapInstance)
                    .bindPopup("You are here!")
                    .openPopup();
                
                // Center the map view on the user's location with a zoom level
                mapInstance.setView(userLatLng, 15); // Zoom level 15 is a good default
            },
            // Error Callback: this function runs if the user denies permission or an error occurs
            (error) => {
                if (userLocationLoadingIndicator) {
                    userLocationLoadingIndicator.classList.add('hidden');
                }
                if (mapInstance) {
                    mapInstance.setView([60.3913, 5.3221], 11); 
                    setTimeout(() => {
                        mapInstance.invalidateSize();
                    }, 300); // 300ms delay for a typical CSS transition
                    console.log("Map re-centered to fixed location after user login.");
                } else {
                    console.error("Map instance not available to set view after login.");
                }
                console.error("[MAP.JS] Geolocation error:", error.message);
                console.error(`[MAP.JS] Geolocation error (${error.code}): ${error.message}`);
                // You can also log the entire error object for more detail
                console.error("Full error object:", error);
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        alert("Permission to get your location was denied.");
                        break;
                    case error.POSITION_UNAVAILABLE:
                        alert("Your location information is unavailable.");
                        break;
                    case error.TIMEOUT:
                        alert("The request to get your location timed out.");
                        break;
                    default:
                        alert("An unknown error occurred while getting your location.");
                }
            }
        );
    } else {
        if (userLocationLoadingIndicator) {
            userLocationLoadingIndicator.classList.add('hidden');
        }
        // Geolocation is not supported in this browser
        alert("Geolocation is not supported by your browser.");
        console.error("[MAP.JS] Geolocation API not supported.");
        if (mapInstance) {
            mapInstance.setView([60.3913, 5.3221], 11); 
            setTimeout(() => {
                mapInstance.invalidateSize();
            }, 300); // 300ms delay for a typical CSS transition
            console.log("Map re-centered to fixed location after user login.");
        } else {
            console.error("Map instance not available to set view after login.");
        }
    }
}