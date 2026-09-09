const API_URL = "http://127.0.0.1:5001";

const table = document.getElementById("productTable");
const searchInput = document.getElementById("search");
const productForm = document.getElementById("productForm");

let products = [];
let categories = [];
let suppliers = [];


// =========================
// LOAD PRODUCTS
// =========================

async function loadProducts() {

    try {

        const response = await fetch(`${API_URL}/products`);

        if (!response.ok) {
            throw new Error("Failed to load products");
        }

        products = await response.json();

        displayProducts(products);

    } catch (error) {

        console.error(error);

        showMessage(
            "Unable to load products. Make sure the Flask server is running.",
            "error"
        );
    }
}


// =========================
// DISPLAY PRODUCTS
// =========================

function displayProducts(data) {

    table.innerHTML = "";

    if (data.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center;">
                    No products found
                </td>
            </tr>
        `;

        return;
    }


    data.forEach(product => {

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>${product.product_id}</td>

            <td>${escapeHTML(product.product_name)}</td>

            <td>${escapeHTML(product.sku)}</td>

            <td>${escapeHTML(product.category_name || "N/A")}</td>

            <td>${escapeHTML(product.supplier_name || "N/A")}</td>

            <td>₹${formatNumber(product.price)}</td>

            <td>₹${formatNumber(product.cost_price)}</td>

            <td>${product.reorder_level ?? 10}</td>

            <td>

                <button
                    class="action-btn edit-btn"
                    onclick="editProduct(${product.product_id})"
                >
                    Edit
                </button>

                <button
                    class="action-btn delete-btn"
                    onclick="deleteProduct(${product.product_id})"
                >
                    Delete
                </button>

            </td>

        `;

        table.appendChild(row);

    });
}


// =========================
// LOAD CATEGORIES
// =========================

async function loadCategories() {

    try {

        const response = await fetch(`${API_URL}/categories`);

        if (!response.ok) {
            throw new Error("Failed to load categories");
        }

        categories = await response.json();

        const select = document.getElementById("categoryId");

        select.innerHTML = `
            <option value="">
                Select Category
            </option>
        `;

        categories.forEach(category => {

            const option = document.createElement("option");

            option.value = category.category_id;

            option.textContent = category.category_name;

            select.appendChild(option);

        });

    } catch (error) {

        console.error("Category error:", error);

    }
}


// =========================
// LOAD SUPPLIERS
// =========================

async function loadSuppliers() {

    try {

        const response = await fetch(`${API_URL}/suppliers`);

        if (!response.ok) {
            throw new Error("Failed to load suppliers");
        }

        suppliers = await response.json();

        const select = document.getElementById("supplierId");

        select.innerHTML = `
            <option value="">
                Select Supplier
            </option>
        `;

        suppliers.forEach(supplier => {

            const option = document.createElement("option");

            option.value = supplier.supplier_id;

            option.textContent = supplier.supplier_name;

            select.appendChild(option);

        });

    } catch (error) {

        console.error("Supplier error:", error);

    }
}


// =========================
// SEARCH
// =========================

searchInput.addEventListener("input", function () {

    const searchText =
        searchInput.value.toLowerCase().trim();


    const filteredProducts = products.filter(product => {

        return (

            String(product.product_name || "")
                .toLowerCase()
                .includes(searchText)

            ||

            String(product.sku || "")
                .toLowerCase()
                .includes(searchText)

            ||

            String(product.category_name || "")
                .toLowerCase()
                .includes(searchText)

            ||

            String(product.supplier_name || "")
                .toLowerCase()
                .includes(searchText)

        );

    });


    displayProducts(filteredProducts);

});


// =========================
// OPEN ADD MODAL
// =========================

function openAddModal() {

    document.getElementById("modalTitle").textContent =
        "Add Product";

    document.getElementById("productId").value = "";

    document.getElementById("productName").value = "";

    document.getElementById("sku").value = "";

    document.getElementById("categoryId").value = "";

    document.getElementById("supplierId").value = "";

    document.getElementById("price").value = "";

    document.getElementById("costPrice").value = "";

    document.getElementById("reorderLevel").value = "10";


    document.getElementById("productModal").style.display =
        "flex";
}


// =========================
// CLOSE MODAL
// =========================

function closeModal() {

    document.getElementById("productModal").style.display =
        "none";

}


// =========================
// EDIT PRODUCT
// =========================

function editProduct(productId) {

    const product =
        products.find(
            item => item.product_id === productId
        );


    if (!product) {

        showMessage(
            "Product not found.",
            "error"
        );

        return;
    }


    document.getElementById("modalTitle").textContent =
        "Edit Product";


    document.getElementById("productId").value =
        product.product_id;


    document.getElementById("productName").value =
        product.product_name || "";


    document.getElementById("sku").value =
        product.sku || "";


    document.getElementById("categoryId").value =
        product.category_id || "";


    document.getElementById("supplierId").value =
        product.supplier_id || "";


    document.getElementById("price").value =
        product.price || "";


    document.getElementById("costPrice").value =
        product.cost_price || "";


    document.getElementById("reorderLevel").value =
        product.reorder_level ?? 10;


    document.getElementById("productModal").style.display =
        "flex";
}


// =========================
// SAVE PRODUCT
// =========================

productForm.addEventListener("submit", async function(event) {

    event.preventDefault();


    const productId =
        document.getElementById("productId").value;


    const productData = {

        product_name:
            document.getElementById("productName").value.trim(),

        sku:
            document.getElementById("sku").value.trim(),

        category_id:
            document.getElementById("categoryId").value || null,

        supplier_id:
            document.getElementById("supplierId").value || null,

        price:
            document.getElementById("price").value,

        cost_price:
            document.getElementById("costPrice").value || null,

        reorder_level:
            document.getElementById("reorderLevel").value || 10

    };


    try {

        let response;


        if (productId) {

            response = await fetch(
                `${API_URL}/products/${productId}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(productData)
                }
            );

        } else {

            response = await fetch(
                `${API_URL}/products`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(productData)
                }
            );

        }


        const result = await response.json();


        if (!response.ok) {

            throw new Error(
                result.error || "Operation failed"
            );

        }


        closeModal();


        showMessage(
            result.message,
            "success"
        );


        await loadProducts();


    } catch (error) {

        console.error(error);

        showMessage(
            error.message,
            "error"
        );

    }

});


// =========================
// DELETE PRODUCT
// =========================

async function deleteProduct(productId) {

    const product =
        products.find(
            item => item.product_id === productId
        );


    if (!product) {
        return;
    }


    const confirmed = confirm(
        `Are you sure you want to delete "${product.product_name}"?`
    );


    if (!confirmed) {
        return;
    }


    try {

        const response = await fetch(
            `${API_URL}/products/${productId}`,
            {
                method: "DELETE"
            }
        );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.error || "Unable to delete product"
            );

        }


        showMessage(
            result.message,
            "success"
        );


        await loadProducts();


    } catch (error) {

        console.error(error);

        showMessage(
            error.message,
            "error"
        );

    }

}


// =========================
// MESSAGE
// =========================

function showMessage(text, type) {

    const message =
        document.getElementById("message");


    message.textContent = text;

    message.className =
        `message ${type}`;

    message.style.display = "block";


    setTimeout(() => {

        message.style.display = "none";

    }, 4000);

}


// =========================
// NUMBER FORMAT
// =========================

function formatNumber(value) {

    if (value === null || value === undefined) {
        return "0.00";
    }

    return Number(value).toLocaleString(
        "en-IN",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


// =========================
// HTML SECURITY
// =========================

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// =========================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// =========================

window.addEventListener("click", function(event) {

    const modal =
        document.getElementById("productModal");

    if (event.target === modal) {
        closeModal();
    }

});


// =========================
// INITIAL LOAD
// =========================

async function initializeProductsPage() {

    await Promise.all([
        loadCategories(),
        loadSuppliers(),
        loadProducts()
    ]);

}


initializeProductsPage();