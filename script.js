// At the very top of your script.js
const SUPABASE_URL = 'https://szcotkwupwrbawgprkbk.supabase.co'; // Replace with your Project URL
const SUPABASE_ANON_KEY = 'sb_publishable_ZQcsxoa1HmByAK0nBLT-iA_Bzs0xgwd'; // Replace with your anon key

// Initialize Supabase client directly at the top of the script.
// Because script.js will now be 'deferred', it runs AFTER the Supabase CDN script has loaded.
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// Wrap all your main logic that interacts with the DOM inside a DOMContentLoaded listener.
// This is still good practice to ensure all HTML elements are ready before you try to access them.
document.addEventListener('DOMContentLoaded', async () => {
    // Define the latitude and longitude for Bergen, Norway (your initial view)
    const bergenLat = 60.39;
    const bergenLng = 5.32;
    const initialZoom = 13; // A good starting zoom level for a city

    // 1. Initialize the map and set its view
    var map = L.map('map').setView([bergenLat, bergenLng], initialZoom);

    // 2. Add the OpenStreetMap tiles layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Array of supported colors for the marker (must match CSS swatch classes)
    const supportedMarkerColors = {
        'Blue': '#3498db',
        'Red': '#e74c3c',
        'Green': '#2ecc71',
        'Yellow': '#f1c40f',
        'Purple': '#9b59b6',
        'Orange': '#e67e22',
        'Gray': '#95a5a6'
    };

    // Function to create an L.divIcon with the specified color
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

    // 3. --- MODIFIED: Add the initial marker using your custom icon function ---
    // Create the icon for the initial marker (e.g., default to 'Blue')
    const initialMarkerIcon = createColoredDivIcon('Blue'); // Or choose any other default color

    L.marker([bergenLat, bergenLng], { icon: initialMarkerIcon }).addTo(map)
        .bindPopup('A charming spot in Bergen, Norway!')
        .openPopup(); // Opens the popup automatically on load


    // --- REST OF THE SCRIPT (CUSTOM DIALOG AND CLICK HANDLER) REMAINS THE SAME ---

    // CUSTOM DIALOG ELEMENTS - NOW GUARANTEED TO BE IN DOM
    const markerDialogOverlay = document.getElementById('markerDialogOverlay');
    const dialogPromptText = document.getElementById('dialogPromptText');
    const markerMessageInput = document.getElementById('markerMessageInput');
    const colorOptionsContainer = document.getElementById('colorOptionsContainer');
    const dialogOkButton = document.getElementById('dialogOkButton');
    const dialogCancelButton = document.getElementById('dialogCancelButton');

    let resolveDialogPromise;
    let rejectDialogPromise;

    function createColorOptions() {
        colorOptionsContainer.innerHTML = '';
        let isFirst = true;

        for (const colorName in supportedMarkerColors) {
            const colorValue = supportedMarkerColors[colorName];
            const inputId = `color-${colorName.toLowerCase()}`;

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'markerColor';
            input.value = colorName.toLowerCase();
            input.id = inputId;
            input.classList.add('color-option');
            if (isFirst) {
                input.checked = true;
                isFirst = false;
            }

            const label = document.createElement('label');
            label.htmlFor = inputId;
            label.classList.add('color-label');

            const swatch = document.createElement('div');
            swatch.classList.add('color-swatch', `swatch-${colorName.toLowerCase()}`);
            swatch.style.backgroundColor = colorValue;

            const span = document.createElement('span');
            span.textContent = colorName;

            label.appendChild(swatch); // Swatch and span inside label
            label.appendChild(span);

            const wrapperDiv = document.createElement('div');
            wrapperDiv.classList.add('color-option-wrapper');
            wrapperDiv.appendChild(input); // Input is sibling to label
            wrapperDiv.appendChild(label);

            colorOptionsContainer.appendChild(wrapperDiv);
        }
    }

    createColorOptions();

    function showMarkerDialog(lat, lng) {
        markerMessageInput.value = '';
        const firstColorRadio = colorOptionsContainer.querySelector('input[name="markerColor"]');
        if (firstColorRadio) {
            firstColorRadio.checked = true;
        }

        dialogPromptText.textContent = `New Marker at Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}\nEnter message and select color:`;

        markerDialogOverlay.style.display = 'flex';
        markerMessageInput.focus();

        return new Promise((resolve, reject) => {
            resolveDialogPromise = resolve;
            rejectDialogPromise = reject;
        });
    }

    dialogOkButton.addEventListener('click', () => {
        const message = markerMessageInput.value;
        const selectedColorRadio = colorOptionsContainer.querySelector('input[name="markerColor"]:checked');
        const color = selectedColorRadio ? selectedColorRadio.value : 'blue';

        markerDialogOverlay.style.display = 'none';
        resolveDialogPromise({ message, color });
    });

    dialogCancelButton.addEventListener('click', () => {
        markerDialogOverlay.style.display = 'none';
        rejectDialogPromise(new Error('Marker creation cancelled by user.'));
    });

    markerMessageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            dialogOkButton.click();
        } else if (e.key === 'Escape') {
            dialogCancelButton.click();
        }
    });

    // --- Auth UI Elements ---
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignupBtn = document.getElementById('show-signup');
    const showLoginBtn = document.getElementById('show-login');

    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const loginButton = document.getElementById('login-button');

    const signupEmailInput = document.getElementById('signup-email');
    const signupPasswordInput = document.getElementById('signup-password');
    const signupUsernameInput = document.getElementById('signup-username');
    const signupButton = document.getElementById('signup-button');

    const currentUserSpan = document.getElementById('current-username');
    const logoutButton = document.getElementById('logout-button');

    // --- Collection UI Elements (within dialog) ---
    // Note: Re-declared here, ensure your HTML structure makes them accessible
    const collectionOptionsContainer = document.getElementById('collectionOptionsContainer');
    const collectionsList = document.getElementById('collectionsList');
    const newCollectionInput = document.getElementById('newCollectionInput');
    const createCollectionButton = document.getElementById('createCollectionButton');

    // --- Auth UI Logic ---
    showSignupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    });

    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    loginButton.addEventListener('click', async () => {
        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            alert(error.message);
        } else {
            // Auth state change listener will handle UI update
            alert('Logged in successfully!');
        }
    });

    signupButton.addEventListener('click', async () => {
        const email = signupEmailInput.value;
        const password = signupPasswordInput.value;
        const username = signupUsernameInput.value;

        if (!username) {
            alert('Please provide a username.');
            return;
        }

        // Sign up the user
        const { data: { user }, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username: username } // Pass username to signup for profiles table creation via RLS policy
            }
        });

        if (signUpError) {
            alert(signUpError.message);
            return;
        }

        if (user) {
            // Automatically create a profile entry for the new user
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({ id: user.id, username: username }); // user.id comes from Supabase Auth

            if (profileError) {
                console.error('Error creating user profile:', profileError.message);
                alert('Sign up successful, but failed to create user profile. Please try logging in.');
            } else {
                alert('Signed up and logged in successfully! Welcome, ' + username + '!');
            }
        } else {
            alert('Please check your email to confirm your account.');
        }
    });

    logoutButton.addEventListener('click', async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            alert(error.message);
        } else {
            alert('Logged out successfully!');
            // Auth state change listener will handle UI update
        }
    });

    // --- Supabase Auth State Change Listener ---
    // This is crucial for managing UI based on user login status
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            // User is logged in
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', session.user.id)
                .single();

            if (profile) {
                currentUserSpan.textContent = profile.username;
            } else {
                currentUserSpan.textContent = session.user.email || 'User'; // Fallback
                console.error("Error fetching profile:", error?.message);
            }

            loadMarkersForCurrentUser(); // Load existing markers for this user
            loadCollectionsForCurrentUser(); // Load existing collections
        } else {
            // User is logged out
            authContainer.style.display = 'block';
            appContainer.style.display = 'none';
            loginForm.style.display = 'block'; // Show login form by default
            signupForm.style.display = 'none';
            map.eachLayer(function(layer) { // Clear all markers from map on logout
                if (layer instanceof L.Marker) {
                    map.removeLayer(layer);
                }
            });
            currentUserSpan.textContent = 'Guest';
        }
    });

    // --- Data Fetching and Saving Functions (Place after auth listener) ---

    let currentMarkers = []; // Store markers retrieved from DB
    let currentCollections = []; // Store collections retrieved from DB

    async function loadMarkersForCurrentUser() {
        const { data: userData } = await supabase.auth.getUser(); // Get user from current session
        const user = userData.user; // Extract user object
        if (!user) return; // Only load if logged in

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
            `); // Select markers and their linked collection names

        if (error) {
            console.error('Error loading markers:', error.message);
            return;
        }

        // Clear existing markers from map before redrawing
        map.eachLayer(function(layer) {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        currentMarkers = data; // Update local cache
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
            newMarker.bindPopup(popupContent); // Remove .openPopup() unless you want all to open on load
        });
    }

    async function loadCollectionsForCurrentUser() {
        const { data: userData } = await supabase.auth.getUser(); // Get user from current session
        const user = userData.user; // Extract user object
        if (!user) return;

        const { data, error } = await supabase
            .from('collections')
            .select('id, name');

        if (error) {
            console.error('Error loading collections:', error.message);
            return;
        }

        currentCollections = data; // Update local cache
        renderCollectionOptions(); // Update the dialog with new collections
    }

    function renderCollectionOptions() {
        collectionsList.innerHTML = ''; // Clear existing options
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

    createCollectionButton.addEventListener('click', async () => {
        const newName = newCollectionInput.value.trim();
        if (!newName) {
            alert('Please enter a name for the new collection.');
            return;
        }

        const { data, error } = await supabase
            .from('collections')
            .insert({ name: newName })
            .select('id, name') // Select the new collection's data to update local cache
            .single();

        if (error) {
            alert('Error creating collection: ' + error.message);
        } else {
            currentCollections.push(data); // Add to local cache
            renderCollectionOptions(); // Re-render to show new collection
            newCollectionInput.value = ''; // Clear input
            alert('Collection created successfully!');
        }
    });


    // --- MODIFIED: map.on('click') to use Supabase ---
    map.on('click', async function(e) {
        const { data: userData } = await supabase.auth.getUser(); // Get user from current session
        const user = userData.user; // Extract user object
        if (!user) {
            alert('Please log in to add markers.');
            return;
        }

        const clickedLat = e.latlng.lat;
        const clickedLng = e.latlng.lng;

        try {
            // Reset collection checkboxes
            collectionsList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            newCollectionInput.value = ''; // Clear new collection input

            const userInput = await showMarkerDialog(clickedLat, clickedLng); // Your existing dialog function

            let markerName = userInput.message.trim();
            let markerColor = userInput.color;

            if (!markerName) {
                markerName = `Marker at ${clickedLat.toFixed(4)}, ${clickedLng.toFixed(4)}`; // Default name if empty
            }

            // Get selected collection IDs
            const selectedCollectionIds = Array.from(collectionsList.querySelectorAll('input[name="selectedCollections"]:checked'))
                                                .map(cb => cb.value);

            // Insert marker into Supabase
            const { data: newMarkerData, error: markerError } = await supabase
                .from('markers')
                .insert({
                    user_id: user.id, // Link to current user
                    name: markerName,
                    latitude: clickedLat,
                    longitude: clickedLng,
                    color: markerColor
                })
                .select('id') // Get the ID of the newly created marker
                .single();

            if (markerError) {
                console.error('Error saving marker:', markerError.message);
                alert('Failed to save marker: ' + markerError.message);
                return;
            }

            // Link marker to selected collections (if any)
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
            loadMarkersForCurrentUser(); // Reload all markers to display the new one
            // No need to open popup here, loadMarkersForCurrentUser will handle it.

        } catch (error) {
            console.log(error.message); // Handle cancellation
        }
    });

    // Initial check when script loads (in case user is already logged in from a previous session)
    // This now correctly runs AFTER all DOM elements are available and other functions defined.
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        // The onAuthStateChange listener has already been set up above.
        // It will trigger the correct UI state automatically if a session exists.
        // For simplicity, just ensure the UI is in the correct state initially.
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', session.user.id)
            .single();
        if (profile) {
            currentUserSpan.textContent = profile.username;
        } else {
            currentUserSpan.textContent = session.user.email || 'User';
        }
        loadMarkersForCurrentUser();
        loadCollectionsForCurrentUser();
    } else {
        // No session, initial state setup
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    }

}); // End of DOMContentLoaded listener