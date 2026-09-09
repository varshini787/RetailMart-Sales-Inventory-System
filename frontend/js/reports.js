const API = "http://127.0.0.1:5001";

document.addEventListener("DOMContentLoaded", loadReports);

async function loadReports() {
    try {
        const response = await fetch(API + "/reports");

        if (!response.ok) {
            throw new Error("Reports API failed");
        }

        const data = await response.json();

        console.log("REPORT DATA:", data);

        document.getElementById("monthlyRevenue").textContent =
            formatCurrency(data.revenue);

        document.getElementById("totalOrders").textContent =
            data.total_orders;

        document.getElementById("totalProducts").textContent =
            data.total_products;

        document.getElementById("totalCustomers").textContent =
            data.total_customers;

        displayStorePerformance(data.store_performance);
        displayCategorySales(data.category_sales);
        displayTopProducts(data.top_products);
        displayTopCustomers(data.top_customers);

    } catch (error) {
        console.error("Reports Error:", error);
        alert("Unable to load reports. Check that Flask is running.");
    }
}


function displayStorePerformance(stores) {

    const table = document.getElementById("storeTable");

    table.innerHTML = "";

    stores.forEach(store => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(store.store_name)}</td>
            <td>${store.total_orders}</td>
            <td>${formatCurrency(store.total_revenue)}</td>
        `;

        table.appendChild(row);
    });
}


function displayCategorySales(categories) {

    const table = document.getElementById("categoryTable");

    table.innerHTML = "";

    categories.forEach(category => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(category.category_name)}</td>
            <td>${formatCurrency(category.total_sales)}</td>
        `;

        table.appendChild(row);
    });
}


function displayTopProducts(products) {

    const table = document.getElementById("productTable");

    table.innerHTML = "";

    products.forEach((product, index) => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${escapeHTML(product.product_name)}</td>
            <td>${product.total_quantity}</td>
            <td>${formatCurrency(product.total_sales)}</td>
        `;

        table.appendChild(row);
    });
}


function displayTopCustomers(customers) {

    const table = document.getElementById("customerTable");

    table.innerHTML = "";

    customers.forEach((customer, index) => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${escapeHTML(customer.customer_name)}</td>
            <td>${customer.total_orders}</td>
            <td>${formatCurrency(customer.total_spent)}</td>
        `;

        table.appendChild(row);
    });
}


function formatCurrency(value) {

    return "₹" + Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
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


window.loadReports = loadReports;