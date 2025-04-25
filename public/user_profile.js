import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyA6V7_3yqmTWz84pmzTFo9PQyCZZNCkxGs",
  authDomain: "sarisupply-hub.firebaseapp.com",
  projectId: "sarisupply-hub",
  storageBucket: "sarisupply-hub.appspot.com",
  messagingSenderId: "999090750567",
  appId: "1:999090750567:web:ea5ac4353834c8bfa800c2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const IMGUR_CLIENT_ID = "100b656f9dce338";

// DOM Elements
const homeBtn = document.getElementById('home-btn');
const cartBtn = document.getElementById('cart-btn');
const logoutBtn = document.getElementById('logout-btn');
const bannerImage = document.getElementById('bannerImage');
const profilePic = document.getElementById('profilePic');
const userName = document.getElementById('userName');
const userAddress = document.getElementById('address');
const userContact = document.getElementById('userContact');

let currentUserId = null;

// Navigation
homeBtn?.addEventListener('click', () => window.location.href = "index.html");
cartBtn?.addEventListener('click', () => window.location.href = "user_cart.html");
logoutBtn?.addEventListener('click', () => {
  signOut(auth).then(() => window.location.href = "login.html");
});

// Upload to Imgur
async function uploadToImgur(file) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("https://api.imgur.com/3/image", {
    method: "POST",
    headers: {
      Authorization: `Client-ID ${IMGUR_CLIENT_ID}`
    },
    body: formData
  });

  const result = await response.json();
  if (result.success) return result.data.link;
  else throw new Error("Imgur upload failed");
}

// Update and display profile picture with preview
document.getElementById('profileUpload')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file && currentUserId) {
    const previewUrl = URL.createObjectURL(file);
    profilePic.src = previewUrl;

    try {
      const imageUrl = await uploadToImgur(file);
      await updateDoc(doc(db, "users", currentUserId), { profileUrl: imageUrl });
      profilePic.src = imageUrl;
    } catch (err) {
      console.error("❌ Error uploading profile image:", err);
    }
  }
});

// Update and display banner image with preview
document.getElementById('bannerUpload')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file && currentUserId) {
    const previewUrl = URL.createObjectURL(file);
    bannerImage.src = previewUrl;

    try {
      const imageUrl = await uploadToImgur(file);
      await updateDoc(doc(db, "users", currentUserId), { bannerUrl: imageUrl });
      bannerImage.src = imageUrl;
    } catch (err) {
      console.error("❌ Error uploading banner image:", err);
    }
  }
});

// Load user data
onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }
  
    currentUserId = user.uid;
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
  
      if (!userSnap.exists()) {
        userName.textContent = "User profile not found.";
        return;
      }
  
      const userData = userSnap.data();
      const { firstName, middleName, lastName, address, phone, profileUrl, bannerUrl } = userData;
  
      const middleInitial = middleName ? `${middleName.charAt(0)}.` : '';
      const fullName = `${firstName} ${middleInitial} ${lastName}`.trim();
  
      userName.textContent = fullName || "Name not set";
      userAddress.textContent = `Address: ${address || "N/A"}`;
      userContact.textContent = `Contact Number: ${phone || "N/A"}`;
  
      // Load profile image with fallback
      const profileFallback = "images/pfp.jpg";
      profilePic.src = profileUrl ? profileUrl : profileFallback;

      // Use the onload and onerror events to ensure that image loads properly
      profilePic.onload = () => console.log("Profile image loaded successfully");
      profilePic.onerror = () => {
        console.warn("⚠️ Failed to load profile image, using fallback.");
        profilePic.src = profileFallback;
      };
  
      // Load banner image with fallback
      const bannerFallback = "images/banner.jpg";
      bannerImage.src = bannerUrl ? bannerUrl : bannerFallback;
      bannerImage.onload = () => console.log("Banner image loaded successfully");
      bannerImage.onerror = () => {
        console.warn("⚠️ Failed to load banner image, using fallback.");
        bannerImage.src = bannerFallback;
      };
  
    } catch (err) {
      console.error("✕ Error loading user profile images:", err);
      // Apply fallbacks in case of unexpected errors
      profilePic.src = "images/pfp.jpg";
      bannerImage.src = "images/banner.jpg";
    }
  });
