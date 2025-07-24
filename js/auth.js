// js/auth.js
import { supabase } from '/Memory_Map/js/supabaseClient.js';
import { loadMarkersForCurrentUser } from '/Memory_Map/js/map.js'; // Will need this to refresh map on auth change
//import { loadCollectionsForCurrentUser } from '/Memory_Map/js/collections.js'; // Will need this to refresh collections

import { clearCollectionsUI, resetCollectionSelection, loadCollectionsForCurrentUser } from '/Memory_Map/js/collections.js';

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
            alert(error.message);
        } else {
            alert('Logged in successfully!');
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
            alert(signUpError.message);
            return;
        }
    
    
        // Now, always alert the user to check their email after successful signup call
        alert('Sign up successful! Please check your email to confirm your account before logging in.');
        console.log('User signed up. Awaiting email confirmation.');
        // Optionally, clear form fields here
        signupEmailInput.value = '';
        signupPasswordInput.value = '';
        signupUsernameInput.value = '';
    });

    logoutButton.addEventListener('click', async () => {
        console.log('Logout button clicked!'); // ADD THIS LINE
        const { error } = await supabase.auth.signOut();
        if (error) {
            alert(error.message);
            console.error('Logout error:', error.message); // ADD THIS LINE
        } else {
            alert('Logged out successfully!');
            console.log('Logout successful!'); // ADD THIS LINE
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
        }
    });
}