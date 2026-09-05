fetch("http://127.0.0.1:5001/products")
    .then(response => response.json())
    .then(data => {

        const table = document.getElementById("productTable");

        data.forEach(product => {

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${product.product_id}</td>
                <td>${product.product_name}</td>
                <td>${product.sku}</td>
                <td>${product.category_name}</td>
                <td>${product.supplier_name}</td>
                <td>₹${product.price}</td>
            `;

            table.appendChild(row);
        });

    })
    .catch(error => {
        console.error("Products API Error:", error);
    });