// js/auth.js
import { supabase } from '/Memory_Map/js/supabaseClient.js';
import { loadMarkersForCurrentUser } from '/Memory_Map/js/map.js'; // Will need this to refresh map on auth change
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
        clearUIMessage(authMessageDisplay); // Clear message if user switches forms
    });

    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
        clearUIMessage(authMessageDisplay); // Clear message if user switches forms
    });

    loginButton.addEventListener('click', async () => {
        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            console.error('Login error:', error.message);
            displayUIMessage(error.message, 'error', authMessageDisplay, 0); // Error persists
        } else {
            // Message will be handled by onAuthStateChange after successful login
            // For immediate feedback *if* onAuthStateChange is slower,
            // you could display a brief loading message here.
            displayUIMessage('Logging in...', 'success', authMessageDisplay, 1000);
            // clearUIMessage(authMessageDisplay); // REMOVE THIS LINE - let onAuthStateChange clear
        }
    });

    signupButton.addEventListener('click', async () => {
        const email = signupEmailInput.value;
        const password = signupPasswordInput.value;
        const username = signupUsernameInput.value;

        if (!username) {
            displayUIMessage('Please provide a username.', 'warning', authMessageDisplay, 3000); // Use UI message
            return;
        }
        clearUIMessage(authMessageDisplay); // Clear any previous messages before attempting signup
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
            displayUIMessage(signUpError.message, 'error', authMessageDisplay, 0); // Error persists
            return;
        }

        displayUIMessage('Sign up successful! Please check your email to confirm your account before logging in.', 'success', authMessageDisplay, 5000);
        console.log('User signed up. Awaiting email confirmation.');
        // clearUIMessage(authMessageDisplay); // REMOVE THIS LINE - let the message fade
        signupEmailInput.value = '';
        signupPasswordInput.value = '';
        signupUsernameInput.value = '';
    });

    logoutButton.addEventListener('click', async () => {
        console.log('Logout button clicked!');
        const { error } = await supabase.auth.signOut();
        if (error) {
            displayUIMessage(error.message, 'error', appMessageDisplay, 0); // Error persists
            console.error('Logout error:', error.message);
        } else {
            displayUIMessage('Logged out successfully!', 'success', appMessageDisplay, 3000);
            console.log('Logout successful!');
            // clearUIMessage(appMessageDisplay); // REMOVE THIS LINE - let the message fade
        }
    });

    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed! Event:', event, 'Session:', session ? 'Session Object Present' : 'Session is null'); // More concise Session log

        if (session) {
            console.log("--- Full Session Object Contents (Start) ---");
            console.log("Session object:", session);
            console.log("Session user object:", session.user);
            console.log("Session user ID (direct access):", session.user ? session.user.id : 'User ID not found');
            console.log("--- Full Session Object Contents (End) ---");
        }

        // Conditional clearing of messages based on state transition
        if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
            clearUIMessage(authMessageDisplay);
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            clearUIMessage(appMessageDisplay);
        }

        if (session) {
            console.log("Entering logged-in state logic.");
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';

            // Set a temporary loading state for the username BEFORE fetching the profile
            currentUserSpan.textContent = 'Loading profile...';
            console.log("currentUserSpan set to 'Loading profile...'");

            // --- IMPORTANT: NEW TRY-CATCH BLOCK AROUND PROFILE FETCH ---
            try {
                // Verify Supabase client object is available before making the call
                console.log("Supabase client object status:", supabase ? 'Available' : 'NOT AVAILABLE');
                if (!supabase) {
                    console.error("Supabase client is not initialized!");
                    currentUserSpan.textContent = 'Error: Supabase not ready';
                    displayUIMessage("An internal error occurred (Supabase client not initialized).", 'error', appMessageDisplay, 0);
                    return; // Stop execution if supabase is not available
                }

                console.log("Attempting to fetch profile for user ID:", session.user.id);

                const { data: profile, error: profileFetchError } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', session.user.id)
                    .single();

                // These logs should now fire if the await resolves
                if (profile) {
                    console.log("PROFILE FETCH SUCCESS: Profile data received:", profile);
                    currentUserSpan.textContent = profile.username;
                    console.log(`currentUserSpan updated to: ${profile.username}`);

                    if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
                        displayUIMessage(`Welcome back, ${profile.username}!`, 'success', appMessageDisplay, 3000);
                    }
                } else if (profileFetchError && profileFetchError.message.includes('rows returned')) {
                    // This means no profile was found for the user's ID
                    console.warn("PROFILE NOT FOUND: No profile found for user ID:", session.user.id, "Attempting to create one...");

                    // Get username from user_metadata (set during signup) or default to email prefix
                    const usernameToUse = session.user.user_metadata?.username || (session.user.email ? session.user.email.split('@')[0] : 'UnknownUser');
                    console.log("Proposed username for new profile:", usernameToUse);

                    const { error: createProfileError } = await supabase
                        .from('profiles')
                        .insert({ id: session.user.id, username: usernameToUse });

                    if (createProfileError) {
                        console.error("FAILED TO CREATE PROFILE:", createProfileError.message);
                        currentUserSpan.textContent = session.user.email || 'User (profile missing, creation failed)';
                        displayUIMessage("Your profile could not be created automatically. Please contact support.", 'error', appMessageDisplay, 0);
                    } else {
                        console.log("Profile created successfully for user:", usernameToUse);
                        currentUserSpan.textContent = usernameToUse;
                        displayUIMessage(`Profile created. Welcome, ${usernameToUse}!`, 'success', appMessageDisplay, 3000);
                    }
                } else {
                    // This captures other types of errors, e.g., network issues, RLS blocking SELECT
                    console.error("ERROR FETCHING PROFILE (Other reason):", profileFetchError?.message, "Full error object:", profileFetchError);
                    currentUserSpan.textContent = session.user.email || 'User (error fetching profile)'; // Fallback if general error
                    displayUIMessage(`Error fetching your profile: ${profileFetchError?.message}`, 'error', appMessageDisplay, 0);
                }
            } catch (e) {
                // This will catch any JavaScript errors that occur synchronously
                // or during the await promise resolution (e.g., TypeError, network error that throws)
                console.error("UNCAUGHT ERROR DURING PROFILE FETCH BLOCK:", e);
                currentUserSpan.textContent = session.user.email || 'User (profile fetch failed)';
                displayUIMessage(`An unexpected error occurred during profile fetch: ${e.message}`, 'error', appMessageDisplay, 0);
            }
            // --- END NEW TRY-CATCH BLOCK ---

            // Load markers and collections only once the user is logged in AND profile is handled
            loadMarkersForCurrentUser();
            loadCollectionsForCurrentUser();

        } else {
            // User is logged out
            console.log('Entering logged-out state logic.');
            authContainer.style.display = 'block';
            appContainer.style.display = 'none';
            currentUserSpan.textContent = 'Guest'; // ONLY place to set 'Guest' when genuinely logged out

            // Only display 'You are currently a guest.' if not coming from a successful logout.
            if (event !== 'SIGNED_OUT') {
                displayUIMessage('You are currently a guest.', 'warning', authMessageDisplay, 3000);
            }

            // Clear map, markers, etc. for logged-out state
            if (mapInstance && mapInstance.eachLayer) {
                mapInstance.eachLayer(function (layer) {
                    if (layer._icon || layer._path) { // Check if it's a marker or polyline/polygon
                        mapInstance.removeLayer(layer);
                    }
                });
            }
            clearCollectionsUI();
            resetCollectionSelection();
        }
    });
}