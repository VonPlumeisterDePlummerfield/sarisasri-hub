import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  writeBatch,
  query,
  where,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// UI References
const logoutBtn = document.getElementById("logout-btn");
const homeBtn = document.getElementById("home-btn");
const manageProductsBtn = document.getElementById("manage-products");
const ordersList = document.getElementById("orders-list");

// Auth
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadOrders();
  } else {
    window.location.href = "login.html";
  }
});

// Navigation
logoutBtn?.addEventListener("click", () => {
  signOut(auth)
    .then(() => {
      window.location.href = "login.html";
    })
    .catch((error) => {
      console.error("Logout error:", error);
    });
});

homeBtn?.addEventListener("click", () => {
  window.location.href = "admin.html";
});

manageProductsBtn?.addEventListener("click", () => {
  window.location.href = "admin_manage_products.html";
});

// Load Orders
async function loadOrders() {
  ordersList.innerHTML = "<p>Loading orders...</p>";

  try {
    const [purchasesSnapshot, shippingSnapshot, completedSnapshot] = await Promise.all([
      getDocs(collection(db, "purchases")),
      getDocs(collection(db, "shipping")),
      getDocs(collection(db, "completedOrders"))
    ]);

    if (purchasesSnapshot.empty && shippingSnapshot.empty && completedSnapshot.empty) {
      ordersList.innerHTML = "<p>No orders found.</p>";
      return;
    }

    const userOrders = {};
    const confirmedOrders = {};
    const completedOrders = {};

    for (const docSnap of purchasesSnapshot.docs) {
      const data = docSnap.data();
      const userID = data.userID;

      if (!userOrders[userID]) {
        userOrders[userID] = {
          purchases: [],
          total: 0,
        };
      }

      if (data.status === "Completed") {
        await deleteDoc(doc(db, "purchases", docSnap.id));
        continue;
      }

      userOrders[userID].purchases.push({ id: docSnap.id, ...data });

      if (data.flagged !== "confirmed") {
        userOrders[userID].total += data.total;
      }
    }

    for (const docSnap of shippingSnapshot.docs) {
      const data = docSnap.data();
      const userID = data.userID;

      if (data.flagged !== "confirmed") continue;

      if (!confirmedOrders[userID]) {
        confirmedOrders[userID] = [];
      }

      confirmedOrders[userID].push({ id: docSnap.id, ...data });
    }

    for (const docSnap of completedSnapshot.docs) {
      const data = docSnap.data();
      const userID = data.userID;
      const groupKey = `${userID}_${data.completedAt?.seconds || 0}`;

      if (!completedOrders[groupKey]) {
        completedOrders[groupKey] = {
          userID,
          completedAt: data.completedAt,
          items: [],
        };
      }

      completedOrders[groupKey].items.push({ id: docSnap.id, ...data });
    }

    const completedGroups = Object.values(completedOrders).sort((a, b) => {
      return b.completedAt?.seconds - a.completedAt?.seconds;
    });

    const allUserIDs = new Set([
      ...Object.keys(userOrders),
      ...Object.keys(confirmedOrders),
      ...completedGroups.map(g => g.userID),
    ]);

    const userDataMap = {};
    for (const userID of allUserIDs) {
      try {
        const userDoc = await getDoc(doc(db, "users", userID));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const middleInitial = data.middleName ? data.middleName.charAt(0).toUpperCase() + "." : "";
          const fullName = [data.firstName, middleInitial, data.lastName].filter(Boolean).join(" ");
          userDataMap[userID] = {
            fullName,
            phone: data.phone || "N/A",
            address: data.address || "N/A",
            email: data.email || "N/A",
          };
        }
      } catch (err) {
        console.error(`Error fetching user ${userID}:`, err);
      }
    }

    let pendingHtml = "";
    let confirmedHtml = "";
    let completedHtml = "";

    for (const userID in userOrders) {
      const user = userDataMap[userID] || {
        fullName: "Unknown User",
        phone: "N/A",
        address: "N/A",
        email: "N/A",
      };

      const unconfirmed = userOrders[userID].purchases.filter(p => p.flagged !== "confirmed");

      if (unconfirmed.length > 0) {
        pendingHtml += `<div class="order-card">`;
        pendingHtml += `<h4>${user.fullName}</h4>`;
        pendingHtml += `<p><strong>Phone:</strong> ${user.phone}</p>`;
        pendingHtml += `<p><strong>Address:</strong> ${user.address}</p>`;
        pendingHtml += `<p><strong>Email:</strong> ${user.email}</p>`;
        pendingHtml += `<hr style="border: 0; height: 2px; background: repeating-linear-gradient(to right, #007bff, #007bff 10px, transparent 10px, transparent 20px); margin: 15px 0;">`;

        unconfirmed.forEach(p => {
          pendingHtml += `
            <p><strong>Product:</strong> ${p.productName}</p>
            <p><strong>Category:</strong> ${p.category}</p>
            <p><strong>Price:</strong> ₱${p.price.toFixed(2)}</p>
            <p><strong>Quantity:</strong> ${p.quantity}</p>
            <p><strong>Total:</strong> ₱${p.total.toFixed(2)}</p>
            <hr>
          `;
        });

        pendingHtml += `
          <p style="text-align: right; font-weight: bold;">Total: ₱${userOrders[userID].total.toFixed(2)}</p>
          <div style="text-align: right;">
            <button class="confirm-btn" data-user="${userID}">Confirm</button>
          </div>
        </div>`;
      }
    }

    for (const userID in confirmedOrders) {
      const user = userDataMap[userID] || {
        fullName: "Unknown User",
        phone: "N/A",
        address: "N/A",
        email: "N/A",
      };

      const confirmedList = confirmedOrders[userID];
      const confirmedTotal = confirmedList.reduce((sum, p) => sum + p.total, 0);

      confirmedHtml += `<div class="order-card">`;
      confirmedHtml += `<h4>${user.fullName}</h4>`;
      confirmedHtml += `<p><strong>Phone:</strong> ${user.phone}</p>`;
      confirmedHtml += `<p><strong>Address:</strong> ${user.address}</p>`;
      confirmedHtml += `<p><strong>Email:</strong> ${user.email}</p>`;
      confirmedHtml += `<hr style="border: 0; height: 2px; background: repeating-linear-gradient(to right, #28a745, #28a745 10px, transparent 10px, transparent 20px); margin: 15px 0;">`;

      confirmedList.forEach(p => {
        confirmedHtml += `
          <p><strong>Product:</strong> ${p.productName}</p>
          <p><strong>Category:</strong> ${p.category}</p>
          <p><strong>Price:</strong> ₱${p.price.toFixed(2)}</p>
          <p><strong>Quantity:</strong> ${p.quantity}</p>
          <p><strong>Total:</strong> ₱${p.total.toFixed(2)}</p>
          <hr>
        `;
      });

      confirmedHtml += `
        <p style="text-align: right; font-weight: bold;">Total: ₱${confirmedTotal.toFixed(2)}</p>
        <div style="text-align: right;">
          <button class="complete-btn" data-user="${userID}">Complete</button>
        </div>
      </div>`;
    }

    completedGroups.forEach(group => {
      const user = userDataMap[group.userID] || {
        fullName: "Unknown User",
        phone: "N/A",
        address: "N/A",
        email: "N/A",
      };
    
      const groupKey = `${group.userID}_${group.completedAt?.seconds || 0}`;
    
      completedHtml += `<div class="order-card" data-group-key="${groupKey}">`;
      completedHtml += `<h4>${user.fullName}</h4>`;
      completedHtml += `<p><strong>Phone:</strong> ${user.phone}</p>`;
      completedHtml += `<p><strong>Address:</strong> ${user.address}</p>`;
      completedHtml += `<p><strong>Email:</strong> ${user.email}</p>`;
      completedHtml += `<hr style="border: 0; height: 2px; background: repeating-linear-gradient(to right, #6c757d, #6c757d 10px, transparent 10px, transparent 20px); margin: 15px 0;">`;
    
      let groupTotal = 0;
    
      group.items.forEach(p => {
        const itemTotal = p.total || (p.price * p.quantity); // Fallback if total isn't available
        groupTotal += itemTotal;
    
        completedHtml += `
          <p><strong>Product:</strong> ${p.productName}</p>
          <p><strong>Category:</strong> ${p.category}</p>
          <p><strong>Price:</strong> ₱${p.price.toFixed(2)}</p>
          <p><strong>Quantity:</strong> ${p.quantity}</p>
          <p><strong>Total:</strong> ₱${itemTotal.toFixed(2)}</p>
          <hr>
        `;
      });
    
      completedHtml += `<p style="text-align:right;"><strong>Overall Total:</strong> ₱${groupTotal.toFixed(2)}</p>`;
    
      if (group.completedAt) {
        completedHtml += `<p style="text-align:right;"><strong>Completed at:</strong> ${new Date(group.completedAt.seconds * 1000).toLocaleString()}</p>`;
      }
    
      completedHtml += `
        <div style="text-align: right;">
          <button class="delete-completed-btn" data-group-key="${groupKey}">Delete</button>
        </div>
      </div>`;
    });
    

    ordersList.innerHTML = `
      <div class="orders-section">
        <div class="pending-orders scroll-container">
          <h3>Pending Orders</h3>
          ${pendingHtml || "<p>No pending orders.</p>"}
        </div>
        <div class="confirmed-orders scroll-container">
          <h3>Confirmed Orders</h3>
          ${confirmedHtml || "<p>No confirmed orders yet.</p>"}
        </div>
      </div>
      <div class="completed-orders scroll-container">
        <h3>Completed Orders</h3>
        ${completedHtml || "<p>No completed orders yet.</p>"}
      </div>
    `;

    const styleTag = document.createElement("style");
    styleTag.textContent = `
      .scroll-container {
        max-height: 500px;
        overflow-y: auto;
        margin-bottom: 30px;
        padding-right: 10px;
      }
      .orders-section {
        display: flex;
        gap: 30px;
        flex-wrap: wrap;
      }
      .pending-orders, .confirmed-orders, .completed-orders {
        flex: 1 1 100%;
      }
      @media(min-width: 768px) {
        .pending-orders, .confirmed-orders {
          flex: 1 1 48%;
        }
      }
    `;
    document.head.appendChild(styleTag);

    document.querySelectorAll(".confirm-btn").forEach(btn => {
      btn.addEventListener("click", async e => {
        const userID = e.target.getAttribute("data-user");
        const toConfirm = userOrders[userID].purchases.filter(p => p.flagged !== "confirmed");

        const batch = writeBatch(db);
        try {
          toConfirm.forEach(p => {
            const purchaseRef = doc(db, "purchases", p.id);
            const shippingRef = doc(db, "shipping", p.id);

            batch.update(purchaseRef, { flagged: "confirmed" });
            batch.set(shippingRef, {
              ...p,
              flagged: "confirmed",
              status: "Pending Shipping",
              shippedAt: null,
              updatedAt: new Date(),
            });
          });

          await batch.commit();
          alert("Orders confirmed!");
          loadOrders();
        } catch (err) {
          console.error("Error confirming:", err);
          alert("Error confirming orders.");
        }
      });
    });

    document.querySelectorAll(".complete-btn").forEach(btn => {
      btn.addEventListener("click", async e => {
        const userID = e.target.getAttribute("data-user");
        const confirmed = confirmedOrders[userID];
        
        if (!confirmed || confirmed.length === 0) return;
        
        const batch = writeBatch(db);
        
        try {
          // Generate a single completedAt timestamp for all items
          const completedAt = new Date();
        
          for (const p of confirmed) {
            const shippingRef = doc(db, "shipping", p.id);
            const completedRef = doc(db, "completedOrders", p.id);
            const userCompletedRef = doc(db, "userCompletedOrders", p.id); // Updated to global userCompletedOrders collection
            
            // Move order to completedOrders (global collection)
            batch.set(completedRef, {
              ...p,
              status: "Completed",
              completedAt: completedAt, // Use shared timestamp
            });
        
            // Move order to user's userCompletedOrders (updated to global collection)
            batch.set(userCompletedRef, {
              ...p,
              status: "Completed",
              completedAt: completedAt, // Use shared timestamp
            });
        
            // Update and delete from shipping
            batch.update(shippingRef, { status: "Completed" });
            batch.delete(shippingRef);
        
            // Update product's status to "Completed"
            const productQuery = query(
              collection(db, "products"),
              where("cartID", "==", p.cartID)
            );
        
            const productSnap = await getDocs(productQuery);
        
            if (!productSnap.empty) {
              const productDoc = productSnap.docs[0];
              const productRef = doc(db, "products", productDoc.id);
              batch.update(productRef, { status: "Completed" });
            }
        
            // Update purchase with status field if it doesn't exist
            const purchaseRef = doc(db, "purchases", p.id);
            const purchaseDoc = await getDoc(purchaseRef);
            if (purchaseDoc.exists() && !purchaseDoc.data().hasOwnProperty("status")) {
              batch.update(purchaseRef, { status: "Completed" });
            }
          }
        
          await batch.commit();
          alert("Orders completed!");
          loadOrders();
        } catch (err) {
          console.error("Error completing:", err);
          alert("Error completing orders.");
        }
      });
    });
    
    document.querySelectorAll(".delete-completed-btn").forEach(btn => {
      btn.addEventListener("click", async e => {
        const groupKey = e.target.getAttribute("data-group-key");
        const group = completedOrders[groupKey];
        if (!group) return;

        if (!confirm("Are you sure you want to delete this completed order?")) return;

        const batch = writeBatch(db);
        try {
          group.items.forEach(item => {
            const completedRef = doc(db, "completedOrders", item.id);
            batch.delete(completedRef);
          });

          await batch.commit();
          alert("Completed order deleted.");
          loadOrders();
        } catch (err) {
          console.error("Error deleting completed order:", err);
          alert("Failed to delete completed order.");
        }
      });
    });
  } catch (err) {
    console.error("Error loading orders:", err);
    ordersList.innerHTML = "<p>Error loading orders. Please try again later.</p>";
  }
}