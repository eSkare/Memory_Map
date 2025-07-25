// script.js (your main entry point)
//import { initMap, loadMarkersForCurrentUser } from '/Memory_Map/js/map.js';
import { setupAuthUI } from '/Memory_Map/js/auth.js';
//import { setupCollectionListeners, loadCollectionsForCurrentUser } from '/Memory_Map/js/collections.js';
// No direct import of dialog.js needed here, map.js imports it.

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize the map first
    // Temporarily comment out initMap call during isolation
    // const mapInstance = initMap(); 
    const mapInstance = null; // Provide a dummy mapInstance to setupAuthUI if it expects one

    // Setup Auth UI, passing mapInstance for potential cleanup on logout
    setupAuthUI(mapInstance); // auth.js will now receive 'null' for mapInstance

    // Setup Collection listeners (create button etc.)
    // Temporarily comment out setupCollectionListeners call during isolation
    // setupCollectionListeners();

    // The initial session check and data loading (markers/collections)
    // are handled by onAuthStateChange in auth.js.
    // Ensure that in auth.js, the calls to loadMarkersForCurrentUser and loadCollectionsForCurrentUser
    // are also commented out during this test phase.
});