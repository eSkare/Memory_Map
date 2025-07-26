// js/collections.js - Exporting all current collections and selected ID

import { showDialog } from '/Memory_Map/js/dialog.js';
import { supabase } from '/Memory_Map/js/script.js'; // Import supabase instance

console.log("[COLLECTIONS.JS] collections.js loaded successfully.");

const collectionsListContainer = document.getElementById('collections-list');

let currentCollections = []; // This array now stores the fetched collections
let selectedCollectionId = null; // To track which collection is active

// Export function to get the currently selected collection ID
export function getSelectedCollectionId() {
    return selectedCollectionId;
}

// NEW: Export function to get all current collections
export function getAllCollections() {
    return currentCollections;
}

export function renderCollections(collections) {
    console.log("[COLLECTIONS.JS] renderCollections called with:", collections);
    currentCollections = collections; // Update the module-level variable
    collectionsListContainer.innerHTML = '';

    if (collections.length === 0) {
        collectionsListContainer.textContent = "No collections yet. Create one!";
        return;
    }

    collections.forEach(collection => {
        const div = document.createElement('div');
        div.classList.add('collection-item');
        div.textContent = collection.name;
        div.dataset.id = collection.id;

        if (collection.id === selectedCollectionId) {
            div.classList.add('selected');
        }

        div.addEventListener('click', () => {
            // Toggle selection
            if (selectedCollectionId === collection.id) {
                selectedCollectionId = null;
                div.classList.remove('selected');
                console.log("[COLLECTIONS.JS] Collection deselected:", collection.name);
            } else {
                // Deselect previous
                const prevSelected = collectionsListContainer.querySelector('.collection-item.selected');
                if (prevSelected) {
                    prevSelected.classList.remove('selected');
                }
                selectedCollectionId = collection.id;
                div.classList.add('selected');
                console.log("[COLLECTIONS.JS] Collection selected:", collection.name);
            }
            // TODO (Future): Trigger re-rendering markers for this selected collection (if filtering by collection is implemented)
        });
        collectionsListContainer.appendChild(div);
    });
}

export function clearCollectionsUI() {
    console.log("[COLLECTIONS.JS] clearCollectionsUI called.");
    collectionsListContainer.innerHTML = '';
    collectionsListContainer.textContent = "No collections yet.";
    currentCollections = [];
    selectedCollectionId = null;
}

export function resetCollectionSelection() {
    console.log("[COLLECTIONS.JS] resetCollectionSelection called.");
    selectedCollectionId = null;
    const prevSelected = collectionsListContainer.querySelector('.collection-item.selected');
    if (prevSelected) {
        prevSelected.classList.remove('selected');
    }
}

export async function loadCollectionsForCurrentUser() {
    console.log("[COLLECTIONS.JS] loadCollectionsForCurrentUser called.");
    const { data: user } = await supabase.auth.getUser();
    if (!user || !user.user) {
        console.warn("[COLLECTIONS.JS] No authenticated user found for loading collections.");
        clearCollectionsUI();
        return;
    }

    try {
        console.log("[COLLECTIONS.JS] Attempting to fetch collections for user ID:", user.user.id);
        const { data: collections, error } = await supabase
            .from('collections')
            .select('*')
            .eq('user_id', user.user.id);

        if (error) {
            console.error("[COLLECTIONS.JS] Error fetching collections:", error.message);
            clearCollectionsUI();
            return;
        }

        console.log("[COLLECTIONS.JS] Collections data received:", collections);
        renderCollections(collections); // This updates currentCollections
        // If there's a selectedCollectionId from a previous session and it still exists, ensure it's selected.
        if (selectedCollectionId && !collections.some(col => col.id === selectedCollectionId)) {
            selectedCollectionId = null; // Clear if previously selected collection no longer exists
        }
        // If no collection is selected, and there are collections, auto-select the first one
        if (!selectedCollectionId && collections.length > 0) {
            selectedCollectionId = collections[0].id;
            // Re-render to show selection
            renderCollections(collections);
        }

    } catch (e) {
        console.error("[COLLECTIONS.JS] Uncaught error loading collections:", e.message);
        clearCollectionsUI();
    }
}

export async function handleCreateCollection(collectionName) {
    console.log("[COLLECTIONS.JS] handleCreateCollection called! Instance ID:", Math.random());

    if (!collectionName) {
        alert("Collection name cannot be empty.");
        return;
    }

    const { data: user } = await supabase.auth.getUser();
    if (!user || !user.user) {
        console.error("[COLLECTIONS.JS] No authenticated user to create collection.");
        alert("You must be logged in to create a collection.");
        return;
    }

    console.log("[COLLECTIONS.JS] Attempting to create new collection:", collectionName, "for user:", user.user.id);

    try {
        const { data, error } = await supabase
            .from('collections')
            .insert([
                { name: collectionName, user_id: user.user.id }
            ])
            .select();

        if (error) {
            console.error("[COLLECTIONS.JS] Error creating collection:", error.message);
            //alert("Error creating collection: " + error.message);
            showDialog("Error", `Error creating collection: ${error.message}`);
            return;
        }

        console.log("[COLLECTIONS.JS] Collection created successfully:", data);
        //alert(`Collection "${collectionName}" created successfully!`);
        showDialog("Success", `Collection "${collectionName}" created successfully!`);
        
        await loadCollectionsForCurrentUser(); // Reload collections to update the UI and selection
        
        const newCollectionNameInput = document.getElementById('new-collection-name');
        if (newCollectionNameInput) {
            newCollectionNameInput.value = '';
        }

    } catch (e) {
        console.error("[COLLECTIONS.JS] Uncaught error during collection creation:", e.message);
        //alert("An unexpected error occurred during collection creation.");
        showDialog("Error", `An unexpected error occurred during collection creation: ${e.message}`);
    }
}
