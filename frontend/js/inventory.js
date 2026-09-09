const API = "http://127.0.0.1:5001";

let inventoryData = [];

document.addEventListener("DOMContentLoaded", () => {
    loadInventory();

    document
        .getElementById("searchInput")
        .addEventListener("input", filterInventory);

    document
        .getElementById("statusFilter")
        .addEventListener("change", filterInventory);

    document
        .getElementById("inventoryForm")
        .addEventListener("submit", updateInventory);
});

async function loadInventory() {
    try {
        const response = await fetch(`${API}/inventory`);

        if (!response.ok) {
            throw new Error("Failed to load inventory");
        }

        inventoryData = await response.json();

        console.log("INVENTORY DATA:", inventoryData);

        updateStatistics(inventoryData);
        displayInventory(inventoryData);

    } catch (error) {
        console.error("Inventory error:", error);

        document.getElementById("message").innerHTML =
            `<p style="color:red;">Unable to load inventory.</p>`;
    }
}

function updateStatistics(data) {
    let inStock = 0;
    let lowStock = 0;
    let outStock = 0;

    data.forEach(item => {
        const quantity = Number(item.quantity);
        const reorder = Number(item.reorder_level);

        if (quantity === 0) {
            outStock++;
        } else if (quantity <= reorder) {
            lowStock++;
        } else {
            inStock++;
        }
    });

    document.getElementById("totalItems").textContent = data.length;
    document.getElementById("inStock").textContent = inStock;
    document.getElementById("lowStock").textContent = lowStock;
    document.getElementById("outStock").textContent = outStock;
}

function getStatus(quantity, reorderLevel) {
    quantity = Number(quantity);
    reorderLevel = Number(reorderLevel);

    if (quantity === 0) {
        return "OUT OF STOCK";
    }

    if (quantity <= reorderLevel) {
        return "LOW STOCK";
    }

    return "IN STOCK";
}

function displayInventory(data) {
    const table = document.getElementById("inventoryTable");

    table.innerHTML = "";

    if (data.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center;">
                    No inventory records found
                </td>
            </tr>
        `;

        return;
    }

    data.forEach(item => {
        const status = getStatus(
            item.quantity,
            item.reorder_level
        );

        let statusClass;

        if (status === "OUT OF STOCK") {
            statusClass = "out-stock";
        } else if (status === "LOW STOCK") {
            statusClass = "low-stock";
        } else {
            statusClass = "in-stock";
        }

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(item.inventory_id)}</td>

            <td>${escapeHTML(item.product_name)}</td>

            <td>${escapeHTML(item.store_name)}</td>

            <td>${escapeHTML(item.quantity)}</td>

            <td>${escapeHTML(item.reorder_level)}</td>

            <td>
                <span class="status ${statusClass}">
                    ${status}
                </span>
            </td>

            <td>
                ${formatDate(item.last_updated)}
            </td>

            <td>
                <button
                    class="edit-btn"
                    onclick="openEditModal(${item.inventory_id})">
                    Update
                </button>
            </td>
        `;

        table.appendChild(row);
    });
}

function filterInventory() {
    const search = document
        .getElementById("searchInput")
        .value
        .toLowerCase()
        .trim();

    const status =
        document.getElementById("statusFilter").value;

    const filtered = inventoryData.filter(item => {
        const product = String(
            item.product_name || ""
        ).toLowerCase();

        const store = String(
            item.store_name || ""
        ).toLowerCase();

        const currentStatus = getStatus(
            item.quantity,
            item.reorder_level
        );

        const matchesSearch =
            product.includes(search) ||
            store.includes(search);

        const matchesStatus =
            status === "ALL" ||
            currentStatus === status;

        return matchesSearch && matchesStatus;
    });

    displayInventory(filtered);
}

function openEditModal(id) {
    const item = inventoryData.find(
        inventory =>
            Number(inventory.inventory_id) === Number(id)
    );

    if (!item) {
        alert("Inventory record not found.");
        return;
    }

    document.getElementById("inventoryId").value =
        item.inventory_id;

    document.getElementById("productName").value =
        item.product_name || "";

    document.getElementById("storeName").value =
        item.store_name || "";

    document.getElementById("quantity").value =
        item.quantity ?? 0;

    document.getElementById("reorderLevel").value =
        item.reorder_level ?? 10;

    document.getElementById("inventoryModal").style.display =
        "flex";
}

function closeModal() {
    document.getElementById("inventoryModal").style.display =
        "none";
}

async function updateInventory(event) {
    event.preventDefault();

    const id =
        document.getElementById("inventoryId").value;

    const quantity =
        Number(document.getElementById("quantity").value);

    const reorderLevel =
        Number(document.getElementById("reorderLevel").value);

    if (!Number.isInteger(quantity) || quantity < 0) {
        showMessage(
            "Quantity must be a valid non-negative number.",
            "red"
        );
        return;
    }

    if (!Number.isInteger(reorderLevel) || reorderLevel < 0) {
        showMessage(
            "Reorder level must be a valid non-negative number.",
            "red"
        );
        return;
    }

    try {
        const response = await fetch(
            `${API}/inventory/${id}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    quantity: quantity,
                    reorder_level: reorderLevel
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Failed to update inventory"
            );
        }

        closeModal();

        showMessage(
            "Inventory updated successfully.",
            "green"
        );

        await loadInventory();

    } catch (error) {
        console.error("Update error:", error);

        showMessage(
            error.message || "Unable to update inventory.",
            "red"
        );
    }
}

function showMessage(text, color) {
    const message =
        document.getElementById("message");

    message.innerHTML =
        `<p style="color:${color};">${escapeHTML(text)}</p>`;

    setTimeout(() => {
        message.innerHTML = "";
    }, 3000);
}

function formatDate(dateString) {
    if (!dateString) {
        return "-";
    }

    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        return escapeHTML(dateString);
    }

    return escapeHTML(
        date.toLocaleString()
    );
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

window.addEventListener("click", event => {
    const modal =
        document.getElementById("inventoryModal");

    if (event.target === modal) {
        closeModal();
    }
});
