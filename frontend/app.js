const restaurantSelect =
    document.getElementById("restaurant");

const restaurantInfo =
    document.getElementById("restaurant-info");

const form =
    document.getElementById("product-form");

const productsTable =
    document.getElementById("products");

const message =
    document.getElementById("message");

const warehouseName =
    document.getElementById("warehouse-name");

const productCount =
    document.getElementById("product-count");


async function loadRestaurants() {
    try {
        const response =
            await fetch("/api/restaurants");

        if (!response.ok) {
            throw new Error(
                "Не удалось загрузить рестораны"
            );
        }

        const restaurants =
            await response.json();

        restaurantSelect.innerHTML = "";

        if (restaurants.length === 0) {

            restaurantSelect.innerHTML = `
                <option value="">
                    Нет доступных ресторанов
                </option>
            `;

            return;
        }

        restaurants.forEach(restaurant => {

            const option =
                document.createElement("option");

            option.value =
                restaurant.id;

            option.textContent =
                restaurant.name;

            restaurantSelect.appendChild(option);
        });

        restaurantSelect.value =
            restaurants[0].id;

        updateRestaurantInfo(
            restaurants[0]
        );

        await loadInventory(
            restaurants[0].id
        );

    } catch (error) {

        console.error(
            "Ошибка загрузки ресторанов:",
            error
        );

        showMessage(
            "Не удалось загрузить список ресторанов"
        );
    }
}


function updateRestaurantInfo(restaurant) {

    restaurantInfo.textContent =
        `Адрес: ${restaurant.address}`;

    warehouseName.textContent =
        `Склад: ${restaurant.name}`;
}


restaurantSelect.addEventListener(
    "change",
    async function() {

        const restaurantId =
            this.value;

        if (!restaurantId) {
            return;
        }

        const selectedOption =
            this.options[
                this.selectedIndex
            ];

        warehouseName.textContent =
            `Склад: ${selectedOption.textContent}`;

        await loadInventory(
            restaurantId
        );
    }
);


async function loadInventory(restaurantId) {

    try {

        const response =
            await fetch(
                `/api/restaurants/${restaurantId}/inventory`
            );

        if (!response.ok) {

            throw new Error(
                "Не удалось загрузить склад"
            );
        }

        const products =
            await response.json();

        productsTable.innerHTML = "";

        productCount.textContent =
            `${products.length} позиций`;

        if (products.length === 0) {

            productsTable.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        class="empty-message"
                    >
                        На этом складе пока нет продуктов
                    </td>
                </tr>
            `;

            return;
        }

        products.forEach(product => {

            const row =
                document.createElement("tr");


            const idCell =
                document.createElement("td");

            idCell.textContent =
                product.id;


            const nameCell =
                document.createElement("td");

            nameCell.textContent =
                product.name;


            const quantityCell =
                document.createElement("td");

            quantityCell.textContent =
                product.quantity;

            quantityCell.className =
                "quantity";


            const unitCell =
                document.createElement("td");

            unitCell.textContent =
                product.unit;


            const deleteCell =
                document.createElement("td");


            const deleteButton =
                document.createElement("button");

            deleteButton.textContent =
                "Удалить";

            deleteButton.className =
                "delete-button";


            deleteButton.addEventListener(
                "click",
                () => deleteProduct(product.id)
            );


            deleteCell.appendChild(
                deleteButton
            );


            row.appendChild(idCell);
            row.appendChild(nameCell);
            row.appendChild(quantityCell);
            row.appendChild(unitCell);
            row.appendChild(deleteCell);


            productsTable.appendChild(row);
        });

    } catch (error) {

        console.error(
            "Ошибка загрузки склада:",
            error
        );

        productsTable.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="empty-message"
                >
                    Не удалось загрузить склад
                </td>
            </tr>
        `;
    }
}


form.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        const restaurantId =
            restaurantSelect.value;

        if (!restaurantId) {

            showMessage(
                "Сначала выберите ресторан"
            );

            return;
        }


        const name =
            document
                .getElementById("name")
                .value
                .trim();


        const quantity =
            Number(
                document
                    .getElementById("quantity")
                    .value
            );


        const unit =
            document
                .getElementById("unit")
                .value
                .trim();


        if (
            !name ||
            !unit ||
            Number.isNaN(quantity)
        ) {

            showMessage(
                "Заполните все поля"
            );

            return;
        }


        try {

            const response =
                await fetch(
                    `/api/restaurants/${restaurantId}/inventory`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            name: name,
                            quantity: quantity,
                            unit: unit
                        })
                    }
                );


            const result =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    result.error ||
                    "Ошибка добавления продукта"
                );
            }


            form.reset();


            showMessage(
                "Продукт успешно добавлен на склад"
            );


            await loadInventory(
                restaurantId
            );

        } catch (error) {

            console.error(
                "Ошибка добавления:",
                error
            );

            showMessage(
                error.message
            );
        }
    }
);


async function deleteProduct(inventoryId) {

    const confirmed =
        confirm(
            "Удалить этот продукт со склада?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `/api/inventory/${inventoryId}`,
                {
                    method: "DELETE"
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.error ||
                "Ошибка удаления продукта"
            );
        }


        showMessage(
            "Продукт удалён со склада"
        );


        await loadInventory(
            restaurantSelect.value
        );

    } catch (error) {

        console.error(
            "Ошибка удаления:",
            error
        );

        showMessage(
            error.message
        );
    }
}


function showMessage(text) {

    message.textContent =
        text;

    message.style.display =
        "block";


    setTimeout(() => {

        message.style.display =
            "none";

    }, 3000);
}


loadRestaurants();