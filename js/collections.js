// js/collections.js - Basic Collection Management

// We will import supabase from script.js later, for now, assume it's available for this module
// import { supabase } from '/Memory_Map/js/script.js'; // Will be uncommented in next step

console.log("[COLLECTIONS.JS] collections.js loaded successfully.");

const collectionsListContainer = document.getElementById('collections-list');
const newCollectionNameInput = document.getElementById('new-collection-name');
const createCollectionBtn = document.getElementById('create-collection-btn');

let currentCollections = [];
let selectedCollectionId = null; // To track which collection is active

// Function to render collections in the UI
export function renderCollections(collections) {
    console.log("[COLLECTIONS.JS] renderCollections called with:", collections);
    currentCollections = collections;
    collectionsListContainer.innerHTML = ''; // Clear existing list

    if (collections.length === 0) {
        collectionsListContainer.textContent = "No collections yet. Create one!";
        return;
    }

    collections.forEach(collection => {
        const div = document.createElement('div');
        div.classList.add('collection-item');
        div.textContent = collection.name;
        div.dataset.id = collection.id; // Store Supabase ID

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
            // In a full app, this would trigger re-rendering markers for this collection
        });
        collectionsListContainer.appendChild(div);
    });
}

// Function to clear collections UI (e.g., on logout)
export function clearCollectionsUI() {
    console.log("[COLLECTIONS.JS] clearCollectionsUI called.");
    collectionsListContainer.innerHTML = '';
    collectionsListContainer.textContent = "No collections yet.";
    currentCollections = [];
    selectedCollectionId = null;
}

// Function to reset collection selection (e.g., when new markers are added)
export function resetCollectionSelection() {
    console.log("[COLLECTIONS.JS] resetCollectionSelection called.");
    selectedCollectionId = null;
    const prevSelected = collectionsListContainer.querySelector('.collection-item.selected');
    if (prevSelected) {
        prevSelected.classList.remove('selected');
    }
}

// This function will be called from script.js after login
export async function loadCollectionsForCurrentUser(supabaseInstance) {
    console.log("[COLLECTIONS.JS] loadCollectionsForCurrentUser called.");
    if (!supabaseInstance) {
        console.error("[COLLECTIONS.JS] Supabase instance not provided to loadCollectionsForCurrentUser.");
        return;
    }

    const { data: user } = await supabaseInstance.auth.getUser();
    if (!user || !user.user) {
        console.warn("[COLLECTIONS.JS] No authenticated user found for loading collections.");
        clearCollectionsUI();
        return;
    }

    try {
        console.log("[COLLECTIONS.JS] Attempting to fetch collections for user ID:", user.user.id);
        const { data: collections, error } = await supabaseInstance
            .from('collections')
            .select('*')
            .eq('user_id', user.user.id); // Assuming 'user_id' column in 'collections' table

        if (error) {
            console.error("[COLLECTIONS.JS] Error fetching collections:", error.message);
            clearCollectionsUI();
            return;
        }

        console.log("[COLLECTIONS.JS] Collections data received:", collections);
        renderCollections(collections);

    } catch (e) {
        console.error("[COLLECTIONS.JS] Uncaught error loading collections:", e.message);
        clearCollectionsUI();
    }
}

// Event listener for creating a new collection (will be activated in script.js)
// For now, it's just a placeholder
createCollectionBtn.addEventListener('click', () => {
    const newName = newCollectionNameInput.value.trim();
    if (newName) {
        console.log("[COLLECTIONS.JS] Attempting to create new collection:", newName);
        // This logic will be added later, likely in script.js or passed in
        alert(`Would create collection: ${newName}`);
        newCollectionNameInput.value = '';
    } else {
        alert("Collection name cannot be empty.");
    }
});