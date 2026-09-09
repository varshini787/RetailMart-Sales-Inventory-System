const API_URL = "http://127.0.0.1:5001";

const searchInput = document.getElementById("search");
const table = document.getElementById("customerTable");
const customerForm = document.getElementById("customerForm");

let customers = [];


// =========================
// LOAD CUSTOMERS
// =========================

async function loadCustomers() {

    try {

        const response =
            await fetch(`${API_URL}/customers`);

        if (!response.ok) {
            throw new Error("Failed to load customers");
        }

        customers = await response.json();

        displayCustomers(customers);

    } catch (error) {

        console.error(error);

        showMessage(
            "Unable to load customers. Make sure the Flask server is running.",
            "error"
        );

    }
}


// =========================
// DISPLAY CUSTOMERS
// =========================

function displayCustomers(data) {

    table.innerHTML = "";

    if (data.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;">
                    No customers found
                </td>
            </tr>
        `;

        return;
    }


    data.forEach(customer => {

        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>${customer.customer_id}</td>

            <td>
                ${escapeHTML(customer.customer_name)}
            </td>

            <td>
                ${escapeHTML(customer.email || "N/A")}
            </td>

            <td>
                ${escapeHTML(customer.phone || "N/A")}
            </td>

            <td>
                ${escapeHTML(customer.city || "N/A")}
            </td>

            <td>
                ${formatDate(customer.registration_date)}
            </td>

            <td>

                <button
                    class="action-btn edit-btn"
                    onclick="editCustomer(${customer.customer_id})"
                >
                    Edit
                </button>

                <button
                    class="action-btn delete-btn"
                    onclick="deleteCustomer(${customer.customer_id})"
                >
                    Delete
                </button>

            </td>

        `;


        table.appendChild(row);

    });

}


// =========================
// SEARCH
// =========================

searchInput.addEventListener(
    "input",
    function () {

        const searchText =
            searchInput.value
                .toLowerCase()
                .trim();


        const filteredCustomers =
            customers.filter(customer => {

                return (

                    String(customer.customer_name || "")
                        .toLowerCase()
                        .includes(searchText)

                    ||

                    String(customer.email || "")
                        .toLowerCase()
                        .includes(searchText)

                    ||

                    String(customer.phone || "")
                        .toLowerCase()
                        .includes(searchText)

                    ||

                    String(customer.city || "")
                        .toLowerCase()
                        .includes(searchText)

                );

            });


        displayCustomers(filteredCustomers);

    }
);


// =========================
// ADD CUSTOMER
// =========================

function openAddModal() {

    document.getElementById("modalTitle").textContent =
        "Add Customer";


    document.getElementById("customerId").value =
        "";


    document.getElementById("customerName").value =
        "";


    document.getElementById("email").value =
        "";


    document.getElementById("phone").value =
        "";


    document.getElementById("city").value =
        "";


    document.getElementById("customerModal").style.display =
        "flex";

}


// =========================
// CLOSE MODAL
// =========================

function closeModal() {

    document.getElementById("customerModal").style.display =
        "none";

}


// =========================
// EDIT CUSTOMER
// =========================

function editCustomer(customerId) {

    const customer =
        customers.find(
            item =>
                item.customer_id === customerId
        );


    if (!customer) {

        showMessage(
            "Customer not found.",
            "error"
        );

        return;
    }


    document.getElementById("modalTitle").textContent =
        "Edit Customer";


    document.getElementById("customerId").value =
        customer.customer_id;


    document.getElementById("customerName").value =
        customer.customer_name || "";


    document.getElementById("email").value =
        customer.email || "";


    document.getElementById("phone").value =
        customer.phone || "";


    document.getElementById("city").value =
        customer.city || "";


    document.getElementById("customerModal").style.display =
        "flex";

}


// =========================
// SAVE CUSTOMER
// =========================

customerForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const customerId =
            document.getElementById("customerId").value;


        const customerData = {

            customer_name:
                document.getElementById("customerName")
                    .value
                    .trim(),

            email:
                document.getElementById("email")
                    .value
                    .trim() || null,

            phone:
                document.getElementById("phone")
                    .value
                    .trim() || null,

            city:
                document.getElementById("city")
                    .value
                    .trim() || null

        };


        try {

            let response;


            if (customerId) {

                response =
                    await fetch(
                        `${API_URL}/customers/${customerId}`,
                        {
                            method: "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    customerData
                                )
                        }
                    );

            } else {

                response =
                    await fetch(
                        `${API_URL}/customers`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    customerData
                                )
                        }
                    );

            }


            const result =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    result.error ||
                    "Operation failed"
                );

            }


            closeModal();


            showMessage(
                result.message,
                "success"
            );


            await loadCustomers();


        } catch (error) {

            console.error(error);

            showMessage(
                error.message,
                "error"
            );

        }

    }
);


// =========================
// DELETE CUSTOMER
// =========================

async function deleteCustomer(customerId) {

    const customer =
        customers.find(
            item =>
                item.customer_id === customerId
        );


    if (!customer) {
        return;
    }


    const confirmed =
        confirm(
            `Are you sure you want to delete "${customer.customer_name}"?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/customers/${customerId}`,
                {
                    method: "DELETE"
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.error ||
                "Unable to delete customer"
            );

        }


        showMessage(
            result.message,
            "success"
        );


        await loadCustomers();


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

    message.style.display =
        "block";


    setTimeout(() => {

        message.style.display =
            "none";

    }, 4000);

}


// =========================
// DATE FORMAT
// =========================

function formatDate(date) {

    if (!date) {
        return "N/A";
    }

    const formatted =
        String(date).substring(0, 10);

    return formatted;

}


// =========================
// HTML SECURITY
// =========================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
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
// CLOSE MODAL OUTSIDE
// =========================

window.addEventListener(
    "click",
    function (event) {

        const modal =
            document.getElementById(
                "customerModal"
            );


        if (event.target === modal) {
            closeModal();
        }

    }
);


// =========================
// INITIAL LOAD
// =========================

loadCustomers();