// Import necessary Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Your Firebase config
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

// DOM elements
const loginForm = document.querySelector('form');
const usernameInput = document.querySelector('.input-group input[type="text"]');
const passwordInput = document.querySelector('.input-group input[type="password"]');

// Check if the DOM is fully loaded
if (!loginForm || !usernameInput || !passwordInput) {
    console.error("Error: Could not find form or input elements in the DOM.");
}

// Event Listener for form submission
loginForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    // Validation before attempting login
    if (username === "" || password === "") {
        alert("Please enter both username and password.");
        return;
    }

    // Firebase Login Logic
    signInWithEmailAndPassword(auth, username, password)
        .then((userCredential) => {
            // Successful login
            const user = userCredential.user;
            console.log("User logged in: ", user);

            // Redirect to home page or dashboard
            window.location.href = "index.html"; // Modify the redirect path as needed
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error("Login Error: ", errorCode, errorMessage);
            alert("Invalid credentials, please try again.");
        });
});
