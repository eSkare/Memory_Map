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
        console.log('Auth state changed! Event:', event, 'Session:', session);

        // This is crucial: Based on the event, decide what to clear.
        // Don't clear *all* messages every time, as it might clear ones you just set.
        if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
            // If we are about to display the app UI, clear auth form messages.
            clearUIMessage(authMessageDisplay);
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            // If we are about to display the auth UI, clear app messages.
            clearUIMessage(appMessageDisplay);
        }

        if (session) {
            console.log("Setting UI to logged-in state."); // For debugging
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';

            const { data: profile, error: profileFetchError } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', session.user.id)
                .single();

            if (profile) {
                currentUserSpan.textContent = profile.username;
                console.log("Profile found:", profile.username);
                // Only display welcome message if it's a fresh sign-in or a page load where they were already signed in
                if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
                    displayUIMessage(`Welcome back, ${profile.username}!`, 'success', appMessageDisplay, 3000);
                }
            } else if (profileFetchError && profileFetchError.message.includes('rows returned')) {
                console.warn("No profile found for user:", session.user.id, "Attempting to create one...");

                const usernameToUse = session.user.user_metadata?.username || session.user.email.split('@')[0];

                const { error: createProfileError } = await supabase
                    .from('profiles')
                    .insert({ id: session.user.id, username: usernameToUse });

                if (createProfileError) {
                    console.error("Failed to create missing profile after sign-in:", createProfileError.message);
                    currentUserSpan.textContent = session.user.email || 'User (profile missing)';
                    displayUIMessage("Your profile could not be created automatically. Please contact support.", 'error', appMessageDisplay, 0);
                } else {
                    console.log("Missing profile successfully created for user:", usernameToUse);
                    currentUserSpan.textContent = usernameToUse;
                    displayUIMessage(`Profile created. Welcome, ${usernameToUse}!`, 'success', appMessageDisplay, 3000);
                }
            } else {
                console.error("Unexpected error fetching profile:", profileFetchError?.message);
                currentUserSpan.textContent = session.user.email || 'User (error fetching profile)';
                displayUIMessage(`Error fetching your profile: ${profileFetchError?.message}`, 'error', appMessageDisplay, 0);
            }

            loadMarkersForCurrentUser();
            loadCollectionsForCurrentUser();

        } else {
            console.log("Setting UI to guest state."); // For debugging
            authContainer.style.display = 'block';
            appContainer.style.display = 'none';
            currentUserSpan.textContent = 'Guest';

            // Only display 'You are currently a guest.' if not coming from a successful logout.
            // A successful logout should have its own message displayed by logoutButton listener.
            if (event !== 'SIGNED_OUT') {
                displayUIMessage('You are currently a guest.', 'warning', authMessageDisplay, 3000);
            }

            // Clear map, markers, etc. for logged-out state
            if (mapInstance && mapInstance.eachLayer) {
                mapInstance.eachLayer(function (layer) {
                    if (layer._icon || layer._path) {
                        mapInstance.removeLayer(layer);
                    }
                });
            }
            clearCollectionsUI();
            resetCollectionSelection();
        }
    });
}