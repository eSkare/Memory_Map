// js/script.js - SELF-CONTAINED AUTHENTICATION (Based on working test.html)

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// --- Supabase Client Initialization (Directly in script.js) ---
const SUPABASE_URL = 'https://szcotkwupwrbawgprkbk.supabase.co'; // YOUR PROJECT URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6Y290a3d1cHdyYmF3Z3Bya2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNTEyNDcsImV4cCI6MjA2ODkyNzI0N30.e-cQbi9lt803sGD-SUItopcE6WgmYcxLFgPsGFp32zI'; // YOUR ANON KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("[SCRIPT.JS] Supabase client created successfully.");

// --- UI Element References ---
const authMessageDisplay = document.getElementById('message-display');
const appMessageDisplay = document.getElementById('app-message-display');

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
const profileDataDisplay = document.getElementById('profile-data-display'); // New element for profile data

// --- Helper Functions for UI Messages ---
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

// --- Core Authentication UI Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // Event listeners for login/signup form toggling
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

    // Login Button Click
    loginButton.addEventListener('click', async () => {
        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            console.error('[SCRIPT.JS] Login error:', error.message);
            displayUIMessage(error.message, 'error', authMessageDisplay, 0);
        } else {
            displayUIMessage('Logging in...', 'success', authMessageDisplay, 1000);
        }
    });

    // Signup Button Click
    signupButton.addEventListener('click', async () => {
        const email = signupEmailInput.value;
        const password = signupPasswordInput.value;
        const username = signupUsernameInput.value;

        if (!username) {
            displayUIMessage('Please provide a username.', 'warning', authMessageDisplay, 3000);
            return;
        }
        clearUIMessage(authMessageDisplay);
        console.log('[SCRIPT.JS] Attempting Supabase Auth signUp...');
        const { data: { user }, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username: username }
            }
        });

        if (signUpError) {
            console.error('[SCRIPT.JS] Supabase Auth signUp error:', signUpError.message);
            displayUIMessage(signUpError.message, 'error', authMessageDisplay, 0);
            return;
        }

        displayUIMessage('Sign up successful! Please check your email to confirm your account before logging in.', 'success', authMessageDisplay, 5000);
        console.log('[SCRIPT.JS] User signed up. Awaiting email confirmation.');
        signupEmailInput.value = '';
        signupPasswordInput.value = '';
        signupUsernameInput.value = '';
    });

    // Logout Button Click
    logoutButton.addEventListener('click', async () => {
        console.log('[SCRIPT.JS] Logout button clicked!');
        const { error } = await supabase.auth.signOut();
        if (error) {
            displayUIMessage(error.message, 'error', appMessageDisplay, 0);
            console.error('[SCRIPT.JS] Logout error:', error.message);
        } else {
            displayUIMessage('Logged out successfully!', 'success', appMessageDisplay, 3000);
            console.log('[SCRIPT.JS] Logout successful!');
        }
    });

    // --- onAuthStateChange Listener ---
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`[SCRIPT.JS] Auth state changed! Event: ${event}. Session: ${session ? 'Object Present' : 'Null'}`);

        // Clear messages for state transitions
        if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
            clearUIMessage(authMessageDisplay);
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            clearUIMessage(appMessageDisplay);
        }

        if (session) {
            console.log("[SCRIPT.JS] Entering logged-in state logic.");
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';

            // Set immediate username fallback (email)
            if (currentUserSpan) {
                currentUserSpan.textContent = session.user.email || 'Logged In User';
                console.log(`[SCRIPT.JS] currentUserSpan immediately set to: ${currentUserSpan.textContent}`);
            }

            // Fetch user profile for username
            try {
                console.log("[SCRIPT.JS] Attempting to fetch profile for user ID:", session.user.id);
                const { data: profile, error: profileFetchError } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', session.user.id)
                    .single();

                console.log("[SCRIPT.JS] AFTER PROFILE FETCH. Profile data:", profile, "Error:", profileFetchError);

                if (profileFetchError && profileFetchError.message !== 'PGRST116: The result contains 0 rows') {
                    console.error("[SCRIPT.JS] ERROR FETCHING PROFILE:", profileFetchError.message);
                    displayUIMessage(`Error loading profile: ${profileFetchError.message}`, 'error', appMessageDisplay, 0);
                    profileDataDisplay.textContent = `Error: ${profileFetchError.message}`;
                } else if (profile) {
                    console.log("[SCRIPT.JS] PROFILE FETCH SUCCESS. Username:", profile.username);
                    if (currentUserSpan) currentUserSpan.textContent = profile.username; // Update to username
                    profileDataDisplay.textContent = JSON.stringify(profile, null, 2); // Display full profile data
                    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                        displayUIMessage(`Welcome back, ${profile.username}!`, 'success', appMessageDisplay, 3000);
                    }
                } else {
                    console.warn("[SCRIPT.JS] PROFILE NOT FOUND for user. Attempting to create one...");
                    const usernameToUse = session.user.user_metadata?.username || (session.user.email ? session.user.email.split('@')[0] : 'UnknownUser');
                    const { error: createProfileError } = await supabase.from('profiles').insert({ id: session.user.id, username: usernameToUse });
                    if (createProfileError) {
                        console.error("[SCRIPT.JS] FAILED TO CREATE PROFILE:", createProfileError.message);
                        displayUIMessage("Profile creation failed.", 'error', appMessageDisplay, 0);
                        profileDataDisplay.textContent = `Error creating profile: ${createProfileError.message}`;
                    } else {
                        console.log("[SCRIPT.JS] Profile created successfully for user:", usernameToUse);
                        if (currentUserSpan) currentUserSpan.textContent = usernameToUse;
                        profileDataDisplay.textContent = JSON.stringify({ id: session.user.id, username: usernameToUse }, null, 2);
                        displayUIMessage(`Profile created. Welcome, ${usernameToUse}!`, 'success', appMessageDisplay, 3000);
                    }
                }
            } catch (e) {
                console.error("[SCRIPT.JS] UNCAUGHT ERROR DURING PROFILE FETCH BLOCK:", e.message);
                displayUIMessage(`An unexpected error occurred: ${e.message}`, 'error', appMessageDisplay, 0);
                profileDataDisplay.textContent = `Error: ${e.message}`;
            }

            console.log("[SCRIPT.JS] End of logged-in state logic.");

        } else {
            // User is logged out
            console.log('[SCRIPT.JS] Entering logged-out state logic.');
            authContainer.style.display = 'block';
            appContainer.style.display = 'none';
            if (currentUserSpan) currentUserSpan.textContent = 'Guest';
            profileDataDisplay.textContent = ''; // Clear profile data
            displayUIMessage('You are currently a guest.', 'warning', authMessageDisplay, 3000);
            console.log("[SCRIPT.JS] Completed logged-out state logic.");
        }
    });

    // Initial session check on page load
    supabase.auth.getSession().then(({ data: { session } }) => {
        console.log("[SCRIPT.JS] Initial getSession result:", session ? "Session found" : "No session found");
        // onAuthStateChange will handle the UI update based on this session
    });
});