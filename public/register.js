// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyA6V7_3yqmTWz84pmzTFo9PQyCZZNCkxGs",
    authDomain: "sarisupply-hub.firebaseapp.com",
    projectId: "sarisupply-hub",
    storageBucket: "sarisupply-hub.appspot.com",
    messagingSenderId: "999090750567",
    appId: "1:999090750567:web:ea5ac4353834c8bfa800c2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Get DOM elements
const registerForm = document.querySelector('form');
const firstName = document.querySelector('#firstName');
const middleName = document.querySelector('#middleName');
const lastName = document.querySelector('#lastName');
const age = document.querySelector('#age');
const birthday = document.querySelector('#birthday');
const email = document.querySelector('#email');
const phone = document.querySelector('#phone');
const address = document.querySelector('#address');
const password = document.querySelector('#password');
const confirmPassword = document.querySelector('#confirmPassword');

// Submit event
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validation
    if (
        !firstName.value || !middleName.value || !lastName.value || !age.value ||
        !birthday.value || !email.value || !phone.value || !address.value ||
        !password.value || !confirmPassword.value
    ) {
        alert("Please fill out all fields.");
        return;
    }

    if (password.value !== confirmPassword.value) {
        alert("Passwords do not match.");
        return;
    }

    try {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email.value.trim(),
            password.value.trim()
        );
        const user = userCredential.user;

        // Save additional data to Firestore with UID as document ID
        await setDoc(doc(db, "users", user.uid), {
            firstName: firstName.value.trim(),
            middleName: middleName.value.trim(),
            lastName: lastName.value.trim(),
            age: parseInt(age.value.trim()),
            birthday: birthday.value.trim(),
            email: email.value.trim(),
            phone: phone.value.trim(),
            address: address.value.trim(),
            createdAt: new Date()
        });

        alert("Registration successful!");
        window.location.href = "login.html";
    } catch (error) {
        console.error("Registration Error:", error.code, error.message);
        alert("Error: " + error.message);
    }
});
