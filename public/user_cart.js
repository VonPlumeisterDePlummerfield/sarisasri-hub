// Firebase config
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc, addDoc, writeBatch 
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// DOM Elements
const cartItemsContainer = document.getElementById("cart-items");
const deliveryContainer = document.querySelector(".delivery-container");
const cartSummary = document.querySelector(".cart-summary p");
const loadingIndicator = document.getElementById("loading-indicator");
const homeBtn = document.getElementById('home-btn');
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
  window.location.href = "user_profile.html";
});

// Format price
function formatPrice(value) {
  return `₱${value.toFixed(2)}`;
}

// Fetch and render user data and cart items
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userId = user.uid;
  loadingIndicator.style.display = "block";

  try {
    // Run all async operations in parallel
    await Promise.all([
      loadUserInfo(userId),
      loadCart(userId),
      loadPurchaseItems(),
      loadCompletedOrders(userId)
    ]);
    console.log("All data loaded.");
  } catch (err) {
    console.error("Error during loading:", err);
  } finally {
    loadingIndicator.style.display = "none";
  }
});

async function loadUserInfo(userId) {
  const userDoc = await getDoc(doc(db, "users", userId));
  if (userDoc.exists()) {
    const data = userDoc.data();
    const middleInitial = data.middleName ? data.middleName.charAt(0) + "." : "";
    const fullName = `${data.firstName} ${middleInitial} ${data.lastName}`.trim();
    deliveryContainer.innerHTML = `
      <h3>Delivery Information</h3>
      <p><strong>Full Name:</strong> ${fullName}</p>
      <p><strong>Address:</strong> ${data.address || "N/A"}</p>
      <p><strong>Contact Number:</strong> ${data.phone || "N/A"}</p>
    `;
  }
}

async function loadCart(userId) {
  const cartQuerySnapshot = await getDocs(query(collection(db, "carts"), where("userID", "==", userId)));
  cartItemsContainer.innerHTML = "";

  if (cartQuerySnapshot.empty) {
    cartItemsContainer.innerHTML = "<p>Your cart is empty.</p>";
    cartSummary.innerHTML = `<strong>Total:</strong> ₱0.00`;
    return;
  }

  const cartItems = [];
  const productKeys = new Set();

  cartQuerySnapshot.forEach(doc => {
    const item = doc.data();
    item.cartItemId = doc.id;
    cartItems.push(item);
    productKeys.add(`${item.productName}|${item.category}`);
  });

  const productSnapshot = await getDocs(collection(db, "products"));
  const productMap = {};
  productSnapshot.forEach(doc => {
    const product = doc.data();
    const key = `${product.name}|${product.category}`;
    if (productKeys.has(key)) {
      productMap[key] = { ...product, productId: doc.id };
    }
  });

  let total = 0;

  cartItems.forEach(item => {
    const key = `${item.productName}|${item.category}`;
    const product = productMap[key];
    if (!product) return;

    const imageUrl = item.image || "images/default.png";
    const price = item.price;
    const currentQty = item.quantity;
    const productStock = product.stock;
    const maxQuantity = currentQty;
    const itemTotal = currentQty * price;
    total += itemTotal;

    const itemElement = document.createElement("div");
    itemElement.classList.add("cart-item");
    itemElement.innerHTML = `
      <img src="${imageUrl}" alt="${item.productName}">
      <div class="item-details">
        <h3 class="product-name" title="${item.productName}">${item.productName}</h3>
        <p>Price: ${formatPrice(price)}</p>
      </div>
      <div class="quantity-controls">
        <button class="decrease-quantity">-</button>
        <input type="number" class="quantity-input" style="width: 40px;" value="${currentQty}" min="0" max="${maxQuantity}" />
        <button class="increase-quantity">+</button>
      </div>
      <button class="confirm-changes" style="border: none;">Confirm</button>
      <div class="item-total">${formatPrice(itemTotal)}</div>
    `;
    cartItemsContainer.appendChild(itemElement);

    const decreaseBtn = itemElement.querySelector(".decrease-quantity");
    const increaseBtn = itemElement.querySelector(".increase-quantity");
    const quantityInput = itemElement.querySelector(".quantity-input");
    const confirmBtn = itemElement.querySelector(".confirm-changes");

    decreaseBtn.addEventListener("click", () => {
      let qty = parseInt(quantityInput.value);
      if (qty > 0) quantityInput.value = qty - 1;
    });

    increaseBtn.addEventListener("click", () => {
      let qty = parseInt(quantityInput.value);
      if (qty < maxQuantity) quantityInput.value = qty + 1;
    });

    confirmBtn.addEventListener("click", async () => {
      const newQty = parseInt(quantityInput.value);
      if (isNaN(newQty) || newQty < 0 || newQty > maxQuantity) {
        alert("Invalid quantity.");
        return;
      }

      const diff = newQty - currentQty;
      const newStock = productStock - diff;

      try {
        if (newQty === currentQty) {
          alert("No changes made.");
          return;
        }

        if (newQty === 0) {
          await deleteDoc(doc(db, "carts", item.cartItemId));
          await updateDoc(doc(db, "products", product.productId), {
            stock: productStock + currentQty
          });
          alert("Item removed from cart.");
        } else {
          await updateDoc(doc(db, "carts", item.cartItemId), { quantity: newQty });
          await updateDoc(doc(db, "products", product.productId), { stock: newStock });
          alert("Cart updated.");
        }

        await loadCart(userId); // Refresh cart
      } catch (e) {
        console.error("Update error:", e);
        alert("Action failed. See console for details.");
      }
    });
  });

  cartSummary.innerHTML = `<strong>Total:</strong> ${formatPrice(total)}`;
}

// Update cart item quantity and stock in Firestore
async function updateCartItem(productId, newQuantity) {
  try {
    const cartItemDoc = doc(db, "carts", productId);  // Reference cart item by ID
    await updateDoc(cartItemDoc, { quantity: newQuantity });

    // Fetch current product details
    const productDoc = doc(db, "products", productId);
    const productSnapshot = await getDoc(productDoc);
    const product = productSnapshot.data();
    const updatedStock = product.stock - (newQuantity - product.quantity);  // Adjust stock based on quantity change
    await updateDoc(productDoc, { stock: updatedStock });

  } catch (error) {
    console.error("Error updating cart item:", error);
  }
}

const checkoutBtn = document.getElementById("checkout-btn");
const purchasesItemsContainer = document.getElementById("purchases-items");

const loadPurchaseItems = async () => {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;

  // Add loading spinner
  purchasesItemsContainer.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      Loading purchases...
    </div>
  `;

  const snapshot = await getDocs(query(collection(db, "purchases"), where("userID", "==", userId)));

  let totalPrice = 0;
  const cancelBtn = document.getElementById("cancel-order-btn");
  const statusMessage = document.getElementById("cancel-status-message");
  statusMessage.innerHTML = ""; // Clear message on reload

  // Clear container after loading
  purchasesItemsContainer.innerHTML = "";

  if (snapshot.empty) {
    purchasesItemsContainer.innerHTML = "<p>No purchases found.</p>";
    document.getElementById("purchases-summary").querySelector("p").innerHTML = `<strong>Total:</strong> ₱0.00`;
    cancelBtn.disabled = true;
    cancelBtn.innerText = "Cancel Order";
    return;
  }

  let allConfirmed = true;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const itemTotal = data.price * data.quantity;
    totalPrice += itemTotal;

    const isConfirmed = data.flagged === "confirmed";
    if (!isConfirmed) {
      allConfirmed = false;
    }

    const itemDiv = document.createElement("div");
    itemDiv.className = "purchase-item";
    itemDiv.innerHTML = `
      <img src="${data.image}" alt="${data.productName}" />
      <h4>${data.productName}</h4>
      <div class="item-details">
        <p>Category: ${data.category}</p>
        <p>Quantity: ${data.quantity}</p>
      </div>
      <div class="item-price">₱${itemTotal.toFixed(2)}</div>
      <div class="action-btns">
        <button class="btn-remove" ${isConfirmed ? 'disabled title="This item is confirmed and cannot be removed."' : ""}>Remove</button>
      </div>
    `;

    const removeBtn = itemDiv.querySelector(".btn-remove");

    if (!isConfirmed) {
      removeBtn.addEventListener("click", async () => {
        await removePurchase(docSnap.id, data.productName, data.category, data.quantity);
      });
    }

    purchasesItemsContainer.appendChild(itemDiv);
  }

  document.getElementById("purchases-summary").querySelector("p").innerHTML = `<strong>Total:</strong> ₱${totalPrice.toFixed(2)}`;

  if (allConfirmed) {
    cancelBtn.disabled = true;
    cancelBtn.innerText = "Order Shipped";
    statusMessage.innerHTML = `<p style="color: green; font-weight: bold;">Your order is now shipped</p>`;
  } else {
    cancelBtn.disabled = false;
    cancelBtn.innerText = "Cancel Order";
  }
};

const removePurchase = async (purchaseId, productName, category, quantity) => {
  try {
    // Find the matching product document by productName and category
    const productsQuery = query(
      collection(db, "products"),
      where("name", "==", productName),
      where("category", "==", category)
    );
    const productSnapshot = await getDocs(productsQuery);

    if (!productSnapshot.empty) {
      const productDoc = productSnapshot.docs[0];
      const productData = productDoc.data();
      const updatedStock = productData.stock + quantity;

      // Update the stock
      await updateDoc(doc(db, "products", productDoc.id), {
        stock: updatedStock
      });
    }

    // Delete the purchase record
    await deleteDoc(doc(db, "purchases", purchaseId));
    alert("Purchase removed and stock updated.");
    await loadPurchaseItems();
  } catch (error) {
    console.error("Error removing purchase:", error);
    alert("Failed to remove purchase. Try again.");
  }
};

checkoutBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const userId = user.uid;

  // Check for any confirmed (shipped) purchases
  const purchasesSnapshot = await getDocs(
    query(collection(db, "purchases"), where("userID", "==", userId))
  );

  const hasShippedOrder = purchasesSnapshot.docs.some(
    doc => doc.data().flagged === "confirmed"
  );

  if (hasShippedOrder) {
    alert("You cannot checkout while you have a shipped order. Please wait for it to be delivered.");
    return;
  }

  const cartSnapshot = await getDocs(query(collection(db, "carts"), where("userID", "==", userId)));

  if (cartSnapshot.empty) {
    alert("Your cart is empty.");
    return;
  }

  try {
    for (const docSnap of cartSnapshot.docs) {
      const cartItem = docSnap.data();

      // Add to purchases collection
      await addDoc(collection(db, "purchases"), {
        ...cartItem,
        userID: userId,
        purchasedAt: new Date()
      });

      // Delete from cart
      await deleteDoc(doc(db, "carts", docSnap.id));
    }

    const loadCart = async () => {
      try {
        loadingIndicator.style.display = "block";

        // Load user info
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const middleInitial = data.middleName ? data.middleName.charAt(0) + "." : "";
          const fullName = `${data.firstName} ${middleInitial} ${data.lastName}`.trim();
          deliveryContainer.innerHTML = `
            <h3>Delivery Information</h3>
            <p><strong>Full Name:</strong> ${fullName}</p>
            <p><strong>Address:</strong> ${data.address || "N/A"}</p>
            <p><strong>Contact Number:</strong> ${data.phone || "N/A"}</p>
          `;
        }

        // Load cart items
        const cartQuerySnapshot = await getDocs(query(collection(db, "carts"), where("userID", "==", userId)));

        cartItemsContainer.innerHTML = "";
        if (cartQuerySnapshot.empty) {
          cartItemsContainer.innerHTML = "<p>Your cart is empty.</p>";
          cartSummary.innerHTML = `<strong>Total:</strong> ₱0.00`;
          return;
        }

        let total = 0;
        const cartItems = [];
        const productKeys = new Set();

        cartQuerySnapshot.forEach(doc => {
          const item = doc.data();
          item.cartItemId = doc.id;
          cartItems.push(item);
          productKeys.add(`${item.productName}|${item.category}`);
        });

        const productSnapshot = await getDocs(collection(db, "products"));
        const productMap = {};
        productSnapshot.forEach(doc => {
          const product = doc.data();
          const key = `${product.name}|${product.category}`;
          if (productKeys.has(key)) {
            productMap[key] = { ...product, productId: doc.id };
          }
        });

        cartItems.forEach(item => {
          const key = `${item.productName}|${item.category}`;
          const product = productMap[key];

          if (!product) return;

          const imageUrl = item.image || "images/default.png";
          const price = item.price;
          const currentQty = item.quantity;
          const productStock = product.stock;

          const maxQuantity = currentQty;
          const itemTotal = currentQty * price;
          total += itemTotal;

          const itemElement = document.createElement("div");
          itemElement.classList.add("cart-item");
          itemElement.innerHTML = `
          <img src="${imageUrl}" alt="${item.productName}">
          <div class="item-details">
            <h3 class="product-name" title="${item.productName}">${item.productName}</h3>
            <p>Price: ${formatPrice(price)}</p>
          </div>
          <div class="quantity-controls">
            <button class="decrease-quantity">-</button>
            <input type="number" class="quantity-input" style="width: 40px;" value="${currentQty}" min="0" max="${maxQuantity}" />
            <button class="increase-quantity">+</button>
          </div>
          <button class="confirm-changes" style="border: none;">Confirm</button>
          <div class="item-total">${formatPrice(itemTotal)}</div>
        `;
          cartItemsContainer.appendChild(itemElement);

          const decreaseBtn = itemElement.querySelector(".decrease-quantity");
          const increaseBtn = itemElement.querySelector(".increase-quantity");
          const quantityInput = itemElement.querySelector(".quantity-input");
          const confirmBtn = itemElement.querySelector(".confirm-changes");

          decreaseBtn.addEventListener("click", () => {
            let qty = parseInt(quantityInput.value);
            if (qty > 0) quantityInput.value = qty - 1;
          });

          increaseBtn.addEventListener("click", () => {
            let qty = parseInt(quantityInput.value);
            if (qty < maxQuantity) quantityInput.value = qty + 1;
          });

          confirmBtn.addEventListener("click", async () => {
            const newQty = parseInt(quantityInput.value);
            if (isNaN(newQty) || newQty < 0 || newQty > maxQuantity) {
              alert("Invalid quantity.");
              return;
            }

            const diff = newQty - currentQty;
            const newStock = productStock - diff;

            try {
              if (newQty === currentQty) {
                alert("No changes made.");
                return;
              }

              if (newQty === 0) {
                await deleteDoc(doc(db, "carts", item.cartItemId));
                await updateDoc(doc(db, "products", product.productId), {
                  stock: productStock + currentQty
                });
                alert("Item removed from cart.");
              } else {
                await updateDoc(doc(db, "carts", item.cartItemId), { quantity: newQty });
                await updateDoc(doc(db, "products", product.productId), { stock: newStock });
                alert("Cart updated.");
              }

              await loadCart(); // Refresh cart after changes

            } catch (e) {
              console.error("Update error:", e);
              alert("Action failed. See console for details.");
            }
          });
        });

        cartSummary.innerHTML = `<strong>Total:</strong> ${formatPrice(total)}`;

      } catch (err) {
        console.error("Cart loading failed:", err);
      } finally {
        loadingIndicator.style.display = "none";
      }
    };

    alert("Checkout successful!");
    await loadCart();         // Refresh cart
    await loadPurchaseItems(); // Refresh purchases
  } catch (error) {
    console.error("Checkout error:", error);
    alert("Checkout failed. See console for details.");
  }
});

document.getElementById("cancel-order-btn").addEventListener("click", async () => {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;

  const snapshot = await getDocs(query(collection(db, "purchases"), where("userID", "==", userId)));
  const statusMessage = document.getElementById("cancel-status-message");
  statusMessage.innerHTML = "";

  if (snapshot.empty) {
    alert("No purchases to cancel.");
    return;
  }

  const allConfirmed = snapshot.docs.every(doc => doc.data().flagged === "confirmed");
  if (allConfirmed) return; // Already handled in loadPurchaseItems()

  const confirmation = confirm("Are you sure you want to cancel all purchases?");
  if (!confirmation) return;

  try {
    const batch = writeBatch(db);
    const productQuantities = {};
    const purchaseIdsToDelete = [];

    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      const key = `${data.productName}|${data.category}`;

      if (!productQuantities[key]) {
        productQuantities[key] = 0;
      }

      productQuantities[key] += data.quantity;
      purchaseIdsToDelete.push(docSnap.id);
    });

    for (const key in productQuantities) {
      const [productName, category] = key.split("|");
      const totalToRestore = productQuantities[key];

      const productsQuery = query(
        collection(db, "products"),
        where("name", "==", productName),
        where("category", "==", category)
      );
      const productSnapshot = await getDocs(productsQuery);

      if (!productSnapshot.empty) {
        const productDoc = productSnapshot.docs[0];
        const updatedStock = productDoc.data().stock + totalToRestore;

        batch.update(doc(db, "products", productDoc.id), { stock: updatedStock });
      }
    }

    purchaseIdsToDelete.forEach(id => {
      batch.delete(doc(db, "purchases", id));
    });

    await batch.commit();
    alert("All purchases cancelled and stock restored.");
    await loadPurchaseItems(); // Refresh UI
  } catch (error) {
    console.error("Cancel order error:", error);
    alert("Failed to cancel purchases. See console for details.");
  }
});

/**
 * Load completed orders and display them
 */
const loadCompletedOrders = async (userId) => {
  const container = document.getElementById("completed-orders-list");

  container.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      Loading completed orders...
    </div>
  `;

  const q = query(
    collection(db, "userCompletedOrders"),
    where("userID", "==", userId)
  );

  try {
    const snapshot = await getDocs(q);

    // Clear loader
    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = "<p>No completed orders yet.</p>";
      return;
    }

    const orders = {};

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const completedAt = data.completedAt;
      const groupKey = `${userId}_${completedAt.seconds}`;

      if (!orders[groupKey]) {
        orders[groupKey] = {
          userID: data.userID,
          completedAt,
          items: [],
          total: 0,
        };
      }

      orders[groupKey].items.push({ ...data });
      orders[groupKey].total += data.total;
    });

    const groupedOrders = Object.values(orders).sort(
      (a, b) => b.completedAt.seconds - a.completedAt.seconds
    );

    if (groupedOrders.length === 0) {
      container.innerHTML = "<p>No items found for this order.</p>";
      return;
    }

    groupedOrders.forEach((group) => {
      const orderCard = document.createElement("div");
      orderCard.className = "order-card";
      orderCard.setAttribute("data-group-key", `${group.userID}_${group.completedAt.seconds}`);

      let html = `
        <hr style="border: 0; height: 2px; background: repeating-linear-gradient(to right, #6c757d, #6c757d 10px, transparent 10px, transparent 20px); margin: 15px 0;">
      `;

      group.items.forEach((item) => {
        html += `
          <p><strong>Product:</strong> ${item.productName || 'Unknown'}</p>
          <p><strong>Category:</strong> ${item.category || 'Unknown'}</p>
          <p><strong>Price:</strong> ₱${item.price?.toFixed(2) || '0.00'}</p>
          <p><strong>Quantity:</strong> ${item.quantity || '0'}</p>
          <p><strong>Total:</strong> ₱${item.total?.toFixed(2) || '0.00'}</p>
          <hr>
        `;
      });

      html += `<p style="text-align:right;"><strong>Overall Total:</strong> ₱${group.total?.toFixed(2) || '0.00'}</p>`;

      if (group.completedAt) {
        html += `<p style="text-align:right;"><strong>Completed at:</strong> ${group.completedAt.toDate().toLocaleString()}</p>`;
      }

      html += `
        <div style="text-align: right; margin-top: 10px;">
          <button class="delete-btn" data-group-key="${group.userID}_${group.completedAt.seconds}">Delete Order</button>
        </div>
      `;

      orderCard.innerHTML = html;
      container.appendChild(orderCard);

      const deleteBtn = orderCard.querySelector(".delete-btn");
      deleteBtn.addEventListener("click", async () => {
        if (confirm("Are you sure you want to delete this order?")) {
          try {
            const orderRef = collection(db, "userCompletedOrders");
            const orderQuery = query(
              orderRef,
              where("userID", "==", userId),
              where("completedAt", "==", group.completedAt)
            );
            const querySnapshot = await getDocs(orderQuery);

            await Promise.all(querySnapshot.docs.map((doc) => deleteDoc(doc.ref)));

            container.removeChild(orderCard);
            console.log("Order deleted successfully.");
          } catch (error) {
            console.error("Error deleting order:", error);
            alert("Error deleting the order.");
          }
        }
      });
    });
  } catch (error) {
    console.error("Error loading completed orders:", error);
    container.innerHTML = "<p>Error loading completed orders.</p>";
  }
};


// Logout logic
document.getElementById("logout-btn").addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    console.error("Logout error:", error);
  }
});
