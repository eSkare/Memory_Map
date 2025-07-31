// js/collections.js - Exporting all current collections and selected ID

// Web
import { showDialog } from '/Memory_Map/js/dialog_v1.js';
import { supabase } from '/Memory_Map/js/supabaseClient_v1.js'; // Import supabase instance 
import { removeMarkerFromMap } from '/Memory_Map/js/map_v4.js'; 


// Local, Liver server
/* import { showDialog } from '/js/dialog_v1.js';
import { supabase } from '/js/supabaseClient_v1.js'; // Import supabase instance
import { removeMarkerFromMap } from '/js/map_v4.js'; */

//console.log("[COLLECTIONS.JS] collections.js loaded successfully.");

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
        //div.textContent = collection.name;
        div.dataset.id = collection.id;

        if (collection.id === selectedCollectionId) {
            div.classList.add('selected');
        }

        // Create the name span
        const nameSpan = document.createElement('span');
        nameSpan.textContent = collection.name;
        div.appendChild(nameSpan);

        // Create a container for action buttons (the popup trigger)
        const actionsContainer = document.createElement('div');
        actionsContainer.classList.add('collection-actions');
        
        // Add the 'options' button (e.g., a kebab menu icon)
        const optionsButton = document.createElement('button');
        optionsButton.classList.add('btn', 'btn-sm', 'btn-secondary', 'collection-options-btn');
        optionsButton.textContent = '...'; // Or an icon like &#8942;
        optionsButton.dataset.collectionId = collection.id;
        actionsContainer.appendChild(optionsButton);

        div.appendChild(actionsContainer);

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
        });

        // Listener for the options button click (opens the popup)
        optionsButton.addEventListener('click', (event) => {
            // STOP the click from bubbling up to the parent div
            // This prevents the collection from being selected/deselected
            event.stopPropagation();

            showCollectionOptionsPopup(collection.id, event.target);
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
    //console.log("[COLLECTIONS.JS] handleCreateCollection called! Instance ID:", Math.random());
    if (!collectionName) {
        showDialog("Missing name", "Collection name cannot be empty.")
        return;
    }

    const { data: user } = await supabase.auth.getUser();
    if (!user || !user.user) {
        console.error("[COLLECTIONS.JS] No authenticated user to create collection.");
        showDialog("No user", "You must be logged in to create a collection")
        return;
    }

    //console.log("[COLLECTIONS.JS] Attempting to create new collection:", collectionName, "for user:", user.user.id);

    try {
        const { data, error } = await supabase
            .from('collections')
            .insert([
                { name: collectionName, user_id: user.user.id }
            ])
            .select();

        if (error) {
            console.error("[COLLECTIONS.JS] Error creating collection:", error.message);
            showDialog("Error", `Error creating collection: ${error.message}`);
            return;
        }

        console.log("[COLLECTIONS.JS] Collection created successfully:", data);
        showDialog("Success", `Collection "${collectionName}" created successfully!`);
        
        await loadCollectionsForCurrentUser(); // Reload collections to update the UI and selection
        
        const newCollectionNameInput = document.getElementById('new-collection-name');
        if (newCollectionNameInput) {
            newCollectionNameInput.value = '';
        }

    } catch (e) {
        console.error("[COLLECTIONS.JS] Uncaught error during collection creation:", e.message);
        showDialog("Error", `An unexpected error occurred during collection creation: ${e.message}`);
    }
}


export async function popupDeleteMarker(locationId, marker) {
    console.log(`[locationHandlers.js] Delete button clicked for location ID: ${locationId}`);

    const confirmed = await showDialog(
        'Confirm Deletion',
        'Are you sure you want to delete this marker? This action cannot be undone.',
        'confirm' // Pass a 'type' argument if your showDialog uses it for styling/behavior
    );

    if (!confirmed) { // If showDialog resolves to false (user clicked 'Cancel' or equivalent)
        console.log("Deletion cancelled by user.");
        return;
    }

    try {
        const { error } = await supabase
            .from('markers') // <-- IMPORTANT: Update this
            .delete()
            .eq('id', locationId);

        if (error) {
            console.error('Supabase Delete Error:', error.message);
            alert(`Failed to delete location: ${error.message}`);
            return;
        }

        console.log(`Marker with ID ${locationId} successfully deleted from database.`);
        removeMarkerFromMap(marker, locationId)
        showDialog('Marker deleted successfully.')

    } catch (e) {
        console.error('An unexpected error occurred during deletion:', e.message);
        alert(`An unexpected error occurred: ${e.message}`);
    }
}

export function popupEditMarker(selected_marker) {
    console.log(`Edit button clicked for location ID:`, selected_marker);
}

export function popupViewMarker(selected_marker) {
    console.log('View Details button clicked for location ID: ', selected_marker);
}


function showCollectionOptionsPopup(collectionId, targetButton) {
    const existingPopup = document.querySelector('.collection-options-popup');
    if (existingPopup) {
        existingPopup.remove();
    }

    const popupDiv = document.createElement('div');
    popupDiv.classList.add('collection-options-popup');
    popupDiv.style.position = 'absolute';
    popupDiv.style.zIndex = 1000;
    
    const rect = targetButton.getBoundingClientRect();
    const popupHeight = popupDiv.offsetHeight;
    const popupWidth = popupDiv.offsetWidth;
    popupDiv.style.top = `${rect.top + window.scrollY - popupHeight - 5}px`;
    popupDiv.style.left = `${rect.left + window.scrollX + rect.width - popupWidth}px`;
    

    popupDiv.innerHTML = `
        <button class="btn btn-sm btn-info w-100 mb-1" data-action="view">View</button>
        <button class="btn btn-sm btn-warning w-100 mb-1" data-action="edit">Edit</button>
        <button class="btn btn-sm btn-danger w-100" data-action="delete">Delete</button>
    `;

    document.body.appendChild(popupDiv);

    // Add event listener to handle button clicks inside the popup
    popupDiv.addEventListener('click', (event) => {
        const action = event.target.dataset.action;
        if (action) {
            switch(action) {
                case 'view': popupViewCollection(collectionId); break;
                case 'edit': popupEditCollection(collectionId); break;
                case 'delete': popupDeleteCollection(collectionId); break;
            }
            popupDiv.remove(); // Hide the popup after an action is selected
        }
    });

    // Hide the popup if the user clicks anywhere else
    document.addEventListener('click', function closePopup(event) {
        if (!popupDiv.contains(event.target) && event.target !== targetButton) {
            popupDiv.remove();
            document.removeEventListener('click', closePopup);
        }
    });
}

function popupViewCollection(collectionId) {
    console.log(`[COLLECTIONS.JS] View collection with ID: ${collectionId}`);
}

function popupEditCollection(collectionId) {
    console.log(`[COLLECTIONS.JS] Edit collection with ID: ${collectionId}`);
}

function popupDeleteCollection(collectionId) {
    console.log(`[COLLECTIONS.JS] Delete collection with ID: ${collectionId}`);
}