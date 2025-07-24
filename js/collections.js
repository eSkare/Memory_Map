// js/collections.js
import { supabase } from 'Memory_Map/js/supabaseClient.js';

let currentCollections = []; // Store collections retrieved from DB

const collectionsList = document.getElementById('collectionsList');
const newCollectionInput = document.getElementById('newCollectionInput');
const createCollectionButton = document.getElementById('createCollectionButton');

export async function loadCollectionsForCurrentUser() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const { data, error } = await supabase
        .from('collections')
        .select('id, name');

    if (error) {
        console.error('Error loading collections:', error.message);
        return;
    }

    currentCollections = data;
    renderCollectionOptions();
}

export function renderCollectionOptions() {
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
    return Array.from(collectionsList.querySelectorAll('input[name="selectedCollections"]:checked'))
                .map(cb => cb.value);
}

export function resetCollectionSelection() {
    collectionsList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    newCollectionInput.value = '';
}

export function setupCollectionListeners() {
    createCollectionButton.addEventListener('click', async () => {
        const newName = newCollectionInput.value.trim();
        if (!newName) {
            alert('Please enter a name for the new collection.');
            return;
        }

        const { data: userData } = await supabase.auth.getUser(); // Ensure user is logged in for collection creation
        const user = userData.user;
        if (!user) {
            alert('Please log in to create collections.');
            return;
        }

        const { data, error } = await supabase
            .from('collections')
            .insert({ name: newName, user_id: user.id }) // Ensure user_id is passed for RLS
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
}