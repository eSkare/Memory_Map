// js/auth.js
import { supabase } from '/Memory_Map/js/supabaseClient.js';
import { loadMarkersForCurrentUser } from '/Memory_Map/js/map.js'; // Will need this to refresh map on auth change
//import { loadCollectionsForCurrentUser } from '/Memory_Map/js/collections.js'; // Will need this to refresh collections

import { clearCollectionsUI, resetCollectionSelection, loadCollectionsForCurrentUser } from '/Memory_Map/js/collections.js';

// Get references to your new message display elements
const authMessageDisplay = document.getElementById('message-display');
const appMessageDisplay = document.getElementById('app-message-display'); // If you chose to use two

/**
 * Displays a message in the UI for a set duration.
 * @param {string} message The message text.
 * @param {string} type 'success', 'error', or 'warning'.
 * @param {HTMLElement} displayElement The DOM element to display the message in.
 * @param {number} durationMs How long the message should be visible in milliseconds. (Default: 3000 for success/warning, 0 for error to persist)
 */
function displayUIMessage(message, type, displayElement, durationMs) {
    if (!displayElement) {
        console.error("Message display element not found:", displayElement);
        return;
    }

    displayElement.textContent = message;
    displayElement.className = `message-display ${type}`; // Reset and apply type class
    displayElement.style.display = 'block'; // Make it visible
    displayElement.style.opacity = '1';

    // Clear any existing timeout to prevent conflicts
    if (displayElement.timeoutId) {
        clearTimeout(displayElement.timeoutId);
    }

    if (durationMs !== 0) { // If duration is 0, message persists until cleared manually
        displayElement.timeoutId = setTimeout(() => {
            displayElement.style.opacity = '0';
            displayElement.timeoutId = setTimeout(() => {
                displayElement.style.display = 'none';
                displayElement.textContent = ''; // Clear text after fading
            }, 500); // Wait for transition to complete before hiding
        }, durationMs || 3000); // Default to 3 seconds for non-error messages
    }
}

/**
 * Manually clears a message display.
 * @param {HTMLElement} displayElement The DOM element to clear.
 */
function clearUIMessage(displayElement) {
    if (displayElement.timeoutId) {
        clearTimeout(displayElement.timeoutId);
    }
    displayElement.style.opacity = '0';
    displayElement.timeoutId = setTimeout(() => {
        displayElement.style.display = 'none';
        displayElement.textContent = '';
    }, 500);
}


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

export function setupAuthUI(mapInstance) { // Pass map instance if needed for clearing markers
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
            console.error('Login error:', error.message);
            // alert(error.message); // OLD
            displayUIMessage(error.message, 'error', authMessageDisplay, 0); // NEW
        } else {
            // alert('Logged in successfully!'); // OLD
            displayUIMessage('Logged in successfully!', 'success', authMessageDisplay, 3000); // NEW
            clearUIMessage(authMessageDisplay); // Clear if you're transitioning away quickly
        }
    });

    // js/auth.js - Inside your signupButton.addEventListener
    signupButton.addEventListener('click', async () => {
        const email = signupEmailInput.value;
        const password = signupPasswordInput.value;
        const username = signupUsernameInput.value;
    
        if (!username) {
            alert('Please provide a username.');
            return;
        }
    
        console.log('Attempting Supabase Auth signUp...');
        const { data: { user }, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            // The 'username' here is stored in auth.users.user_metadata, which is accessible after login
            options: {
                data: { username: username }
            }
        });
    
        if (signUpError) {
                console.error('Supabase Auth signUp error:', signUpError.message);
                // alert(signUpError.message); // OLD
                displayUIMessage(signUpError.message, 'error', authMessageDisplay, 0); // NEW: Error persists until manually cleared or new action
                return;
            }

        // alert('Sign up successful! Please check your email to confirm your account before logging in.'); // OLD
        displayUIMessage('Sign up successful! Please check your email to confirm your account before logging in.', 'success', authMessageDisplay, 5000); // NEW: Success message, 5 seconds
        console.log('User signed up. Awaiting email confirmation.');
        clearUIMessage(authMessageDisplay); // Clear message when switching views or after successful confirmation.
        // Optionally, clear form fields here
        signupEmailInput.value = '';
        signupPasswordInput.value = '';
        signupUsernameInput.value = '';
    });

    logoutButton.addEventListener('click', async () => {
        console.log('Logout button clicked!');
        const { error } = await supabase.auth.signOut();
        if (error) {
            // alert(error.message); // OLD
            displayUIMessage(error.message, 'error', appMessageDisplay, 0); // NEW: Use app-specific display for logout
            console.error('Logout error:', error.message);
        } else {
            // alert('Logged out successfully!'); // OLD
            displayUIMessage('Logged out successfully!', 'success', appMessageDisplay, 3000); // NEW
            console.log('Logout successful!');
            clearUIMessage(appMessageDisplay); // This will be handled by onAuthStateChange hiding the app view
        }
    });

    // js/auth.js - Inside your onAuthStateChange listener
    // (Ensure you have mapInstance available here, passed from script.js)
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed! Event:', event, 'Session:', session);

        if (session) {
            // User is logged in (or just confirmed email and became signed in)
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';

            // --- IMPORTANT: Attempt to fetch profile. If it doesn't exist, create it. ---
            const { data: profile, error: profileFetchError } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', session.user.id)
                .single();

            if (profile) {
                // Profile found, display username
                currentUserSpan.textContent = profile.username;
                console.log("Profile found:", profile.username);
            } else if (profileFetchError && profileFetchError.message.includes('rows returned')) {
                // Profile not found (0 rows returned by .single()) - Create it now!
                console.warn("No profile found for user:", session.user.id, "Attempting to create one...");

                // Get username from user_metadata (set during signup) or default to email prefix
                // `session.user.user_metadata` contains the 'data' passed during signUp
                const usernameToUse = session.user.user_metadata?.username || session.user.email.split('@')[0];

                const { error: createProfileError } = await supabase
                    .from('profiles')
                    .insert({ id: session.user.id, username: usernameToUse });

                if (createProfileError) {
                    console.error("Failed to create missing profile after sign-in:", createProfileError.message);
                    currentUserSpan.textContent = session.user.email || 'User (profile missing)';
                    // Don't alert here unless it's a critical, unrecoverable error, as it might spam the user on refresh
                    displayUIMessage("Your profile could not be created automatically. Please contact support.", 'error', appMessageDisplay, 0); // NEW
                } else {
                    console.log("Missing profile successfully created for user:", usernameToUse);
                    currentUserSpan.textContent = usernameToUse;
                }
            } else {
                // Other unexpected error fetching profile (e.g., network error, RLS for SELECT)
                console.error("Unexpected error fetching profile:", profileFetchError?.message);
                currentUserSpan.textContent = session.user.email || 'User (error fetching profile)'; // Fallback
            }

            // Load markers and collections only once the user is logged in AND profile is handled
            loadMarkersForCurrentUser();
            loadCollectionsForCurrentUser();

            clearUIMessage(authMessageDisplay); // Clear any old login/signup messages when app loads
            clearUIMessage(appMessageDisplay); // Clear any old logout messages when logged in

        } else {
            // User is logged out
            console.log('User is logged out.');
            authContainer.style.display = 'block';
            appContainer.style.display = 'none';
            currentUserSpan.textContent = 'Guest';
            // Clear map, markers, etc. for logged-out state
            if (mapInstance && mapInstance.eachLayer) {
                mapInstance.eachLayer(function (layer) {
                    if (layer._icon || layer._path) { // Check if it's a marker or polyline/polygon
                        mapInstance.removeLayer(layer);
                    }
                });
            }
            clearCollectionsUI(); // Assuming you have this function
            resetCollectionSelection(); // Assuming you have this function

            clearUIMessage(authMessageDisplay); // Clear any auth messages when logging out
            clearUIMessage(appMessageDisplay); // Clear any app messages when logging out (e.g., "Logged out successfully")
        }
    });
}