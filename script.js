const EGG_PER_FLEYKA = 30; // 1 Fleyka = 30 dona

// LocalStorage dan ma'lumotlarni olish yoki boshlang'ich qiymat berish
let markets = JSON.parse(localStorage.getItem('egg_markets')) || [
    { id: 1, name: "Iroda Market", owner: "Iroda opa", phone: "+998901234567", location: "Chorsu daxasi", debt: 450000 },
    { id: 2, name: "Baraka Do'koni", owner: "Jasur aka", phone: "+998912345678", location: "Yunusobod 4", debt: 120000 },
    { id: 3, name: "Oasis Supermarket", owner: "Mirzo aka", phone: "+998933456789", location: "Mirzo Ulug'bek", debt: 0 },
    { id: 4, name: "Fayz Market", owner: "Hikmat aka", phone: "+998944567890", location: "Chilanzar 10", debt: 890000 },
    { id: 5, name: "Zamin Do'koni", owner: "Anvar aka", phone: "+998955678901", location: "Sergeli 8", debt: 230000 },
    { id: 6, name: "Saxovat Market", owner: "Qodir aka", phone: "+998909876543", location: "Qo'yliq bozori", debt: 560000 }
];

let fleykaPrices = JSON.parse(localStorage.getItem('egg_prices')) || { katta: 45000, ortacha: 39000, kichik: 33000 };
let stockPieces = JSON.parse(localStorage.getItem('egg_stock')) || { katta: 3000, ortacha: 2400, kichik: 1500 };
let todayOrders = JSON.parse(localStorage.getItem('egg_today_orders')) || [];

let activeMarketForBarter = null;

window.onload = function() {
    document.getElementById('today-date').innerText = new Date().toLocaleDateString('uz-UZ');
    document.getElementById('price-katta').value = fleykaPrices.katta;
    document.getElementById('price-ortacha').value = fleykaPrices.ortacha;
    document.getElementById('price-kichik').value = fleykaPrices.kichik;
    
    populateMarketSelect();
    renderMarkets();
    updateStats();
    updateStockUI();
    renderTodayOrders();
};

function saveData() {
    localStorage.setItem('egg_markets', JSON.stringify(markets));
    localStorage.setItem('egg_prices', JSON.stringify(fleykaPrices));
    localStorage.setItem('egg_stock', JSON.stringify(stockPieces));
    localStorage.setItem('egg_today_orders', JSON.stringify(todayOrders));
}

function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn-lg').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    btn.classList.add('active');
}

function changeQty(id, delta) {
    let input = document.getElementById(id);
    let val = parseInt(input.value) || 0;
    val = Math.max(0, val + delta);
    input.value = val;
    calculateOrder();
}

function populateMarketSelect() {
    let select = document.getElementById('order-market');
    select.innerHTML = '<option value="">-- Do\'konni tanlang --</option>';
    markets.forEach(m => {
        select.innerHTML += `<option value="${m.id}">${m.name} (${m.owner})</option>`;
    });
}

function calculateOrder() {
    let marketId = document.getElementById('order-market').value;
    let flKatta = parseInt(document.getElementById('qty-katta').value) || 0;
    let flOrtacha = parseInt(document.getElementById('qty-ortacha').value) || 0;
    let flKichik = parseInt(document.getElementById('qty-kichik').value) || 0;
    let paid = parseInt(document.getElementById('paid-amount').value) || 0;

    document.getElementById('info-katta').innerText = `${flKatta * EGG_PER_FLEYKA} dona (${flKatta} fleyka)`;
    document.getElementById('info-ortacha').innerText = `${flOrtacha * EGG_PER_FLEYKA} dona (${flOrtacha} fleyka)`;
    document.getElementById('info-kichik').innerText = `${flKichik * EGG_PER_FLEYKA} dona (${flKichik} fleyka)`;

    let currentSum = (flKatta * fleykaPrices.katta) + (flOrtacha * fleykaPrices.ortacha) + (flKichik * fleykaPrices.kichik);
    let debt = 0;

    if (marketId) {
        let m = markets.find(x => x.id == marketId);
        if (m) debt = m.debt;
    }

    let total = currentSum + debt - paid;

    document.getElementById('res-current').innerText = currentSum.toLocaleString() + " so'm";
    document.getElementById('res-debt').innerText = debt.toLocaleString() + " so'm";
    document.getElementById('res-total').innerText = total.toLocaleString() + " so'm";
}

function saveOrder() {
    let marketId = document.getElementById('order-market').value;
    let flKatta = parseInt(document.getElementById('qty-katta').value) || 0;
    let flOrtacha = parseInt(document.getElementById('qty-ortacha').value) || 0;
    let flKichik = parseInt(document.getElementById('qty-kichik').value) || 0;
    let paid = parseInt(document.getElementById('paid-amount').value) || 0;

    if (!marketId) {
        alert("Iltimos, avval marketni tanlang!");
        return;
    }

    if (flKatta === 0 && flOrtacha === 0 && flKichik === 0) {
        alert("Kamida 1 fleyka tuxum sonini kiriting!");
        return;
    }

    let currentSum = (flKatta * fleykaPrices.katta) + (flOrtacha * fleykaPrices.ortacha) + (flKichik * fleykaPrices.kichik);
    let m = markets.find(x => x.id == marketId);

    let unpaid = currentSum - paid;
    m.debt += unpaid;

    stockPieces.katta -= (flKatta * EGG_PER_FLEYKA);
    stockPieces.ortacha -= (flOrtacha * EGG_PER_FLEYKA);
    stockPieces.kichik -= (flKichik * EGG_PER_FLEYKA);

    todayOrders.unshift({
        marketName: m.name,
        flKatta,
        flOrtacha,
        flKichik,
        sum: currentSum,
        paid: paid
    });

    saveData();

    alert("Zakaz muvaffaqiyatli saqlandi!");

    document.getElementById('qty-katta').value = 0;
    document.getElementById('qty-ortacha').value = 0;
    document.getElementById('qty-kichik').value = 0;
    document.getElementById('paid-amount').value = "";
    document.getElementById('order-market').value = "";
    
    calculateOrder();
    renderMarkets();
    renderTodayOrders();
    updateStats();
    updateStockUI();
}

function renderMarkets() {
    let list = document.getElementById('markets-list');
    let search = document.getElementById('search-market').value.toLowerCase();
    list.innerHTML = "";

    markets.filter(m => m.name.toLowerCase().includes(search) || m.owner.toLowerCase().includes(search)).forEach(m => {
        let hasDebt = m.debt > 0;
        list.innerHTML += `
            <div class="market-card-lg ${hasDebt ? 'has-debt' : ''}">
                <div class="m-header-lg">
                    <div>
                        <div class="m-name-lg">${m.name}</div>
                        <div class="m-sub-lg">👤 ${m.owner} | 📍 ${m.location}</div>
                    </div>
                    <div class="debt-badge-lg ${!hasDebt ? 'no-debt' : ''}">
                        ${hasDebt ? 'Qarz: ' + m.debt.toLocaleString() + ' so\'m' : 'Qarzsiz'}
                    </div>
                </div>
                <div class="m-actions-lg">
                    <a href="tel:${m.phone}" class="act-btn-lg call-bg">📞 TEL</a>
                    <button class="act-btn-lg sms-bg" onclick="sendSMS('${m.phone}', '${m.name}', ${m.debt})">💬 SMS</button>
                    <button class="act-btn-lg barter-bg" onclick="openBarterModal(${m.id})">🔄 BARTER</button>
                </div>
            </div>
        `;
    });
}

function renderTodayOrders() {
    let container = document.getElementById('today-orders-list');
    if (todayOrders.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-dim); font-size: 1rem; padding: 20px;">Bugun hali zakazlar kiritilmadi</p>`;
        return;
    }
    container.innerHTML = "";
    todayOrders.forEach(o => {
        container.innerHTML += `
            <div style="background: #0a0e17; border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 1.1rem; margin-bottom: 6px;">
                    <span>${o.marketName}</span>
                    <span style="color: var(--primary-yellow);">${o.sum.toLocaleString()} so'm</span>
                </div>
                <div style="font-size: 0.95rem; color: var(--text-light); font-weight: 700;">
                    Katta: ${o.flKatta} fl | O'rtacha: ${o.flOrtacha} fl | Kichik: ${o.flKichik} fl 
                    <br><small style="color: var(--success-green);">(Berildi: ${o.paid.toLocaleString()} so'm)</small>
                </div>
            </div>
        `;
    });
}

function sendSMS(phone, name, debt) {
    if (debt <= 0) {
        alert(name + " marketining qarzi yo'q!");
        return;
    }
    let msg = `Hormang, ${name}! Sizning tuxum yetkazib berish xizmatidan qarzingiz: ${debt.toLocaleString()} so'm. To'lovni qilishingizni so'raymiz. Rahmat!`;
    window.open(`sms:${phone}?body=${encodeURIComponent(msg)}`, '_blank');
}

function openBarterModal(id) {
    activeMarketForBarter = markets.find(m => m.id == id);
    document.getElementById('barter-market-name').innerText = activeMarketForBarter.name + " (Qarz: " + activeMarketForBarter.debt.toLocaleString() + " so'm)";
    document.getElementById('barter-modal').classList.add('open');
}

function closeBarterModal() {
    document.getElementById('barter-modal').classList.remove('open');
}

function applyBarter() {
    let amount = parseInt(document.getElementById('barter-amount').value) || 0;
    let item = document.getElementById('barter-item').value;
    if (amount <= 0 || !item) {
        alert("Ma'lumotlarni to'liq kiriting!");
        return;
    }
    activeMarketForBarter.debt -= amount;
    if (activeMarketForBarter.debt < 0) activeMarketForBarter.debt = 0;
    
    saveData();
    alert("Tovar qabul qilindi va qarzdan ayirildi!");
    closeBarterModal();
    renderMarkets();
    updateStats();
}

function openAddMarketModal() {
    document.getElementById('add-market-modal').classList.add('open');
}

function closeAddMarketModal() {
    document.getElementById('add-market-modal').classList.remove('open');
}

function saveNewMarket() {
    let name = document.getElementById('new-name').value;
    let owner = document.getElementById('new-owner').value;
    let phone = document.getElementById('new-phone').value;
    let location = document.getElementById('new-location').value;

    if (!name || !owner) {
        alert("Market nomi va egasini kiriting!");
        return;
    }
    markets.push({ id: Date.now(), name, owner, phone, location, debt: 0 });
    saveData();
    alert("Yangi market qo'shildi!");
    closeAddMarketModal();
    populateMarketSelect();
    renderMarkets();
}

function updatePrices() {
    fleykaPrices.katta = parseInt(document.getElementById('price-katta').value) || 0;
    fleykaPrices.ortacha = parseInt(document.getElementById('price-ortacha').value) || 0;
    fleykaPrices.kichik = parseInt(document.getElementById('price-kichik').value) || 0;

    document.getElementById('disp-price-katta').innerText = fleykaPrices.katta.toLocaleString() + " so'm/fl";
    document.getElementById('disp-price-ortacha').innerText = fleykaPrices.ortacha.toLocaleString() + " so'm/fl";
    document.getElementById('disp-price-kichik').innerText = fleykaPrices.kichik.toLocaleString() + " so'm/fl";

    saveData();
    calculateOrder();
}

function updateStockUI() {
    let flK = Math.floor(stockPieces.katta / EGG_PER_FLEYKA);
    let flO = Math.floor(stockPieces.ortacha / EGG_PER_FLEYKA);
    let flKi = Math.floor(stockPieces.kichik / EGG_PER_FLEYKA);

    document.getElementById('stock-katta-fl').innerText = flK + " fleyka";
    document.getElementById('stock-katta-dona').innerText = stockPieces.katta.toLocaleString() + " dona";

    document.getElementById('stock-ortacha-fl').innerText = flO + " fleyka";
    document.getElementById('stock-ortacha-dona').innerText = stockPieces.ortacha.toLocaleString() + " dona";

    document.getElementById('stock-kichik-fl').innerText = flKi + " fleyka";
    document.getElementById('stock-kichik-dona').innerText = stockPieces.kichik.toLocaleString() + " dona";
}

function updateStats() {
    let totalDebt = markets.reduce((acc, m) => acc + m.debt, 0);
    let todaySales = todayOrders.reduce((acc, o) => acc + o.sum, 0);

    document.getElementById('total-debt').innerText = totalDebt.toLocaleString() + " so'm";
    document.getElementById('today-sales').innerText = todaySales.toLocaleString() + " so'm";
}
