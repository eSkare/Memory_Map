// js/auth.js - SIMPLIFIED VERSION FOR DEBUGGING

import { supabase } from '/Memory_Map/js/supabaseClient.js';
// Temporarily removing these imports to simplify and isolate
// import { loadMarkersForCurrentUser } from '/Memory_Map/js/map.js';
// import { clearCollectionsUI, resetCollectionSelection, loadCollectionsForCurrentUser } from '/Memory_Map/js/collections.js';

// Get references to your new message display elements
const authMessageDisplay = document.getElementById('message-display');
const appMessageDisplay = document.getElementById('app-message-display');

// Simplified display functions - keep them minimal
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


export function setupAuthUI(mapInstance) { // mapInstance might be unused in this simplified version
    // Event listeners for login/signup forms
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


    // --- CRITICAL: Simplified onAuthStateChange listener ---
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`[SIMPLIFIED onAuthStateChange] Auth state changed! Event: ${event}. Session: ${session ? 'Object Present' : 'Null'}`);

        // Clear messages for state transitions
        if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
            clearUIMessage(authMessageDisplay);
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            clearUIMessage(appMessageDisplay);
        }

        if (session) {
            console.log("[SIMPLIFIED] Entering logged-in state logic.");
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';

            currentUserSpan.textContent = 'Loading profile...';
            console.log("[SIMPLIFIED] currentUserSpan set to 'Loading profile...'");

            try {
                console.log("[SIMPLIFIED] Supabase client object status:", supabase ? 'Available' : 'NOT AVAILABLE');

                if (!supabase) {
                    console.error("[SIMPLIFIED] Supabase client is not initialized!");
                    currentUserSpan.textContent = 'Error: Supabase not ready';
                    displayUIMessage("An internal error occurred (Supabase client not initialized).", 'error', appMessageDisplay, 0);
                    return;
                }

                console.log("[SIMPLIFIED] Attempting to fetch profile for user ID:", session.user.id);

                const { data: profile, error: profileFetchError } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', session.user.id)
                    .single();

                // --- CRITICAL DEBUG LOGS ---
                console.log("[SIMPLIFIED] Profile fetch await resolved. Profile:", profile, "Error:", profileFetchError);
                alert("[SIMPLIFIED] Await resolved! Profile: " + (profile ? profile.username : 'NULL') + ", Error: " + (profileFetchError ? profileFetchError.message : 'NULL'));
                // --- END CRITICAL DEBUG LOGS ---

                if (profile) {
                    console.log("[SIMPLIFIED] PROFILE FETCH SUCCESS: Profile data received:", profile);
                    currentUserSpan.textContent = profile.username;
                    console.log(`[SIMPLIFIED] currentUserSpan updated to: ${profile.username}`);
                    displayUIMessage(`Welcome back, ${profile.username}! (Simplified)`, 'success', appMessageDisplay, 3000);
                } else if (profileFetchError && profileFetchError.message.includes('rows returned')) {
                    console.warn("[SIMPLIFIED] PROFILE NOT FOUND: Attempting to create one...");
                    const usernameToUse = session.user.user_metadata?.username || (session.user.email ? session.user.email.split('@')[0] : 'UnknownUser');
                    const { error: createProfileError } = await supabase.from('profiles').insert({ id: session.user.id, username: usernameToUse });
                    if (createProfileError) {
                        console.error("[SIMPLIFIED] FAILED TO CREATE PROFILE:", createProfileError.message);
                        currentUserSpan.textContent = session.user.email || 'User (profile missing, creation failed)';
                        displayUIMessage("Profile creation failed.", 'error', appMessageDisplay, 0);
                    } else {
                        console.log("[SIMPLIFIED] Profile created successfully.");
                        currentUserSpan.textContent = usernameToUse;
                        displayUIMessage(`Profile created. Welcome, ${usernameToUse}! (Simplified)`, 'success', appMessageDisplay, 3000);
                    }
                } else {
                    console.error("[SIMPLIFIED] ERROR FETCHING PROFILE (Other reason):", profileFetchError?.message);
                    currentUserSpan.textContent = session.user.email || 'User (error fetching profile)';
                    displayUIMessage(`Error fetching profile: ${profileFetchError?.message}`, 'error', appMessageDisplay, 0);
                }
            } catch (e) {
                console.error("[SIMPLIFIED] UNCAUGHT ERROR DURING PROFILE FETCH BLOCK:", e);
                currentUserSpan.textContent = session.user.email || 'User (profile fetch failed)';
                displayUIMessage(`An unexpected error occurred: ${e.message}`, 'error', appMessageDisplay, 0);
            }
            // Temporarily not calling loadMarkersForCurrentUser() or loadCollectionsForCurrentUser()
            console.log("[SIMPLIFIED] End of logged-in state logic.");

        } else {
            // User is logged out
            console.log('[SIMPLIFIED] Entering logged-out state logic.');
            authContainer.style.display = 'block';
            appContainer.style.display = 'none';
            currentUserSpan.textContent = 'Guest';
            displayUIMessage('You are currently a guest. (Simplified)', 'warning', authMessageDisplay, 3000);

            // Temporarily not clearing map layers or collections UI
            // if (mapInstance && mapInstance.eachLayer) { /* ... */ }
            // clearCollectionsUI();
            // resetCollectionSelection();
        }
    });
    console.log("Auth setup complete (simplified version).");
}