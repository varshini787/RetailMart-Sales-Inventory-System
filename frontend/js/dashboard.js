const API_URL = "http://127.0.0.1:5001";


document.addEventListener("DOMContentLoaded", function () {

    loadDashboard();
    setTodayDate();

});


/* ================= DATE ================= */

function setTodayDate() {

    const dateElement = document.getElementById("todayDate");

    if (!dateElement) return;

    const today = new Date();

    dateElement.textContent = today.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}


/* ================= DASHBOARD ================= */

async function loadDashboard() {

    try {

        const response = await fetch(`${API_URL}/dashboard`);

        if (!response.ok) {
            throw new Error("Dashboard API failed");
        }

        const data = await response.json();

        console.log("Dashboard data:", data);


        /* STATISTICS */

        document.getElementById("products").textContent =
            data.products ?? 0;

        document.getElementById("customers").textContent =
            data.customers ?? 0;

        document.getElementById("orders").textContent =
            data.orders ?? 0;

        document.getElementById("revenue").textContent =
            "₹" + Number(data.revenue ?? 0).toLocaleString("en-IN");


        createSalesChart(data);
        createInventoryChart(data);

        loadRecentOrders(data);

    } catch (error) {

        console.error("Dashboard error:", error);

        document.getElementById("products").textContent = "0";
        document.getElementById("customers").textContent = "0";
        document.getElementById("orders").textContent = "0";
        document.getElementById("revenue").textContent = "₹0";

        showNoData();

    }

}


/* ================= SALES CHART ================= */

function createSalesChart(data) {

    const canvas = document.getElementById("salesChart");

    if (!canvas) return;

    const ctx = canvas.getContext("2d");


    const monthlySales =
        data.monthly_sales ||
        data.monthlySales ||
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];


    new Chart(ctx, {

        type: "line",

        data: {

            labels: [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec"
            ],

            datasets: [{

                label: "Sales",

                data: monthlySales,

                borderColor: "#2563eb",

                backgroundColor: "rgba(37, 99, 235, 0.08)",

                borderWidth: 3,

                fill: true,

                tension: 0.4,

                pointRadius: 4,

                pointHoverRadius: 6

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {
                    display: false
                },

                tooltip: {

                    callbacks: {

                        label: function (context) {

                            return " ₹" +
                                Number(context.raw || 0)
                                    .toLocaleString("en-IN");

                        }

                    }

                }

            },

            scales: {

                y: {

                    beginAtZero: true,

                    grid: {
                        color: "#f0f2f5"
                    },

                    ticks: {

                        callback: function (value) {

                            return "₹" +
                                Number(value)
                                    .toLocaleString("en-IN");

                        },

                        font: {
                            size: 10
                        }

                    }

                },

                x: {

                    grid: {
                        display: false
                    },

                    ticks: {
                        font: {
                            size: 10
                        }
                    }

                }

            }

        }

    });

}


/* ================= INVENTORY CHART ================= */

function createInventoryChart(data) {

    const canvas = document.getElementById("inventoryChart");

    if (!canvas) return;

    const ctx = canvas.getContext("2d");


    const inStock =
        data.in_stock ??
        data.inStock ??
        0;

    const lowStock =
        data.low_stock ??
        data.lowStock ??
        0;

    const outStock =
        data.out_of_stock ??
        data.outStock ??
        0;


    document.getElementById("inStock").textContent =
        `${inStock} items`;

    document.getElementById("lowStock").textContent =
        `${lowStock} items`;

    document.getElementById("outStock").textContent =
        `${outStock} items`;


    new Chart(ctx, {

        type: "doughnut",

        data: {

            labels: [
                "In Stock",
                "Low Stock",
                "Out of Stock"
            ],

            datasets: [{

                data: [
                    inStock,
                    lowStock,
                    outStock
                ],

                backgroundColor: [
                    "#22c55e",
                    "#f59e0b",
                    "#ef4444"
                ],

                borderWidth: 0,

                hoverOffset: 5

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            cutout: "70%",

            plugins: {

                legend: {
                    display: false
                }

            }

        }

    });

}


/* ================= RECENT ORDERS ================= */

function loadRecentOrders(data) {

    const tbody =
        document.getElementById("recentOrdersBody");

    if (!tbody) return;


    const orders =
        data.recent_orders ||
        data.recentOrders ||
        [];


    if (!orders.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="loading">
                    No recent orders available
                </td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML = orders
        .slice(0, 5)
        .map(order => {

            const orderId =
                order.order_id ??
                order.id ??
                "-";

            const customer =
                order.customer_name ??
                order.customer ??
                "Customer";

            const date =
                order.order_date ??
                order.date ??
                "-";

            const amount =
                order.total_amount ??
                order.amount ??
                0;

            const status =
                order.status ??
                "Completed";


            let statusClass = "completed";

            if (status.toLowerCase().includes("pending")) {
                statusClass = "pending";
            }

            if (status.toLowerCase().includes("cancel")) {
                statusClass = "cancelled";
            }


            return `

                <tr>

                    <td>#${orderId}</td>

                    <td>${customer}</td>

                    <td>${date}</td>

                    <td>
                        ₹${Number(amount)
                            .toLocaleString("en-IN")}
                    </td>

                    <td>
                        <span class="status ${statusClass}">
                            ${status}
                        </span>
                    </td>

                </tr>

            `;

        })
        .join("");

}


/* ================= NO DATA ================= */

function showNoData() {

    const tbody =
        document.getElementById("recentOrdersBody");

    if (tbody) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="loading">
                    Unable to load recent orders
                </td>
            </tr>
        `;

    }

}