import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const homeBtn = document.getElementById('home-btn');
const cartBtn = document.getElementById('cart-btn');
const logoutBtn = document.getElementById('logout-btn');
const bannerImage = document.getElementById('bannerImage');
const profilePic = document.getElementById('profilePic');
const userName = document.getElementById('userName');
const userAddress = document.getElementById('address');
const userContact = document.getElementById('userContact');
const profileUpload = document.getElementById('profileUpload');
const bannerUpload = document.getElementById('bannerUpload');

let currentUserId = null;
let unsubscribeUser = null;

// Navigation
homeBtn?.addEventListener('click', () => window.location.href = "index.html");
cartBtn?.addEventListener('click', () => window.location.href = "user_cart.html");
logoutBtn?.addEventListener('click', () => {
  signOut(auth).then(() => window.location.href = "login.html")
               .catch((err) => console.error("Logout failed:", err));
});

// Image compression function
const compressImageToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const MAX_SIZE = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const quality = 0.7;
        const base64 = canvas.toDataURL('image/jpeg', quality);
        resolve(base64);
      };
      img.onerror = error => reject(error);
      img.src = event.target.result;
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
};

// Handle profile picture upload
profileUpload?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file || !currentUserId) return;

  try {
    const previewUrl = URL.createObjectURL(file);
    profilePic.src = previewUrl;

    const compressedImage = await compressImageToBase64(file);
    await updateDoc(doc(db, "users", currentUserId), {
      profileBase64: compressedImage
    });

    console.log('Profile image updated in Firestore');
  } catch (err) {
    console.error("Profile upload failed:", err);
    profilePic.src = "images/pfp.jpg";
  }
});

// Handle banner image upload
bannerUpload?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file || !currentUserId) return;

  try {
    const previewUrl = URL.createObjectURL(file);
    bannerImage.src = previewUrl;

    const compressedImage = await compressImageToBase64(file);
    await updateDoc(doc(db, "users", currentUserId), {
      bannerBase64: compressedImage
    });

    console.log('Banner image updated in Firestore');
  } catch (err) {
    console.error("Banner upload failed:", err);
    bannerImage.src = "images/banner.jpg";
  }
});

// Set up Firestore listener
function setupUserListener(userId) {
  if (unsubscribeUser) unsubscribeUser();

  const userRef = doc(db, "users", userId);

  unsubscribeUser = onSnapshot(userRef, (docSnap) => {
    if (!docSnap.exists()) {
      console.warn("User document not found");
      return;
    }

    const data = docSnap.data();
    console.log("User data:", data);

    const {
      firstName = "",
      middleName = "",
      lastName = "",
      address = "N/A",
      phone = "N/A",
      profileBase64,
      bannerBase64
    } = data;

    // Construct full name with middle initial
    const middleInitial = middleName ? `${middleName.charAt(0)}.` : "";
    const fullName = `${firstName} ${middleInitial} ${lastName}`.trim();

    // Only update if content changed
    if (userName.textContent !== fullName) userName.textContent = fullName;
    if (userAddress.textContent !== `Address: ${address}`) userAddress.textContent = `Address: ${address}`;
    if (userContact.textContent !== `Contact Number: ${phone}`) userContact.textContent = `Contact Number: ${phone}`;

    // Update profile picture (only if different)
    if (profilePic.src !== profileBase64 && profileBase64) {
      profilePic.src = profileBase64;
    } else if (!profileBase64 && profilePic.src !== location.origin + "/images/pfp.jpg") {
      profilePic.src = "images/pfp.jpg";
    }

    profilePic.onerror = () => {
      if (profilePic.src !== location.origin + "/images/pfp.jpg") {
        console.warn("Failed to load profile image, using fallback");
        profilePic.src = "images/pfp.jpg";
      }
    };

    // Update banner image (only if different)
    if (bannerImage.src !== bannerBase64 && bannerBase64) {
      bannerImage.src = bannerBase64;
    } else if (!bannerBase64 && bannerImage.src !== location.origin + "/images/banner.jpg") {
      bannerImage.src = "images/banner.jpg";
    }

    bannerImage.onerror = () => {
      if (bannerImage.src !== location.origin + "/images/banner.jpg") {
        console.warn("Failed to load banner image, using fallback");
        bannerImage.src = "images/banner.jpg";
      }
    };
  }, (error) => {
    console.error("Error fetching user data:", error);
  });
}

// Auth state
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    currentUserId = user.uid;
    setupUserListener(user.uid);
  }
});

// Clean up
window.addEventListener('beforeunload', () => {
  if (unsubscribeUser) unsubscribeUser();
});
