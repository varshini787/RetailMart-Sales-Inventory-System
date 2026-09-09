import os
import sys
from decimal import Decimal
from datetime import date, datetime
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db import get_connection

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR)
CORS(app, supports_credentials=True, origins=r".*")


def serialize_row(row):
    """Serialize Decimals to float and dates to string for JSON compatibility."""
    if not row:
        return row
    result = {}
    for k, v in row.items():
        if isinstance(v, Decimal):
            result[k] = float(v)
        elif isinstance(v, (date, datetime)):
            result[k] = str(v)
        else:
            result[k] = v
    return result


def serialize_rows(rows):
    return [serialize_row(r) for r in rows]


# =========================
# ROOT & STATIC FILES
# =========================

@app.route("/")
def home():
    if "text/html" in request.headers.get("Accept", ""):
        return send_from_directory(FRONTEND_DIR, "login.html")
    return jsonify({
        "message": "RetailMart Backend Running"
    })


# =========================
# AUTHENTICATION
# =========================

@app.route("/login", methods=["POST"])
def login():
    connection = None
    cursor = None
    try:
        data = request.get_json() or {}
        username = (data.get("username") or "").strip()
        password = data.get("password") or ""

        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400

        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            "SELECT user_id, username, role FROM Users WHERE username = %s AND password = %s",
            (username, password)
        )
        user = cursor.fetchone()

        if not user:
            return jsonify({"error": "Invalid username or password"}), 401

        return jsonify({
            "message": "Login successful",
            "user": {
                "id": user["user_id"],
                "username": user["username"],
                "role": user["role"]
            }
        }), 200

    except Exception as e:
        print("Login error:", e)
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# =========================
# DASHBOARD
# =========================

@app.route("/dashboard", methods=["GET"])
def dashboard():
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        # Total Products
        cursor.execute("SELECT COUNT(*) AS total_products FROM Products")
        products = cursor.fetchone()["total_products"] or 0

        # Total Customers
        cursor.execute("SELECT COUNT(*) AS total_customers FROM Customers")
        customers = cursor.fetchone()["total_customers"] or 0

        # Total Orders
        cursor.execute("SELECT COUNT(*) AS total_orders FROM Orders")
        orders = cursor.fetchone()["total_orders"] or 0

        # Total Revenue
        cursor.execute("""
            SELECT COALESCE(SUM(total_amount), 0) AS revenue
            FROM Orders
            WHERE status = 'Completed'
        """)
        revenue = float(cursor.fetchone()["revenue"] or 0)

        # Monthly Sales
        cursor.execute("""
            SELECT
                MONTH(order_date) AS month,
                COALESCE(SUM(total_amount), 0) AS sales
            FROM Orders
            WHERE status = 'Completed'
            GROUP BY MONTH(order_date)
            ORDER BY MONTH(order_date)
        """)
        monthly_rows = cursor.fetchall()
        monthly_sales = [0.0] * 12
        for row in monthly_rows:
            month_num = int(row["month"])
            if 1 <= month_num <= 12:
                monthly_sales[month_num - 1] = float(row["sales"] or 0)

        # Inventory Status
        cursor.execute("""
            SELECT
                SUM(CASE WHEN quantity > reorder_level THEN 1 ELSE 0 END) AS in_stock,
                SUM(CASE WHEN quantity > 0 AND quantity <= reorder_level THEN 1 ELSE 0 END) AS low_stock,
                SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) AS out_of_stock
            FROM Inventory
        """)
        inventory = cursor.fetchone() or {}

        # Recent Orders
        cursor.execute("""
            SELECT
                o.order_id,
                DATE_FORMAT(o.order_date, '%d %b %Y') AS order_date,
                o.total_amount,
                o.status,
                c.customer_name
            FROM Orders o
            LEFT JOIN Customers c ON o.customer_id = c.customer_id
            ORDER BY o.order_date DESC, o.order_id DESC
            LIMIT 5
        """)
        recent_orders = serialize_rows(cursor.fetchall())

        return jsonify({
            "products": products,
            "customers": customers,
            "orders": orders,
            "revenue": revenue,
            "monthly_sales": monthly_sales,
            "in_stock": int(inventory.get("in_stock") or 0),
            "low_stock": int(inventory.get("low_stock") or 0),
            "out_of_stock": int(inventory.get("out_of_stock") or 0),
            "recent_orders": recent_orders
        })

    except Exception as e:
        print("Dashboard error:", e)
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# =========================
# PRODUCTS
# =========================

@app.route("/products", methods=["GET", "POST"])
def products():
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        if request.method == "GET":
            cursor.execute("""
                SELECT
                    p.product_id,
                    p.product_name,
                    p.sku,
                    p.price,
                    p.cost_price,
                    p.reorder_level,
                    p.category_id,
                    p.supplier_id,
                    c.category_name,
                    s.supplier_name
                FROM Products p
                LEFT JOIN Categories c ON p.category_id = c.category_id
                LEFT JOIN Suppliers s ON p.supplier_id = s.supplier_id
                ORDER BY p.product_id DESC
            """)
            return jsonify(serialize_rows(cursor.fetchall()))

        elif request.method == "POST":
            data = request.get_json() or {}
            product_name = (data.get("product_name") or "").strip()
            sku = (data.get("sku") or "").strip()
            category_id = data.get("category_id") or None
            supplier_id = data.get("supplier_id") or None
            price = data.get("price")
            cost_price = data.get("cost_price") or None
            reorder_level = data.get("reorder_level") or 10

            if not product_name or not sku or price is None:
                return jsonify({"error": "Product name, SKU, and price are required"}), 400

            cursor.execute("""
                INSERT INTO Products (product_name, sku, category_id, supplier_id, price, cost_price, reorder_level)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (product_name, sku, category_id, supplier_id, price, cost_price, reorder_level))
            product_id = cursor.lastrowid

            cursor.execute("SELECT store_id FROM Stores LIMIT 1")
            store_row = cursor.fetchone()
            store_id = store_row["store_id"] if store_row else 1

            cursor.execute("""
                INSERT INTO Inventory (product_id, store_id, quantity, reorder_level, last_updated)
                VALUES (%s, %s, 0, %s, NOW())
            """, (product_id, store_id, reorder_level))

            connection.commit()
            return jsonify({
                "message": "Product added successfully",
                "product_id": product_id
            }), 201

    except Exception as e:
        print("Products error:", e)
        if connection:
            connection.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.route("/products/<int:product_id>", methods=["PUT", "DELETE"])
def single_product(product_id):
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        if request.method == "PUT":
            data = request.get_json() or {}
            product_name = (data.get("product_name") or "").strip()
            sku = (data.get("sku") or "").strip()
            category_id = data.get("category_id") or None
            supplier_id = data.get("supplier_id") or None
            price = data.get("price")
            cost_price = data.get("cost_price") or None
            reorder_level = data.get("reorder_level") or 10

            if not product_name or not sku or price is None:
                return jsonify({"error": "Product name, SKU, and price are required"}), 400

            cursor.execute("""
                UPDATE Products
                SET product_name = %s, sku = %s, category_id = %s, supplier_id = %s,
                    price = %s, cost_price = %s, reorder_level = %s
                WHERE product_id = %s
            """, (product_name, sku, category_id, supplier_id, price, cost_price, reorder_level, product_id))
            connection.commit()
            return jsonify({"message": "Product updated successfully"})

        elif request.method == "DELETE":
            cursor.execute("DELETE FROM Inventory WHERE product_id = %s", (product_id,))
            cursor.execute("DELETE FROM OrderItems WHERE product_id = %s", (product_id,))
            cursor.execute("DELETE FROM Products WHERE product_id = %s", (product_id,))
            connection.commit()
            return jsonify({"message": "Product deleted successfully"})

    except Exception as e:
        print("Single product error:", e)
        if connection:
            connection.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# =========================
# CATEGORIES & SUPPLIERS
# =========================

@app.route("/categories", methods=["GET"])
def get_categories():
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT category_id, category_name FROM Categories ORDER BY category_name")
        return jsonify(serialize_rows(cursor.fetchall()))
    except Exception as e:
        print("Categories error:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.route("/suppliers", methods=["GET"])
def get_suppliers():
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT supplier_id, supplier_name, contact_person, phone, email, city FROM Suppliers ORDER BY supplier_name")
        return jsonify(serialize_rows(cursor.fetchall()))
    except Exception as e:
        print("Suppliers error:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# =========================
# CUSTOMERS
# =========================

@app.route("/customers", methods=["GET", "POST"])
def customers():
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        if request.method == "GET":
            cursor.execute("SELECT * FROM Customers ORDER BY customer_id DESC")
            return jsonify(serialize_rows(cursor.fetchall()))

        elif request.method == "POST":
            data = request.get_json() or {}
            customer_name = (data.get("customer_name") or "").strip()
            email = (data.get("email") or "").strip() or None
            phone = (data.get("phone") or "").strip() or None
            city = (data.get("city") or "").strip() or None

            if not customer_name:
                return jsonify({"error": "Customer name is required"}), 400

            cursor.execute("""
                INSERT INTO Customers (customer_name, email, phone, city, registration_date)
                VALUES (%s, %s, %s, %s, CURDATE())
            """, (customer_name, email, phone, city))
            customer_id = cursor.lastrowid
            connection.commit()
            return jsonify({
                "message": "Customer created successfully",
                "customer_id": customer_id
            }), 201

    except Exception as e:
        print("Customers error:", e)
        if connection:
            connection.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.route("/customers/<int:customer_id>", methods=["PUT", "DELETE"])
def single_customer(customer_id):
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        if request.method == "PUT":
            data = request.get_json() or {}
            customer_name = (data.get("customer_name") or "").strip()
            email = (data.get("email") or "").strip() or None
            phone = (data.get("phone") or "").strip() or None
            city = (data.get("city") or "").strip() or None

            if not customer_name:
                return jsonify({"error": "Customer name is required"}), 400

            cursor.execute("""
                UPDATE Customers
                SET customer_name = %s, email = %s, phone = %s, city = %s
                WHERE customer_id = %s
            """, (customer_name, email, phone, city, customer_id))
            connection.commit()
            return jsonify({"message": "Customer updated successfully"})

        elif request.method == "DELETE":
            cursor.execute("DELETE FROM Payments WHERE order_id IN (SELECT order_id FROM Orders WHERE customer_id = %s)", (customer_id,))
            cursor.execute("DELETE FROM Shipments WHERE order_id IN (SELECT order_id FROM Orders WHERE customer_id = %s)", (customer_id,))
            cursor.execute("DELETE FROM OrderItems WHERE order_id IN (SELECT order_id FROM Orders WHERE customer_id = %s)", (customer_id,))
            cursor.execute("DELETE FROM Orders WHERE customer_id = %s", (customer_id,))
            cursor.execute("DELETE FROM Customers WHERE customer_id = %s", (customer_id,))
            connection.commit()
            return jsonify({"message": "Customer deleted successfully"})

    except Exception as e:
        print("Single customer error:", e)
        if connection:
            connection.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# =========================
# ORDERS
# =========================

@app.route("/orders", methods=["GET", "POST"])
def orders():
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        if request.method == "GET":
            cursor.execute("""
                SELECT
                    o.order_id,
                    DATE_FORMAT(o.order_date, '%d %b %Y, %h:%i %p') AS order_date,
                    o.total_amount,
                    o.status,
                    c.customer_name,
                    s.store_name
                FROM Orders o
                LEFT JOIN Customers c ON o.customer_id = c.customer_id
                LEFT JOIN Stores s ON o.store_id = s.store_id
                ORDER BY o.order_id DESC
            """)
            return jsonify(serialize_rows(cursor.fetchall()))

        elif request.method == "POST":
            data = request.get_json() or {}
            customer_id = data.get("customer_id")
            store_id = data.get("store_id")
            status = data.get("status") or "Completed"
            items = data.get("items") or []

            if not customer_id or not store_id or not items:
                return jsonify({"error": "Customer, store, and at least one item are required"}), 400

            total_amount = Decimal("0.00")
            items_with_price = []
            for item in items:
                pid = item.get("product_id")
                qty = int(item.get("quantity") or 1)
                cursor.execute("SELECT price FROM Products WHERE product_id = %s", (pid,))
                prod = cursor.fetchone()
                if not prod:
                    return jsonify({"error": f"Product ID {pid} not found"}), 404
                price = Decimal(str(prod["price"]))
                total_amount += price * qty
                items_with_price.append((pid, qty, price))

            cursor.execute("""
                INSERT INTO Orders (customer_id, store_id, order_date, total_amount, status)
                VALUES (%s, %s, NOW(), %s, %s)
            """, (customer_id, store_id, total_amount, status))
            order_id = cursor.lastrowid

            for pid, qty, price in items_with_price:
                cursor.execute("""
                    INSERT INTO OrderItems (order_id, product_id, quantity, unit_price)
                    VALUES (%s, %s, %s, %s)
                """, (order_id, pid, qty, price))

                cursor.execute("""
                    UPDATE Inventory
                    SET quantity = GREATEST(0, quantity - %s), last_updated = NOW()
                    WHERE product_id = %s AND store_id = %s
                """, (qty, pid, store_id))

            connection.commit()
            return jsonify({
                "message": "Order created successfully",
                "order_id": order_id
            }), 201

    except Exception as e:
        print("Orders error:", e)
        if connection:
            connection.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.route("/orders/<int:order_id>", methods=["GET", "PUT", "DELETE"])
def single_order(order_id):
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        if request.method == "GET":
            cursor.execute("""
                SELECT
                    o.order_id,
                    o.order_date,
                    o.total_amount,
                    o.status,
                    c.customer_name,
                    s.store_name
                FROM Orders o
                LEFT JOIN Customers c ON o.customer_id = c.customer_id
                LEFT JOIN Stores s ON o.store_id = s.store_id
                WHERE o.order_id = %s
            """, (order_id,))
            order = cursor.fetchone()
            if not order:
                return jsonify({"error": "Order not found"}), 404

            cursor.execute("""
                SELECT
                    p.product_name,
                    oi.quantity,
                    oi.unit_price,
                    (oi.quantity * oi.unit_price) AS subtotal
                FROM OrderItems oi
                JOIN Products p ON oi.product_id = p.product_id
                WHERE oi.order_id = %s
            """, (order_id,))
            items = cursor.fetchall()

            return jsonify({
                "order": serialize_row(order),
                "items": serialize_rows(items)
            })

        elif request.method == "PUT":
            data = request.get_json() or {}
            status = data.get("status")
            if not status:
                return jsonify({"error": "Status is required"}), 400

            cursor.execute("UPDATE Orders SET status = %s WHERE order_id = %s", (status, order_id))
            connection.commit()
            return jsonify({"message": "Order status updated successfully"})

        elif request.method == "DELETE":
            cursor.execute("DELETE FROM Payments WHERE order_id = %s", (order_id,))
            cursor.execute("DELETE FROM Shipments WHERE order_id = %s", (order_id,))
            cursor.execute("DELETE FROM OrderItems WHERE order_id = %s", (order_id,))
            cursor.execute("DELETE FROM Orders WHERE order_id = %s", (order_id,))
            connection.commit()
            return jsonify({"message": "Order deleted successfully"})

    except Exception as e:
        print("Single order error:", e)
        if connection:
            connection.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.route("/order-customers", methods=["GET"])
def order_customers():
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT customer_id, customer_name FROM Customers ORDER BY customer_name")
        return jsonify(serialize_rows(cursor.fetchall()))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.route("/order-stores", methods=["GET"])
def order_stores():
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT store_id, store_name FROM Stores ORDER BY store_name")
        return jsonify(serialize_rows(cursor.fetchall()))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.route("/order-products", methods=["GET"])
def order_products():
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT product_id, product_name, price FROM Products ORDER BY product_name")
        return jsonify(serialize_rows(cursor.fetchall()))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# =========================
# INVENTORY
# =========================

@app.route("/inventory", methods=["GET"])
def inventory():
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                i.inventory_id,
                i.product_id,
                p.product_name,
                p.sku,
                i.store_id,
                s.store_name,
                i.quantity,
                i.reorder_level,
                CASE
                    WHEN i.quantity = 0 THEN 'Out of Stock'
                    WHEN i.quantity <= i.reorder_level THEN 'Low Stock'
                    ELSE 'In Stock'
                END AS stock_status
            FROM Inventory i
            LEFT JOIN Products p ON i.product_id = p.product_id
            LEFT JOIN Stores s ON i.store_id = s.store_id
            ORDER BY i.inventory_id DESC
        """)
        return jsonify(serialize_rows(cursor.fetchall()))

    except Exception as e:
        print("Inventory error:", e)
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


@app.route("/inventory/<int:inventory_id>", methods=["PUT"])
def update_inventory(inventory_id):
    connection = None
    cursor = None
    try:
        data = request.get_json() or {}
        quantity = data.get("quantity")
        reorder_level = data.get("reorder_level")

        if quantity is None or reorder_level is None:
            return jsonify({"error": "Quantity and reorder level are required"}), 400

        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            UPDATE Inventory
            SET quantity = %s, reorder_level = %s, last_updated = NOW()
            WHERE inventory_id = %s
        """, (quantity, reorder_level, inventory_id))
        connection.commit()
        return jsonify({"message": "Inventory updated successfully"})

    except Exception as e:
        print("Update inventory error:", e)
        if connection:
            connection.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# =========================
# REPORTS
# =========================

@app.route("/reports", methods=["GET"])
def reports():
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT COALESCE(SUM(total_amount), 0) AS revenue
            FROM Orders
            WHERE status = 'Completed'
        """)
        revenue = float(cursor.fetchone()["revenue"] or 0)

        cursor.execute("SELECT COUNT(*) AS total_orders FROM Orders")
        total_orders = cursor.fetchone()["total_orders"] or 0

        cursor.execute("SELECT COUNT(*) AS total_products FROM Products")
        total_products = cursor.fetchone()["total_products"] or 0

        cursor.execute("SELECT COUNT(*) AS total_customers FROM Customers")
        total_customers = cursor.fetchone()["total_customers"] or 0

        cursor.execute("""
            SELECT
                s.store_name,
                COUNT(o.order_id) AS total_orders,
                COALESCE(SUM(o.total_amount), 0) AS total_revenue
            FROM Stores s
            LEFT JOIN Orders o ON s.store_id = o.store_id AND o.status = 'Completed'
            GROUP BY s.store_id, s.store_name
            ORDER BY total_revenue DESC
        """)
        store_performance = serialize_rows(cursor.fetchall())

        cursor.execute("""
            SELECT
                c.category_name,
                COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS total_sales
            FROM Categories c
            LEFT JOIN Products p ON c.category_id = p.category_id
            LEFT JOIN OrderItems oi ON p.product_id = oi.product_id
            LEFT JOIN Orders o ON oi.order_id = o.order_id AND o.status = 'Completed'
            GROUP BY c.category_id, c.category_name
            ORDER BY total_sales DESC
        """)
        category_sales = serialize_rows(cursor.fetchall())

        cursor.execute("""
            SELECT
                p.product_name,
                COALESCE(SUM(oi.quantity), 0) AS total_quantity,
                COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS total_sales
            FROM Products p
            LEFT JOIN OrderItems oi ON p.product_id = oi.product_id
            LEFT JOIN Orders o ON oi.order_id = o.order_id AND o.status = 'Completed'
            GROUP BY p.product_id, p.product_name
            ORDER BY total_sales DESC
            LIMIT 5
        """)
        top_products = serialize_rows(cursor.fetchall())

        cursor.execute("""
            SELECT
                c.customer_name,
                COUNT(o.order_id) AS total_orders,
                COALESCE(SUM(o.total_amount), 0) AS total_spent
            FROM Customers c
            LEFT JOIN Orders o ON c.customer_id = o.customer_id AND o.status = 'Completed'
            GROUP BY c.customer_id, c.customer_name
            ORDER BY total_spent DESC
            LIMIT 5
        """)
        top_customers = serialize_rows(cursor.fetchall())

        return jsonify({
            "revenue": revenue,
            "total_orders": total_orders,
            "total_products": total_products,
            "total_customers": total_customers,
            "store_performance": store_performance,
            "category_sales": category_sales,
            "top_products": top_products,
            "top_customers": top_customers
        })

    except Exception as e:
        print("Reports error:", e)
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# Static file serving for any HTML/CSS/JS file in frontend
@app.route("/<path:path>")
def static_proxy(path):
    return send_from_directory(FRONTEND_DIR, path)


# =========================
# RUN SERVER
# =========================

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        debug=True,
        port=5001
    )