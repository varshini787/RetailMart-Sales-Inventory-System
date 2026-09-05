const table = document.getElementById("inventoryTable");

fetch("http://127.0.0.1:5001/inventory")
    .then(response => response.json())
    .then(data => {

        let inStock = 0;
        let lowStock = 0;
        let outOfStock = 0;

        table.innerHTML = "";

        data.forEach(item => {

            const status = item.stock_status;

            if (status === "In Stock") {
                inStock++;
            } else if (status === "Low Stock") {
                lowStock++;
            } else if (status === "Out of Stock") {
                outOfStock++;
            }

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${item.product_name}</td>
                <td>${item.store_name}</td>
                <td>${item.quantity}</td>
                <td>${item.reorder_level}</td>
                <td>${status}</td>
            `;

            table.appendChild(row);
        });

        document.getElementById("totalItems").textContent = data.length;
        document.getElementById("inStock").textContent = inStock;
        document.getElementById("lowStock").textContent = lowStock;
        document.getElementById("outOfStock").textContent = outOfStock;

    })
    .catch(error => {
        console.error("Inventory API Error:", error);
    });