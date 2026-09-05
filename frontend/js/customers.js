const searchInput = document.getElementById("search");
const table = document.getElementById("customerTable");

let customers = [];

fetch("http://127.0.0.1:5001/customers")
    .then(response => response.json())
    .then(data => {
        customers = data;
        displayCustomers(customers);
    })
    .catch(error => {
        console.error("Customers API Error:", error);
    });

function displayCustomers(data) {
    table.innerHTML = "";

    data.forEach(customer => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${customer.customer_id}</td>
            <td>${customer.customer_name}</td>
            <td>${customer.email}</td>
            <td>${customer.phone}</td>
        `;

        table.appendChild(row);
    });
}

searchInput.addEventListener("input", function () {
    const searchText = searchInput.value.toLowerCase();

    const filteredCustomers = customers.filter(customer =>
        customer.customer_name.toLowerCase().includes(searchText) ||
        customer.email.toLowerCase().includes(searchText) ||
        customer.phone.toString().includes(searchText)
    );

    displayCustomers(filteredCustomers);
});