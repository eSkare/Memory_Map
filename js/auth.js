// js/auth.js - CLEAN VERSION

//import { supabase } from '/Memory_Map/js/supabaseClient.js';
import { supabase } from '/Memory_Map/script.js'; // Import supabase from script.js now


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

    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`[AUTH-FINAL] Auth state changed! Event: ${event}. Session: ${session ? 'Object Present' : 'Null'}`);

        if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
            clearUIMessage(authMessageDisplay);
            console.log("[AUTH-FINAL] Entering logged-in state logic.");
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';

            if (mapInstance) {
                setTimeout(() => {
                    mapInstance.invalidateSize();
                    console.log("[AUTH-FINAL] mapInstance.invalidateSize() called.");
                }, 100);
            }

            if (currentUserSpan) {
                currentUserSpan.textContent = session.user.email || 'Logged In User';
                console.log(`[AUTH-FINAL] currentUserSpan immediately set to: ${currentUserSpan.textContent}`);
            }

            try {
                console.log("[AUTH-FINAL] Supabase client object status:", supabase ? 'Available' : 'NOT AVAILABLE');

                const { data: profile, error: profileFetchError } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', session.user.id)
                    .single();

                console.log("[AUTH-FINAL] AFTER PROFILE FETCH. Profile data:", profile, "Error:", profileFetchError);

                if (profileFetchError && profileFetchError.message !== 'PGRST116: The result contains 0 rows') {
                    console.error("[AUTH-FINAL] ERROR FETCHING PROFILE:", profileFetchError.message);
                    displayUIMessage(`Error loading profile: ${profileFetchError.message}`, 'error', appMessageDisplay, 0);
                } else if (profile) {
                    console.log("[AUTH-FINAL] PROFILE FETCH SUCCESS. Username:", profile.username);
                    if (currentUserSpan) currentUserSpan.textContent = profile.username;
                    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                        displayUIMessage(`Welcome back, ${profile.username}!`, 'success', appMessageDisplay, 3000);
                    }
                } else {
                    console.warn("[AUTH-FINAL] PROFILE NOT FOUND for user. Attempting to create one...");
                    const usernameToUse = session.user.user_metadata?.username || (session.user.email ? session.user.email.split('@')[0] : 'UnknownUser');
                    const { error: createProfileError } = await supabase.from('profiles').insert({ id: session.user.id, username: usernameToUse });
                    if (createProfileError) {
                        console.error("[AUTH-FINAL] FAILED TO CREATE PROFILE:", createProfileError.message);
                        displayUIMessage("Profile creation failed.", 'error', appMessageDisplay, 0);
                    } else {
                        console.log("[AUTH-FINAL] Profile created successfully for user:", usernameToUse);
                        if (currentUserSpan) currentUserSpan.textContent = usernameToUse;
                        displayUIMessage(`Profile created. Welcome, ${usernameToUse}!`, 'success', appMessageDisplay, 3000);
                    }
                }
            } catch (e) {
                console.error("[AUTH-FINAL] UNCAUGHT ERROR DURING PROFILE FETCH BLOCK:", e.message);
                displayUIMessage(`An unexpected error occurred: ${e.message}`, 'error', appMessageDisplay, 0);
            }

            //console.log("[AUTH-FINAL] Calling loadMarkersForCurrentUser...");
            //await loadMarkersForCurrentUser();
            //console.log("[AUTH-FINAL] Finished loadMarkersForCurrentUser.");

            //console.log("[AUTH-FINAL] Calling loadCollectionsForCurrentUser...");
            //await loadCollectionsForCurrentUser();
            //console.log("[AUTH-FINAL] Finished loadCollectionsForCurrentUser.");

            //console.log("[AUTH-FINAL] End of logged-in state logic.");

        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            console.log('[AUTH-FINAL] Entering logged-out state logic.');
            clearUIMessage(appMessageDisplay);
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
            console.log("[AUTH-FINAL] Completed logged-out state logic.");
        }
    });
    console.log("Auth setup complete (FINAL version).");
}