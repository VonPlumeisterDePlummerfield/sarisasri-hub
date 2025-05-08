import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  addDoc,
  collection,
  query,
  getDocs,
  updateDoc,
  serverTimestamp,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const addProductForm = document.getElementById('add-product-form');
const productNameInput = document.getElementById('productName');
const productPriceInput = document.getElementById('productPrice');
const productStockInput = document.getElementById('productStock');
const productCategorySelect = document.getElementById('productCategory');
const productImageInput = document.getElementById('productImage');
const uploadMessage = document.getElementById('uploadMessage');
const imagePreview = document.getElementById('imagePreview');
const searchProductInput = document.getElementById('searchProduct');
const categoryFilter = document.getElementById('categoryFilter');
const productsContainer = document.getElementById('products-container');
const formTitle = document.getElementById('formTitle');
const addProductBtn = document.getElementById('addProductBtn');
const switchToAddBtn = document.getElementById('switchToAdd');
const homeBtn = document.getElementById('home-btn');
const logoutBtn = document.getElementById('logout-btn');
const orderBtn = document.getElementById('view-orders-btn');

let currentProductId = null;
let currentProductImage = null;
let currentStock = 0;
let isEditMode = false;

switchToAddBtn.addEventListener('click', () => {
  resetFormToAddMode();
});

function resetFormToAddMode() {
  isEditMode = false;
  formTitle.textContent = 'Add Product';
  addProductBtn.textContent = 'Add Product';
  addProductForm.reset(); 
  productStockInput.value = ''; 
  imagePreview.style.display = 'none'; 
  uploadMessage.textContent = '';

  currentProductId = null;
  currentProductImage = null;
  currentStock = 0;
}

productImageInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      imagePreview.src = e.target.result;
      imagePreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
});

function convertToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

addProductForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const productName = productNameInput.value.trim();
  const productPrice = parseFloat(productPriceInput.value);
  const stockToAdd = parseInt(productStockInput.value);
  const productCategory = productCategorySelect.value;
  const productImageFile = productImageInput.files[0];

  if (!productName || isNaN(productPrice) || isNaN(stockToAdd) || !productCategory) {
    uploadMessage.textContent = "Please fill in all product details.";
    return;
  }

  try {
    let imageBase64 = currentProductImage;

    if (productImageFile) {
      imageBase64 = await convertToBase64(productImageFile);
    }

    if (isEditMode && currentProductId) {
      const productRef = doc(db, "products", currentProductId);
      const newStock = currentStock + stockToAdd;

      await updateDoc(productRef, {
        name: productName,
        price: productPrice,
        stock: newStock,
        category: productCategory,
        imageBase64,
        updatedAt: serverTimestamp()
      });

      uploadMessage.textContent = "Product updated successfully!";
    } else {
      await addDoc(collection(db, "products"), {
        name: productName,
        price: productPrice,
        stock: stockToAdd,
        category: productCategory,
        imageBase64,
        createdAt: serverTimestamp()
      });

      uploadMessage.textContent = "Product added successfully!";
    }

    resetFormToAddMode();
    loadProducts();
  } catch (error) {
    uploadMessage.textContent = "Error saving product: " + error.message;
  }
});

function createProductItem(product) {
  const item = document.createElement('div');
  item.classList.add('product-item');

  item.innerHTML = `
    <div>${product.name}</div>
    <div>₱${product.price.toFixed(2)}</div>
    <div>${product.category}</div>
    <div>${product.stock ?? 0}</div>
    <div><button class="edit-button">Edit</button></div>
  `;

  const editBtn = item.querySelector('.edit-button');
  editBtn.addEventListener('click', () => {
    productNameInput.value = product.name;
    productPriceInput.value = product.price;
    productStockInput.value = '';
    productCategorySelect.value = product.category;

    imagePreview.src = product.imageBase64 || '';
    imagePreview.style.display = product.imageBase64 ? 'block' : 'none';

    currentProductId = product.id;
    currentProductImage = product.imageBase64 || '';
    currentStock = product.stock || 0;
    isEditMode = true;

    formTitle.textContent = 'Edit Product';
    addProductBtn.textContent = 'Update Product';
    uploadMessage.textContent = '';
  });

  return item;
}

async function loadProducts() {
  const loadingSpinner = document.getElementById("loading-spinner");
  const productsContainer = document.getElementById("products-container");

  loadingSpinner.style.display = "flex";
  const productItems = productsContainer.querySelectorAll('.product-item');
  productItems.forEach(item => item.remove());

  try {
    const q = query(collection(db, "products"));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(doc => {
      const data = doc.data();
      const product = { ...data, id: doc.id };
      const productElement = createProductItem(product);
      productsContainer.appendChild(productElement);
    });
  } catch (error) {
    console.error("Error loading products:", error);
  } finally {
    loadingSpinner.style.display = "none";
  }
}


async function filterProducts(searchTerm) {
  const productsSnapshot = await getDocs(collection(db, "products"));
  return productsSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(product =>
      product.name.toLowerCase().includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm)
    );
}

searchProductInput.addEventListener('input', async () => {
  const searchTerm = searchProductInput.value.toLowerCase();
  const filteredProducts = await filterProducts(searchTerm);
  productsContainer.innerHTML = "";
  filteredProducts.forEach(product => {
    const productItem = createProductItem(product);
    productsContainer.appendChild(productItem);
  });
});

categoryFilter.addEventListener('change', async () => {
  const selectedCategory = categoryFilter.value;
  const productsSnapshot = await getDocs(collection(db, "products"));
  const products = productsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  const filteredProducts = products.filter(product =>
    selectedCategory === "" || product.category === selectedCategory
  );

  productsContainer.innerHTML = "";
  filteredProducts.forEach(product => {
    const productItem = createProductItem(product);
    productsContainer.appendChild(productItem);
  });
});

logoutBtn.addEventListener('click', () => {
  signOut(auth).then(() => {
    window.location.href = 'login.html';
  }).catch((error) => {
    console.error('Error during logout:', error);
  });
});


homeBtn.addEventListener('click', () => {
  window.location.href = 'admin.html';
});

orderBtn.addEventListener('click', () => {
  window.location.href = 'admin_orders.html';
});


loadProducts();
