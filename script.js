const K="tuxum-ferma-v1",$=s=>document.querySelector(s),uid=()=>Math.random().toString(36).slice(2,9);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const money=n=>Math.round(n).toLocaleString("ru-RU")+" so‘m",num=n=>Math.round(n).toLocaleString("ru-RU");
const today=()=>new Date().toISOString().slice(0,10),dm=d=>d.slice(8)+"."+d.slice(5,7);
function load(){try{const r=localStorage.getItem(K);if(r)return JSON.parse(r)}catch(e){}
return{pin:"1234",custom:false,products:[{id:uid(),name:"Oliy nav",price:1300,stock:0,min:300},{id:uid(),name:"1-nav",price:1100,stock:0,min:300},{id:uid(),name:"2-nav",price:900,stock:0,min:200}],shops:[],sales:[],pays:[],exp:[],harv:[]}}
let S=load(),view="dash",authed=false;
try{authed=sessionStorage.getItem("tf-auth")==="1"}catch(e){}
const save=()=>{try{localStorage.setItem(K,JSON.stringify(S))}catch(e){toast("Ma’lumotni saqlab bo‘lmadi")}};
const toast=m=>{const t=$("#toast");t.textContent=m;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,2600)};
const P=id=>S.products.find(p=>p.id===id),pn=id=>P(id)?.name||"(o‘chirilgan)",sn=id=>(S.shops.find(s=>s.id===id)||{}).name||"(o‘chirilgan)";
const sum=(a,f)=>a.reduce((x,y)=>x+f(y),0);
const debt=id=>sum(S.sales.filter(s=>s.shop===id),s=>s.total-s.paid)-sum(S.pays.filter(p=>p.shop===id),p=>p.amount);
const tray=n=>Math.floor(n/30)+" tabaqcha"+(n%30?" + "+n%30+" dona":"");

/* kirish */
function gate(){$("#login").hidden=authed;$("#app").hidden=!authed;$("#hint").textContent=S.custom?"":"Dastlabki PIN: 1234. Kirgach uni o‘zgartiring.";if(authed)render();else $("#pin").focus()}
function tryLogin(){if($("#pin").value===S.pin){authed=true;try{sessionStorage.setItem("tf-auth","1")}catch(e){}$("#pin").value="";$("#err").textContent="";gate()}else{$("#err").textContent="PIN noto‘g‘ri. Qayta urinib ko‘ring.";$("#pin").select()}}
$("#go").onclick=tryLogin;$("#pin").onkeydown=e=>{if(e.key==="Enter")tryLogin()};

/* dialog */
function openForm(title,fields,ok,label){
const d=$("#dlg");
d.innerHTML=`<form><h3>${title}</h3>${fields.map(f=>`<label>${f.l}${f.t==="select"?`<select name="${f.k}">${f.o.map(o=>`<option value="${o[0]}"${o[0]===f.v?" selected":""}>${esc(o[1])}</option>`).join("")}</select>`:`<input name="${f.k}" type="${f.t||"text"}" value="${esc(f.v??"")}" ${f.t==="number"?'min="0" step="any"':""} ${f.r===false?"":"required"}${f.t==="password"?' inputmode="numeric"':""}>`}</label>`).join("")}<div class="row"><button type="button" class="ghost" id="cx">Bekor qilish</button><button class="pri">${label||"Saqlash"}</button></div></form>`;
const f=d.querySelector("form");
fields.forEach(x=>x.ch&&f.elements[x.k].addEventListener("change",()=>x.ch(f)));
$("#cx").onclick=()=>d.close();
f.onsubmit=e=>{e.preventDefault();const v=Object.fromEntries(new FormData(f));if(ok(v)===false)return;save();d.close();render()};
d.showModal();const i=f.querySelector("input,select");i&&i.focus()}
const sure=(t,fn)=>openForm(t,[],()=>{fn()},"O‘chirish");
const pOpts=()=>S.products.map(p=>[p.id,p.name+" ("+num(p.stock)+" dona)"]),shOpts=()=>S.shops.map(s=>[s.id,s.name]);

/* amallar */
const A={
nav:id=>{view=id;render();scrollTo(0,0)},
out:()=>{authed=false;try{sessionStorage.removeItem("tf-auth")}catch(e){}gate()},
chpin:()=>openForm("PIN kodni o‘zgartirish",[{k:"old",l:"Joriy PIN",t:"password"},{k:"n",l:"Yangi PIN (kamida 4 raqam)",t:"password"}],v=>{if(v.old!==S.pin){toast("Joriy PIN noto‘g‘ri");return false}if(!/^\d{4,12}$/.test(v.n)){toast("PIN 4–12 ta raqamdan iborat bo‘lsin");return false}S.pin=v.n;S.custom=true;toast("PIN o‘zgartirildi")}),
harv:()=>S.products.length?openForm("Kunlik yig‘im",[{k:"p",l:"Mahsulot",t:"select",o:pOpts()},{k:"q",l:"Yig‘ilgan tuxum (dona)",t:"number"},{k:"b",l:"Singan yoki yaroqsiz (dona)",t:"number",v:0}],v=>{const q=+v.q,b=+v.b;if(b>q){toast("Singan soni yig‘imdan ko‘p bo‘lmasin");return false}P(v.p).stock+=q-b;S.harv.push({id:uid(),date:today(),product:v.p,qty:q-b,broken:b});toast("Yig‘im qo‘shildi")},"Qo‘shish"):toast("Avval mahsulot qo‘shing"),
prod:id=>{const p=id&&P(id);openForm(p?"Mahsulotni tahrirlash":"Yangi mahsulot",[{k:"name",l:"Nomi (masalan, Oliy nav)",v:p?.name},{k:"price",l:"Narxi (so‘m / dona)",t:"number",v:p?.price},{k:"min",l:"Kam qoldiq chegarasi (dona)",t:"number",v:p?.min??200}],v=>{if(p){Object.assign(p,{name:v.name,price:+v.price,min:+v.min})}else S.products.push({id:uid(),name:v.name,price:+v.price,min:+v.min,stock:0})})},
dprod:id=>sure("“"+esc(pn(id))+"” mahsuloti o‘chirilsinmi?",()=>{S.products=S.products.filter(p=>p.id!==id);save();render()}),
sale:()=>{if(!S.shops.length)return toast("Avval do‘kon qo‘shing");if(!S.products.length)return toast("Avval mahsulot qo‘shing");
const first=S.products[0];openForm("Yangi sotuv",[{k:"shop",l:"Do‘kon",t:"select",o:shOpts()},{k:"p",l:"Mahsulot",t:"select",o:pOpts(),ch:f=>f.elements.price.value=P(f.elements.p.value).price},{k:"q",l:"Soni (dona)",t:"number"},{k:"price",l:"Narxi (so‘m / dona)",t:"number",v:first.price},{k:"paid",l:"Hozir to‘langan summa (so‘m)",t:"number",v:0}],v=>{const p=P(v.p),q=+v.q,total=q*(+v.price);if(q>p.stock){toast("Omborda faqat "+num(p.stock)+" dona bor");return false}p.stock-=q;S.sales.push({id:uid(),date:today(),shop:v.shop,product:v.p,qty:q,total,paid:Math.min(+v.paid,total)});toast("Sotuv qayd etildi")},"Sotuvni saqlash")},
dsale:id=>sure("Sotuv bekor qilinsinmi? Tuxum omborga qaytariladi.",()=>{const s=S.sales.find(x=>x.id===id);if(P(s.product))P(s.product).stock+=s.qty;S.sales=S.sales.filter(x=>x.id!==id);save();render()}),
shop:()=>openForm("Yangi do‘kon",[{k:"name",l:"Do‘kon nomi"},{k:"phone",l:"Telefon",r:false}],v=>{S.shops.push({id:uid(),name:v.name,phone:v.phone})}),
dshop:id=>sure("“"+esc(sn(id))+"” do‘koni o‘chirilsinmi? Sotuv tarixi saqlanadi.",()=>{S.shops=S.shops.filter(s=>s.id!==id);save();render()}),
pay:id=>{if(!S.shops.length)return toast("Avval do‘kon qo‘shing");openForm("To‘lov qabul qilish",[{k:"shop",l:"Do‘kon",t:"select",o:shOpts(),v:id},{k:"amount",l:"Summa (so‘m)",t:"number"}],v=>{S.pays.push({id:uid(),date:today(),shop:v.shop,amount:+v.amount});toast("To‘lov qabul qilindi")},"Qabul qilish")},
dpay:id=>sure("To‘lov o‘chirilsinmi?",()=>{S.pays=S.pays.filter(x=>x.id!==id);save();render()}),
exp:()=>openForm("Yangi xarajat",[{k:"cat",l:"Turi",t:"select",o:["Yem","Ish haqi","Veterinariya","Kommunal","Transport","Boshqa"].map(x=>[x,x])},{k:"note",l:"Izoh",r:false},{k:"amount",l:"Summa (so‘m)",t:"number"}],v=>{S.exp.push({id:uid(),date:today(),cat:v.cat,note:v.note,amount:+v.amount});toast("Xarajat qo‘shildi")}),
dexp:id=>sure("Xarajat o‘chirilsinmi?",()=>{S.exp=S.exp.filter(x=>x.id!==id);save();render()})};
document.addEventListener("click",e=>{const b=e.target.closest("[data-a]");if(b){const f=A[b.dataset.a];f&&f(b.dataset.id)}});

/* ko‘rinishlar */
const TABS=[["dash","Boshqaruv"],["prod","Mahsulotlar"],["sales","Sotuv"],["shops","Do‘konlar"],["cash","Kassa"],["rep","Hisobot"]];
const tbl=(h,rows,empty)=>rows.length?`<div class="wrap"><table><thead><tr>${h.map(x=>`<th class="${x[0]==="#"?"n":""}">${x.replace("#","")}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`:`<div class="empty">${empty}</div>`;
const btn=(a,t,id,c)=>`<button class="sm ${c||""}" data-a="${a}"${id?` data-id="${id}"`:""}>${t}</button>`;
const head=(t,acts)=>`<div class="top"><h2>${t}</h2><div class="acts">${acts||""}</div></div>`;
const mon=()=>today().slice(0,7);
const V={
dash(){const tot=sum(S.products,p=>p.stock),ht=sum(S.harv.filter(h=>h.date===today()),h=>h.qty),ms=sum(S.sales.filter(s=>s.date.startsWith(mon())),s=>s.total),td=sum(S.shops,s=>Math.max(0,debt(s.id)));
const days=[...Array(7)].map((_,i)=>{const d=new Date(Date.now()-(6-i)*864e5).toISOString().slice(0,10);return[d,sum(S.harv.filter(h=>h.date===d),h=>h.qty)]}),mx=Math.max(1,...days.map(d=>d[1]));
const rec=S.sales.slice(-5).reverse();
return head("Boshqaruv paneli",btn("harv","Yig‘im kiritish","","pri")+btn("sale","Yangi sotuv"))+
`<div class="stats"><div class="st big"><small>Omborda jami</small><strong>${num(tot)} dona</strong><small>${tray(tot)}</small></div><div class="st"><small>Bugungi yig‘im</small><strong>${num(ht)}</strong></div><div class="st"><small>Shu oy sotuvi</small><strong>${money(ms)}</strong></div><div class="st"><small>Do‘konlar qarzi</small><strong class="${td?"neg":""}">${money(td)}</strong></div></div>
<div class="grid2"><div class="card"><h3>Ombor qoldig‘i</h3>${S.products.length?S.products.map(p=>{const m=Math.max(p.min*3,p.stock,1);return`<div class="pr"><div><span>${esc(p.name)} ${p.stock<=p.min?'<span class="tag low">kam qoldi</span>':""}</span><b>${num(p.stock)} dona</b></div><div class="bar"><i style="width:${p.stock/m*100}%"></i></div></div>`}).join(""):'<div class="empty">Mahsulot yo‘q</div>'}</div>
<div class="card"><h3>So‘nggi 7 kunlik yig‘im</h3><div class="days">${days.map(d=>`<div><i style="height:${d[1]/mx*80}px"></i>${dm(d[0])}</div>`).join("")}</div></div></div>
<div class="card"><h3>So‘nggi sotuvlar</h3>${tbl(["Sana","Do‘kon","Mahsulot","#Summa"],rec.map(s=>`<tr><td>${dm(s.date)}</td><td>${esc(sn(s.shop))}</td><td>${esc(pn(s.product))} × ${num(s.qty)}</td><td class="n">${money(s.total)}</td></tr>`),"Hali sotuv yo‘q. Birinchi sotuvni qayd eting.")}</div>`},
prod(){return head("Mahsulotlar va ombor",btn("harv","Yig‘im kiritish","","pri")+btn("prod","Mahsulot qo‘shish"))+`<div class="card">${tbl(["Mahsulot","#Narxi","#Zaxira","Holat",""],S.products.map(p=>`<tr><td>${esc(p.name)}</td><td class="n">${money(p.price)}</td><td class="n">${num(p.stock)} dona<br><small style="color:var(--mute)">${tray(p.stock)}</small></td><td>${p.stock<=p.min?'<span class="tag low">Kam qoldi</span>':'<span class="tag ok">Yetarli</span>'}</td><td class="n">${btn("prod","Tahrirlash",p.id)} ${btn("dprod","O‘chirish",p.id,"dng")}</td></tr>`),"Mahsulot qo‘shing.")}</div>
<div class="card"><h3>So‘nggi yig‘imlar</h3>${tbl(["Sana","Mahsulot","#Qo‘shildi","#Singan"],S.harv.slice(-8).reverse().map(h=>`<tr><td>${dm(h.date)}</td><td>${esc(pn(h.product))}</td><td class="n">${num(h.qty)}</td><td class="n">${num(h.broken)}</td></tr>`),"Yig‘im hali kiritilmagan.")}</div>`},
sales(){return head("Sotuvlar",btn("sale","Yangi sotuv","","pri"))+`<div class="card">${tbl(["Sana","Do‘kon","Mahsulot","#Soni","#Summa","#To‘langan","#Qarz",""],S.sales.slice().reverse().map(s=>`<tr><td>${dm(s.date)}</td><td>${esc(sn(s.shop))}</td><td>${esc(pn(s.product))}</td><td class="n">${num(s.qty)}</td><td class="n">${money(s.total)}</td><td class="n">${money(s.paid)}</td><td class="n ${s.total>s.paid?"neg":""}">${money(s.total-s.paid)}</td><td class="n">${btn("dsale","Bekor qilish",s.id,"dng")}</td></tr>`),"Sotuv yo‘q. Do‘kon qo‘shib, birinchi sotuvni kiriting.")}</div>`},
shops(){return head("Do‘konlar",btn("shop","Do‘kon qo‘shish","","pri"))+`<div class="card">${tbl(["Do‘kon","Telefon","#Jami sotuv","#Qarz",""],S.shops.map(s=>{const d=debt(s.id);return`<tr><td>${esc(s.name)}</td><td>${esc(s.phone||"—")}</td><td class="n">${money(sum(S.sales.filter(x=>x.shop===s.id),x=>x.total))}</td><td class="n ${d>0?"neg":"pos"}">${money(d)}</td><td class="n">${btn("pay","To‘lov qabul qilish",s.id)} ${btn("dshop","O‘chirish",s.id,"dng")}</td></tr>`}),"Do‘kon qo‘shing: nom va telefon yetarli.")}</div>`},
cash(){return head("Kassa: to‘lovlar va xarajatlar",btn("pay","To‘lov qabul qilish","","pri")+btn("exp","Xarajat qo‘shish"))+`<div class="card"><h3>Do‘konlardan to‘lovlar</h3>${tbl(["Sana","Do‘kon","#Summa",""],S.pays.slice().reverse().map(p=>`<tr><td>${dm(p.date)}</td><td>${esc(sn(p.shop))}</td><td class="n pos">${money(p.amount)}</td><td class="n">${btn("dpay","O‘chirish",p.id,"dng")}</td></tr>`),"Qarz to‘lovlari shu yerda ko‘rinadi.")}</div><div class="card"><h3>Xarajatlar</h3>${tbl(["Sana","Turi","Izoh","#Summa",""],S.exp.slice().reverse().map(x=>`<tr><td>${dm(x.date)}</td><td>${esc(x.cat)}</td><td>${esc(x.note||"—")}</td><td class="n neg">${money(x.amount)}</td><td class="n">${btn("dexp","O‘chirish",x.id,"dng")}</td></tr>`),"Xarajat kiritilmagan.")}</div>`},
rep(){const m=view.m||mon(),inM=d=>d.startsWith(m),rev=sum(S.sales.filter(s=>inM(s.date)),s=>s.total),cash=sum(S.sales.filter(s=>inM(s.date)),s=>s.paid)+sum(S.pays.filter(p=>inM(p.date)),p=>p.amount),ex=sum(S.exp.filter(x=>inM(x.date)),x=>x.amount),hv=sum(S.harv.filter(h=>inM(h.date)),h=>h.qty),sold=sum(S.sales.filter(s=>inM(s.date)),s=>s.qty);
const byCat={};S.exp.filter(x=>inM(x.date)).forEach(x=>byCat[x.cat]=(byCat[x.cat]||0)+x.amount);
return head("Oylik hisobot",`<input type="month" id="mp" value="${m}" aria-label="Oy" style="padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--sf)"><button class="sm" onclick="print()">Chop etish</button>`)+
`<div class="stats"><div class="st big"><small>Sof foyda (sotuv − xarajat)</small><strong>${money(rev-ex)}</strong></div><div class="st"><small>Sotuv summasi</small><strong>${money(rev)}</strong></div><div class="st"><small>Kassaga tushgan</small><strong>${money(cash)}</strong></div><div class="st"><small>Xarajat</small><strong>${money(ex)}</strong></div></div>
<div class="grid2"><div class="card"><h3>Ishlab chiqarish</h3><p>Yig‘ilgan: <b>${num(hv)}</b> dona. Sotilgan: <b>${num(sold)}</b> dona.</p><h3 style="margin-top:16px">Xarajatlar turi bo‘yicha</h3>${tbl(["Turi","#Summa"],Object.entries(byCat).map(([k,v])=>`<tr><td>${esc(k)}</td><td class="n">${money(v)}</td></tr>`),"Bu oy xarajat yo‘q.")}</div>
<div class="card"><h3>Do‘konlar qarzi (hozirgi)</h3>${tbl(["Do‘kon","#Qarz"],S.shops.filter(s=>debt(s.id)!==0).map(s=>`<tr><td>${esc(s.name)}</td><td class="n neg">${money(debt(s.id))}</td></tr>`),"Qarzdor do‘kon yo‘q.")}</div></div>`}};
function render(){if(!authed)return;
$("#nav").innerHTML=TABS.map(t=>`<button data-a="nav" data-id="${t[0]}"${(view.m!==undefined?"rep":view)===t[0]?' aria-current="page"':""}>${t[1]}</button>`).join("");
const k=view.m!==undefined?"rep":view;$("#main").innerHTML=V[k]()+(k==="dash"?'<div class="mfoot"><button class="sm" data-a="chpin">PIN o‘zgartirish</button><button class="sm" data-a="out">Chiqish</button></div>':"");
const mp=$("#mp");if(mp)mp.onchange=()=>{view={m:mp.value||mon()};render()}}
gate();
