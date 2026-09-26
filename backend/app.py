from flask import Flask, jsonify, request
import psycopg2
import os


app = Flask(__name__)


def get_connection():
    return psycopg2.connect(
        host="postgres",
        database=os.getenv("POSTGRES_DB", "inventory"),
        user=os.getenv("POSTGRES_USER", "inventory_user"),
        password=os.getenv("POSTGRES_PASSWORD", "password")
    )


@app.get("/api/health")
def health():
    return jsonify({
        "status": "ok"
    })


@app.get("/api/restaurants")
def get_restaurants():
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            SELECT id, name, address
            FROM restaurants
            ORDER BY id
        """)

        restaurants = cursor.fetchall()

        result = []

        for restaurant in restaurants:
            result.append({
                "id": restaurant[0],
                "name": restaurant[1],
                "address": restaurant[2]
            })

        return jsonify(result)

    finally:
        cursor.close()
        connection.close()


@app.get("/api/restaurants/<int:restaurant_id>/inventory")
def get_inventory(restaurant_id):
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            SELECT
                inventory.id,
                products.id,
                products.name,
                inventory.quantity,
                products.unit
            FROM inventory
            JOIN products
                ON inventory.product_id = products.id
            WHERE inventory.restaurant_id = %s
            ORDER BY products.name
        """, (restaurant_id,))

        inventory = cursor.fetchall()

        result = []

        for item in inventory:
            result.append({
                "id": item[0],
                "product_id": item[1],
                "name": item[2],
                "quantity": item[3],
                "unit": item[4]
            })

        return jsonify(result)

    finally:
        cursor.close()
        connection.close()


@app.post("/api/restaurants/<int:restaurant_id>/inventory")
def add_inventory(restaurant_id):
    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "error": "Request body must contain JSON"
        }), 400

    name = data.get("name")
    quantity = data.get("quantity")
    unit = data.get("unit")

    if not name:
        return jsonify({
            "error": "Field 'name' is required"
        }), 400

    if quantity is None:
        return jsonify({
            "error": "Field 'quantity' is required"
        }), 400

    if not unit:
        return jsonify({
            "error": "Field 'unit' is required"
        }), 400

    try:
        quantity = int(quantity)
    except (TypeError, ValueError):
        return jsonify({
            "error": "Quantity must be an integer"
        }), 400

    if quantity < 0:
        return jsonify({
            "error": "Quantity cannot be negative"
        }), 400

    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            SELECT id
            FROM restaurants
            WHERE id = %s
        """, (restaurant_id,))

        if cursor.fetchone() is None:
            return jsonify({
                "error": "Restaurant not found"
            }), 404

        cursor.execute("""
            SELECT id, unit
            FROM products
            WHERE LOWER(name) = LOWER(%s)
        """, (name,))

        product = cursor.fetchone()

        if product:
            product_id = product[0]
            existing_unit = product[1]

            if existing_unit != unit:
                return jsonify({
                    "error": (
                        f"Product already exists with unit "
                        f"'{existing_unit}'"
                    )
                }), 400

        else:
            cursor.execute("""
                INSERT INTO products (name, unit)
                VALUES (%s, %s)
                RETURNING id
            """, (name, unit))

            product_id = cursor.fetchone()[0]

        cursor.execute("""
            SELECT id
            FROM inventory
            WHERE restaurant_id = %s
              AND product_id = %s
        """, (restaurant_id, product_id))

        existing_inventory = cursor.fetchone()

        if existing_inventory:
            cursor.execute("""
                UPDATE inventory
                SET quantity = quantity + %s
                WHERE id = %s
                RETURNING id, quantity
            """, (
                quantity,
                existing_inventory[0]
            ))

            inventory_id, new_quantity = cursor.fetchone()

        else:
            cursor.execute("""
                INSERT INTO inventory (
                    restaurant_id,
                    product_id,
                    quantity
                )
                VALUES (%s, %s, %s)
                RETURNING id, quantity
            """, (
                restaurant_id,
                product_id,
                quantity
            ))

            inventory_id, new_quantity = cursor.fetchone()

        connection.commit()

        return jsonify({
            "id": inventory_id,
            "product_id": product_id,
            "quantity": new_quantity,
            "message": "Product added to inventory"
        }), 201

    except Exception as error:
        connection.rollback()

        return jsonify({
            "error": str(error)
        }), 500

    finally:
        cursor.close()
        connection.close()


@app.delete("/api/inventory/<int:inventory_id>")
def delete_inventory(inventory_id):
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            DELETE FROM inventory
            WHERE id = %s
            RETURNING id
        """, (inventory_id,))

        deleted = cursor.fetchone()

        if deleted is None:
            return jsonify({
                "error": "Inventory item not found"
            }), 404

        connection.commit()

        return jsonify({
            "message": "Product removed from inventory"
        })

    except Exception as error:
        connection.rollback()

        return jsonify({
            "error": str(error)
        }), 500

    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000
    )