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

        baseMeals = rowsConfig.slice(1).map(r => {
            if (!r.c || !r.c[0]) return null;
            return {
                name: r.c[0].v,
                time: r.c[1] ? (r.c[1].f || r.c[1].v) : "00:00"
            };
        }).filter(Boolean);

        items = {};
        rowsAlimentos.slice(1).forEach(r => {
            if (!r.c || !r.c[0]) return;
            const id = String(r.c[0].v).trim();
            items[id] = {
                name: r.c[1] ? r.c[1].v : "Item",
                qty: (r.c[2] && r.c[2].v) ? r.c[2].v : '---',
                category: r.c[3] ? r.c[3].v : "Geral"
            };
        });

        recipes = {};
        rowsReceitas.slice(1).forEach(r => {
            if (!r.c || !r.c[0]) return;
            const nomeReceita = String(r.c[0].v).trim();
            
            if (!recipes[nomeReceita]) {
                recipes[nomeReceita] = {
                    ingredients: [],
                    prep: r.c[3] ? r.c[3].v : "",
                    time: r.c[4] ? r.c[4].v : ""
                };
            }
            
            recipes[nomeReceita].ingredients.push({
                name: r.c[1] ? r.c[1].v : "",
                qty: r.c[2] ? r.c[2].v : ""
            });
        });

        weekMeals = { domingo: [], segunda: [], terca: [], quarta: [], quinta: [], sexta: [], sabado: [] };
        rowsAgenda.slice(1).forEach(r => {
            if (!r.c || !r.c[0] || !r.c[1]) return;
            const diaRaw = r.c[0].v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const dia = diaRaw === "terca" ? "terca" : diaRaw;
            const refeicao = r.c[1].v;
            const alimentosRaw = r.c[2] ? String(r.c[2].v) : "";
            const alimentosIds = alimentosRaw ? alimentosRaw.split(',').map(s => s.trim()) : [];
            const config = baseMeals.find(m => m.name === refeicao);
            
            if (weekMeals[dia]) {
                weekMeals[dia].push({
                    name: refeicao,
                    time: config ? config.time : "00:00",
                    foods: alimentosIds
                });
            }
        });

        navigate("semana");
    } catch (error) {
        console.error("Erro:", error);
        app.innerHTML = `<div class="error-msg">Erro ao carregar dados.</div>`;
    }
}

// ─────────────────────────────
// 🍽️ SECTION: HELPERS
// ─────────────────────────────

const days = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
const dayLabels = { domingo: "Domingo", segunda: "Segunda", terca: "Terça", quarta: "Quarta", quinta: "Quinta", sexta: "Sexta", sabado: "Sábado" };
const EMPTY_ICON = '<i class="fa-solid fa-circle-question empty-style"></i>';

function getToday() { return days[new Date().getDay()]; }
function getItemData(id) { return items[id] || { name: id, qty: '---', category: "Geral" }; }

function normalize(dayMeals) {
    return baseMeals.map(base => {
        const found = dayMeals ? dayMeals.find(m => m.name === base.name) : null;
        return found || { name: base.name, time: base.time, foods: [] };
    });
}

function toggleAccordion(header) {
    const card = header.parentElement;
    const isCollapsed = card.classList.contains('collapsed');
    
    const container = card.parentElement;
    container.querySelectorAll('.card').forEach(c => {
        c.classList.add('collapsed');
    });

    if (isCollapsed) {
        card.classList.remove('collapsed');
    }
}

function openRecipe(nome) {
    const recipe = recipes[nome];
    if (!recipe) return;

    document.getElementById('modal-title').innerText = nome;
    const body = document.getElementById('modal-body');
    
    let html = "";
    if (recipe.time) {
        html += `<div class="recipe-time"><i class="fa-regular fa-clock"></i> ${recipe.time}</div>`;
    }

    html += `<div class="recipe-section-title"><i class="fa-solid fa-basket-shopping"></i> Ingredientes</div>`;
    recipe.ingredients.forEach(ing => {
        html += `<div class="row"><span>&bull; ${ing.name}</span><span>${ing.qty}</span></div>`;
    });

    if (recipe.prep) {
        html += `<div class="recipe-section-title"><i class="fa-solid fa-fire-burner"></i> Modo de Preparo</div>`;
        html += `<div class="recipe-prep-text">${recipe.prep}</div>`;
    }

    body.innerHTML = html;
    document.getElementById('recipe-modal').classList.add('active');
}

// ─────────────────────────────
// 🍽️ SECTION: RENDERS
// ─────────────────────────────

function renderSemana(app) {
    const today = getToday();
    const dateStr = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });

    const dateHeader = document.createElement("div");
    dateHeader.className = "date-display anim-up";
    dateHeader.innerHTML = `
        <span class="day-label" id="current-day-name">${dayLabels[today]}</span>
        <span class="date-label">${dayLabels[today]} - ${dateStr}</span>
    `;
    app.appendChild(dateHeader);

    const selector = document.createElement("div");
    selector.className = "day-selector anim-up";
    const shortDays = { domingo: "D", segunda: "S", terca: "T", quarta: "Q", quinta: "Q", sexta: "S", sabado: "S" };

    days.forEach(day => {
        const btn = document.createElement("button");
        const isActive = (day === today);
        btn.className = `day-btn ${isActive ? 'active' : ''} ${day === today ? 'is-today' : ''}`;
        
        btn.innerText = shortDays[day];
        btn.onclick = () => {
            document.querySelectorAll(".day-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById("current-day-name").innerText = dayLabels[day];
            filterWeekDay(day);
        };
        selector.appendChild(btn);
    });

    app.appendChild(selector);

    const cardsContainer = document.createElement("div");
    cardsContainer.id = "week-cards-container";
    cardsContainer.className = "anim-up cards-stack";
    app.appendChild(cardsContainer);

    filterWeekDay(today);
}

function filterWeekDay(day) {
    const container = document.querySelector("#week-cards-container");
    if (!container) return;
    container.innerHTML = "";
    renderDayCards(container, day, normalize(weekMeals[day]));
}

function renderDayCards(container, day, meals) {
    meals.forEach(meal => {
        const card = document.createElement("div");
        card.className = `card ${day}`;
        const mIcon = mealIcons[meal.name] || mealIcons["Geral"];

        const foodsHtml = meal.foods.length > 0 
            ? meal.foods.map(id => {
                const data = getItemData(id);
                const icon = categoryIcons[data.category] || categoryIcons["Geral"];
                const hasRecipe = recipes[data.name] ? 'has-recipe' : '';
                const clickAttr = recipes[data.name] ? `onclick="openRecipe('${data.name}')"` : '';
                const recipeIcon = recipes[data.name] ? '<i class="fa-solid fa-book recipe-icon"></i>' : '';
                
                return `<div class="row">
                            <span class="${hasRecipe}" ${clickAttr}>${icon} ${data.name}${recipeIcon}</span>
                            <span>${data.qty}</span>
                        </div>`;
            }).join("")
            : `<div class="row empty-row"><span>${EMPTY_ICON} Nada planejado</span><span></span></div>`;

        card.innerHTML = `
  <div class="card-header">
        <span>${mIcon} ${meal.name}</span>
        <span>${meal.time}</span>
    </div>
    <div class="card-content">${foodsHtml}</div>`;
        container.appendChild(card);
    });
}

function renderRefeicoes(app) {
    const container = document.createElement("div");
    container.className = "anim-up cards-stack";
    app.appendChild(container);

    baseMeals.forEach(meal => {
        const mIcon = mealIcons[meal.name] || mealIcons["Geral"];
        const allowedIds = new Set();
        Object.values(weekMeals).forEach(dayList => {
            dayList.forEach(m => {
                if (m.name === meal.name) {
                    m.foods.forEach(id => allowedIds.add(id));
                }
            });
        });

        const card = document.createElement("div");
        card.className = "card collapsed";
        
        let contentHtml = allowedIds.size > 0 
            ? Array.from(allowedIds).map(id => {
                const i = getItemData(id);
                const hasRecipe = recipes[i.name] ? 'has-recipe' : '';
                const clickAttr = recipes[i.name] ? `onclick="openRecipe('${i.name}')"` : '';
                const recipeIcon = recipes[i.name] ? '<i class="fa-solid fa-book recipe-icon"></i>' : '';

                return `<div class="row">
                            <span class="${hasRecipe}" ${clickAttr}>${i.name}${recipeIcon}</span>
                            <span>${i.qty}</span>
                        </div>`;
            }).join("")
            : `<div class="row empty-row"><span>Nenhum item vinculado</span></div>`;

        card.innerHTML = `
            <div class="card-header" onclick="toggleAccordion(this)">
                <span>${mIcon} ${meal.name} <small class="item-counter">(${allowedIds.size})</small></span>
                <i class="fa-solid fa-chevron-down accordion-arrow"></i>
            </div>
            <div class="card-content">${contentHtml}</div>`;
        container.appendChild(card);
    });
}

function renderItens(app) {
    const container = document.createElement("div");
    container.className = "anim-up cards-stack";
    app.appendChild(container);

    const grouped = {};
    Object.values(items).forEach(i => {
        if (!grouped[i.category]) grouped[i.category] = [];
        grouped[i.category].push(i);
    });

    Object.keys(grouped).sort().forEach(cat => {
        const card = document.createElement("div");
        card.className = "card collapsed";
        const catIcon = categoryIcons[cat] || categoryIcons["Geral"];
        const totalItems = grouped[cat].length;
        
        const contentHtml = grouped[cat]
            .sort((a,b) => a.name.localeCompare(b.name))
            .map(i => {
                const hasRecipe = recipes[i.name] ? 'has-recipe' : '';
                const clickAttr = recipes[i.name] ? `onclick="openRecipe('${i.name}')"` : '';
                const recipeIcon = recipes[i.name] ? '<i class="fa-solid fa-book recipe-icon"></i>' : '';

                return `<div class="row">
                            <span class="${hasRecipe}" ${clickAttr}>${i.name}${recipeIcon}</span>
                            <span>${i.qty}</span>
                        </div>`;
            }).join("");

        card.innerHTML = `
            <div class="card-header" onclick="toggleAccordion(this)">
                <span>${catIcon} ${cat} <small class="item-counter">(${totalItems})</small></span>
                <i class="fa-solid fa-chevron-down accordion-arrow"></i>
            </div>
            <div class="card-content">${contentHtml}</div>`;
        container.appendChild(card);
    });
}

// ─────────────────────────────
// 🔄 SECTION: ROUTER
// ─────────────────────────────

const routes = { semana: renderSemana, refeicoes: renderRefeicoes, itens: renderItens };

function navigate(route) {
    const app = document.querySelector("#app");
    app.innerHTML = "";
    
    if (routes[route]) routes[route](app);

    document.querySelectorAll(".bottom-nav button").forEach(b => b.classList.remove("active"));
    const targetBtn = document.querySelector(`[data-route="${route}"]`);
    if (targetBtn) targetBtn.classList.add("active");
    
    window.scrollTo(0, 0);
}

document.querySelectorAll(".bottom-nav button").forEach(b => {
    b.addEventListener("click", () => navigate(b.dataset.route));
});

document.addEventListener("DOMContentLoaded", initApp);