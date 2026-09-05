from flask import Flask, jsonify
from flask_cors import CORS
from db import get_connection

app = Flask(__name__)
CORS(app)


@app.route("/")
def home():
    return jsonify({
        "message": "RetailMart Backend Running"
    })


@app.route("/products")
def get_products():

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            p.product_id,
            p.product_name,
            p.sku,
            p.price,
            c.category_name,
            s.supplier_name
        FROM Products p
        JOIN Categories c
            ON p.category_id = c.category_id
        JOIN Suppliers s
            ON p.supplier_id = s.supplier_id
    """)

    products = cursor.fetchall()

    cursor.close()
    connection.close()

    return jsonify(products)
@app.route("/dashboard")
def dashboard():

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("SELECT COUNT(*) AS total_products FROM Products")
    products = cursor.fetchone()["total_products"]

    cursor.execute("SELECT COUNT(*) AS total_customers FROM Customers")
    customers = cursor.fetchone()["total_customers"]

    cursor.execute("SELECT COUNT(*) AS total_orders FROM Orders")
    orders = cursor.fetchone()["total_orders"]

    cursor.execute("""
        SELECT COALESCE(SUM(total_amount), 0) AS revenue
        FROM Orders
        WHERE status = 'Completed'
    """)

    revenue = cursor.fetchone()["revenue"]

    cursor.close()
    connection.close()

    return jsonify({
        "products": products,
        "customers": customers,
        "orders": orders,
        "revenue": float(revenue)
    })

@app.route("/customers")
def get_customers():

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            customer_id,
            customer_name,
            email,
            phone
        FROM Customers
    """)

    customers = cursor.fetchall()

    cursor.close()
    connection.close()

    return jsonify(customers)

@app.route("/inventory")
def get_inventory():

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            p.product_name,
            s.store_name,
            i.quantity,
            i.reorder_level,
            CASE
                WHEN i.quantity = 0 THEN 'Out of Stock'
                WHEN i.quantity <= i.reorder_level THEN 'Low Stock'
                ELSE 'In Stock'
            END AS stock_status
        FROM Products p
        JOIN Inventory i
            ON p.product_id = i.product_id
        JOIN Stores s
            ON i.store_id = s.store_id
    """)

    inventory = cursor.fetchall()

    cursor.close()
    connection.close()

    return jsonify(inventory)

@app.route("/orders")
def get_orders():

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            o.order_id,
            c.customer_name,
            s.store_name,
            o.order_date,
            o.total_amount,
            o.status
        FROM Orders o
        JOIN Customers c
            ON o.customer_id = c.customer_id
        JOIN Stores s
            ON o.store_id = s.store_id
        ORDER BY o.order_date DESC
    """)

    orders = cursor.fetchall()

    cursor.close()
    connection.close()

    return jsonify(orders)

@app.route("/reports")
def reports():

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("""
        SELECT COALESCE(SUM(total_amount), 0) AS revenue
        FROM Orders
        WHERE status = 'Completed'
    """)

    monthly_revenue = cursor.fetchone()["revenue"]

    cursor.execute("""
        SELECT COUNT(DISTINCT category_id) AS categories
        FROM Products
    """)

    category_sales = cursor.fetchone()["categories"]

    cursor.execute("""
        SELECT COUNT(*) AS total_products
        FROM Products
    """)

    top_products = cursor.fetchone()["total_products"]

    cursor.execute("""
        SELECT COUNT(*) AS total_customers
        FROM Customers
    """)

    top_customers = cursor.fetchone()["total_customers"]

    cursor.execute("""
        SELECT
            s.store_name,
            COUNT(o.order_id) AS total_orders,
            COALESCE(SUM(o.total_amount), 0) AS total_revenue
        FROM Stores s
        LEFT JOIN Orders o
            ON s.store_id = o.store_id
        GROUP BY s.store_id, s.store_name
    """)

    store_performance = cursor.fetchall()

    cursor.close()
    connection.close()

    return jsonify({
        "monthly_revenue": float(monthly_revenue),
        "category_sales": category_sales,
        "top_products": top_products,
        "top_customers": top_customers,
        "store_performance": store_performance
    })

if __name__ == "__main__":
    app.run(debug=True, port=5001)