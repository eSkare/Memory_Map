// js/auth.js - WORKAROUND VERSION (FORCE LOGOUT ON PROFILE FETCH HANG)

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

    // --- WORKAROUND: onAuthStateChange listener with immediate email fallback and forced logout on profile fetch hang ---
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`[AUTH-WORKAROUND] Auth state changed! Event: ${event}. Session: ${session ? 'Object Present' : 'Null'}`);

        if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
            clearUIMessage(authMessageDisplay);
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            clearUIMessage(appMessageDisplay);
        }

        if (session) {
            console.log("[AUTH-WORKAROUND] Entering logged-in state logic.");
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';

            if (mapInstance) {
                setTimeout(() => {
                    mapInstance.invalidateSize();
                    console.log("[AUTH-WORKAROUND] mapInstance.invalidateSize() called.");
                }, 100);
            }

            if (currentUserSpan) {
                currentUserSpan.textContent = session.user.email || 'Logged In User';
                console.log(`[AUTH-WORKAROUND] currentUserSpan immediately set to: ${currentUserSpan.textContent}`);
            }

            // Attempt to fetch the profile in the background with a timeout
            try {
                console.log("[AUTH-WORKAROUND] Supabase client object status:", supabase ? 'Available' : 'NOT AVAILABLE');

                if (!supabase) {
                    console.error("[AUTH-WORKAROUND] Supabase client is not initialized!");
                    displayUIMessage("An internal error occurred (Supabase client not initialized).", 'error', appMessageDisplay, 0);
                    // Force logout
                    await supabase.auth.signOut();
                    return;
                }

                console.log("[AUTH-WORKAROUND] Attempting to fetch profile with timeout for user ID:", session.user.id);

                // --- Timeout Mechanism ---
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Profile fetch timed out.")), 5000) // 5 seconds timeout
                );

                const profileFetchPromise = supabase
                    .from('profiles')
                    .select('username') // Reverted to select 'username' as this is what you need
                    .eq('id', session.user.id) // Reverted to eq and single for direct profile fetch
                    .single();

                const { data: profile, error: profileFetchError } = await Promise.race([
                    profileFetchPromise,
                    timeoutPromise
                ]);
                // --- End Timeout Mechanism ---

                console.log("[AUTH-WORKAROUND] AFTER PROFILE FETCH PROMISE. Profile data:", profile, "Error:", profileFetchError);

                if (profileFetchError) {
                    console.error("[AUTH-WORKAROUND] ERROR FETCHING PROFILE (or timeout):", profileFetchError.message);
                    displayUIMessage(`Error loading profile: ${profileFetchError.message}. Logging out.`, 'error', appMessageDisplay, 3000);
                    await supabase.auth.signOut(); // Force logout on any fetch error
                    return;
                }

                if (profile && currentUserSpan) {
                    console.log("[AUTH-WORKAROUND] PROFILE FETCH SUCCESS. Username:", profile.username);
                    currentUserSpan.textContent = profile.username;
                    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                        displayUIMessage(`Welcome back, ${profile.username}!`, 'success', appMessageDisplay, 3000);
                    }
                } else {
                    console.warn("[AUTH-WORKAROUND] PROFILE NOT FOUND for user. Attempting to create one...");
                    const usernameToUse = session.user.user_metadata?.username || (session.user.email ? session.user.email.split('@')[0] : 'UnknownUser');
                    const { error: createProfileError } = await supabase.from('profiles').insert({ id: session.user.id, username: usernameToUse });
                    if (createProfileError) {
                        console.error("[AUTH-WORKAROUND] FAILED TO CREATE PROFILE:", createProfileError.message);
                        displayUIMessage("Profile creation failed. Logging out.", 'error', appMessageDisplay, 3000);
                        await supabase.auth.signOut(); // Force logout on profile creation failure
                    } else {
                        console.log("[AUTH-WORKAROUND] Profile created successfully for user:", usernameToUse);
                        if (currentUserSpan) currentUserSpan.textContent = usernameToUse;
                        displayUIMessage(`Profile created. Welcome, ${usernameToUse}!`, 'success', appMessageDisplay, 3000);
                    }
                }
            } catch (e) {
                console.error("[AUTH-WORKAROUND] UNCAUGHT ERROR DURING PROFILE FETCH BLOCK (or timeout):", e.message);
                displayUIMessage(`An unexpected error occurred: ${e.message}. Attempting to log out.`, 'error', appMessageDisplay, 3000);

                console.log("[AUTH-WORKAROUND] Attempting to force signOut due to error.");
                try {
                    const { error: signOutError } = await supabase.auth.signOut();
                    console.log("[AUTH-WORKAROUND] signOut promise RESOLVED. Error object:", signOutError); // NEW LOG
                    if (signOutError) {
                        console.error("[AUTH-WORKAROUND] Error during forced signOut:", signOutError.message);
                        displayUIMessage(`Failed to log out: ${signOutError.message}. Please clear data manually.`, 'error', appMessageDisplay, 0);
                    } else {
                        console.log("[AUTH-WORKAROUND] Force signOut completed successfully. Expecting SIGNED_OUT event.");
                    }
                } catch (signOutCatchError) {
                    console.error("[AUTH-WORKAROUND] UNCAUGHT ERROR DURING signOut ATTEMPT:", signOutCatchError.message); // NEW LOG
                    displayUIMessage(`Critial logout error: ${signOutCatchError.message}. Manual data clear required.`, 'error', appMessageDisplay, 0);
                }
                // We're not returning here, relying on onAuthStateChange to fire SIGNED_OUT
            }

            // Re-enable loading of map markers and collections
            console.log("[AUTH-WORKAROUND] Calling loadMarkersForCurrentUser...");
            await loadMarkersForCurrentUser();
            console.log("[AUTH-WORKAROUND] Finished loadMarkersForCurrentUser.");

            console.log("[AUTH-WORKAROUND] Calling loadCollectionsForCurrentUser...");
            await loadCollectionsForCurrentUser();
            console.log("[AUTH-WORKAROUND] Finished loadCollectionsForCurrentUser.");

            console.log("[AUTH-WORKAROUND] End of logged-in state logic.");

        } else { // This is the `else` block for `if (session)`
            // User is logged out
            console.log('[AUTH-WORKAROUND] Entering logged-out state logic. User should be sent to login screen.');
            authContainer.style.display = 'block'; // Make auth visible
            appContainer.style.display = 'none';   // Hide app
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
            console.log("[AUTH-WORKAROUND] Completed logged-out state logic.");
        }
    });
    console.log("Auth setup complete (WORKAROUND version - Force Logout).");
}