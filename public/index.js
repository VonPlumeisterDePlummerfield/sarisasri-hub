// Import necessary Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyA6V7_3yqmTWz84pmzTFo9PQyCZZNCkxGs",
    authDomain: "sarisupply-hub.firebaseapp.com",
    projectId: "sarisupply-hub",
    storageBucket: "sarisupply-hub.firebasestorage.app",
    messagingSenderId: "999090750567",
    appId: "1:999090750567:web:ea5ac4353834c8bfa800c2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const cartBtn = document.getElementById('cart-btn');

// DOM elements
const logoutButton = document.querySelector('#logout');
const menuIcon = document.getElementById('menu-icon');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const closeSidebarBtn = document.getElementById('close-sidebar');
const mainContent = document.querySelector('.main-content');
const profileBtn = document.getElementById('profile-btn');

// Check if the user is logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in, so display user info or allow access
        console.log("User is logged in:", user);

        // Optional: You can show user's info or welcome message here
    } else {
        // User is not signed in, redirect to login page
        window.location.href = "login.html"; // Redirect to login page if no user is signed in
    }
});

// Logout functionality
logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => {
        // Successfully logged out
        console.log("User logged out.");
        window.location.href = "login.html"; // Redirect to login page
    }).catch((error) => {
        console.error("Error logging out:", error);
    });
});

// Cart button redirect to user cart page
cartBtn.addEventListener('click', () => {
    window.location.href = "user_cart.html";
  });

  // Redirect to the profile page when the Profile button is clicked
profileBtn.addEventListener('click', () => {
    window.location.href = "user_profile.html";
  });

// Sidebar toggle functionality
menuIcon.addEventListener('click', () => {
    sidebar.classList.add('active');
    overlay.classList.add('active');
    mainContent.classList.add('sidebar-active');  // Shift content to the right
});

closeSidebarBtn.addEventListener('click', () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    mainContent.classList.remove('sidebar-active');  // Reset content position
});

overlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    mainContent.classList.remove('sidebar-active');  // Reset content position
});
