// Import Firebase modules
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";

// Firebase config and initialization
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// DOM elements
const homeBtn = document.getElementById('home-btn');
const logoutBtn = document.getElementById('logout-btn');
const cartBtn = document.getElementById('cart-btn');
const profileBtn = document.getElementById('profile-btn');

// Home button redirect to index
homeBtn.addEventListener('click', () => {
  window.location.href = "index.html";
});

cartBtn.addEventListener('click', () => {
    window.location.href = "user_cart.html";
});

profileBtn.addEventListener('click', () => {
    window.location.href = "user_profile.html"
});

// Logout logic
logoutBtn.addEventListener('click', () => {
  signOut(auth).then(() => {
    console.log("User logged out");
    window.location.href = "login.html"; // Redirect to login page after logout
  }).catch((error) => {
    console.error("Logout error: ", error.message);
  });
});
