// js/map.js
//import { supabase } from '/Memory_Map/js/supabaseClient.js';
import { supabase } from '/Memory_Map/script.js';

import { showMarkerDialog } from '/Memory_Map/js/dialog.js';
import { loadCollectionsForCurrentUser, getSelectedCollectionIds, resetCollectionSelection } from '/Memory_Map/js/collections.js';

let map;
let currentMarkers = []; // Store markers retrieved from DB

const supportedMarkerColors = {
    'Blue': '#3498db',
    'Red': '#e74c3c',
    'Green': '#2ecc71',
    'Yellow': '#f1c40f',
    'Purple': '#9b59b6',
    'Orange': '#e67e22',
    'Gray': '#95a5a6'
};

function createColoredDivIcon(colorName) {
    const colorHex = supportedMarkerColors[colorName.charAt(0).toUpperCase() + colorName.slice(1)];
    const svgPinPath = `M12 0 C6.48 0 2 4.48 2 10.0 C2 16 12 25 12 25 C12 25 22 16 22 10.0 C22 4.48 17.52 0 12 0 Z`;

    return L.divIcon({
        className: 'custom-svg-icon',
        html: `
            <div class="marker-shadow-blob"></div>
            <svg class="marker-svg-shape" width="25" height="41" viewBox="0 0 24 40" xmlns="http://www.w3.org/2000/svg">
                <path d="${svgPinPath}" fill="${colorHex}" stroke="#666" stroke-width="0.5"/>
                <circle cx="12" cy="10" r="3" fill="white" />
            </svg>
            `,
        iconSize: [25, 41],
        iconAnchor: [12, 42],
        popupAnchor: [1, -34]
    });
}

export function initMap() {
    const bergenLat = 60.39;
    const bergenLng = 5.32;
    const initialZoom = 13;

    map = L.map('map').setView([bergenLat, bergenLng], initialZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const initialMarkerIcon = createColoredDivIcon('Blue');
    L.marker([bergenLat, bergenLng], { icon: initialMarkerIcon }).addTo(map)
        .bindPopup('A charming spot in Bergen, Norway!')
        .openPopup();

    setupMapClickEventListener();
    return map;
}

export async function loadMarkersForCurrentUser() {
    console.log("loadMarkersForCurrentUser: Attempting to get user session...");
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
        console.error("loadMarkersForCurrentUser: Error getting user:", userError.message);
        // Clear markers if there's an error getting user, to reflect logged-out state.
        map.eachLayer(function(layer) {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });
        return;
    }

    const user = userData.user;
    
    console.log("loadMarkersForCurrentUser: User object received:", user);

    if (!user) {
        console.warn("loadMarkersForCurrentUser: No user session found. Not loading markers.");
        // Clear existing markers from map if user logs out
        map.eachLayer(function(layer) {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });
        return;
    }

    // Clear existing markers from map before redrawing
    map.eachLayer(function(layer) {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });

    const { data, error } = await supabase
        .from('markers')
        .select(`
            id,
            name,
            latitude,
            longitude,
            color,
            created_at,
            marker_collections (
                collection_id,
                collections (
                    name
                )
            )
        `)
        .eq('user_id', user.id); // <--- CRITICAL FIX: Filter by user_id

    if (error) {
        console.error('Error loading markers:', error.message);
        return;
    }

    console.log("loadMarkersForCurrentUser: Markers data received:", data);

    currentMarkers = data;
    currentMarkers.forEach(markerData => {
        const newMarkerIcon = createColoredDivIcon(markerData.color);
        const newMarker = L.marker([markerData.latitude, markerData.longitude], { icon: newMarkerIcon }).addTo(map);

        let popupContent = `<b>${markerData.name}</b><br>
                            Created: ${new Date(markerData.created_at).toLocaleDateString()}`;

        if (markerData.marker_collections && markerData.marker_collections.length > 0) {
            const collectionNames = markerData.marker_collections
                .map(mc => mc.collections.name)
                .join(', ');
            popupContent += `<br>Collections: ${collectionNames}`;
        }
        newMarker.bindPopup(popupContent);
    });
    console.log("loadMarkersForCurrentUser: Finished rendering markers.");
}

function setupMapClickEventListener() {
    map.on('click', async function(e) {
        const { data: userData, error: userError } = await supabase.auth.getUser(); // Add error handling
        
        if (userError) {
            console.error("Map click: Error getting user:", userError.message);
            alert('An error occurred. Please try logging in again.');
            return;
        }

        const user = userData.user;
        if (!user) {
            alert('Please log in to add markers.');
            return;
        }

        const clickedLat = e.latlng.lat;
        const clickedLng = e.latlng.lng;

        try {
            resetCollectionSelection();
            await loadCollectionsForCurrentUser();

            const userInput = await showMarkerDialog(clickedLat, clickedLng);

            let markerName = userInput.message.trim();
            let markerColor = userInput.color;

            if (!markerName) {
                markerName = `Marker at ${clickedLat.toFixed(4)}, ${clickedLng.toFixed(4)}`;
            }

            const selectedCollectionIds = getSelectedCollectionIds();

            const { data: newMarkerData, error: markerError } = await supabase
                .from('markers')
                .insert({
                    user_id: user.id,
                    name: markerName,
                    latitude: clickedLat,
                    longitude: clickedLng,
                    color: markerColor
                })
                .select('id')
                .single();

            if (markerError) {
                console.error('Error saving marker:', markerError.message);
                alert('Failed to save marker: ' + markerError.message);
                return;
            }

            if (selectedCollectionIds.length > 0) {
                const linksToInsert = selectedCollectionIds.map(collectionId => ({
                    marker_id: newMarkerData.id,
                    collection_id: collectionId
                }));
                const { error: linkError } = await supabase
                    .from('marker_collections')
                    .insert(linksToInsert);

                if (linkError) {
                    console.error('Error linking marker to collections:', linkError.message);
                    alert('Marker saved, but failed to link to some collections: ' + linkError.message);
                }
            }

            alert('Marker added successfully!');
            loadMarkersForCurrentUser();
        } catch (error) {
            console.error("Map click error:", error.message); // More specific error logging
            alert("An error occurred while adding marker: " + error.message);
        }
    });
}