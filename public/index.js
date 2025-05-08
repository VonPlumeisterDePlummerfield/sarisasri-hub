// Import necessary Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, query, where, getDocs as getDocsQuery, updateDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM elements
const logoutButton = document.querySelector('#logout');
const menuIcon = document.getElementById('menu-icon');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const closeSidebarBtn = document.getElementById('close-sidebar');
const mainContent = document.querySelector('.main-content');
const profileBtn = document.getElementById('profile-btn');
const cartBtn = document.getElementById('cart-btn');
const productGrid = document.getElementById('product-grid');

const productOverlay = document.getElementById('product-overlay');
const overlayImage = document.getElementById('overlay-image');
const overlayName = document.getElementById('overlay-name');
const overlayCategory = document.getElementById('overlay-category');
const overlayStock = document.getElementById('overlay-stock');
const overlayPrice = document.getElementById('overlay-price');
const overlayTotal = document.getElementById('overlay-total');
const quantityInput = document.getElementById('quantity-input');
const increaseQtyBtn = document.getElementById('increase-qty-btn');
const decreaseQtyBtn = document.getElementById('decrease-qty-btn');
const closeOverlayBtn = document.getElementById('close-overlay-btn');
const confirmAddToCartBtn = document.getElementById('confirm-add-to-cart');

let currentUser = null;

// Check if the user is logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is logged in:", user);
        currentUser = user;
        fetchAndRenderProducts(); // Fetch products once user is authenticated
    } else {
        window.location.href = "login.html";
    }
});

// Logout functionality
logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => {
        console.log("User logged out.");
        window.location.href = "login.html";
    }).catch((error) => {
        console.error("Error logging out:", error);
    });
});

// Navigation
cartBtn.addEventListener('click', () => {
    window.location.href = "user_cart.html";
});

profileBtn.addEventListener('click', () => {
    window.location.href = "user_profile.html";
});

// Sidebar toggle functionality
menuIcon.addEventListener('click', () => {
    sidebar.classList.add('active');
    overlay.classList.add('active');
    mainContent.classList.add('sidebar-active');
});

closeSidebarBtn.addEventListener('click', () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    mainContent.classList.remove('sidebar-active');
});

overlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    mainContent.classList.remove('sidebar-active');
});

// Close overlay only once as requested
closeOverlayBtn.addEventListener('click', () => {
    productOverlay.style.display = 'none';
});

const categorySelect = document.getElementById('category');
const priceRangeInput = document.getElementById('price');
const priceRangeDisplay = document.getElementById('price-range');

priceRangeDisplay.textContent = `₱0 - ₱${priceRangeInput.value}`;
priceRangeInput.addEventListener('input', () => {
    const priceValue = priceRangeInput.value;
    priceRangeDisplay.textContent = `₱0 - ₱${priceValue}`;
});

// 🔥 Fetch and render products from Firestore
async function fetchAndRenderProducts() {
    productGrid.innerHTML = `
        <div id="loading-message">
            <div class="loading-spinner"></div>
            Loading products...
        </div>
    `;

    const selectedCategory = categorySelect.value;
    const selectedPrice = parseInt(priceRangeInput.value);

    try {
        const productRef = collection(db, "products");
        let filters = [];

        if (selectedCategory !== "all") {
            filters.push(where("category", "==", selectedCategory));
        }
        if (selectedPrice > 0) {
            filters.push(where("price", "<=", selectedPrice));
        }

        const productQuery = filters.length > 0 ? query(productRef, ...filters) : productRef;
        const querySnapshot = await getDocs(productQuery);
        productGrid.innerHTML = "";

        if (querySnapshot.empty) {
            productGrid.innerHTML = "<p>No products available for the selected filters.</p>";
            return;
        }

        const fragment = document.createDocumentFragment();

        const products = querySnapshot.docs.map(doc => ({
            ...doc.data(),
            docId: doc.id
        }));
        products.sort((a, b) => b.price - a.price);

        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${product.imageBase64}" alt="${product.name}" />
                <div class="product-info">
                    <h3>${product.name} <span style="font-size: 0.9em; color: #888;">(${product.category})</span></h3>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <p class="price">₱${parseFloat(product.price).toFixed(2)}</p>
                        <p style="font-size: 0.9em; color: #666;" data-stock-id="${product.docId}">Stock: ${product.stock}</p>
                    </div>
                    <button class="add-to-cart"
                        data-name="${product.name}"
                        data-category="${product.category}"
                        data-stock="${product.stock}"
                        data-price="${product.price}"
                        data-image="${product.imageBase64}"
                        data-docid="${product.docId}">Add to Cart</button>
                </div>
            `;
            fragment.appendChild(card);
        });

        productGrid.appendChild(fragment);

        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', () => {
                const name = button.dataset.name;
                const category = button.dataset.category;
                const stock = parseInt(button.dataset.stock);
                const price = parseFloat(button.dataset.price);
                const image = button.dataset.image;
                const docId = button.dataset.docid;

                overlayImage.src = image;
                overlayName.textContent = name;
                overlayCategory.textContent = `Category: ${category}`;
                overlayStock.textContent = `Stock Available: ${stock}`;
                overlayPrice.textContent = `Price: ₱${price.toFixed(2)}`;
                quantityInput.value = 1;
                productOverlay.style.display = 'flex';

                const updateTotal = () => {
                    let qty = parseInt(quantityInput.value);
                    if (isNaN(qty) || qty < 1) qty = 1;
                    if (qty > stock) qty = stock;
                    quantityInput.value = qty;
                    overlayTotal.textContent = `Total: ₱${(qty * price).toFixed(2)}`;
                };

                increaseQtyBtn.onclick = () => {
                    let qty = parseInt(quantityInput.value);
                    if (qty < stock) {
                        quantityInput.value = qty + 1;
                        updateTotal();
                    }
                };

                decreaseQtyBtn.onclick = () => {
                    let qty = parseInt(quantityInput.value);
                    if (qty > 1) {
                        quantityInput.value = qty - 1;
                        updateTotal();
                    }
                };

                quantityInput.oninput = () => {
                    let val = parseInt(quantityInput.value);
                    if (!isNaN(val)) {
                        if (val < 1) val = 1;
                        if (val > stock) val = stock;
                        quantityInput.value = val;
                        updateTotal();
                    }
                };
                const overlayLoadingSpinner = document.getElementById('overlay-loading-spinner');
                confirmAddToCartBtn.onclick = async () => {
                    const quantity = parseInt(quantityInput.value);
                    if (quantity > 0 && quantity <= stock && currentUser) {
                        overlayLoadingSpinner.style.display = 'block'; // Show spinner
                        confirmAddToCartBtn.disabled = true; // Prevent multiple clicks
                            
                        try {
                            const cartsRef = collection(db, "carts");
                            const q = query(
                                cartsRef,
                                where("userID", "==", currentUser.uid),
                                where("productName", "==", name),
                                where("category", "==", category)
                            );

                            const existingCart = await getDocs(q);

                            if (!existingCart.empty) {
                                const docRef = existingCart.docs[0].ref;
                                const prevData = existingCart.docs[0].data();
                                const newQuantity = prevData.quantity + quantity;
                                const newTotal = newQuantity * price;

                                await updateDoc(docRef, {
                                    quantity: newQuantity,
                                    total: newTotal,
                                    updatedAt: serverTimestamp()
                                });
                            } else {
                                await addDoc(cartsRef, {
                                    cartID: `${currentUser.uid}_${Date.now()}`,
                                    userID: currentUser.uid,
                                    productName: name,
                                    category: category,
                                    image: image,
                                    price: price,
                                    quantity: quantity,
                                    total: price * quantity,
                                    createdAt: serverTimestamp()
                                });
                            }

                            const productRef = doc(db, "products", docId);
                            const updatedStock = stock - quantity;

                            await updateDoc(productRef, {
                                stock: updatedStock
                            });

                            // Update stock text directly in DOM
                            const stockText = document.querySelector(`[data-stock-id="${docId}"]`);
                            if (stockText) stockText.textContent = `Stock: ${updatedStock}`;
                            button.dataset.stock = updatedStock;

                            alert(`Added ${quantity} × ${name} to cart!`);
                            productOverlay.style.display = 'none';

                        } catch (error) {
                            console.error("Error adding to cart:", error);
                            alert("Failed to add to cart. Please try again.");
                        } finally {
                            overlayLoadingSpinner.style.display = 'none';
                            confirmAddToCartBtn.disabled = false;
                        }
                    }
                };

                updateTotal();
            });
        });

    } catch (error) {
        console.error("Error fetching products:", error);
        productGrid.innerHTML = "<p>Failed to load products. Please try again later.</p>";
    }
}


// Trigger on category or price filter change
categorySelect.addEventListener('change', fetchAndRenderProducts);
priceRangeInput.addEventListener('input', fetchAndRenderProducts);

// Initial fetch
fetchAndRenderProducts();
