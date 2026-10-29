'use strict';
const KEY = 'fleyka.v1', PC = 30; // 1 fleyka = 30 eggs
const CATS = [['L', 'Katta'], ['M', "O'rtacha"], ['S', 'Kichik']];

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const m = n => Math.round(n || 0).toLocaleString('en-US').replace(/,/g, ' ');
const crates = p => `${Math.floor(p / PC)} fl${p % PC ? ` ${p % PC} pcs` : ''}`;
const today = () => new Date().toLocaleDateString('sv');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const clean = p => String(p || '').replace(/[^\d+]/g, '');

/* ---------- state (stock is stored in pieces) ---------- */
const fresh = () => ({ prices: { L: 60000, M: 55000, S: 50000 }, stock: { L: 0, M: 0, S: 0 }, stores: [], sales: [] });
function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.stores) return { ...fresh(), ...d }; } catch (e) {}
  return fresh();
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Storage full – export a backup'); } };
const blank = () => ({ store: '', q: { L: 0, M: 0, S: 0 }, paid: '' });
let db = load(), draft = blank(), view = 'orders', search = '';
const getStore = id => db.stores.find(s => s.id === id);
const orderCost = () => CATS.reduce((a, [k]) => a + draft.q[k] * db.prices[k], 0);

/* ---------- ui primitives ---------- */
let tt;
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('on'), 2200); }
function modal(title, html, ok) {
  const el = $('#modal');
  el.innerHTML = `<form class="sheet"><h2>${title}</h2>${html}<div class="row"><button type="button" class="btn ghost" data-act="close">Cancel</button><button class="btn">Save</button></div></form>`;
  el.hidden = false;
  el.firstChild.onsubmit = e => { e.preventDefault(); ok(new FormData(e.target)); };
  const f = $('input', el); if (f) f.focus();
}
const closeModal = () => { $('#modal').hidden = true; $('#modal').innerHTML = ''; };
const field = (l, n, v = '', t = 'text', x = '') => `<label>${l}<input name="${n}" type="${t}" value="${esc(v)}" ${x}></label>`;
const empty = (t, v, b) => `<div class="empty"><p>${t}</p><button class="btn" data-v="${v}">${b}</button></div>`;
const debtTxt = d => d > 0 ? `${m(d)}<small>debt</small>` : d < 0 ? `${m(-d)}<small>prepaid</small>` : `0<small>no debt</small>`;

/* ---------- views ---------- */
function sum() {
  const s = getStore(draft.store), cost = orderCost(), old = s ? s.debt : 0, paid = +draft.paid || 0, due = old + cost - paid;
  return `<div class="calc"><p><span>This order</span><b>${m(cost)}</b></p><p><span>Old debt</span><b>+ ${m(old)}</b></p><p><span>Paid now</span><b>− ${m(paid)}</b></p><p class="due"><span>Total due</span><b class="${due > 0 ? 'bad' : 'ok'}">${m(due)}</b></p></div>`;
}
function vOrders() {
  if (!db.stores.length) return empty('Add your first market to start taking orders.', 'markets', 'Add a market');
  const opts = db.stores.map(s => `<option value="${s.id}" ${s.id === draft.store ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  const rows = CATS.map(([k, n]) => { const q = draft.q[k]; return `<div class="card qty"><div><h3>${n}</h3><small>${m(db.prices[k])} / fl · left ${crates(db.stock[k])}</small><small>${q} fl = ${q * PC} pcs = ${m(q * db.prices[k])}</small></div><div class="step"><button data-act="dec" data-k="${k}" aria-label="Less ${n}">−</button><output>${q}</output><button data-act="inc" data-k="${k}" aria-label="More ${n}">+</button></div></div>`; }).join('');
  return `<select id="store" aria-label="Market"><option value="">Select market…</option>${opts}</select>${rows}
  <label>Paid now (so'm)<input id="paid" type="number" inputmode="numeric" min="0" placeholder="0" value="${esc(draft.paid)}"></label>
  <button class="btn ghost" data-act="payfull">Pay everything</button><div id="sum">${sum()}</div><button class="btn big" data-act="saveorder">Save order</button>`;
}
function card(s) {
  const ios = /iP(hone|ad)/.test(navigator.userAgent);
  const body = encodeURIComponent(`Assalomu alaykum${s.owner ? ', ' + s.owner : ''}! ${s.name} qarzi: ${m(s.debt)} so'm. Iltimos, to'lovni amalga oshiring. Rahmat!`);
  const ph = clean(s.phone);
  return `<article class="card"><div class="top"><div><h3>${esc(s.name)}</h3><small>${esc([s.owner, s.loc].filter(Boolean).join(', '))}</small></div><div class="debt ${s.debt > 0 ? 'bad' : 'ok'}">${debtTxt(s.debt)}</div></div>
  <div class="acts">${ph ? `<a class="btn" href="tel:${ph}">Call</a>` : ''}${ph && s.debt > 0 ? `<a class="btn" href="sms:${ph}${ios ? '&' : '?'}body=${body}">SMS reminder</a>` : ''}
  <button class="btn ghost" data-act="debt" data-id="${s.id}">Debt</button><button class="btn ghost" data-act="barter" data-id="${s.id}">Barter</button><button class="btn ghost" data-act="editstore" data-id="${s.id}">Edit</button></div></article>`;
}
function cards() {
  const q = search.toLowerCase();
  const l = db.stores.filter(s => (s.name + s.owner + s.loc).toLowerCase().includes(q)).sort((a, b) => b.debt - a.debt);
  return l.length ? l.map(card).join('') : `<p class="empty">No markets found.</p>`;
}
function vMarkets() {
  const tot = db.stores.reduce((a, s) => a + Math.max(0, s.debt), 0);
  return `<div class="tile hero"><small>Total debt owed to you (${db.stores.length} markets)</small><b class="bad">${m(tot)}</b></div>
  <button class="btn big" data-act="addstore">+ Add market</button>
  <input id="q" type="search" placeholder="Search name, owner, location" value="${esc(search)}"><div id="list" style="display:grid;gap:14px">${cards()}</div>`;
}
function vStock() {
  return `<form id="stockform">${CATS.map(([k, n]) => `<div class="card" style="margin-bottom:14px"><div class="top"><h3>${n}</h3><div class="debt">${crates(db.stock[k])}<small>${db.stock[k]} pcs</small></div></div>
  <div class="two"><label>Price / fleyka<input name="p${k}" type="number" inputmode="numeric" min="0" value="${db.prices[k]}"></label><label>Add fleykas<input name="a${k}" type="number" step="any" placeholder="0"></label></div></div>`).join('')}
  <button class="btn big">Save prices & stock</button></form><p class="hint">1 fleyka = 30 eggs. Add new crates when you restock; enter a negative number to correct a miscount.</p>`;
}
function vReports() {
  const d = today(), T = db.sales.filter(x => x.d === d && !x.b), B = db.sales.filter(x => x.d === d && x.b);
  const s = f => T.reduce((a, x) => a + f(x), 0);
  const rev = s(x => x.cost), cash = s(x => x.paid), bart = B.reduce((a, x) => a + x.val, 0);
  const debt = db.stores.reduce((a, x) => a + Math.max(0, x.debt), 0);
  const tm = x => new Date(x.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const top = db.stores.filter(x => x.debt > 0).sort((a, b) => b.debt - a.debt).slice(0, 5);
  return `<div class="tiles"><div class="tile hero"><small>Sales today (${T.length} orders)</small><b>${m(rev)}</b></div>
  <div class="tile"><small>Cash collected</small><b class="ok">${m(cash)}</b></div><div class="tile"><small>New debt today</small><b class="bad">${m(rev - cash)}</b></div>
  <div class="tile"><small>Barter received</small><b>${m(bart)}</b></div><div class="tile"><small>All outstanding debt</small><b class="bad">${m(debt)}</b></div></div>
  <div class="card"><h3>Sold today</h3>${CATS.map(([k, n]) => `<div class="line"><span>${n}</span><span>${s(x => x.q[k])} fl = ${s(x => x.q[k]) * PC} pcs</span></div>`).join('')}</div>
  <div class="card"><h3>Stock left</h3>${CATS.map(([k, n]) => `<div class="line"><span>${n}</span><span>${crates(db.stock[k])} (${db.stock[k]} pcs)</span></div>`).join('')}</div>
  <div class="card"><h3>Today's activity</h3>${[...T, ...B].sort((a, b) => b.t - a.t).map(x => `<div class="line"><span>${esc(x.sn)}<small>${tm(x)}${x.b ? ', barter: ' + esc(x.b) : `, paid ${m(x.paid)}`}</small></span><b>${x.b ? '− ' + m(x.val) : m(x.cost)}</b></div>`).join('') || '<p class="hint">No activity yet.</p>'}</div>
  <div class="card"><h3>Biggest debts</h3>${top.map(x => `<div class="line"><span>${esc(x.name)}</span><b class="bad">${m(x.debt)}</b></div>`).join('') || '<p class="hint">Nobody owes you anything.</p>'}</div>
  <div class="acts"><button class="btn ghost" data-act="backup">Export backup</button><button class="btn danger" data-act="reset">Erase all data</button></div>`;
}
const V = { orders: vOrders, markets: vMarkets, stock: vStock, reports: vReports };
const TITLES = { orders: 'New order', markets: 'Markets', stock: 'Stock & prices', reports: 'Reports' };
function render() {
  $('#title').textContent = TITLES[view];
  $('#app').innerHTML = V[view]();
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.v === view));
}

/* ---------- actions ---------- */
const storeFields = (s = {}) => field('Market name', 'name', s.name, 'text', 'required') + field('Owner', 'owner', s.owner) + field('Phone', 'phone', s.phone, 'tel', 'inputmode="tel" placeholder="+998 90 123 45 67"') + field('Location', 'loc', s.loc);
const pick = fd => ({ name: fd.get('name').trim(), owner: fd.get('owner').trim(), phone: fd.get('phone').trim(), loc: fd.get('loc').trim() });
const step = (k, n) => { draft.q[k] = Math.max(0, draft.q[k] + n); navigator.vibrate?.(8); render(); };
const A = {
  inc: d => step(d.k, 1),
  dec: d => step(d.k, -1),
  payfull() { const s = getStore(draft.store); draft.paid = String(Math.max(0, orderCost() + (s ? s.debt : 0))); render(); },
  saveorder() {
    const s = getStore(draft.store); if (!s) return toast('Select a market first');
    const cost = orderCost(); if (!cost) return toast('Add at least 1 fleyka');
    for (const [k, n] of CATS) if (draft.q[k] * PC > db.stock[k]) return toast(`Not enough ${n}: only ${crates(db.stock[k])} left`);
    const paid = +draft.paid || 0;
    CATS.forEach(([k]) => db.stock[k] -= draft.q[k] * PC);
    s.debt += cost - paid;
    db.sales.unshift({ id: uid(), d: today(), t: Date.now(), sid: s.id, sn: s.name, q: { ...draft.q }, cost, paid, debt: s.debt });
    draft = blank(); save(); render(); toast('Order saved');
  },
  addstore() {
    modal('New market', storeFields() + field("Starting debt (so'm)", 'debt', '', 'number', 'inputmode="numeric"'), fd => {
      db.stores.push({ id: uid(), ...pick(fd), debt: +fd.get('debt') || 0 }); save(); closeModal(); render(); toast('Market added');
    });
  },
  editstore(d) {
    const s = getStore(d.id);
    modal('Edit market', storeFields(s) + `<button type="button" class="btn danger" data-act="delstore" data-id="${s.id}">Delete market</button>`, fd => {
      Object.assign(s, pick(fd)); save(); closeModal(); render(); toast('Market updated');
    });
  },
  delstore(d) {
    const s = getStore(d.id);
    if (!confirm(`Delete ${s.name}? Its debt record will be lost.`)) return;
    db.stores = db.stores.filter(x => x.id !== d.id); if (draft.store === d.id) draft.store = '';
    save(); closeModal(); render(); toast('Market deleted');
  },
  debt(d) {
    const s = getStore(d.id);
    modal(`${esc(s.name)}: edit debt`, field("Debt (so'm)", 'debt', s.debt, 'number', 'inputmode="numeric" required') + `<button type="button" class="btn ghost" data-act="cleardebt" data-id="${s.id}">Clear debt</button>`, fd => {
      s.debt = +fd.get('debt') || 0; save(); closeModal(); render(); toast('Debt updated');
    });
  },
  cleardebt(d) { getStore(d.id).debt = 0; save(); closeModal(); render(); toast('Debt cleared'); },
  barter(d) {
    const s = getStore(d.id);
    modal(`${esc(s.name)}: barter`, `<p class="hint">Current debt: ${m(s.debt)} so'm. The value below is subtracted from it.</p>` + field('Goods received (flour, oil…)', 'item', '', 'text', 'required') + field("Value (so'm)", 'val', '', 'number', 'inputmode="numeric" min="1" required'), fd => {
      const val = +fd.get('val'); s.debt -= val;
      db.sales.unshift({ id: uid(), d: today(), t: Date.now(), sid: s.id, sn: s.name, b: fd.get('item').trim(), val, cost: 0, paid: 0, debt: s.debt });
      save(); closeModal(); render(); toast('Barter recorded');
    });
  },
  close: closeModal,
  backup() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' }));
    a.download = `fleyka-backup-${today()}.json`; a.click();
  },
  reset() { if (confirm('Erase ALL markets, stock and sales on this device?')) { localStorage.removeItem(KEY); db = load(); draft = blank(); render(); toast('All data erased'); } }
};

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act],[data-v]'); if (!b) return;
  if (b.dataset.v) { view = b.dataset.v; render(); scrollTo(0, 0); return; }
  A[b.dataset.act]?.(b.dataset);
});
document.addEventListener('change', e => { if (e.target.id === 'store') { draft.store = e.target.value; render(); } });
document.addEventListener('input', e => {
  if (e.target.id === 'paid') { draft.paid = e.target.value; $('#sum').innerHTML = sum(); }
  if (e.target.id === 'q') { search = e.target.value; $('#list').innerHTML = cards(); }
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'stockform') return;
  e.preventDefault(); const fd = new FormData(e.target);
  CATS.forEach(([k]) => {
    db.prices[k] = Math.max(0, +fd.get('p' + k) || 0);
    db.stock[k] = Math.max(0, db.stock[k] + Math.round((+fd.get('a' + k) || 0) * PC));
  });
  save(); render(); toast('Stock & prices saved');
});
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

$('#date').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
render();
