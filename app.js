// O‘RMON PARRANDA — boshqaruv tizimi
// Ma'lumotlar hozircha shu brauzerda saqlanadi.

const $ = (id) => document.getElementById(id);

const DB_KEY = "ormonParrandaDB";

const defaultDB = {
  products: [
    { id: "p1", name: "1-tur tuxum", price: 0, stock: 0 },
    { id: "p2", name: "2-tur tuxum", price: 0, stock: 0 },
    { id: "p3", name: "3-tur tuxum", price: 0, stock: 0 }
  ],
  shops: [],
  sales: [],
  payments: [],
  expenses: []
};

function loadDB() {
  try {
    const saved = localStorage.getItem(DB_KEY);

    if (!saved) {
      return structuredClone(defaultDB);
    }

    const data = JSON.parse(saved);

    return {
      products: Array.isArray(data.products) ? data.products : [],
      shops: Array.isArray(data.shops) ? data.shops : [],
      sales: Array.isArray(data.sales) ? data.sales : [],
      payments: Array.isArray(data.payments) ? data.payments : [],
      expenses: Array.isArray(data.expenses) ? data.expenses : []
    };
  } catch (error) {
    alert("Saqlangan ma'lumotlarni o‘qishda xatolik yuz berdi.");
    return structuredClone(defaultDB);
  }
}

let db = loadDB();

function saveDB() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (error) {
    alert("Ma'lumot saqlanmadi. Brauzer xotirasini tekshiring.");
  }
}

function newId() {
  return Date.now().toString() + Math.random().toString(16).slice(2);
}

function number(value) {
  return Number(value) || 0;
}

function money(value) {
  return number(value).toLocaleString("uz-UZ") + " so‘m";
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function emptyRow(columns, message = "Hozircha ma'lumot yo‘q") {
  return `
    <tr>
      <td class="empty-row" colspan="${columns}">
        ${message}
      </td>
    </tr>
  `;
}

// -----------------------------
// KIRISH VA CHIQISH
// -----------------------------

function showApp() {
  $("loginScreen").classList.add("hidden");
  $("app").classList.remove("hidden");
  $("today").textContent = new Date().toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  setDefaultDates();
  renderAll();
}

$("loginForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const username = $("username").value.trim();
  const password = $("password").value;

  // Bu faqat namoyish uchun login.
  // Haqiqiy xavfsiz tizimda server orqali tekshirish kerak.
  if (username === "admin" && password === "ormon123") {
    sessionStorage.setItem("ormonLoggedIn", "true");
    $("loginError").textContent = "";
    showApp();
  } else {
    $("loginError").textContent = "Login yoki parol noto‘g‘ri.";
  }
});

$("logoutBtn").addEventListener("click", function () {
  sessionStorage.removeItem("ormonLoggedIn");
  $("app").classList.add("hidden");
  $("loginScreen").classList.remove("hidden");
  $("password").value = "";
});

if (sessionStorage.getItem("ormonLoggedIn") === "true") {
  showApp();
}

// -----------------------------
// SAHIFALAR O‘RTASIDA O‘TISH
// -----------------------------

const pageNames = {
  dashboard: "Bosh sahifa",
  products: "Mahsulotlar",
  shops: "Do‘konlar",
  sales: "Savdo",
  debts: "Qarzdorlik",
  expenses: "Xarajatlar",
  reports: "Hisobotlar"
};

function openPage(pageName) {
  if (!pageNames[pageName]) return;

  document.querySelectorAll(".page").forEach((page) => {
    page.classList.add("hidden");
  });

  $(pageName).classList.remove("hidden");
  $("pageTitle").textContent = pageNames[pageName];

  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageName
    );
  });

  renderAll();
}

document.querySelectorAll(".nav-link").forEach((button) => {
  button.addEventListener("click", () => {
    openPage(button.dataset.page);
  });
});

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => {
    openPage(button.dataset.go);
  });
});

// -----------------------------
// SANA MAYDONLARI
// -----------------------------

function setDefaultDates() {
  $("saleDate").value = todayISO();
  $("expenseDate").value = todayISO();
}

// -----------------------------
// HISOB-KITOBLAR
// -----------------------------

function totalSalesValue() {
  return db.sales.reduce((sum, sale) => sum + number(sale.total), 0);
}

function totalExpenseValue() {
  return db.expenses.reduce((sum, expense) => {
    return sum + number(expense.amount);
  }, 0);
}

function totalStock() {
  return db.products.reduce((sum, product) => {
    return sum + number(product.stock);
  }, 0);
}

function shopDebt(shopId) {
  const unpaidSales = db.sales
    .filter((sale) => String(sale.shopId) === String(shopId))
    .reduce((sum, sale) => {
      return sum + Math.max(
        0,
        number(sale.total) - number(sale.paid)
      );
    }, 0);

  const payments = db.payments
    .filter((payment) => String(payment.shopId) === String(shopId))
    .reduce((sum, payment) => {
      return sum + number(payment.amount);
    }, 0);

  return Math.max(0, unpaidSales - payments);
}

function totalAllDebts() {
  return db.shops.reduce((sum, shop) => {
    return sum + shopDebt(shop.id);
  }, 0);
}

// -----------------------------
// TANLOV RO‘YXATLARI
// -----------------------------

function renderSelectors() {
  const oldShop = $("saleShop").value;
  const oldProduct = $("saleProduct").value;

  $("saleShop").innerHTML =
    '<option value="">Do‘konni tanlang</option>' +
    db.shops.map((shop) => `
      <option value="${escapeHTML(shop.id)}">
        ${escapeHTML(shop.name)}
      </option>
    `).join("");

  $("saleProduct").innerHTML =
    '<option value="">Mahsulotni tanlang</option>' +
    db.products.map((product) => `
      <option value="${escapeHTML(product.id)}">
        ${escapeHTML(product.name)} — qoldiq: ${number(product.stock)} fleka
      </option>
    `).join("");

  if (db.shops.some((shop) => String(shop.id) === oldShop)) {
    $("saleShop").value = oldShop;
  }

  if (db.products.some((product) => String(product.id) === oldProduct)) {
    $("saleProduct").value = oldProduct;
  }
}

$("saleProduct").addEventListener("change", function () {
  const product = db.products.find(
    (item) => String(item.id) === this.value
  );

  $("salePrice").value = product ? number(product.price) : 0;
  updateSalePreview();
});

$("saleQty").addEventListener("input", updateSalePreview);
$("salePrice").addEventListener("input", updateSalePreview);

function updateSalePreview() {
  const total = number($("saleQty").value) * number($("salePrice").value);
  $("salePreview").textContent = money(total);
}

// -----------------------------
// MAHSULOTLAR
// -----------------------------

$("productForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const id = $("productId").value;
  const name = $("productName").value.trim();
  const price = number($("productPrice").value);
  const stock = number($("productStock").value);

  if (!name || price < 0 || stock < 0) {
    alert("Mahsulot ma'lumotlarini tekshiring.");
    return;
  }

  if (id) {
    const product = db.products.find(
      (item) => String(item.id) === String(id)
    );

    if (product) {
      product.name = name;
      product.price = price;
      product.stock = stock;
    }
  } else {
    db.products.push({
      id: newId(),
      name,
      price,
      stock
    });
  }

  saveDB();
  this.reset();
  $("productId").value = "";
  renderAll();
  alert("Mahsulot saqlandi.");
});

function editProduct(id) {
  const product = db.products.find(
    (item) => String(item.id) === String(id)
  );

  if (!product) return;

  $("productId").value = product.id;
  $("productName").value = product.name;
  $("productPrice").value = product.price;
  $("productStock").value = product.stock;

  openPage("products");
  $("productName").focus();
}

function deleteProduct(id) {
  const usedInSales = db.sales.some(
    (sale) => String(sale.productId) === String(id)
  );

  if (usedInSales) {
    alert("Bu mahsulot savdo tarixida bor. Uni o‘chirish mumkin emas.");
    return;
  }

  if (!confirm("Mahsulotni o‘chirmoqchimisiz?")) return;

  db.products = db.products.filter(
    (product) => String(product.id) !== String(id)
  );

  saveDB();
  renderAll();
}

// -----------------------------
// DO‘KONLAR
// -----------------------------

$("shopForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const id = $("shopId").value;
  const shopData = {
    name: $("shopName").value.trim(),
    owner: $("shopOwner").value.trim(),
    phone: $("shopPhone").value.trim(),
    address: $("shopAddress").value.trim()
  };

  if (!shopData.name) {
    alert("Do‘kon nomini kiriting.");
    return;
  }

  if (id) {
    const shop = db.shops.find(
      (item) => String(item.id) === String(id)
    );

    if (shop) Object.assign(shop, shopData);
  } else {
    db.shops.push({
      id: newId(),
      ...shopData
    });
  }

  saveDB();
  this.reset();
  $("shopId").value = "";
  renderAll();
  alert("Do‘kon saqlandi.");
});

function editShop(id) {
  const shop = db.shops.find(
    (item) => String(item.id) === String(id)
  );

  if (!shop) return;

  $("shopId").value = shop.id;
  $("shopName").value = shop.name;
  $("shopOwner").value = shop.owner || "";
  $("shopPhone").value = shop.phone || "";
  $("shopAddress").value = shop.address || "";

  openPage("shops");
  $("shopName").focus();
}

function deleteShop(id) {
  const hasSales = db.sales.some(
    (sale) => String(sale.shopId) === String(id)
  );

  const hasPayments = db.payments.some(
    (payment) => String(payment.shopId) === String(id)
  );

  if (hasSales || hasPayments) {
    alert(
      "Bu do‘kon savdo yoki to‘lov tarixida bor. " +
      "Tarixni saqlash uchun uni o‘chirish mumkin emas."
    );
    return;
  }

  if (!confirm("Do‘konni o‘chirmoqchimisiz?")) return;

  db.shops = db.shops.filter(
    (shop) => String(shop.id) !== String(id)
  );

  saveDB();
  renderAll();
}

// -----------------------------
// SAVDO
// -----------------------------

$("saleForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const shopId = $("saleShop").value;
  const productId = $("saleProduct").value;
  const qty = number($("saleQty").value);
  const price = number($("salePrice").value);
  const paid = number($("salePaid").value);
  const date = $("saleDate").value;
  const note = $("saleNote").value.trim();

  const shop = db.shops.find(
    (item) => String(item.id) === String(shopId)
  );

  const product = db.products.find(
    (item) => String(item.id) === String(productId)
  );

  if (!shop || !product) {
    alert("Avval do‘kon va mahsulotni tanlang.");
    return;
  }

  if (!date || qty <= 0 || price < 0 || paid < 0) {
    alert("Savdo ma'lumotlarini tekshiring.");
    return;
  }

  if (qty > number(product.stock)) {
    alert(
      "Omborda buncha mahsulot yo‘q. Qoldiq: " +
      number(product.stock) + " fleka."
    );
    return;
  }

  const total = qty * price;

  if (paid > total) {
    alert("Olingan to‘lov savdo summasidan katta bo‘lishi mumkin emas.");
    return;
  }

  db.sales.push({
    id: newId(),
    date,
    shopId: shop.id,
    shopName: shop.name,
    productId: product.id,
    productName: product.name,
    qty,
    price,
    total,
    paid,
    note
  });

  // Sotilgan miqdorni ombordan ayiramiz.
  product.stock = number(product.stock) - qty;

  saveDB();
  this.reset();
  setDefaultDates();

  $("saleQty").value = 1;
  $("salePrice").value = 0;
  $("salePaid").value = 0;
  $("saleNote").value = "";
  updateSalePreview();

  renderAll();
  alert("Savdo saqlandi. Ombor qoldig‘i yangilandi.");
});

// -----------------------------
// QARZ TO‘LOVLARI
// -----------------------------

$("debtsTable").addEventListener("click", function (event) {
  const button = event.target.closest("[data-pay-shop]");
  if (!button) return;

  const shopId = button.dataset.payShop;
  const shop = db.shops.find(
    (item) => String(item.id) === String(shopId)
  );

  if (!shop) return;

  const debt = shopDebt(shop.id);

  if (debt <= 0) {
    alert("Bu do‘konning qarzi yo‘q.");
    return;
  }

  const input = prompt(
    shop.name + " do‘konining qarzi: " + money(debt) +
    "\nQabul qilingan to‘lov summasini kiriting:"
  );

  if (input === null) return;

  const amount = Number(input.replace(/\s/g, "").replace(",", "."));

  if (!Number.isFinite(amount) || amount <= 0) {
    alert("To‘g‘ri to‘lov summasini kiriting.");
    return;
  }

  if (amount > debt) {
    alert("To‘lov qarz qoldig‘idan ko‘p. Qarz: " + money(debt));
    return;
  }

  const note = prompt("To‘lov haqida izoh (ixtiyoriy):") || "";

  db.payments.push({
    id: newId(),
    shopId: shop.id,
    shopName: shop.name,
    amount,
    date: todayISO(),
    note
  });

  saveDB();
  renderAll();
  alert("To‘lov saqlandi. Do‘kon qarzi yangilandi.");
});

// -----------------------------
// XARAJATLAR
// -----------------------------

$("expenseForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const expense = {
    id: newId(),
    date: $("expenseDate").value,
    name: $("expenseName").value.trim(),
    amount: number($("expenseAmount").value),
    note: $("expenseNote").value.trim()
  };

  if (!expense.date || !expense.name || expense.amount <= 0) {
    alert("Xarajat ma'lumotlarini tekshiring.");
    return;
  }

  db.expenses.push(expense);

  saveDB();
  this.reset();
  $("expenseDate").value = todayISO();
  renderAll();
  alert("Xarajat saqlandi.");
});

function deleteExpense(id) {
  if (!confirm("Bu xarajatni o‘chirmoqchimisiz?")) return;

  db.expenses = db.expenses.filter(
    (expense) => String(expense.id) !== String(id)
  );

  saveDB();
  renderAll();
}

// -----------------------------
// JADVALLARNI EKRANGA CHIQARISH
// -----------------------------

function renderProducts() {
  $("productsTable").innerHTML = db.products.length
    ? db.products.map((product) => `
      <tr>
        <td>${escapeHTML(product.name)}</td>
        <td>${money(product.price)}</td>
        <td>${number(product.stock)} fleka</td>
        <td>${money(number(product.price) * number(product.stock))}</td>
        <td>
          <button class="small-btn edit-btn"
            onclick="editProduct('${escapeHTML(product.id)}')">
            Tahrirlash
          </button>
          <button class="small-btn delete-btn"
            onclick="deleteProduct('${escapeHTML(product.id)}')">
            O‘chirish
          </button>
        </td>
      </tr>
    `).join("")
    : emptyRow(5);
}

function renderShops() {
  $("shopsTable").innerHTML = db.shops.length
    ? db.shops.map((shop) => `
      <tr>
        <td>${escapeHTML(shop.name)}</td>
        <td>${escapeHTML(shop.owner || "—")}</td>
        <td>${escapeHTML(shop.phone || "—")}</td>
        <td>${escapeHTML(shop.address || "—")}</td>
        <td>${money(shopDebt(shop.id))}</td>
        <td>
          <button class="small-btn edit-btn"
            onclick="editShop('${escapeHTML(shop.id)}')">
            Tahrirlash
          </button>
          <button class="small-btn delete-btn"
            onclick="deleteShop('${escapeHTML(shop.id)}')">
            O‘chirish
          </button>
        </td>
      </tr>
    `).join("")
    : emptyRow(6);
}

function renderSales() {
  const rows = [...db.sales].reverse();

  $("salesTable").innerHTML = rows.length
    ? rows.map((sale) => `
      <tr>
        <td>${escapeHTML(sale.date)}</td>
        <td>${escapeHTML(sale.shopName)}</td>
        <td>${escapeHTML(sale.productName)}</td>
        <td>${number(sale.qty)} fleka</td>
        <td>${money(sale.total)}</td>
        <td>${money(sale.paid)}</td>
        <td>${money(Math.max(0, number(sale.total) - number(sale.paid)))}</td>
      </tr>
    `).join("")
    : emptyRow(7);
}

function renderDebts() {
  $("debtsTable").innerHTML = db.shops.length
    ? db.shops.map((shop) => `
      <tr>
        <td>${escapeHTML(shop.name)}</td>
        <td>${escapeHTML(shop.phone || "—")}</td>
        <td>${money(shopDebt(shop.id))}</td>
        <td>
          <button class="pay-btn"
            data-pay-shop="${escapeHTML(shop.id)}">
            To‘lov qabul qilish
          </button>
        </td>
      </tr>
    `).join("")
    : emptyRow(4);

  const rows = [...db.payments].reverse();

  $("paymentsTable").innerHTML = rows.length
    ? rows.map((payment) => `
      <tr>
        <td>${escapeHTML(payment.date)}</td>
        <td>${escapeHTML(payment.shopName)}</td>
        <td>${money(payment.amount)}</td>
        <td>${escapeHTML(payment.note || "—")}</td>
      </tr>
    `).join("")
    : emptyRow(4);
}

function renderExpenses() {
  const rows = [...db.expenses].reverse();

  $("expensesTable").innerHTML = rows.length
    ? rows.map((expense) => `
      <tr>
        <td>${escapeHTML(expense.date)}</td>
        <td>${escapeHTML(expense.name)}</td>
        <td>${money(expense.amount)}</td>
        <td>${escapeHTML(expense.note || "—")}</td>
        <td>
          <button class="small-btn delete-btn"
            onclick="deleteExpense('${escapeHTML(expense.id)}')">
            O‘chirish
          </button>
        </td>
      </tr>
    `).join("")
    : emptyRow(5);
}

function renderDashboard() {
  $("totalStock").textContent = totalStock().toLocaleString("uz-UZ");
  $("totalSales").textContent = money(totalSalesValue());
  $("totalDebt").textContent = money(totalAllDebts());
  $("totalExpenses").textContent = money(totalExpenseValue());

  $("dashboardProducts").innerHTML = db.products.length
    ? db.products.map((product) => `
      <tr>
        <td>${escapeHTML(product.name)}</td>
        <td>${money(product.price)}</td>
        <td>${number(product.stock)} fleka</td>
        <td>${money(number(product.price) * number(product.stock))}</td>
      </tr>
    `).join("")
    : emptyRow(4);

  const latestSales = [...db.sales].reverse().slice(0, 5);

  $("dashboardSales").innerHTML = latestSales.length
    ? latestSales.map((sale) => `
      <tr>
        <td>${escapeHTML(sale.date)}</td>
        <td>${escapeHTML(sale.shopName)}</td>
        <td>${escapeHTML(sale.productName)}</td>
        <td>${number(sale.qty)} fleka</td>
        <td>${money(sale.total)}</td>
      </tr>
    `).join("")
    : emptyRow(5);
}

function renderReports() {
  $("reportSales").textContent = money(totalSalesValue());

  const receivedFromSales = db.sales.reduce((sum, sale) => {
    return sum + number(sale.paid);
  }, 0);

  const laterPayments = db.payments.reduce((sum, payment) => {
    return sum + number(payment.amount);
  }, 0);

  $("reportCollected").textContent =
    money(receivedFromSales + laterPayments);

  $("reportDebt").textContent = money(totalAllDebts());
  $("reportExpenses").textContent = money(totalExpenseValue());
}

function renderAll() {
  renderSelectors();
  renderProducts();
  renderShops();
  renderSales();
  renderDebts();
  renderExpenses();
  renderDashboard();
  renderReports();
  updateSalePreview();
}

// -----------------------------
// HISOBOTNI CSV FAYLGA YUKLASH
// -----------------------------

function csvCell(value) {
  const safe = String(value ?? "").replace(/"/g, '""');
  return `"${safe}"`;
}

$("exportBtn").addEventListener("click", function () {
  const header = [
    "Sana",
    "Do‘kon",
    "Mahsulot",
    "Fleka",
    "Bir fleka narxi",
    "Jami summa",
    "To‘langan",
    "Qarz",
    "Izoh"
  ];

  const rows = db.sales.map((sale) => [
    sale.date,
    sale.shopName,
    sale.productName,
    sale.qty,
    sale.price,
    sale.total,
    sale.paid,
    Math.max(0, number(sale.total) - number(sale.paid)),
    sale.note || ""
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(";"))
    .join("\r\n");

  // BOM Excel dasturida o‘zbekcha harflarni to‘g‘ri ochishga yordam beradi.
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "ormon-parranda-savdo-hisoboti.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
});
