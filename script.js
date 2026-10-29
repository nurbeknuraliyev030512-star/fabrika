// MA'LUMOTLAR BAZASI (LOCALSTORAGE)
const PRICE_PER_BOX = 350000; // 1 Karobka tuxum narxi (masalan: 350,000 so'm)
const ADMIN_PIN = "1234";      // Admin PIN kodi

let orders = JSON.parse(localStorage.getItem('egg_orders')) || [];
let debts = JSON.parse(localStorage.getItem('egg_debts')) || [
    { id: 1, client: "Zormarket", amount: 100000, date: "2026-10-30" }
];

// SAHISA YUKLANGANDA
document.addEventListener('DOMContentLoaded', () => {
    renderClientTracking();
    updateDashboardStats();
});

// BUYURTMA BERISH (MIJOZ)
function handleClientOrder(e) {
    e.preventDefault();
    const clientName = document.getElementById('clientName').value;
    const clientPhone = document.getElementById('clientPhone').value;
    const clientBoxes = parseInt(document.getElementById('clientBoxes').value);

    const newOrder = {
        id: Date.now(),
        client: clientName,
        phone: clientPhone,
        boxes: clientBoxes,
        status: 'Kutilmoqda', // Kutilmoqda, Yo'lda, Yetkazildi
        timeMinutes: null,
        createdTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toISOString().split('T')[0]
    };

    orders.unshift(newOrder);
    saveData();
    
    // Formani tozalash va statusni yangilash
    document.getElementById('clientOrderForm').reset();
    localStorage.setItem('last_order_id', newOrder.id);
    renderClientTracking();
    
    alert("Buyurtmangiz qabul qilindi! Admin ko'rib chiqqach yetkazish vaqti ko'rinadi.");
}

// MIJOZ UCHUN TRACKING DISPLAY
function renderClientTracking() {
    const trackingContainer = document.getElementById('trackingStatusContainer');
    const lastOrderId = localStorage.getItem('last_order_id');
    const currentOrder = orders.find(o => o.id == lastOrderId);

    if (!currentOrder) {
        trackingContainer.className = "tracking-empty";
        trackingContainer.innerHTML = `
            <i class="fa-solid fa-clock-rotate-left empty-icon"></i>
            <p>Hozircha faol buyurtmangiz yo'q.</p>
        `;
        return;
    }

    let statusText = "";
    let timeDisplay = "";

    if (currentOrder.status === 'Kutilmoqda') {
        statusText = `<span class="status-badge pending">Kutilmoqda</span>`;
        timeDisplay = `<p style="color: var(--text-muted); margin-top: 10px;">Buyurtma admin tomonidan tasdiqlanishi kutilmoqda...</p>`;
    } else if (currentOrder.status === "Yo'lda") {
        statusText = `<span class="status-badge active">Yo'lda</span>`;
        timeDisplay = `
            <div class="time-highlight">
                <i class="fa-solid fa-truck-fast"></i> ${currentOrder.timeMinutes} daqiqada yetib boradi!
            </div>
            <p style="color: var(--text-muted); font-size: 13px; margin-top: 5px;">Tuxum yetkazib berilmoqda, iltimos kutib turing.</p>
        `;
    } else {
        statusText = `<span class="status-badge active" style="background: rgba(16, 185, 129, 0.3);">Yetkazildi</span>`;
        timeDisplay = `<p style="color: var(--green); font-weight: bold; margin-top: 10px;">Muvaffaqiyatli yetkazib berildi! Rahmat.</p>`;
    }

    trackingContainer.className = "";
    trackingContainer.innerHTML = `
        <div class="status-box">
            <div class="status-header">
                <strong>${currentOrder.client} (${currentOrder.boxes} karobka)</strong>
                ${statusText}
            </div>
            <p style="font-size: 13px; color: var(--text-muted);">Vaqti: ${currentOrder.createdTime}</p>
            ${timeDisplay}
        </div>
    `;
}

// ADMIN MODAL VA PIN CHECK
function openAdminModal() {
    document.getElementById('adminAuthModal').style.display = 'flex';
}

function closeAdminModal() {
    document.getElementById('adminAuthModal').style.display = 'none';
    document.getElementById('pinError').innerText = "";
    document.getElementById('adminPinInput').value = "";
}

function checkAdminPin() {
    const pin = document.getElementById('adminPinInput').value;
    if (pin === ADMIN_PIN) {
        closeAdminModal();
        openAdminPanel();
    } else {
        document.getElementById('pinError').innerText = "PIN kod noto'g'ri!";
    }
}

function openAdminPanel() {
    document.getElementById('adminPanelModal').style.display = 'flex';
    renderOrdersTable();
    renderDebtTable();
    updateDashboardStats();
}

function closeAdminPanel() {
    document.getElementById('adminPanelModal').style.display = 'none';
}

// TAB SWITCHER
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    event.currentTarget.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

// ADMIN ORDERS TABLE
function renderOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = "";

    orders.forEach(order => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${order.id.toString().slice(-4)}</td>
            <td><strong>${order.client}</strong><br><small>${order.phone}</small></td>
            <td>${order.boxes} karobka</td>
            <td>${order.createdTime}</td>
            <td>
                ${order.status === 'Yo\'lda' ? `<b style="color:var(--green)">Yo'lda (${order.timeMinutes} min)</b>` : order.status}
                ${order.status === 'Kutilmoqda' ? `
                    <div class="action-inputs" style="margin-top:5px;">
                        <input type="number" id="time_${order.id}" placeholder="Daqiqa" value="20">
                        <button class="btn-small" onclick="setDeliveryTime(${order.id})">Yuborish</button>
                    </div>
                ` : ''}
            </td>
            <td>
                ${order.status !== 'Yetkazildi' ? `<button class="btn-small" onclick="markDelivered(${order.id})">OK</button>` : '✅'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function setDeliveryTime(orderId) {
    const timeVal = document.getElementById(`time_${orderId}`).value;
    if (!timeVal) return;

    const order = orders.find(o => o.id === orderId);
    if (order) {
        order.status = "Yo'lda";
        order.timeMinutes = timeVal;
        saveData();
        renderOrdersTable();
        renderClientTracking();
    }
}

function markDelivered(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (order) {
        order.status = "Yetkazildi";
        saveData();
        renderOrdersTable();
        renderClientTracking();
        updateDashboardStats();
    }
}

// DEBT SYSTEM
function renderDebtTable() {
    const tbody = document.getElementById('debtTableBody');
    tbody.innerHTML = "";

    debts.forEach(debt => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${debt.client}</strong></td>
            <td style="color: var(--red); font-weight: bold;">${debt.amount.toLocaleString()} so'm</td>
            <td>${debt.date}</td>
            <td>
                <button class="btn-small btn-delete" onclick="deleteDebt(${debt.id})">To'landi (O'chirish)</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function handleAddDebt(e) {
    e.preventDefault();
    const client = document.getElementById('debtClientName').value;
    const amount = parseInt(document.getElementById('debtAmount').value);

    const newDebt = {
        id: Date.now(),
        client: client,
        amount: amount,
        date: new Date().toISOString().split('T')[0]
    };

    debts.unshift(newDebt);
    saveData();
    document.getElementById('addDebtForm').reset();
    renderDebtTable();
    updateDashboardStats();
}

function deleteDebt(id) {
    debts = debts.filter(d => d.id !== id);
    saveData();
    renderDebtTable();
    updateDashboardStats();
}

// STATISTIKALARNI YANGILASH
function updateDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    
    // Bugungi sotilgan karobkalar
    const todayBoxes = orders
        .filter(o => o.date === today && o.status === 'Yetkazildi')
        .reduce((sum, o) => sum + o.boxes, 0);

    // Bugungi tushum
    const todayRevenue = todayBoxes * PRICE_PER_BOX;

    // Umumiy qarz
    const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0);

    document.getElementById('statTodayBoxes').innerText = todayBoxes;
    document.getElementById('statTodayRevenue').innerText = todayRevenue.toLocaleString();
    document.getElementById('statTotalDebt').innerText = totalDebt.toLocaleString();
}

// STORAGE
function saveData() {
    localStorage.setItem('egg_orders', JSON.stringify(orders));
    localStorage.setItem('egg_debts', JSON.stringify(debts));
}
