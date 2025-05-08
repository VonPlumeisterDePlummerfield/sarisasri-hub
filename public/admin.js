import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, addDoc, collection } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginBtn = document.getElementById('adminLoginBtn');
const logoutBtn = document.getElementById('logout-btn');

// Admin login
loginBtn?.addEventListener('click', async () => {
  const email = document.getElementById('adminEmail').value;
  const password = document.getElementById('adminPassword').value;
  const loginError = document.getElementById('loginError');

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    const userDoc = await getDoc(doc(db, "users", uid));

    if (!userDoc.exists()) {
      loginError.textContent = "No user record found!";
      return;
    }

    const userData = userDoc.data();
    if (userData.role !== "admin") {
      loginError.textContent = "Access denied. Not an Admin!";
      await signOut(auth);
    } else {
      window.location.href = "admin.html";
    }
  } catch (err) {
    loginError.textContent = err.message;
  }
});

// Logout functionality
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        // Successfully logged out
        console.log("User logged out.");
        window.location.href = "login.html"; // Redirect to login page
    }).catch((error) => {
        console.error("Error logging out:", error);
    });
});

  // Manage Products button click event
  const manageProductsBtn = document.getElementById('manage-products');
  manageProductsBtn.addEventListener('click', () => {
      window.location.href = "admin_manage_products.html";
  });

  const orderBtn = document.getElementById('view-orders');
  orderBtn.addEventListener('click', () => {
      window.location.href = "admin_orders.html";
  });