// js/script.js - Importing dialog.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
// IMPORT DIALOG.JS HERE
import { showDialog } from '/Memory_Map/js/dialog.js';

// YOUR PROJECT URL AND ANON KEY (as provided in your test.html)
const SUPABASE_URL = 'https://szcotkwupwrbawgprkbk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6Y290a3d1cHdyYmF3Z3Bya2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNTEyNDcsImV4cCI6MjA2ODkyNzI0N30.e-cQbi9lt803sGD-SUItopcE6WgmYcxLFgPsGFp32zI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("Supabase client created successfully from external script.");

const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const usernameSpan = document.getElementById('usernameSpan');
const profileData = document.getElementById('profileData');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const logoutBtn = document.getElementById('logoutBtn');
// Get reference to the new test dialog button
const testDialogBtn = document.getElementById('testDialogBtn');

async function fetchUserProfile(userId) {
    console.log("Attempting to fetch profile for user ID:", userId);
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', userId)
            .single();

        if (error && error.message !== 'PGRST116: The result contains 0 rows') {
            console.error("Error fetching profile:", error);
            return null;
        }
        console.log("Profile data received:", profile);
        return profile;
    } catch (e) {
        console.error("Caught error during profile fetch:", e);
        return null;
    }
}

async function updateUI(session) {
    if (session) {
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        usernameSpan.textContent = session.user.email; // Set to email initially

        const profile = await fetchUserProfile(session.user.id);
        if (profile) {
            usernameSpan.textContent = profile.username; // Update to username if fetched
            profileData.textContent = JSON.stringify(profile, null, 2);
        } else {
            profileData.textContent = "Profile not found or error fetching.";
        }
    } else {
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        usernameSpan.textContent = 'Guest';
        profileData.textContent = '';
    }
}

loginBtn.addEventListener('click', async () => {
    const { error } = await supabase.auth.signInWithPassword({
        email: emailInput.value,
        password: passwordInput.value
    });
    if (error) console.error('Login failed:', error.message);
});

signupBtn.addEventListener('click', async () => {
    const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email: emailInput.value,
        password: passwordInput.value,
        options: { data: { username: emailInput.value.split('@')[0] } } // Simple username for test
    } );
    if (signUpError) console.error('Signup failed:', signUpError.message);
    else if (user) alert('Check your email for confirmation!');
});

logoutBtn.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout failed:', error.message);
});

// EVENT LISTENER FOR THE NEW DIALOG TEST BUTTON
if (testDialogBtn) {
    testDialogBtn.addEventListener('click', () => {
        showDialog("This is a test message from Dialog.js!");
    });
}


supabase.auth.onAuthStateChange((event, session) => {
    console.log("Auth state changed:", event, session ? "Session present" : "No session");
    updateUI(session);
});

// Initial check on page load using getSession
supabase.auth.getSession().then(({ data: { session } }) => {
    console.log("Initial getSession result:", session ? "Session found" : "No session found");
    updateUI(session);
});