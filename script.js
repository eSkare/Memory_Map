// script.js (your main entry point)
import { initMap, loadMarkersForCurrentUser } from './js/map.js';
import { setupAuthUI } from './js/auth.js';
import { setupCollectionListeners, loadCollectionsForCurrentUser } from './js/collections.js';
// No direct import of dialog.js needed here, map.js imports it.

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize the map first
    const mapInstance = initMap();

    // Setup Auth UI, passing mapInstance for potential cleanup on logout
    setupAuthUI(mapInstance);

    // Setup Collection listeners (create button etc.)
    setupCollectionListeners();

    // Initial check for session (This will trigger loadMarkersForCurrentUser etc. via onAuthStateChange)
    // No explicit call needed here if setupAuthUI handles the initial session check within its onAuthStateChange.
    // However, it's good to ensure initial state is correct.
    // The onAuthStateChange listener is already called on initialization.
    // The relevant functions (loadMarkersForCurrentUser, loadCollectionsForCurrentUser)
    // are called within the auth.js's onAuthStateChange handler.
    // So, effectively, the initial logic to check for session and load data is now implicitly handled
    // by the onAuthStateChange in auth.js when the page loads.
});