// js/collections.js
//import { supabase } from '/Memory_Map/js/supabaseClient.js';
import { supabase } from '/Memory_Map/script.js';

let currentCollections = []; // Store collections retrieved from DB

// Corrected IDs: Please ensure these match your index.html exactly!
const collectionsList = document.getElementById('collection-list');
const newCollectionInput = document.getElementById('new-collection-name');
const createCollectionButton = document.getElementById('add-collection-btn');

export async function loadCollectionsForCurrentUser() {
    console.log("loadCollectionsForCurrentUser: Attempting to get user session...");
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
        console.error("loadCollectionsForCurrentUser: Error getting user:", userError.message);
        clearCollectionsUI(); // Clear UI if there's an error getting user
        return;
    }

    const user = userData.user;
    console.log("loadCollectionsForCurrentUser: User object received:", user);

    if (!user) {
        console.warn("loadCollectionsForCurrentUser: No user session found. Not loading collections.");
        clearCollectionsUI(); // Ensure UI is cleared
        return;
    }

    const { data, error } = await supabase
        .from('collections')
        .select('id, name')
        .eq('user_id', user.id); // <--- CRITICAL FIX: Filter by user_id

    if (error) {
        console.error('Error loading collections:', error.message);
        return;
    }

    console.log("loadCollectionsForCurrentUser: Collections data received:", data);
    currentCollections = data; // Assign data to currentCollections
    renderCollectionOptions();
}

export function renderCollectionOptions() {
    if (!collectionsList) { // Added a check to ensure collectionsList element exists
        console.warn("collectionsList element not found. Cannot render collection options.");
        return;
    }
    collectionsList.innerHTML = '';
    currentCollections.forEach(collection => {
        const checkboxId = `collection-${collection.id}`;
        const wrapper = document.createElement('div');
        wrapper.classList.add('collection-option-wrapper');

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = checkboxId;
        input.name = 'selectedCollections';
        input.value = collection.id;

        const label = document.createElement('label');
        label.htmlFor = checkboxId;
        label.textContent = collection.name;

        wrapper.appendChild(input);
        wrapper.appendChild(label);
        collectionsList.appendChild(wrapper);
    });
}

export function getSelectedCollectionIds() {
    if (!collectionsList) return []; // Return empty array if element not found
    return Array.from(collectionsList.querySelectorAll('input[name="selectedCollections"]:checked'))
                .map(cb => cb.value);
}

export function resetCollectionSelection() {
    if (collectionsList) {
        collectionsList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    }
    if (newCollectionInput) {
        newCollectionInput.value = '';
    }
}

export function clearCollectionsUI() {
    console.log('Clearing collections UI...');
    if (collectionsList) {
        collectionsList.innerHTML = '';
    }
    currentCollections = [];
    if (newCollectionInput) {
        newCollectionInput.value = '';
    }
}

export function setupCollectionListeners() {
    if (createCollectionButton) { // Ensure button exists before adding listener
        createCollectionButton.addEventListener('click', async () => {
            const newName = newCollectionInput.value.trim();
            if (!newName) {
                alert('Please enter a name for the new collection.');
                return;
            }

            const { data: userData, error: userError } = await supabase.auth.getUser(); // Add error handling
            
            if (userError) {
                console.error("Collection creation: Error getting user:", userError.message);
                alert('An error occurred. Please try logging in again to create a collection.');
                return;
            }

            const user = userData.user;
            if (!user) {
                alert('Please log in to create collections.');
                return;
            }

            const { data, error } = await supabase
                .from('collections')
                .insert({ name: newName, user_id: user.id })
                .select('id, name')
                .single();

            if (error) {
                alert('Error creating collection: ' + error.message);
            } else {
                currentCollections.push(data);
                renderCollectionOptions();
                newCollectionInput.value = '';
                alert('Collection created successfully!');
            }
        });
    } else {
        console.warn("Create Collection Button not found. Collection listeners not set up.");
    }
}