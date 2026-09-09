const API_URL = "http://127.0.0.1:5001";

const table = document.getElementById("supplierTable");
const searchInput = document.getElementById("search");
let suppliers = [];

document.addEventListener("DOMContentLoaded", () => {
    loadSuppliers();
    if (searchInput) {
        searchInput.addEventListener("input", filterSuppliers);
    }
});

async function loadSuppliers() {
    try {
        const response = await fetch(`${API_URL}/suppliers`);
        if (!response.ok) {
            throw new Error("Failed to load suppliers");
        }

        suppliers = await response.json();
        const totalEl = document.getElementById("totalSuppliers");
        if (totalEl) {
            totalEl.textContent = suppliers.length;
        }

        displaySuppliers(suppliers);
    } catch (error) {
        console.error("Supplier error:", error);
        if (table) {
            table.innerHTML = `
                <tr>
                    <td colspan="6" class="loading" style="color: #dc2626;">
                        Unable to load suppliers from backend.
                    </td>
                </tr>
            `;
        }
    }
}

function displaySuppliers(data) {
    if (!table) return;
    table.innerHTML = "";

    if (data.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="6" class="loading">
                    No suppliers found
                </td>
            </tr>
        `;
        return;
    }

    data.forEach(supplier => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>#${supplier.supplier_id}</td>
            <td><strong>${escapeHTML(supplier.supplier_name)}</strong></td>
            <td>${escapeHTML(supplier.contact_person || "-")}</td>
            <td>${escapeHTML(supplier.phone || "-")}</td>
            <td>${escapeHTML(supplier.email || "-")}</td>
            <td>${escapeHTML(supplier.city || "-")}</td>
        `;
        table.appendChild(row);
    });
}

function filterSuppliers() {
    const query = searchInput.value.toLowerCase().trim();
    const filtered = suppliers.filter(s => {
        const name = (s.supplier_name || "").toLowerCase();
        const contact = (s.contact_person || "").toLowerCase();
        const city = (s.city || "").toLowerCase();
        return name.includes(query) || contact.includes(query) || city.includes(query);
    });
    displaySuppliers(filtered);
}

function escapeHTML(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
