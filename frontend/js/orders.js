const API = "http://127.0.0.1:5001";

let ordersData = [];
let productsData = [];

document.addEventListener("DOMContentLoaded", function () {
    loadOrders();
    loadCustomers();
    loadStores();
    loadProducts();

    document.getElementById("searchInput").addEventListener("input", filterOrders);
    document.getElementById("statusFilter").addEventListener("change", filterOrders);
    document.getElementById("orderForm").addEventListener("submit", createOrder);
});

/* =========================
   LOAD ORDERS
========================= */

async function loadOrders() {
    const table = document.getElementById("ordersTable");
    try {
        const response = await fetch(API + "/orders");

        if (!response.ok) {
            throw new Error("Failed to load orders");
        }

        ordersData = await response.json();

        console.log("ORDERS DATA:", ordersData);
        console.log("NUMBER OF ORDERS:", ordersData.length);

        displayOrders(ordersData);
        updateStatistics();

    } catch (error) {
        console.error("Order loading error:", error);
        if (table) {
            table.innerHTML = `
                <tr>
                    <td colspan="7" class="loading" style="color: #dc2626;">
                        Unable to load orders. Please try again.
                    </td>
                </tr>
            `;
        }
        showMessage("Unable to load orders.", "red");
    }
}

/* =========================
   STATISTICS
========================= */

function updateStatistics() {
    if (!Array.isArray(ordersData)) return;

    const total = ordersData.length;

    const completed = ordersData.filter(function (order) {
        return order.status === "Completed";
    }).length;

    const pending = ordersData.filter(function (order) {
        return order.status === "Pending" ||
               order.status === "Processing";
    }).length;

    const sales = ordersData.reduce(function (sum, order) {
        return sum + Number(order.total_amount || 0);
    }, 0);

    const totalEl = document.getElementById("totalOrders");
    if (totalEl) totalEl.textContent = total;

    const completedEl = document.getElementById("completedOrders");
    if (completedEl) completedEl.textContent = completed;

    const pendingEl = document.getElementById("pendingOrders");
    if (pendingEl) pendingEl.textContent = pending;

    const salesEl = document.getElementById("totalSales") || document.getElementById("totalRevenue");
    if (salesEl) salesEl.textContent = formatCurrency(sales);
}

/* =========================
   DISPLAY ORDERS
========================= */

function displayOrders(data) {
    const table = document.getElementById("ordersTable");

    table.innerHTML = "";

    if (!data || data.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;">
                    No orders found
                </td>
            </tr>
        `;
        return;
    }

    data.forEach(function (order) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>#${order.order_id}</td>

            <td>
                ${escapeHTML(order.customer_name || "-")}
            </td>

            <td>
                ${escapeHTML(order.store_name || "-")}
            </td>

            <td>
                ${formatDate(order.order_date)}
            </td>

            <td>
                ${formatCurrency(order.total_amount)}
            </td>

            <td>
                <span class="status ${getStatusClass(order.status)}">
                    ${escapeHTML(order.status || "-")}
                </span>
            </td>

            <td>
                <button
                    class="view-btn"
                    onclick="viewOrder(${order.order_id})">
                    View
                </button>

                <button
                    class="edit-btn"
                    onclick="changeStatus(${order.order_id})">
                    Status
                </button>

                <button
                    class="delete-btn"
                    onclick="deleteOrder(${order.order_id})">
                    Delete
                </button>
            </td>
        `;

        table.appendChild(row);
    });
}

/* =========================
   SEARCH + FILTER
========================= */

function filterOrders() {
    const search = document
        .getElementById("searchInput")
        .value
        .toLowerCase()
        .trim();

    const status = document.getElementById("statusFilter").value;

    const filtered = ordersData.filter(function (order) {
        const orderId = String(order.order_id);

        const customer = String(
            order.customer_name || ""
        ).toLowerCase();

        const store = String(
            order.store_name || ""
        ).toLowerCase();

        const matchesSearch =
            orderId.includes(search) ||
            customer.includes(search) ||
            store.includes(search);

        const matchesStatus =
            status === "ALL" ||
            order.status === status;

        return matchesSearch && matchesStatus;
    });

    displayOrders(filtered);
}

/* =========================
   LOAD CUSTOMERS
========================= */

async function loadCustomers() {
    try {
        const response = await fetch(API + "/order-customers");

        if (!response.ok) {
            throw new Error("Failed to load customers");
        }

        const customers = await response.json();

        const select = document.getElementById("customerId");

        select.innerHTML = `
            <option value="">Select Customer</option>
        `;

        customers.forEach(function (customer) {
            const option = document.createElement("option");

            option.value = customer.customer_id;
            option.textContent = customer.customer_name;

            select.appendChild(option);
        });

    } catch (error) {
        console.error("Customer loading error:", error);
    }
}

/* =========================
   LOAD STORES
========================= */

async function loadStores() {
    try {
        const response = await fetch(API + "/order-stores");

        if (!response.ok) {
            throw new Error("Failed to load stores");
        }

        const stores = await response.json();

        const select = document.getElementById("storeId");

        select.innerHTML = `
            <option value="">Select Store</option>
        `;

        stores.forEach(function (store) {
            const option = document.createElement("option");

            option.value = store.store_id;
            option.textContent = store.store_name;

            select.appendChild(option);
        });

    } catch (error) {
        console.error("Store loading error:", error);
    }
}

/* =========================
   LOAD PRODUCTS
========================= */

async function loadProducts() {
    try {
        const response = await fetch(API + "/order-products");

        if (!response.ok) {
            throw new Error("Failed to load products");
        }

        productsData = await response.json();

        console.log("PRODUCT DATA:", productsData);

    } catch (error) {
        console.error("Product loading error:", error);
    }
}

/* =========================
   ADD PRODUCT ROW
========================= */

function addProductRow() {
    const container = document.getElementById("orderItems");

    const row = document.createElement("div");

    row.className = "order-item-row";

    let productOptions = `
        <option value="">Select Product</option>
    `;

    productsData.forEach(function (product) {
        productOptions += `
            <option
                value="${product.product_id}"
                data-price="${product.price}">
                ${escapeHTML(product.product_name)}
                - ₹${Number(product.price).toFixed(2)}
            </option>
        `;
    });

    row.innerHTML = `
        <select class="product-select" required>
            ${productOptions}
        </select>

        <input
            type="number"
            class="product-quantity"
            value="1"
            min="1"
            required
        >

        <button
            type="button"
            class="remove-btn"
            onclick="removeProductRow(this)">
            Remove
        </button>
    `;

    container.appendChild(row);

    row.querySelector(".product-select")
        .addEventListener("change", calculateTotal);

    row.querySelector(".product-quantity")
        .addEventListener("input", calculateTotal);

    calculateTotal();
}

/* =========================
   REMOVE PRODUCT
========================= */

function removeProductRow(button) {
    button.parentElement.remove();
    calculateTotal();
}

/* =========================
   CALCULATE TOTAL
========================= */

function calculateTotal() {
    let total = 0;

    const rows = document.querySelectorAll(".order-item-row");

    rows.forEach(function (row) {
        const select = row.querySelector(".product-select");
        const quantityInput = row.querySelector(".product-quantity");

        const quantity = Number(quantityInput.value || 0);

        if (select.selectedIndex >= 0) {
            const selectedOption =
                select.options[select.selectedIndex];

            const price =
                Number(selectedOption.dataset.price || 0);

            total += price * quantity;
        }
    });

    document.getElementById("orderTotal").textContent =
        formatCurrency(total);
}

/* =========================
   OPEN ADD ORDER MODAL
========================= */

function openAddOrderModal() {
    document.getElementById("orderForm").reset();

    document.getElementById("orderItems").innerHTML = "";

    document.getElementById("orderTotal").textContent = "₹0.00";

    addProductRow();

    document.getElementById("orderModal").style.display = "flex";
}

/* =========================
   CLOSE ADD ORDER MODAL
========================= */

function closeOrderModal() {
    document.getElementById("orderModal").style.display = "none";
}

/* =========================
   CREATE ORDER
========================= */

async function createOrder(event) {
    event.preventDefault();

    const customerId =
        document.getElementById("customerId").value;

    const storeId =
        document.getElementById("storeId").value;

    const status =
        document.getElementById("orderStatus").value;

    const rows =
        document.querySelectorAll(".order-item-row");

    const items = [];

    rows.forEach(function (row) {
        const productId =
            row.querySelector(".product-select").value;

        const quantity =
            Number(
                row.querySelector(".product-quantity").value
            );

        if (productId && quantity > 0) {
            items.push({
                product_id: Number(productId),
                quantity: quantity
            });
        }
    });

    if (!customerId) {
        showMessage("Please select a customer.", "red");
        return;
    }

    if (!storeId) {
        showMessage("Please select a store.", "red");
        return;
    }

    if (items.length === 0) {
        showMessage("Please add at least one product.", "red");
        return;
    }

    try {
        const response = await fetch(API + "/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                customer_id: Number(customerId),
                store_id: Number(storeId),
                status: status,
                items: items
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Failed to create order"
            );
        }

        closeOrderModal();

        showMessage(
            "Order #" + result.order_id +
            " created successfully.",
            "green"
        );

        await loadOrders();

    } catch (error) {
        console.error("Create order error:", error);
        showMessage(error.message, "red");
    }
}

/* =========================
   VIEW ORDER
========================= */

async function viewOrder(orderId) {
    try {
        const response =
            await fetch(API + "/orders/" + orderId);

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Unable to load order"
            );
        }

        const order = data.order;

        let html = `
            <div class="order-info">

                <p>
                    <strong>Order ID:</strong>
                    #${order.order_id}
                </p>

                <p>
                    <strong>Customer:</strong>
                    ${escapeHTML(order.customer_name || "-")}
                </p>

                <p>
                    <strong>Store:</strong>
                    ${escapeHTML(order.store_name || "-")}
                </p>

                <p>
                    <strong>Date:</strong>
                    ${formatDate(order.order_date)}
                </p>

                <p>
                    <strong>Status:</strong>
                    ${escapeHTML(order.status || "-")}
                </p>

            </div>

            <h3>Products</h3>

            <table>
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>

                <tbody>
        `;

        data.items.forEach(function (item) {
            html += `
                <tr>
                    <td>
                        ${escapeHTML(item.product_name)}
                    </td>

                    <td>
                        ${item.quantity}
                    </td>

                    <td>
                        ${formatCurrency(item.unit_price)}
                    </td>

                    <td>
                        ${formatCurrency(item.subtotal)}
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>

            <h3 class="details-total">
                Total:
                ${formatCurrency(order.total_amount)}
            </h3>
        `;

        document.getElementById("orderDetails").innerHTML = html;

        document.getElementById("detailsModal").style.display = "flex";

    } catch (error) {
        console.error("View order error:", error);
        showMessage(error.message, "red");
    }
}

/* =========================
   CLOSE DETAILS MODAL
========================= */

function closeDetailsModal() {
    document.getElementById("detailsModal").style.display = "none";
}

/* =========================
   CHANGE STATUS
========================= */

async function changeStatus(orderId) {
    const newStatus = prompt(
        "Enter new status:\n\n" +
        "Completed\n" +
        "Pending\n" +
        "Processing\n" +
        "Cancelled"
    );

    if (!newStatus) {
        return;
    }

    const allowed = [
        "Completed",
        "Pending",
        "Processing",
        "Cancelled"
    ];

    if (!allowed.includes(newStatus)) {
        alert(
            "Invalid status.\n\n" +
            "Use: Completed, Pending, Processing or Cancelled."
        );
        return;
    }

    try {
        const response = await fetch(
            API + "/orders/" + orderId,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    status: newStatus
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Failed to update status"
            );
        }

        showMessage(
            "Order status updated successfully.",
            "green"
        );

        await loadOrders();

    } catch (error) {
        console.error("Status update error:", error);
        showMessage(error.message, "red");
    }
}

/* =========================
   DELETE ORDER
========================= */

async function deleteOrder(orderId) {
    const confirmed = confirm(
        "Are you sure you want to delete Order #" +
        orderId +
        "?"
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(
            API + "/orders/" + orderId,
            {
                method: "DELETE"
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Failed to delete order"
            );
        }

        showMessage(
            "Order deleted successfully.",
            "green"
        );

        await loadOrders();

    } catch (error) {
        console.error("Delete order error:", error);
        showMessage(error.message, "red");
    }
}

/* =========================
   HELPERS
========================= */

function getStatusClass(status) {
    switch (status) {
        case "Completed":
            return "in-stock";

        case "Pending":
            return "low-stock";

        case "Processing":
            return "low-stock";

        case "Cancelled":
            return "out-stock";

        default:
            return "";
    }
}

function formatCurrency(value) {
    return "₹" +
        Number(value || 0).toLocaleString(
            "en-IN",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );
}

function formatDate(value) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("en-IN");
}

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

function showMessage(text, color) {
    const message = document.getElementById("message");

    message.innerHTML =
        `<p style="color:${color};">${escapeHTML(text)}</p>`;

    setTimeout(function () {
        message.innerHTML = "";
    }, 3000);
}

/* =========================
   MAKE FUNCTIONS AVAILABLE
========================= */

window.openAddOrderModal = openAddOrderModal;
window.closeOrderModal = closeOrderModal;
window.closeDetailsModal = closeDetailsModal;
window.closeViewOrderModal = closeDetailsModal;
window.addProductRow = addProductRow;
window.addOrderItemRow = addProductRow;
window.removeProductRow = removeProductRow;
window.viewOrder = viewOrder;
window.changeStatus = changeStatus;
window.deleteOrder = deleteOrder;

/* =========================
   CLOSE MODALS ON BACKGROUND CLICK
========================= */

window.addEventListener("click", function (event) {
    const orderModal =
        document.getElementById("orderModal");

    const detailsModal =
        document.getElementById("detailsModal");

    if (event.target === orderModal) {
        closeOrderModal();
    }

    if (event.target === detailsModal) {
        closeDetailsModal();
    }
});