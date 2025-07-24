// js/auth.js - ABSOLUTE BARE MINIMUM FOR AUTH STATE TOGGLE

import { supabase } from '/Memory_Map/js/supabaseClient.js';

// Get references to core UI elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');

// Auth form elements
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignupBtn = document.getElementById('show-signup');
const showLoginBtn = document.getElementById('show-login');

// Login form inputs/button
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginButton = document.getElementById('login-button');

// Signup form inputs/button
const signupEmailInput = document.getElementById('signup-email');
const signupPasswordInput = document.getElementById('signup-password');
const signupUsernameInput = document.getElementById('signup-username'); // Still needed for sign-up options
const signupButton = document.getElementById('signup-button');

// Logout button
const logoutButton = document.getElementById('logout-button');

// For this minimal test, we are intentionally ignoring:
// - currentUserSpan
// - custom message display elements (using alert for critical errors)
// - map/collection imports and functions

// Function to update UI based on session presence
function updateAuthUI(session) {
    if (session) {
        console.log("[BARE MINIMUM] Session found. Showing app container.");
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        // If you still have currentUserSpan in your HTML, you could do:
        // document.getElementById('current-username').textContent = session.user.email || 'Logged In';
    } else {
        console.log("[BARE MINIMUM] No session found. Showing auth container.");
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        // If you still have currentUserSpan in your HTML, you could do:
        // document.getElementById('current-username').textContent = 'Guest';
    }
}

export function setupAuthUI() { // mapInstance parameter is not needed for this minimal test
    // Toggle between login/signup forms
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

    // Login logic
    loginButton.addEventListener('click', async () => {
        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;
        console.log("[BARE MINIMUM] Attempting login...");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            console.error('Login error:', error.message);
            alert('Login failed: ' + error.message); // Use alert for critical feedback
        } else {
            console.log('Login successful.');
            // UI will be updated by onAuthStateChange, which fires immediately after login
        }
    });

    // Signup logic
    signupButton.addEventListener('click', async () => {
        const email = signupEmailInput.value;
        const password = signupPasswordInput.value;
        const username = signupUsernameInput.value; // Get username for metadata

        if (!username) {
            alert('Please provide a username.');
            return;
        }
        console.log("[BARE MINIMUM] Attempting signup...");
        const { data: { user }, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username: username } // Pass username as metadata
            }
        });

        if (signUpError) {
            console.error('Supabase Auth signUp error:', signUpError.message);
            alert('Sign up failed: ' + signUpError.message);
        } else {
            console.log('User signed up. Awaiting email confirmation.');
            alert('Sign up successful! Please check your email to confirm your account before logging in.');
            signupEmailInput.value = '';
            signupPasswordInput.value = '';
            signupUsernameInput.value = '';
        }
    });

    // Logout logic
    logoutButton.addEventListener('click', async () => {
        console.log('Logout button clicked!');
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Logout error:', error.message);
            alert('Logout failed: ' + error.message);
        } else {
            console.log('Logout successful.');
            // UI will be updated by onAuthStateChange
        }
    });

    // --- Core Authentication State Listener ---
    // This listener is key: it reacts to ANY auth state change (login, logout, refresh with session)
    supabase.auth.onAuthStateChange((event, session) => {
        console.log(`[BARE MINIMUM onAuthStateChange] Auth state changed! Event: ${event}. Session: ${session ? 'Object Present' : 'Null'}`);
        updateAuthUI(session); // Call the function to update UI based on the session
    });

    // Initial check on page load: onAuthStateChange should fire with 'INITIAL_SESSION'
    // or 'SIGNED_IN' if a session exists from a previous visit.

    console.log("Auth setup complete (BARE MINIMUM version).");
}