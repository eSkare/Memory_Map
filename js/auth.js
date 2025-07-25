// js/auth.js - TEMPORARY DEBUG VERSION

import { supabase } from '/Memory_Map/js/supabaseClient.js';
import { loadMarkersForCurrentUser } from '/Memory_Map/js/map.js';
import { clearCollectionsUI, resetCollectionSelection, loadCollectionsForCurrentUser } from '/Memory_Map/js/collections.js';

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

const currentUserSpan = document.getElementById('current-username');
const logoutButton = document.getElementById('logout-button');


export function setupAuthUI(mapInstance) {
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
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`[AUTH-DEBUG] Auth state changed! Event: ${event}. Session: ${session ? 'Object Present' : 'Null'}`);

        if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
            clearUIMessage(authMessageDisplay);
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            clearUIMessage(appMessageDisplay);
        }

        if (session) {
            console.log("[AUTH-DEBUG] Entering logged-in state logic.");
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';

            if (mapInstance) {
                setTimeout(() => {
                    mapInstance.invalidateSize();
                    console.log("[AUTH-DEBUG] mapInstance.invalidateSize() called.");
                }, 100);
            }

            if (currentUserSpan) {
                currentUserSpan.textContent = session.user.email || 'Logged In User';
                console.log(`[AUTH-DEBUG] currentUserSpan immediately set to: ${currentUserSpan.textContent}`);
            }

            // Attempt to fetch the profile in the background
            try {
                console.log("[AUTH-DEBUG] Supabase client object status:", supabase ? 'Available' : 'NOT AVAILABLE');

                if (!supabase) {
                    console.error("[AUTH-DEBUG] Supabase client is not initialized!");
                    displayUIMessage("An internal error occurred (Supabase client not initialized).", 'error', appMessageDisplay, 0);
                    return;
                }

                console.log("[AUTH-DEBUG] Attempting to fetch profile (TEMPORARY simplified query) for user ID:", session.user.id);

                // --- TEMPORARY DEBUG CHANGE: Simplified profile fetch ---
                const { data: profile, error: profileFetchError } = await supabase
                    .from('profiles')
                    .select('id, username'); // <-- Fetching all profiles to see if the query itself is the issue

                console.log("[AUTH-DEBUG] AFTER SIMPLIFIED PROFILE FETCH. Raw data:", profile, "Error:", profileFetchError); // CRITICAL NEW LOG

                if (profileFetchError) {
                    console.error("[AUTH-DEBUG] ERROR FETCHING PROFILES:", profileFetchError?.message);
                    displayUIMessage(`Error fetching profiles: ${profileFetchError?.message}`, 'error', appMessageDisplay, 0);
                } else if (profile && profile.length > 0) {
                    const userProfile = profile.find(p => p.id === session.user.id); // Find the specific user's profile
                    if (userProfile && currentUserSpan) {
                        console.log("[AUTH-DEBUG] SPECIFIC PROFILE FOUND. Username:", userProfile.username);
                        currentUserSpan.textContent = userProfile.username;
                        displayUIMessage(`Welcome back, ${userProfile.username}!`, 'success', appMessageDisplay, 3000);
                    } else {
                        console.warn("[AUTH-DEBUG] USER PROFILE NOT FOUND IN SIMPLIFIED FETCH RESULT. Proceeding to create...");
                        // This indicates no profile exists for the current user, or RLS is blocking even a general select
                        // Proceed to profile creation logic
                        const usernameToUse = session.user.user_metadata?.username || (session.user.email ? session.user.email.split('@')[0] : 'UnknownUser');
                        const { error: createProfileError } = await supabase.from('profiles').insert({ id: session.user.id, username: usernameToUse });
                        if (createProfileError) {
                            console.error("[AUTH-DEBUG] FAILED TO CREATE PROFILE:", createProfileError.message);
                            displayUIMessage("Profile creation failed.", 'error', appMessageDisplay, 0);
                        } else {
                            console.log("[AUTH-DEBUG] Profile created successfully for user:", usernameToUse);
                            if (currentUserSpan) currentUserSpan.textContent = usernameToUse;
                            displayUIMessage(`Profile created. Welcome, ${usernameToUse}!`, 'success', appMessageDisplay, 3000);
                        }
                    }
                } else {
                    console.warn("[AUTH-DEBUG] NO PROFILES FOUND AT ALL. Attempting to create one...");
                    // This scenario means no profiles exist or RLS blocked everything.
                    const usernameToUse = session.user.user_metadata?.username || (session.user.email ? session.user.email.split('@')[0] : 'UnknownUser');
                    const { error: createProfileError } = await supabase.from('profiles').insert({ id: session.user.id, username: usernameToUse });
                    if (createProfileError) {
                        console.error("[AUTH-DEBUG] FAILED TO CREATE PROFILE:", createProfileError.message);
                        displayUIMessage("Profile creation failed.", 'error', appMessageDisplay, 0);
                    } else {
                        console.log("[AUTH-DEBUG] Profile created successfully for user:", usernameToUse);
                        if (currentUserSpan) currentUserSpan.textContent = usernameToUse;
                        displayUIMessage(`Profile created. Welcome, ${usernameToUse}!`, 'success', appMessageDisplay, 3000);
                    }
                }
            } catch (e) {
                console.error("[AUTH-DEBUG] UNCAUGHT ERROR DURING PROFILE FETCH BLOCK:", e);
                displayUIMessage(`An unexpected error occurred: ${e.message}`, 'error', appMessageDisplay, 0);
            }

            // Re-enable loading of map markers and collections
            console.log("[AUTH-DEBUG] Calling loadMarkersForCurrentUser...");
            await loadMarkersForCurrentUser(); // Use await as it's an async function
            console.log("[AUTH-DEBUG] Finished loadMarkersForCurrentUser.");

            console.log("[AUTH-DEBUG] Calling loadCollectionsForCurrentUser...");
            await loadCollectionsForCurrentUser(); // Use await as it's an async function
            console.log("[AUTH-DEBUG] Finished loadCollectionsForCurrentUser.");

            console.log("[AUTH-DEBUG] End of logged-in state logic.");

        } else {
            // User is logged out
            console.log('[AUTH-DEBUG] Entering logged-out state logic.');
            authContainer.style.display = 'block';
            appContainer.style.display = 'none';
            if (currentUserSpan) currentUserSpan.textContent = 'Guest';
            displayUIMessage('You are currently a guest.', 'warning', authMessageDisplay, 3000);

            // Clear map layers and collections UI
            if (mapInstance && mapInstance.eachLayer) {
                mapInstance.eachLayer(function (layer) {
                    if (layer._icon || layer._path || layer._popup) {
                        mapInstance.removeLayer(layer);
                    }
                });
            }
            clearCollectionsUI();
            resetCollectionSelection();
            console.log("[AUTH-DEBUG] Completed logged-out state logic.");
        }
    });
    console.log("Auth setup complete (TEMPORARY DEBUG VERSION).");
}