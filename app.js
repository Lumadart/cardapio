// ─────────────────────────────
// ⚙️ SECTION: CONFIGURAÇÃO
// ─────────────────────────────

const SHEET_ID = '1FgvbAHH5qQHVCP1ySo5Dss_oOdkXYXOn4uRqzwvkUyQ';

let items = {};
let baseMeals = [];
let weekMeals = {};
let recipes = {};

const categoryIcons = {
    "Proteínas": '<i class="fa-solid fa-drumstick-bite"></i>',
    "Carboidratos": '<i class="fa-solid fa-wheat-awn"></i>',
    "Frutas": '<i class="fa-solid fa-apple-whole"></i>',
    "Bebidas": '<i class="fa-solid fa-glass-water"></i>',
    "Extras": '<i class="fa-solid fa-plus"></i>',
    "Vegetais": '<i class="fa-solid fa-leaf"></i>',
    "Laticínios": '<i class="fa-solid fa-cheese"></i>',
    "Suplementos": '<i class="fa-solid fa-bottle-droplet"></i>',
    "Geral": '<i class="fa-solid fa-bowl-food"></i>'
};

const mealIcons = {
    "Desjejum": '<i class="fa-solid fa-stroopwafel"></i>',
    "Café": '<i class="fa-solid fa-mug-hot"></i>',
    "Almoço": '<i class="fa-solid fa-utensils"></i>',
    "Lanche": '<i class="fa-solid fa-apple-whole"></i>',
    "Jantar": '<i class="fa-solid fa-bowl-food"></i>',
    "Geral": '<i class="fa-solid fa-plate-wheat"></i>'
};

// ─────────────────────────────
// 🌐 SECTION: MOTOR DE DADOS
// ─────────────────────────────

async function fetchSheetData(tabName) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${tabName}`;
    const response = await fetch(url);
    const text = await response.text();
    const json = JSON.parse(text.substr(47).slice(0, -2));
    return json.table.rows;
}

async function initApp() {
    const app = document.querySelector("#app");
    app.innerHTML = "<div class='loading-msg'>Carregando cardápio...</div>";

    try {
        const [rowsConfig, rowsAlimentos, rowsAgenda, rowsReceitas] = await Promise.all([
            fetchSheetData('Configuracoes'),
            fetchSheetData('Alimentos'),
            fetchSheetData('Agenda'),
            fetchSheetData('Receitas')
        ]);

        // ─────────────────────────────
        // Configurações
        // ─────────────────────────────
        baseMeals = rowsConfig.slice(1).map(r => {
            if (!r.c || !r.c[0]) return null;

            return {
                name: r.c[0].v,
                time: r.c[1]
                    ? (r.c[1].f || r.c[1].v)
                    : "00:00"
            };
        }).filter(Boolean);

        // ─────────────────────────────
        // Alimentos
        // ─────────────────────────────
        items = {};

        rowsAlimentos.slice(1).forEach(r => {
            if (!r.c || !r.c[0]) return;

            const id = String(r.c[0].v).trim();

            items[id] = {
                name: r.c[1] ? r.c[1].v : "Item",
                qty: r.c[2] ? r.c[2].v : "---",
                category: r.c[3] ? r.c[3].v : "Geral"
            };
        });

        // ─────────────────────────────
        // Receitas
        // ─────────────────────────────
        recipes = {};

        rowsReceitas.slice(1).forEach(r => {
            if (!r.c || !r.c[0]) return;

            const recipeName = String(r.c[0].v).trim();

            if (!recipes[recipeName]) {
                recipes[recipeName] = {
                    ingredients: [],
                    prep: r.c[3] ? r.c[3].v : "",
                    time: r.c[4] ? r.c[4].v : ""
                };
            }

            recipes[recipeName].ingredients.push({
                name: r.c[1] ? r.c[1].v : "",
                qty: r.c[2] ? r.c[2].v : ""
            });
        });

        // ─────────────────────────────
        // Agenda semanal
        // ─────────────────────────────
        weekMeals = {
            domingo: [],
            segunda: [],
            terca: [],
            quarta: [],
            quinta: [],
            sexta: [],
            sabado: []
        };

        rowsAgenda.slice(1).forEach(r => {
            if (!r.c || !r.c[0] || !r.c[1]) return;

            const rawDay = r.c[0].v
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");

            const day = rawDay === "terca"
                ? "terca"
                : rawDay;

            const mealName = r.c[1].v;

            const rawFoods = r.c[2]
                ? String(r.c[2].v)
                : "";

            const foodIds = rawFoods
                ? rawFoods.split(",").map(v => v.trim())
                : [];

            const config = baseMeals.find(
                meal => meal.name === mealName
            );

            if (weekMeals[day]) {
                weekMeals[day].push({
                    name: mealName,
                    time: config
                        ? config.time
                        : "00:00",
                    foods: foodIds
                });
            }
        });

        navigate("semana");

    } catch (error) {
        console.error(error);

        app.innerHTML = `
            <div class="error-msg">
                Erro ao carregar dados.
            </div>
        `;
    }
}

// ─────────────────────────────
// 🍽️ HELPERS
// ─────────────────────────────

const days = [
    "domingo",
    "segunda",
    "terca",
    "quarta",
    "quinta",
    "sexta",
    "sabado"
];

const dayLabels = {
    domingo: "Domingo",
    segunda: "Segunda",
    terca: "Terça",
    quarta: "Quarta",
    quinta: "Quinta",
    sexta: "Sexta",
    sabado: "Sábado"
};

const EMPTY_ICON =
    '<i class="fa-solid fa-circle-question empty-style"></i>';

function getToday() {
    return days[new Date().getDay()];
}

function getItemData(id) {
    return items[id] || {
        name: id,
        qty: "---",
        category: "Geral"
    };
}

function normalize(dayMeals) {
    return baseMeals.map(base => {
        const found = dayMeals.find(
            meal => meal.name === base.name
        );

        return found || {
            name: base.name,
            time: base.time,
            foods: []
        };
    });
}

function toggleAccordion(header) {
    const card = header.parentElement;
    const isCollapsed =
        card.classList.contains("collapsed");

    const container = card.parentElement;

    container
        .querySelectorAll(".card")
        .forEach(c =>
            c.classList.add("collapsed")
        );

    if (isCollapsed) {
        card.classList.remove("collapsed");
    }
}

function openRecipe(name) {
    const recipe = recipes[name];

    if (!recipe) return;

    document.getElementById(
        "modal-title"
    ).innerText = name;

    const body =
        document.getElementById(
            "modal-body"
        );

    let html = "";

    if (recipe.time) {
        html += `
            <div class="recipe-time">
                <i class="fa-regular fa-clock"></i>
                ${recipe.time}
            </div>
        `;
    }

    html += `
        <div class="recipe-section-title">
            <i class="fa-solid fa-basket-shopping"></i>
            Ingredientes
        </div>
    `;

    recipe.ingredients.forEach(ing => {
        html += `
            <div class="row">
                <span>• ${ing.name}</span>
                <span>${ing.qty}</span>
            </div>
        `;
    });

    if (recipe.prep) {

        const steps = recipe.prep
            .replace(/(\d+\.)/g, '\n$1')
            .split('\n')
            .filter(
                line => line.trim() !== ""
            );

        const stepsHtml = steps
            .map(
                step =>
                    `<div class="prep-step">${step.trim()}</div>`
            )
            .join("");

        html += `
            <div class="recipe-section-title">
                <i class="fa-solid fa-fire-burner"></i>
                Modo de Preparo
            </div>

            <div class="recipe-prep-text">
                ${stepsHtml}
            </div>
        `;
    }

    body.innerHTML = html;

    document
        .getElementById("recipe-modal")
        .classList.add("active");
}

// ─────────────────────────────
// 📅 RENDER SEMANA
// ─────────────────────────────

function renderSemana(app) {

    const today = getToday();

    const dateStr =
        new Date().toLocaleDateString(
            "pt-BR",
            {
                day: "numeric",
                month: "long"
            }
        );

    const dateHeader =
        document.createElement("div");

    dateHeader.className =
        "date-display anim-up";

    dateHeader.innerHTML = `
        <span class="day-label" id="current-day-name">
            ${dayLabels[today]}
        </span>

        <span class="date-label">
            ${dayLabels[today]} - ${dateStr}
        </span>
    `;

    app.appendChild(dateHeader);

    const selector =
        document.createElement("div");

    selector.className =
        "day-selector anim-up";

    const shortDays = {
        domingo: "D",
        segunda: "S",
        terca: "T",
        quarta: "Q",
        quinta: "Q",
        sexta: "S",
        sabado: "S"
    };

    days.forEach(day => {

        const btn =
            document.createElement("button");

        const isActive =
            day === today;

        btn.className = `
            day-btn
            ${isActive ? "active" : ""}
            ${day === today ? "is-today" : ""}
        `;

        btn.innerText =
            shortDays[day];

        btn.onclick = () => {

            document
                .querySelectorAll(".day-btn")
                .forEach(
                    b =>
                        b.classList.remove(
                            "active"
                        )
                );

            btn.classList.add(
                "active"
            );

            document.getElementById(
                "current-day-name"
            ).innerText =
                dayLabels[day];

            filterWeekDay(day);
        };

        selector.appendChild(btn);
    });

    app.appendChild(selector);

    const cards =
        document.createElement("div");

    cards.id =
        "week-cards-container";

    cards.className =
        "anim-up cards-stack";

    app.appendChild(cards);

    filterWeekDay(today);
}

function filterWeekDay(day) {

    const container =
        document.querySelector(
            "#week-cards-container"
        );

    container.innerHTML = "";

    renderDayCards(
        container,
        day,
        normalize(weekMeals[day])
    );
}

function renderDayCards(
    container,
    day,
    meals
) {

    meals.forEach(meal => {

        const card =
            document.createElement("div");

        card.className =
            `card ${day}`;

        const mealIcon =
            mealIcons[meal.name]
            || mealIcons.Geral;

        const foodsHtml =
            meal.foods.length > 0

                ? meal.foods.map(id => {

                    const item =
                        getItemData(id);

                    const icon =
                        categoryIcons[
                            item.category
                        ]
                        || categoryIcons.Geral;

                    const hasRecipe =
                        recipes[item.name];

                    return `
                        <div class="row">
                            <span
                                class="${
                                    hasRecipe
                                    ? "has-recipe"
                                    : ""
                                }"
                                ${
                                    hasRecipe
                                    ? `onclick="openRecipe('${item.name}')"`
                                    : ""
                                }
                            >
                                ${icon}
                                ${item.name}
                            </span>

                            <span>
                                ${item.qty}
                            </span>
                        </div>
                    `;

                }).join("")

                : `
                    <div class="row empty-row">
                        <span>
                            ${EMPTY_ICON}
                            Nada planejado
                        </span>
                    </div>
                `;

        card.innerHTML = `
            <div class="card-header">
                <span>
                    ${mealIcon}
                    ${meal.name}
                </span>

                <span>
                    ${meal.time}
                </span>
            </div>

            <div class="card-content">
                ${foodsHtml}
            </div>
        `;

        container.appendChild(card);
    });
}

// ─────────────────────────────
// 🍽️ RENDER REFEIÇÕES
// ─────────────────────────────

function renderRefeicoes(app) {

    const container =
        document.createElement("div");

    container.className =
        "anim-up cards-stack";

    app.appendChild(container);

    baseMeals.forEach(meal => {

        const mealIcon =
            mealIcons[meal.name]
            || mealIcons.Geral;

        const allowedIds =
            new Set();

        Object.values(
            weekMeals
        ).forEach(dayMeals => {

            dayMeals.forEach(m => {

                if (
                    m.name === meal.name
                ) {

                    m.foods.forEach(
                        id =>
                            allowedIds.add(id)
                    );
                }
            });
        });

        const card =
            document.createElement("div");

        card.className =
            "card collapsed";

        const contentHtml =
            Array.from(
                allowedIds
            )
                .map(id => {

                    const item =
                        getItemData(id);

                    return `
                        <div class="row">
                            <span
                                ${
                                    recipes[item.name]
                                    ? `onclick="openRecipe('${item.name}') class="has-recipe"`
                                    : ""
                                }
                            >
                                ${item.name}
                            </span>

                            <span>
                                ${item.qty}
                            </span>
                        </div>
                    `;

                })
                .join("");

        card.innerHTML = `
            <div
                class="card-header"
                onclick="toggleAccordion(this)"
            >
                <span>
                    ${mealIcon}
                    ${meal.name}

                    <small class="item-counter">
                        (${allowedIds.size})
                    </small>
                </span>

                <i class="fa-solid fa-chevron-down accordion-arrow"></i>
            </div>

            <div class="card-content">
                ${contentHtml}
            </div>
        `;

        container.appendChild(card);
    });
}

// ─────────────────────────────
// 📖 RENDER RECEITAS
// ─────────────────────────────

function renderItens(app) {

    const container =
        document.createElement("div");

    container.className =
        "anim-up cards-stack";

    app.appendChild(container);

    const grouped = {};

    // Só itens com receita
    Object.values(items)
        .forEach(item => {

            if (
                !recipes[item.name]
            ) return;

            if (
                !grouped[
                    item.category
                ]
            ) {

                grouped[
                    item.category
                ] = [];
            }

            grouped[
                item.category
            ].push(item);
        });

    Object.keys(grouped)
        .sort()
        .forEach(category => {

            const card =
                document.createElement("div");

            card.className =
                "card collapsed";

            const icon =
                categoryIcons[
                    category
                ]
                || categoryIcons.Geral;

            const categoryItems =
                grouped[category];

            const contentHtml =
                categoryItems
                    .sort(
                        (a, b) =>
                            a.name.localeCompare(
                                b.name
                            )
                    )
                    .map(item => `
                        <div class="row">
                            <span
                                class="has-recipe"
                                onclick="openRecipe('${item.name}')"
                            >
                                ${item.name}
                                <i class="fa-solid fa-book recipe-icon"></i>
                            </span>

                            <span>
                                ${item.qty}
                            </span>
                        </div>
                    `)
                    .join("");

            card.innerHTML = `
                <div
                    class="card-header"
                    onclick="toggleAccordion(this)"
                >
                    <span>
                        ${icon}
                        ${category}

                        <small class="item-counter">
                            (${categoryItems.length})
                        </small>
                    </span>

                    <i class="fa-solid fa-chevron-down accordion-arrow"></i>
                </div>

                <div class="card-content">
                    ${contentHtml}
                </div>
            `;

            container.appendChild(card);
        });
}

// ─────────────────────────────
// 🔄 ROUTER
// ─────────────────────────────

const routes = {
    semana: renderSemana,
    refeicoes: renderRefeicoes,
    itens: renderItens
};

function navigate(route) {

    const app =
        document.querySelector("#app");

    app.innerHTML = "";

    if (routes[route]) {
        routes[route](app);
    }

    document
        .querySelectorAll(
            ".bottom-nav button"
        )
        .forEach(btn =>
            btn.classList.remove(
                "active"
            )
        );

    const activeBtn =
        document.querySelector(
            `[data-route="${route}"]`
        );

    if (activeBtn) {
        activeBtn.classList.add(
            "active"
        );
    }

    window.scrollTo(0, 0);
}

document
    .querySelectorAll(
        ".bottom-nav button"
    )
    .forEach(btn => {

        btn.addEventListener(
            "click",
            () =>
                navigate(
                    btn.dataset.route
                )
        );
    });

document.addEventListener(
    "DOMContentLoaded",
    initApp
);