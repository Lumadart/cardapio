// ─────────────────────────────
// ⚙️ SECTION: CONFIGURAÇÃO
// ─────────────────────────────

const SHEET_ID = '1FgvbAHH5qQHVCP1ySo5Dss_oOdkXYXOn4uRqzwvkUyQ';

let items = {};
let baseMeals = [];
let weekMeals = {};

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
    app.innerHTML = "<div style='text-align:center; padding:50px; opacity:0.5'>Carregando cardápio...</div>";

    try {
        const [rowsConfig, rowsAlimentos, rowsAgenda] = await Promise.all([
            fetchSheetData('Configuracoes'),
            fetchSheetData('Alimentos'),
            fetchSheetData('Agenda')
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

        // Agora inicia sempre pela aba Semana
        navigate("semana");
    } catch (error) {
        console.error("Erro:", error);
        app.innerHTML = `<div style="text-align:center; padding:50px; color:var(--segunda)">Erro ao carregar dados.</div>`;
    }
}

// ─────────────────────────────
// 🍽️ SECTION: HELPERS
// ─────────────────────────────

const days = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
const dayLabels = { domingo: "Domingo", segunda: "Segunda", terca: "Terça", quarta: "Quarta", quinta: "Quinta", sexta: "Sexta", sabado: "Sábado" };
const EMPTY_ICON = '<i class="fa-solid fa-circle-minus" style="opacity:0.2"></i>';

function getToday() { return days[new Date().getDay()]; }
function getItemData(id) { return items[id] || { name: id, qty: '---', category: "Geral" }; }

function normalize(dayMeals) {
    return baseMeals.map(base => {
        const found = dayMeals ? dayMeals.find(m => m.name === base.name) : null;
        return found || { name: base.name, time: base.time, foods: [] };
    });
}

// ─────────────────────────────
// 🍽️ SECTION: RENDERS
// ─────────────────────────────

function renderSemana(app) {
    const today = getToday();
    const dateStr = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });

    // Novo cabeçalho de data dinâmico dentro do app
    const dateHeader = document.createElement("div");
    dateHeader.className = "date-display";
    dateHeader.innerHTML = `
        <span class="day-label" id="current-day-name">${dayLabels[today]}</span>
        <span class="date-label">${dateStr}</span>
    `;
    app.appendChild(dateHeader);

    const selector = document.createElement("div");
    selector.className = "day-selector";
    const shortDays = { domingo: "D", segunda: "S", terca: "T", quarta: "Q", quinta: "Q", sexta: "S", sabado: "S" };

    days.forEach(day => {
        const btn = document.createElement("button");
        btn.className = `day-btn ${day === today ? 'active' : ''}`;
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
    cardsContainer.style.display = "flex";
    cardsContainer.style.flexDirection = "column";
    cardsContainer.style.gap = "var(--block-margin)";
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
                return `<div class="row"><span>${icon} ${data.name}</span><span>${data.qty}</span></div>`;
            }).join("")
            : `<div class="row" style="opacity:0.3"><span>${EMPTY_ICON} Nada planejado</span><span></span></div>`;

        card.innerHTML = `
            <div class="card-header">${mIcon} ${meal.name} - ${meal.time}</div>
            <div class="card-content">${foodsHtml}</div>`;
        container.appendChild(card);
    });
}

function renderRefeicoes(app) {
    baseMeals.forEach(meal => {
        const mIcon = mealIcons[meal.name] || mealIcons["Geral"];
        const allowed = Object.values(items).filter(i => {
            const itemKey = Object.keys(items).find(key => items[key] === i);
            return Object.values(weekMeals).some(dayList => 
                dayList.some(m => m.name === meal.name && m.foods.includes(itemKey))
            );
        });

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div class="card-header">${mIcon} ${meal.name}</div>
            <div class="card-content">
                ${allowed.length > 0 
                    ? allowed.map(i => {
                        const icon = categoryIcons[i.category] || categoryIcons["Geral"];
                        return `<div class="row"><span>${icon} ${i.name}</span><span>${i.qty}</span></div>`;
                    }).join("")
                    : `<div class="row" style="opacity:0.3"><span>Nenhum item vinculado</span></div>`
                }
            </div>`;
        app.appendChild(card);
    });
}

function renderItens(app) {
    const grouped = {};
    Object.values(items).forEach(i => {
        if (!grouped[i.category]) grouped[i.category] = [];
        grouped[i.category].push(i);
    });

    Object.keys(grouped).sort().forEach(cat => {
        const card = document.createElement("div");
        card.className = "card";
        const catIcon = categoryIcons[cat] || categoryIcons["Geral"];
        card.innerHTML = `
            <div class="card-header">${catIcon} ${cat}</div>
            <div class="card-content">
                ${grouped[cat].sort((a,b) => a.name.localeCompare(b.name)).map(i => `
                    <div class="row"><span>${categoryIcons[i.category] || categoryIcons["Geral"]} ${i.name}</span><span>${i.qty}</span></div>
                `).join("")}
            </div>`;
        app.appendChild(card);
    });
}

// ─────────────────────────────
// 🔄 SECTION: ROUTER
// ─────────────────────────────

// Removida a rota 'hoje'
const routes = { semana: renderSemana, refeicoes: renderRefeicoes, itens: renderItens };

function navigate(route) {
    const app = document.querySelector("#app");
    
    // Limpa o conteúdo atual
    app.innerHTML = "";
    
    // Executa a função de renderização da rota
    if (routes[route]) routes[route](app);

    // Atualiza o estado visual dos botões do menu inferior
    document.querySelectorAll(".bottom-nav button").forEach(b => b.classList.remove("active"));
    const targetBtn = document.querySelector(`[data-route="${route}"]`);
    if (targetBtn) targetBtn.classList.add("active");
    
    window.scrollTo(0, 0);
}

document.querySelectorAll(".bottom-nav button").forEach(b => {
    b.addEventListener("click", () => navigate(b.dataset.route));
});

// Inicialização oficial
document.addEventListener("DOMContentLoaded", initApp);