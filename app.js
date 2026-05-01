// ─────────────────────────────
// ⚙️ SECTION: CONFIGURAÇÃO PLANILHA
// ─────────────────────────────

const SHEET_ID = '1FgvbAHH5qQHVCP1ySo5Dss_oOdkXYXOn4uRqzwvkUyQ';

let items = {};
let baseMeals = [];
let weekMeals = {};

// Mapa de ícones por categoria
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

// ─────────────────────────────
// 🌐 SECTION: MOTOR DE DADOS (GOOGLE SHEETS)
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
        const [rowsConfig, rowsAlimentos, rowsAgenda] = await Promise.all([
            fetchSheetData('Configuracoes'),
            fetchSheetData('Alimentos'),
            fetchSheetData('Agenda')
        ]);

        // 1. Processar Horários - Pula a primeira linha (cabeçalho)
        baseMeals = rowsConfig.slice(1).map(r => {
            if (!r.c || !r.c[0]) return null;
            return {
                name: r.c[0].v,
                time: r.c[1] ? (r.c[1].f || r.c[1].v) : "00:00"
            };
        }).filter(Boolean);

        // 2. Processar Alimentos - Pula a primeira linha
        items = {};
        rowsAlimentos.slice(1).forEach(r => {
            if (!r.c || !r.c[0]) return;
            const id = String(r.c[0].v).trim();
            items[id] = {
                name: r.c[1] ? r.c[1].v : "Item",
                qty: (r.c[2] && r.c[2].v) ? r.c[2].v : '<i class="fa-solid fa-circle-minus" style="opacity:0.2"></i>',
                category: r.c[3] ? r.c[3].v : "Geral"
            };
        });

        // 3. Processar Agenda - Pula a primeira linha
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

        navigate("hoje");

    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        app.innerHTML = `
            <div class="error-msg">
                <i class="fa-solid fa-circle-exclamation"></i><br>
                Erro ao carregar os dados da planilha.
            </div>`;
    }
}

// ─────────────────────────────
// 🍽️ SECTION: HELPERS
// ─────────────────────────────

const days = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

const dayLabels = {
    domingo: "Domingo", segunda: "Segunda", terca: "Terça",
    quarta: "Quarta", quinta: "Quinta", sexta: "Sexta", sabado: "Sábado"
};

const EMPTY_ICON = '<i class="fa-solid fa-circle-minus" style="opacity:0.2"></i>';

function getToday() {
    return days[new Date().getDay()];
}

function getItemData(id) {
    return items[id] || { name: id, qty: EMPTY_ICON, category: "Geral" };
}

function normalize(dayMeals) {
    return baseMeals.map(base => {
        const found = dayMeals ? dayMeals.find(m => m.name === base.name) : null;
        return found || { name: base.name, time: base.time, foods: [] };
    });
}

// ─────────────────────────────
// 🍽️ SECTION: RENDERS
// ─────────────────────────────

function renderHoje(app) {
    const day = getToday();
    const meals = normalize(weekMeals[day]);
    const dateStr = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
    
    app.innerHTML = `
        <div class="date-display">
            <span class="day-label">${dayLabels[day]}</span>
            <span class="date-label">${dateStr}</span>
        </div>
    `;

    meals.forEach(meal => {
        const card = document.createElement("div");
        card.className = `card ${day}`;

        const foodsHtml = meal.foods.length > 0 
            ? meal.foods.map(id => {
                const data = getItemData(id);
                const icon = categoryIcons[data.category] || categoryIcons["Geral"];
                return `<div class="row"><span>${icon} ${data.name}</span><span>${data.qty}</span></div>`;
            }).join("")
            : `<div class="row"><span>${EMPTY_ICON} Nenhum alimento planejado</span><span>${EMPTY_ICON}</span></div>`;

        card.innerHTML = `
            <div class="card-header">${meal.name} - ${meal.time}</div>
            <div class="card-content">${foodsHtml}</div>`;
        app.appendChild(card);
    });
}

function renderSemana(app) {
    days.forEach(day => {
        const meals = normalize(weekMeals[day]);
        const card = document.createElement("div");
        card.className = `card ${day}`;

        card.innerHTML = `
            <div class="card-header">${dayLabels[day]}</div>
            <div class="card-content">
                ${meals.map(meal => `
                    <div class="meal-title">${meal.name}</div>
                    ${meal.foods.length > 0 
                        ? meal.foods.map(id => {
                            const data = getItemData(id);
                            const icon = categoryIcons[data.category] || categoryIcons["Geral"];
                            return `<div class="row"><span>${icon} ${data.name}</span><span>${data.qty}</span></div>`;
                        }).join("")
                        : `<div class="row"><span>Vazio</span><span>${EMPTY_ICON}</span></div>`
                    }
                `).join("")}
            </div>`;
        app.appendChild(card);
    });
}

function renderRefeicoes(app) {
    baseMeals.forEach(meal => {
        const allowed = Object.values(items).filter(i => {
            const itemKey = Object.keys(items).find(key => items[key] === i);
            return Object.values(weekMeals).some(dayList => 
                dayList.some(m => m.name === meal.name && m.foods.includes(itemKey))
            );
        });

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div class="card-header">${meal.name}</div>
            <div class="card-content">
                ${allowed.length > 0 
                    ? allowed.map(i => {
                        const icon = categoryIcons[i.category] || categoryIcons["Geral"];
                        return `<div class="row"><span>${icon} ${i.name}</span><span>${i.qty}</span></div>`;
                    }).join("")
                    : `<div class="row"><span>Sem itens vinculados</span><span>${EMPTY_ICON}</span></div>`
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
                    <div class="row"><span>${i.name}</span><span>${i.qty}</span></div>
                `).join("")}
            </div>`;
        app.appendChild(card);
    });
}

// ─────────────────────────────
// 🔄 SECTION: ROUTER & NAVEGAÇÃO
// ─────────────────────────────

const routes = { hoje: renderHoje, semana: renderSemana, refeicoes: renderRefeicoes, itens: renderItens };

function navigate(route) {
    const app = document.querySelector("#app");
    const headerSpan = document.querySelector(".app-header span");
    
    const pageTitles = {
        hoje: '<i class="fa-solid fa-sun"></i> Hoje',
        semana: '<i class="fa-solid fa-calendar-days"></i> Plano Semanal',
        refeicoes: '<i class="fa-solid fa-utensils"></i> Sugestão de refeições',
        itens: '<i class="fa-solid fa-list"></i> Lista de alimentos'
    };

    if (headerSpan && pageTitles[route]) headerSpan.innerHTML = pageTitles[route];

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