// js/auth.js - WORKAROUND VERSION (DISPLAY EMAIL FALLBACK)

import { supabase } from '/Memory_Map/js/supabaseClient.js';
import { loadMarkersForCurrentUser } from '/Memory_Map/js/map.js'; // Re-enabling map functions
import { clearCollectionsUI, resetCollectionSelection, loadCollectionsForCurrentUser } from '/Memory_Map/js/collections.js'; // Re-enabling collection functions

// Get references to your message display elements
const authMessageDisplay = document.getElementById('message-display');
const appMessageDisplay = document.getElementById('app-message-display');

// Helper functions for UI messages
function displayUIMessage(message, type, displayElement, durationMs = 3000) {
    if (!displayElement) return;
    displayElement.textContent = message;
    displayElement.className = `message-display ${type}`;
    displayElement.style.display = 'block';
    setTimeout(() => {
        displayElement.style.display = 'none';
        displayElement.textContent = '';
    }, durationMs);
}

function clearUIMessage(displayElement) {
    if (!displayElement) return;
    displayElement.style.display = 'none';
    displayElement.textContent = '';
}

// Get references to core UI elements
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

const currentUserSpan = document.getElementById('current-username'); // Re-enable this
const logoutButton = document.getElementById('logout-button');


export function setupAuthUI(mapInstance) {
    // Event listeners for login/signup forms (unchanged from previous versions)
    showSignupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        clearUIMessage(authMessageDisplay);
    });

    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
        clearUIMessage(authMessageDisplay);
    });

    loginButton.addEventListener('click', async () => {
        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            console.error('Login error:', error.message);
            displayUIMessage(error.message, 'error', authMessageDisplay, 0);
        } else {
            displayUIMessage('Logging in...', 'success', authMessageDisplay, 1000);
        }
    });

    signupButton.addEventListener('click', async () => {
        const email = signupEmailInput.value;
        const password = signupPasswordInput.value;
        const username = signupUsernameInput.value;

        if (!username) {
            displayUIMessage('Please provide a username.', 'warning', authMessageDisplay, 3000);
            return;
        }
        clearUIMessage(authMessageDisplay);
        console.log('Attempting Supabase Auth signUp...');
        const { data: { user }, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username: username }
            }
        });

        if (signUpError) {
            console.error('Supabase Auth signUp error:', signUpError.message);
            displayUIMessage(signUpError.message, 'error', authMessageDisplay, 0);
            return;
        }

        displayUIMessage('Sign up successful! Please check your email to confirm your account before logging in.', 'success', authMessageDisplay, 5000);
        console.log('User signed up. Awaiting email confirmation.');
        signupEmailInput.value = '';
        signupPasswordInput.value = '';
        signupUsernameInput.value = '';
    });

    logoutButton.addEventListener('click', async () => {
        console.log('Logout button clicked!');
        const { error } = await supabase.auth.signOut();
        if (error) {
            displayUIMessage(error.message, 'error', appMessageDisplay, 0);
            console.error('Logout error:', error.message);
        } else {
            displayUIMessage('Logged out successfully!', 'success', appMessageDisplay, 3000);
            console.log('Logout successful!');
        }
    });


    // --- WORKAROUND: onAuthStateChange listener with immediate email fallback and background profile fetch ---
    supabase.auth.onAuthStateChange(async (event, session) => { // Keep async here for the profile fetch
        console.log(`[WORKAROUND onAuthStateChange] Auth state changed! Event: ${event}. Session: ${session ? 'Object Present' : 'Null'}`);

        // Clear messages for state transitions
        if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
            clearUIMessage(authMessageDisplay);
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            clearUIMessage(appMessageDisplay);
        }

        if (session) {
            console.log("[WORKAROUND] Entering logged-in state logic.");
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';

            if (mapInstance) { // Ensure mapInstance was successfully passed and is valid
                setTimeout(() => { // Use a small timeout to ensure DOM is rendered before resizing
                    mapInstance.invalidateSize();
                    console.log("[WORKAROUND] mapInstance.invalidateSize() called.");
                }, 100); // A small delay (e.g., 100ms) can help ensure the CSS has been applied
            }

            // --- WORKAROUND START: Display email as immediate fallback ---
            if (currentUserSpan) { // Ensure currentUserSpan exists before trying to update it
                currentUserSpan.textContent = session.user.email || 'Logged In User'; // Fallback to email or generic text
                console.log(`[WORKAROUND] currentUserSpan immediately set to: ${currentUserSpan.textContent}`);
            }
            // --- WORKAROUND END ---

            // Now, attempt to fetch the profile in the background
            try {
                console.log("[WORKAROUND] Supabase client object status:", supabase ? 'Available' : 'NOT AVAILABLE');

                if (!supabase) {
                    console.error("[WORKAROUND] Supabase client is not initialized!");
                    displayUIMessage("An internal error occurred (Supabase client not initialized).", 'error', appMessageDisplay, 0);
                    return;
                }

                console.log("[WORKAROUND] Attempting to fetch profile for user ID:", session.user.id);

                const { data: profile, error: profileFetchError } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', session.user.id)
                    .single(); // <--- Execution seems to halt around here in your logs

                console.log("[WORKAROUND] AFTER PROFILE SINGLE CALL. Profile data:", profile, "Error:", profileFetchError); // NEW LOG HERE

                if (profile && currentUserSpan) { // Update if profile and span exist
                    console.log("[WORKAROUND] PROFILE FETCH SUCCESS: Profile data received:", profile);
                    currentUserSpan.textContent = profile.username; // Update to username if successful
                    console.log(`[WORKAROUND] currentUserSpan updated to: ${profile.username}`);
                    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                        // Only show welcome message on initial sign-in/refresh, not subsequent re-renders
                        displayUIMessage(`Welcome back, ${profile.username}!`, 'success', appMessageDisplay, 3000);
                    }
                } else if (profileFetchError && profileFetchError.message.includes('rows returned')) {
                    console.warn("[WORKAROUND] PROFILE NOT FOUND (0 rows returned from RLS). Attempting to create one...");
                    const usernameToUse = session.user.user_metadata?.username || (session.user.email ? session.user.email.split('@')[0] : 'UnknownUser');
                    const { error: createProfileError } = await supabase.from('profiles').insert({ id: session.user.id, username: usernameToUse });
                    if (createProfileError) {
                        console.error("[WORKAROUND] FAILED TO CREATE PROFILE:", createProfileError.message);
                        displayUIMessage("Profile creation failed.", 'error', appMessageDisplay, 0);
                    } else {
                        console.log("[WORKAROUND] Profile created successfully.");
                        if (currentUserSpan) currentUserSpan.textContent = usernameToUse; // Update to new username
                        displayUIMessage(`Profile created. Welcome, ${usernameToUse}!`, 'success', appMessageDisplay, 3000);
                    }
                } else if (profileFetchError) {
                    console.error("[WORKAROUND] ERROR FETCHING PROFILE (Other reason):", profileFetchError?.message);
                    displayUIMessage(`Error fetching profile: ${profileFetchError?.message}`, 'error', appMessageDisplay, 0);
                }
            } catch (e) {
                console.error("[WORKAROUND] UNCAUGHT ERROR DURING PROFILE FETCH BLOCK:", e);
                displayUIMessage(`An unexpected error occurred: ${e.message}`, 'error', appMessageDisplay, 0);
            }

            // Re-enable loading of map markers and collections
            console.log("[WORKAROUND] Calling loadMarkersForCurrentUser...");
            await loadMarkersForCurrentUser(); // Use await as it's an async function
            console.log("[WORKAROUND] Finished loadMarkersForCurrentUser.");

            console.log("[WORKAROUND] Calling loadCollectionsForCurrentUser...");
            await loadCollectionsForCurrentUser(); // Use await as it's an async function
            console.log("[WORKAROUND] Finished loadCollectionsForCurrentUser.");

            console.log("[WORKAROUND] End of logged-in state logic.");

        } else {
            // User is logged out
            console.log('[WORKAROUND] Entering logged-out state logic.');
            authContainer.style.display = 'block';
            appContainer.style.display = 'none';
            if (currentUserSpan) currentUserSpan.textContent = 'Guest';
            displayUIMessage('You are currently a guest.', 'warning', authMessageDisplay, 3000);

            // Clear map layers and collections UI
            if (mapInstance && mapInstance.eachLayer) {
                mapInstance.eachLayer(function (layer) {
                    // Assuming you only want to remove markers/popups, not base map tiles
                    if (layer._icon || layer._path || layer._popup) { // _popup for popup layers
                        mapInstance.removeLayer(layer);
                    }
                });
            }
            clearCollectionsUI();
            resetCollectionSelection();
            console.log("[WORKAROUND] Completed logged-out state logic.");
        }
    });
    console.log("Auth setup complete (WORKAROUND version).");
}