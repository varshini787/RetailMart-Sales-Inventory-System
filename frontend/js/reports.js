fetch("http://127.0.0.1:5001/reports")
    .then(response => response.json())
    .then(data => {

        document.getElementById("monthlyRevenue").textContent =
            "₹" + data.monthly_revenue;

        document.getElementById("categorySales").textContent =
            data.category_sales.length;

        document.getElementById("topProducts").textContent =
            data.top_products.length;

        document.getElementById("topCustomers").textContent =
            data.top_customers.length;

        const table = document.getElementById("storeTable");

        table.innerHTML = "";

        data.store_performance.forEach(store => {

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${store.store_name}</td>
                <td>${store.total_orders}</td>
                <td>₹${store.total_revenue}</td>
            `;

            table.appendChild(row);
        });

    })
    .catch(error => {
        console.error("Reports API Error:", error);
    });