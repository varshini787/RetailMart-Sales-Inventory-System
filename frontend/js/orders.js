const searchInput = document.getElementById("search");
const table = document.getElementById("orderTable");

let orders = [];

fetch("http://127.0.0.1:5001/orders")
    .then(response => response.json())
    .then(data => {
        orders = data;
        displayOrders(orders);
    })
    .catch(error => {
        console.error("Orders API Error:", error);
    });

function displayOrders(data) {
    table.innerHTML = "";

    data.forEach(order => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${order.order_id}</td>
            <td>${order.customer_name}</td>
            <td>${order.store_name}</td>
            <td>${order.order_date}</td>
            <td>₹${order.total_amount}</td>
            <td>${order.status}</td>
        `;

        table.appendChild(row);
    });
}

searchInput.addEventListener("input", function () {
    const searchText = searchInput.value.toLowerCase();

    const filteredOrders = orders.filter(order =>
        order.customer_name.toLowerCase().includes(searchText) ||
        order.store_name.toLowerCase().includes(searchText) ||
        order.status.toLowerCase().includes(searchText) ||
        order.order_id.toString().includes(searchText)
    );

    displayOrders(filteredOrders);
});