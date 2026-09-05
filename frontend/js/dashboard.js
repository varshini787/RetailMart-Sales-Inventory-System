fetch("http://127.0.0.1:5001/dashboard")
    .then(response => response.json())
    .then(data => {

        document.getElementById("products").textContent = data.products;
        document.getElementById("customers").textContent = data.customers;
        document.getElementById("orders").textContent = data.orders;
        document.getElementById("revenue").textContent = "₹" + data.revenue;

    })
    .catch(error => {
        console.error("Dashboard API Error:", error);
    });