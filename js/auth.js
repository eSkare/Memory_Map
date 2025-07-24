// js/auth.js
import { supabase } from '/Memory_Map/js/supabaseClient.js';
import { loadMarkersForCurrentUser } from '/Memory_Map/js/map.js'; // Will need this to refresh map on auth change
import { loadCollectionsForCurrentUser } from '/Memory_Map/js/collections.js'; // Will need this to refresh collections

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

    signupButton.addEventListener('click', async () => {
        const email = signupEmailInput.value;
        const password = signupPasswordInput.value;
        const username = signupUsernameInput.value;

        if (!username) {
            alert('Please provide a username.');
            return;
        }

        const { data: { user }, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username: username }
            }
        });

        if (signUpError) {
            alert(signUpError.message);
            return;
        }

        if (user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({ id: user.id, username: username });

            if (profileError) {
                console.error('Error creating user profile:', profileError.message);
                alert('Sign up successful, but failed to create user profile. Please try logging in.');
            } else {
                alert('Signed up and logged in successfully! Welcome, ' + username + '!');
            }
        } else {
            alert('Please check your email to confirm your account.');
        }
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

    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', session.user.id)
                .single();

            if (profile) {
                currentUserSpan.textContent = profile.username;
            } else {
                currentUserSpan.textContent = session.user.email || 'User';
                console.error("Error fetching profile:", error?.message);
            }
            loadMarkersForCurrentUser();
            loadCollectionsForCurrentUser();
        } else {
            authContainer.style.display = 'block';
            appContainer.style.display = 'none';
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
            if (mapInstance) { // Clear markers only if map instance is provided
                mapInstance.eachLayer(function(layer) {
                    if (layer instanceof L.Marker) {
                        mapInstance.removeLayer(layer);
                    }
                });
            }
            currentUserSpan.textContent = 'Guest';
        }
    });
}