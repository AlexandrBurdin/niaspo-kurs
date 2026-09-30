let restaurants = [];
let currentRestaurantId = null;


async function loadRestaurants() {
    try {
        const response = await fetch("/api/restaurants");

        if (!response.ok) {
            throw new Error("Не удалось загрузить рестораны");
        }

        restaurants = await response.json();

        const select = document.getElementById("restaurantSelect");

        select.innerHTML = "";

        restaurants.forEach(restaurant => {
            const option = document.createElement("option");

            option.value = restaurant.id;
            option.textContent = restaurant.name;

            select.appendChild(option);
        });

        if (restaurants.length > 0) {
            currentRestaurantId = restaurants[0].id;

            select.value = currentRestaurantId;

            updateRestaurantInfo(restaurants[0]);

            await loadInventory(currentRestaurantId);
        }

    } catch (error) {
        console.error(error);

        showMessage(
            "Не удалось загрузить список ресторанов",
            "error"
        );
    }
}


function updateRestaurantInfo(restaurant) {
    const nameElement = document.getElementById("restaurantName");
    const addressElement = document.getElementById("restaurantAddress");

    if (nameElement) {
        nameElement.textContent = restaurant.name;
    }

    if (addressElement) {
        addressElement.textContent = restaurant.address;
    }
}


async function changeRestaurant() {
    const select = document.getElementById("restaurantSelect");

    const restaurantId = Number(select.value);

    const restaurant = restaurants.find(
        item => item.id === restaurantId
    );

    if (!restaurant) {
        return;
    }

    currentRestaurantId = restaurantId;

    updateRestaurantInfo(restaurant);

    await loadInventory(restaurantId);
}


async function loadInventory(restaurantId) {
    try {
        const response = await fetch(
            `/api/restaurants/${restaurantId}/inventory`
        );

        if (!response.ok) {
            throw new Error("Не удалось загрузить склад");
        }

        const inventory = await response.json();

        renderInventory(inventory);

    } catch (error) {
        console.error(error);

        showMessage(
            "Не удалось загрузить склад ресторана",
            "error"
        );
    }
}


function renderInventory(inventory) {
    const tableBody =
        document.getElementById("productsTableBody");

    if (!tableBody) {
        console.error(
            "Элемент productsTableBody не найден"
        );

        return;
    }

    tableBody.innerHTML = "";

    inventory.forEach(product => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>${product.quantity}</td>
            <td>${product.unit}</td>
            <td>
                <button
                    class="delete-button"
                    onclick="deleteProduct(${product.id})">
                    Удалить
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });

    const countElement =
        document.getElementById("productCount");

    if (countElement) {
        countElement.textContent =
            `${inventory.length} позиций`;
    }
}


async function addProduct(event) {
    event.preventDefault();

    if (!currentRestaurantId) {
        showMessage(
            "Сначала выберите ресторан",
            "error"
        );

        return;
    }

    const nameInput =
        document.getElementById("productName");

    const quantityInput =
        document.getElementById("productQuantity");

    const unitInput =
        document.getElementById("productUnit");

    const name = nameInput.value.trim();
    const quantity = Number(quantityInput.value);
    const unit = unitInput.value.trim();

    if (!name || !unit) {
        showMessage(
            "Заполните все поля",
            "error"
        );

        return;
    }

    if (Number.isNaN(quantity) || quantity < 0) {
        showMessage(
            "Количество должно быть неотрицательным числом",
            "error"
        );

        return;
    }

    try {
        const response = await fetch(
            `/api/restaurants/${currentRestaurantId}/inventory`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name: name,
                    quantity: quantity,
                    unit: unit
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Ошибка добавления товара"
            );
        }

        nameInput.value = "";
        quantityInput.value = "";
        unitInput.value = "";

        await loadInventory(currentRestaurantId);

        showMessage(
            "Товар успешно добавлен",
            "success"
        );

    } catch (error) {
        console.error(error);

        showMessage(
            error.message,
            "error"
        );
    }
}


async function deleteProduct(inventoryId) {
    if (!confirm("Удалить этот товар со склада?")) {
        return;
    }

    try {
        const response = await fetch(
            `/api/inventory/${inventoryId}`,
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Ошибка удаления"
            );
        }

        await loadInventory(currentRestaurantId);

        showMessage(
            "Товар удалён со склада",
            "success"
        );

    } catch (error) {
        console.error(error);

        showMessage(
            error.message,
            "error"
        );
    }
}


function showMessage(message, type) {
    const messageElement =
        document.getElementById("message");

    if (!messageElement) {
        return;
    }

    messageElement.textContent = message;

    messageElement.className = `message ${type}`;

    setTimeout(() => {
        messageElement.textContent = "";
        messageElement.className = "message";
    }, 3000);
}


document.addEventListener("DOMContentLoaded", () => {
    const restaurantSelect =
        document.getElementById("restaurantSelect");

    const productForm =
        document.getElementById("productForm");

    if (restaurantSelect) {
        restaurantSelect.addEventListener(
            "change",
            changeRestaurant
        );
    }

    if (productForm) {
        productForm.addEventListener(
            "submit",
            addProduct
        );
    }

    loadRestaurants();
});