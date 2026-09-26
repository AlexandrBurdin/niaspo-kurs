import os
import psycopg2


def get_connection():
    return psycopg2.connect(
        host="postgres",
        database=os.getenv("POSTGRES_DB", "inventory"),
        user=os.getenv("POSTGRES_USER", "inventory_user"),
        password=os.getenv("POSTGRES_PASSWORD", "password")
    )


def init_db():
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'products'
            )
        """)

        products_exists = cursor.fetchone()[0]

        old_products = []

        if products_exists:
            cursor.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'products'
            """)

            columns = {row[0] for row in cursor.fetchall()}

            if "quantity" in columns:
                cursor.execute("""
                    SELECT name, quantity, unit
                    FROM products
                """)

                old_products = cursor.fetchall()

                cursor.execute("""
                    DROP TABLE IF EXISTS inventory CASCADE
                """)

                cursor.execute("""
                    DROP TABLE IF EXISTS products CASCADE
                """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS restaurants (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                address VARCHAR(255) NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                unit VARCHAR(50) NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory (
                id SERIAL PRIMARY KEY,
                restaurant_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 0,

                CONSTRAINT fk_inventory_restaurant
                    FOREIGN KEY (restaurant_id)
                    REFERENCES restaurants(id)
                    ON DELETE CASCADE,

                CONSTRAINT fk_inventory_product
                    FOREIGN KEY (product_id)
                    REFERENCES products(id)
                    ON DELETE CASCADE,

                CONSTRAINT unique_restaurant_product
                    UNIQUE (restaurant_id, product_id),

                CONSTRAINT positive_quantity
                    CHECK (quantity >= 0)
            )
        """)

        cursor.execute("""
            INSERT INTO restaurants (name, address)
            VALUES
                ('Ресторан "Центр"', 'ул. Ленина, 10'),
                ('Ресторан "Север"', 'ул. Северная, 25'),
                ('Ресторан "Южный"', 'ул. Южная, 15')
            ON CONFLICT (name) DO NOTHING
        """)

        if old_products:
            cursor.execute("""
                SELECT id
                FROM restaurants
                WHERE name = 'Ресторан "Центр"'
            """)

            center_restaurant = cursor.fetchone()

            if center_restaurant:
                center_restaurant_id = center_restaurant[0]

                for name, quantity, unit in old_products:

                    cursor.execute("""
                        INSERT INTO products (name, unit)
                        VALUES (%s, %s)
                        ON CONFLICT (name) DO NOTHING
                        RETURNING id
                    """, (name, unit))

                    result = cursor.fetchone()

                    if result:
                        product_id = result[0]
                    else:
                        cursor.execute("""
                            SELECT id
                            FROM products
                            WHERE name = %s
                        """, (name,))

                        product_id = cursor.fetchone()[0]

                    cursor.execute("""
                        INSERT INTO inventory (
                            restaurant_id,
                            product_id,
                            quantity
                        )
                        VALUES (%s, %s, %s)
                        ON CONFLICT (restaurant_id, product_id)
                        DO UPDATE SET quantity = EXCLUDED.quantity
                    """, (
                        center_restaurant_id,
                        product_id,
                        quantity
                    ))

        connection.commit()

        print("Database initialized successfully")

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    init_db()