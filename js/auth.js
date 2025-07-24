// js/auth.js
import { supabase } from '/Memory_Map/js/supabaseClient.js';
import { loadMarkersForCurrentUser } from '/Memory_Map/js/map.js';
import { clearCollectionsUI, resetCollectionSelection, loadCollectionsForCurrentUser } from '/Memory_Map/js/collections.js';

// Get references to your new message display elements
const authMessageDisplay = document.getElementById('message-display');
const appMessageDisplay = document.getElementById('app-message-display');

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

// --- NEW: Centralized function to handle logged-in UI and profile fetching ---
async function handleProfileAndUI(session, event = 'UNKNOWN_EVENT') {
    console.log(`[handleProfileAndUI] Triggered by: ${event}. Session present:`, !!session);

    // Initial UI state setup for logged-in
    authContainer.style.display = 'none';
    appContainer.style.display = 'block';
    currentUserSpan.textContent = 'Loading profile...';
    console.log("currentUserSpan set to 'Loading profile...' (step 1)");

    try {
        console.log("[handleProfileAndUI] Supabase client object status:", supabase ? 'Available' : 'NOT AVAILABLE');
        if (!supabase) {
            console.error("[handleProfileAndUI] Supabase client is not initialized!");
            currentUserSpan.textContent = 'Error: Supabase not ready';
            displayUIMessage("An internal error occurred (Supabase client not initialized).", 'error', appMessageDisplay, 0);
            return;
        }

        console.log("[handleProfileAndUI] Attempting to fetch profile for user ID:", session.user.id + " (step 2)");

        const { data: profile, error: profileFetchError } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', session.user.id)
            .single();

        console.log("[handleProfileAndUI] Profile fetch await resolved. Profile:", profile, "Error:", profileFetchError + " (step 3)");

        // --- AGGRESSIVE VISUAL CONFIRMATION (Keep for now) ---
        // This will try to display even if other console logs are suppressed
        if (profile && profile.username) {
            currentUserSpan.textContent = "DEBUG: Profile Loaded: " + profile.username;
            displayUIMessage("DEBUG: Profile loaded: " + profile.username, 'success', appMessageDisplay, 5000);
            alert("DEBUG: Profile Loaded: " + profile.username + " (Check console for other logs)");
        } else {
            currentUserSpan.textContent = "DEBUG: Profile Not Loaded (Check console for errors)";
            displayUIMessage("DEBUG: Profile NOT loaded: " + (profileFetchError?.message || "unknown error"), 'error', appMessageDisplay, 5000);
            alert("DEBUG: Profile NOT Loaded! Error: " + (profileFetchError?.message || "none") + " (Check console)");
        }
        // --- END AGGRESSIVE VISUAL CONFIRMATION ---


        if (profile) {
            console.log("[handleProfileAndUI] PROFILE FETCH SUCCESS: Profile data received:", profile + " (step 4)");
            currentUserSpan.textContent = profile.username; // This will overwrite the DEBUG text
            console.log(`[handleProfileAndUI] currentUserSpan updated to: ${profile.username} (step 5)`);

            // Only show welcome message for actual sign-in or initial load
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION_ON_LOAD') { // Using specific event for DOMContentLoaded
                displayUIMessage(`Welcome back, ${profile.username}!`, 'success', appMessageDisplay, 3000);
            }
        } else if (profileFetchError && profileFetchError.message.includes('rows returned')) {
            console.warn("[handleProfileAndUI] PROFILE NOT FOUND: No profile found for user ID:", session.user.id, "Attempting to create one... (step 4b)");

            const usernameToUse = session.user.user_metadata?.username || (session.user.email ? session.user.email.split('@')[0] : 'UnknownUser');
            console.log("[handleProfileAndUI] Proposed username for new profile:", usernameToUse);

            const { error: createProfileError } = await supabase
                .from('profiles')
                .insert({ id: session.user.id, username: usernameToUse });

            if (createProfileError) {
                console.error("[handleProfileAndUI] FAILED TO CREATE PROFILE:", createProfileError.message + " (step 5b)");
                currentUserSpan.textContent = session.user.email || 'User (profile missing, creation failed)';
                displayUIMessage("Your profile could not be created automatically. Please contact support.", 'error', appMessageDisplay, 0);
            } else {
                console.log("[handleProfileAndUI] Profile created successfully for user:", usernameToUse + " (step 5c)");
                currentUserSpan.textContent = usernameToUse;
                displayUIMessage(`Profile created. Welcome, ${usernameToUse}!`, 'success', appMessageDisplay, 3000);
            }
        } else {
            console.error("[handleProfileAndUI] ERROR FETCHING PROFILE (Other reason):", profileFetchError?.message, "Full error object:", profileFetchError + " (step 4c)");
            currentUserSpan.textContent = session.user.email || 'User (error fetching profile)';
            displayUIMessage(`Error fetching your profile: ${profileFetchError?.message}`, 'error', appMessageDisplay, 0);
        }
    } catch (e) {
        console.error("[handleProfileAndUI] UNCAUGHT ERROR DURING PROFILE FETCH BLOCK:", e + " (step UNCAUGHT)");
        currentUserSpan.textContent = session.user.email || 'User (profile fetch failed)';
        displayUIMessage(`An unexpected error occurred during profile fetch: ${e.message}`, 'error', appMessageDisplay, 0);
    }

    // Load markers and collections only once the user is logged in AND profile is handled
    loadMarkersForCurrentUser();
    loadCollectionsForCurrentUser();

    console.log("[handleProfileAndUI] End of logged-in state logic (step FINAL)");
}

// --- NEW: Centralized function to handle logged-out UI ---
function handleLoggedOutUI(mapInstance, event = 'UNKNOWN_EVENT') {
    console.log(`[handleLoggedOutUI] Triggered by: ${event}.`);
    authContainer.style.display = 'block';
    appContainer.style.display = 'none';
    currentUserSpan.textContent = 'Guest';

    if (event !== 'SIGNED_OUT') { // Only display guest message if not coming from an explicit sign out
        displayUIMessage('You are currently a guest.', 'warning', authMessageDisplay, 3000);
    }

    if (mapInstance && mapInstance.eachLayer) {
        mapInstance.eachLayer(function (layer) {
            if (layer._icon || layer._path) {
                mapInstance.removeLayer(layer);
            }
        });
    }
    clearCollectionsUI();
    resetCollectionSelection();
    console.log("[handleLoggedOutUI] Completed logged-out state logic.");
}


export function setupAuthUI(mapInstance) {
    // --- Existing event listeners for login/signup/logout forms ---
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

    // --- NEW: Check session immediately on page load once DOM is ready ---
    document.addEventListener('DOMContentLoaded', async () => {
        console.log("[DOMContentLoaded] Page loaded. Checking initial session...");
        const { data: { session }, error: getSessionError } = await supabase.auth.getSession();

        if (getSessionError) {
            console.error("[DOMContentLoaded] Error getting initial session:", getSessionError.message);
            handleLoggedOutUI(mapInstance, 'GET_SESSION_ERROR');
            return;
        }

        if (session) {
            console.log("[DOMContentLoaded] Initial session found. Handling profile and UI.");
            await handleProfileAndUI(session, 'INITIAL_SESSION_ON_LOAD'); // Pass a specific event type
        } else {
            console.log("[DOMContentLoaded] No initial session found. Handling logged-out UI.");
            handleLoggedOutUI(mapInstance, 'NO_INITIAL_SESSION');
        }
    });


    // --- Existing onAuthStateChange listener ---
    // This will now primarily handle SIGNED_IN (after login), SIGNED_OUT, USER_UPDATED, etc.
    // The INITIAL_SESSION on page load is now handled by the DOMContentLoaded block above.
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`[onAuthStateChange] Auth state changed! Event: ${event}. Session: ${session ? 'Object Present' : 'Null'}`);

        // Clear UI messages based on state transition
        if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
            clearUIMessage(authMessageDisplay);
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            clearUIMessage(appMessageDisplay);
        }

        if (event === 'SIGNED_IN') {
             // If SIGNED_IN from a fresh login (not INITIAL_SESSION on page load), handle it.
             console.log(`[onAuthStateChange] Handling SIGNED_IN event...`);
             await handleProfileAndUI(session, event);
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            console.log(`[onAuthStateChange] Handling ${event} event...`);
            handleLoggedOutUI(mapInstance, event);
        } else if (event === 'INITIAL_SESSION' && !session) {
            // This case handles INITIAL_SESSION where no session is found (e.g., first visit, cleared cache)
            console.log(`[onAuthStateChange] Handling INITIAL_SESSION with no session (user is guest).`);
            handleLoggedOutUI(mapInstance, event);
        }
        // For other events like USER_UPDATED,PASSWORD_RECOVERY, etc., you might want to call handleProfileAndUI(session, event)
        // or specific handlers if needed.
    });
}