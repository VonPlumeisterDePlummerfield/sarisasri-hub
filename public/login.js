// Import necessary Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM elements
const loginForm = document.querySelector('form');
const usernameInput = document.querySelector('.input-group input[type="text"]');
const passwordInput = document.querySelector('.input-group input[type="password"]');
const spinner = document.getElementById('spinner'); // The spinner element

// Check if DOM is ready
if (!loginForm || !usernameInput || !passwordInput || !spinner) {
    console.error("Error: Could not find form or input elements in the DOM.");
}

// Event Listener for form submission
loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (username === "" || password === "") {
        alert("Please enter both username and password.");
        return;
    }

    // Show the spinner before starting the login process
    spinner.style.display = "block";

    try {
        // Sign in using Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, username, password);
        const user = userCredential.user;
        console.log("User logged in: ", user);

        // After successful login, fetch user role from Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();

            if (userData.role === "admin") {
                // If user is admin
                window.location.href = "admin.html";
            } else {
                // Regular user
                window.location.href = "index.html";
            }
        } else {
            console.error("No user data found in Firestore.");
            alert("User record not found. Contact support.");
        }

    } catch (error) {
        console.error("Login Error:", error.code, error.message);
        alert("Invalid credentials, please try again.");
    } finally {
        // Hide the spinner when login process is complete
        spinner.style.display = "none";
    }
});
