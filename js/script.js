// js/script.js - Main application logic

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { showDialog } from '/Memory_Map/js/dialog.js'; // Ensure this is the updated dialog.js
import { initializeMap, setMapClickCallback, clearAllMapMarkers, addMarkerToMap } from '/Memory_Map/js/map.js'; // Import new map functions
import { loadCollectionsForCurrentUser, clearCollectionsUI, resetCollectionSelection, handleCreateCollection, getSelectedCollectionId, getAllCollections } from '/Memory_Map/js/collections.js'; // Import new getAllCollections

// YOUR PROJECT URL AND ANON KEY - Make sure these are correct for YOUR project
const SUPABASE_URL = 'https://szcotkwupwrbawgprkbk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6Y290a3d1cHdyYmF3Z3Bya2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNTEyNDcsImV4cCI6MjA2ODkyNzI0N30.e-cQbi9lt803sGD-SUItopcE6WgmYcxLFgPsGFp32zI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); // Export Supabase client
console.log("Supabase client created successfully from external script.");

// DOM Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const usernameSpan = document.getElementById('usernameSpan');
const profileData = document.getElementById('profileData');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const usernameInput = document.getElementById('username');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const logoutBtn = document.getElementById('logoutBtn');
const testDialogBtn = document.getElementById('testDialogBtn');

const newCollectionNameInput = document.getElementById('new-collection-name');
const createCollectionBtn = document.getElementById('create-collection-btn');

let collectionListenerAttached = false;

async function fetchUserProfile(userId) {
    console.log("[SCRIPT.JS] Attempting to fetch profile for user ID:", userId);
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', userId)
            .single();

        if (error && error.message !== 'PGRST116: The result contains 0 rows') {
            console.error("[SCRIPT.JS] Error fetching profile:", error);
            return null;
        }
        console.log("[SCRIPT.JS] Profile data received:", profile);
        return profile;
    } catch (e) {
        console.error("[SCRIPT.JS] Caught error during profile fetch:", e);
        return null;
    }
}

// NEW/UPDATED: Load all markers for the current user and display them
export async function loadAndDisplayAllMarkers() {
    console.log("[SCRIPT.JS] Calling loadAndDisplayAllMarkers...");
    clearAllMapMarkers(); // Clear existing markers from the map before loading new ones

    const { data: user } = await supabase.auth.getUser();
    if (!user || !user.user) {
        console.warn("[SCRIPT.JS] No authenticated user found for loading markers.");
        return;
    }

    try {
        console.log("[SCRIPT.JS] Attempting to fetch all markers for user ID:", user.user.id);
        const { data: markers, error } = await supabase
            .from('markers')
            .select('*') // Fetch all fields including collection_id, color
            .eq('user_id', user.user.id);

        if (error) {
            console.error("[SCRIPT.JS] Error fetching markers:", error.message);
            return;
        }

        console.log("[SCRIPT.JS] Markers data received:", markers);
        markers.forEach(markerData => {
            addMarkerToMap(markerData.latitude, markerData.longitude, markerData.name, markerData.description, markerData.color);
        });
        console.log("[SCRIPT.JS] Finished loading and displaying markers.");

    } catch (e) {
        console.error("[SCRIPT.JS] Uncaught error loading markers:", e.message);
    }
}


// NEW/UPDATED: Handle map clicks for adding markers with a full form dialog
async function handleMapClick(lat, lng) {
    console.log("[SCRIPT.JS] Map clicked at:", lat, lng);

    const collections = getAllCollections(); // Get all available collections for the dropdown
    if (!collections || collections.length === 0) {
        showDialog("Add Marker", "You need to create at least one collection before adding markers. Please create a collection first.");
        return;
    }

    // Prepare options for the collection dropdown in the dialog
    const collectionOptions = collections.map(col => ({
        value: col.id,
        text: col.name
    }));

    // Determine default selected collection in the dropdown
    const preSelectedCollectionId = getSelectedCollectionId();
    let defaultCollection = collectionOptions[0] ? collectionOptions[0].value : ''; // Default to first available
    if (preSelectedCollectionId && collectionOptions.some(opt => opt.value === preSelectedCollectionId)) {
        defaultCollection = preSelectedCollectionId; // If a collection was selected in sidebar, use it
    }


    const markerDetails = await showDialog(
        "Add New Marker",
        "Please enter details for your new memory map marker:",
        {
            type: 'form',
            fields: [
                { id: 'name', label: 'Marker Name:', type: 'text', value: '' },
                { id: 'description', label: 'Description (optional):', type: 'textarea', value: '' },
                { id: 'color', label: 'Marker Color:', type: 'color', value: '#FF0000' }, // Default red
                { id: 'collection', label: 'Select Collection:', type: 'select', options: collectionOptions, value: defaultCollection }
            ]
        }
    );

    if (!markerDetails) { // User cancelled the dialog
        showDialog("Info", "Marker creation cancelled.");
        return;
    }

    // Basic validation
    if (!markerDetails.name || markerDetails.name.trim() === '') {
        showDialog("Error", "Marker name cannot be empty. Please try again.");
        return;
    }
    if (!markerDetails.collection || markerDetails.collection.trim() === '') {
        showDialog("Error", "Please select a collection. Marker not created.");
        return;
    }


    console.log("[SCRIPT.JS] Preparing to save marker:", {
        name: markerDetails.name,
        description: markerDetails.description,
        color: markerDetails.color,
        lat, lng,
        collectionId: markerDetails.collection
    });

    await saveMarkerToCollection(markerDetails.name, markerDetails.description, markerDetails.color, lat, lng, markerDetails.collection);
}

// Save marker to Supabase
async function saveMarkerToCollection(name, description, color, lat, lng, collectionId) {
    const { data: user } = await supabase.auth.getUser();
    if (!user || !user.user) {
        console.error("[SCRIPT.JS] Cannot save marker: No authenticated user.");
        showDialog("Error", "You must be logged in to save markers.");
        return;
    }

    try {
        // 1. Insert the new marker into the 'markers' table
        console.log("[SCRIPT.JS] Attempting to insert marker into 'markers' table:", {
            name, description, color, latitude: lat, longitude: lng, user_id: user.user.id
        });
        const { data: newMarkerData, error: markerError } = await supabase
            .from('markers')
            .insert({
                name: name,
                description: description, // Now includes description
                color: color,             // Now includes color
                latitude: lat,
                longitude: lng,
                user_id: user.user.id
            })
            .select('id'); // Select only the ID of the newly created marker

        if (markerError) {
            console.error("[SCRIPT.JS] Error saving marker to 'markers' table:", markerError.message);
            showDialog("Error", `Error saving marker: ${markerError.message}`);
            return;
        }

        const newMarkerId = newMarkerData[0].id;
        console.log("[SCRIPT.JS] Marker successfully saved to 'markers' table with ID:", newMarkerId);

        // 2. Insert the relationship into the 'marker_collections' table
        console.log("[SCRIPT.JS] Attempting to link marker to collection in 'marker_collections':", {
            marker_id: newMarkerId, collection_id: collectionId
        });
        const { error: linkError } = await supabase
            .from('marker_collections')
            .insert([
                { marker_id: newMarkerId, collection_id: collectionId }
            ]);

        if (linkError) {
            console.error("[SCRIPT.JS] Error linking marker to collection in 'marker_collections':", linkError.message);
            // IMPORTANT: If the link fails, you might want to consider deleting the marker just created.
            // For now, we'll just report the error and leave the marker.
            showDialog("Error", `Error linking marker to collection: ${linkError.message}`);
            return;
        }

        console.log("[SCRIPT.JS] Marker and collection linked successfully.");
        showDialog("Success", `Marker "${name}" added and linked to collection!`);

        // After saving and linking, immediately reload and display all markers to show the new one
        await loadAndDisplayAllMarkers();

    } catch (e) {
        console.error("[SCRIPT.JS] Uncaught error during marker saving or linking process:", e.message);
        showDialog("Error", `An unexpected error occurred: ${e.message}`);
    }
}


async function updateUI(session) {
    if (session) {
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        usernameSpan.textContent = session.user.email;

        initializeMap();
        setMapClickCallback(handleMapClick); // Set the map click callback

        const profile = await fetchUserProfile(session.user.id);
        if (profile) {
            usernameSpan.textContent = profile.username;
            profileData.textContent = JSON.stringify(profile, null, 2);
        } else {
            profileData.textContent = "Profile not found or error fetching.";
        }

        console.log("[SCRIPT.JS] Calling loadCollectionsForCurrentUser...");
        await loadCollectionsForCurrentUser();
        console.log("[SCRIPT.JS] Finished loadCollectionsForCurrentUser.");

        // Load and display all markers after collections are loaded
        await loadAndDisplayAllMarkers();

    } else {
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        usernameSpan.textContent = 'Guest';
        profileData.textContent = '';
        clearCollectionsUI();
        resetCollectionSelection();
        clearAllMapMarkers(); // Clear map markers from map on logout
    }
}

// Event Listeners
loginBtn.addEventListener('click', async () => {
    const { error } = await supabase.auth.signInWithPassword({
        email: emailInput.value,
        password: passwordInput.value
    });
    if (error) console.error('Login failed:', error.message);
});

signupBtn.addEventListener('click', async () => {
    const enteredUsername = usernameInput.value.trim(); // Get the username value
    if (!enteredUsername) {
        showDialog("Error", "Username cannot be empty. Please enter a username.");
        return; // Stop the signup if username is empty
    }

    const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email: emailInput.value,
        password: passwordInput.value,
        options: {
            // This is the crucial part that sends the username to Supabase's auth.users.raw_user_meta_data
            data: {
                username: enteredUsername
            }
        }
    });
    if (signUpError) {
        console.error('Signup failed:', signUpError.message);
        showDialog("Signup Failed", `Error: ${signUpError.message}`);
    } else if (user) {
        showDialog("Success", `User ${user.email} signed up! Check your email for confirmation (if enabled).`);
        // Optional: Clear fields after successful signup attempt
        emailInput.value = '';
        passwordInput.value = '';
        usernameInput.value = ''; // Clear username field too
    }
});

logoutBtn.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout failed:', error.message);
});

if (testDialogBtn) {
    testDialogBtn.addEventListener('click', () => {
        showDialog("Test Alert", "This is a test message from Dialog.js!");
    });
}

// --- START OF MODIFIED SECTION FOR COLLECTION BUTTON ---
// Attach the create collection handler from collections.js
// This 'if' condition now ensures the listener is only attached once, even if this block runs multiple times.
if (createCollectionBtn && newCollectionNameInput && !collectionListenerAttached) {
    createCollectionBtn.addEventListener('click', () => {
        handleCreateCollection(newCollectionNameInput.value.trim());
    });
    collectionListenerAttached = true; // Set the flag to true after attaching the listener
    console.log("[SCRIPT.JS] Collection creation listener attached successfully.");
} else if (collectionListenerAttached) {
    // This console.warn will help you confirm if the block is being hit multiple times
    console.warn("[SCRIPT.JS] Attempted to re-attach collection creation listener, but it was already attached (this is expected if the script re-runs, but the listener won't be duplicated).");
}
// --- END OF MODIFIED SECTION FOR COLLECTION BUTTON ---

// Supabase Auth State Change Listener
supabase.auth.onAuthStateChange((event, session) => {
    console.log("Auth state changed:", event, session ? "Session present" : "No session");
    updateUI(session);
});

// Initial session check
supabase.auth.getSession().then(({ data: { session } }) => {
    console.log("Initial getSession result:", session ? "Session found" : "No session found");
    updateUI(session);
});
