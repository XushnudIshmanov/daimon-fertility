// ══════════════════════════════════════════════════
//  DAIMON FERTILITY — APP.JS v2.0 (Server Sync)
// ══════════════════════════════════════════════════

const API_URL = ""; // Yagona server bazasi

let appState = {
    currentUser: null,
    transactions: []
};

// Sahifa yuklanganda ishga tushadi
document.addEventListener("DOMContentLoaded", () => {
    // Bugungi sanani avtomatik qo'yish
    const bugun = new Date().toISOString().split('T')[0];
    if(document.getElementById("dc-date")) document.getElementById("dc-date").value = bugun;
    if(document.getElementById("db-date")) document.getElementById("db-date").value = bugun;
    if(document.getElementById("h-from")) document.getElementById("h-from").value = bugun;
    if(document.getElementById("h-to")) document.getElementById("h-to").value = bugun;

    // Seansni tekshirish
    const savedUser = localStorage.getItem("daimon_user");
    if (savedUser) {
        appState.currentUser = JSON.parse(savedUser);
        loadDashboardData();
    }
});

// 1. TIZIMGA KIRISH (LOGIN) - YANGILANGAN VA TOZALANGAN VARIANTI
async function doLogin() {
    const loginInp = document.getElementById("inp-login").value.trim();
    const passInp = document.getElementById("inp-pass").value.trim();
    const errDiv = document.getElementById("login-err");

    errDiv.style.display = "none";

    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: loginInp, password: passInp })
        });
        const res = await response.json();

        if (response.ok && res.success) {
            // 1. Foydalanuvchi ma'lumotlarini saqlaymiz
            appState.currentUser = res.user;
            localStorage.setItem("daimon_user", JSON.stringify(res.user));
            
            // 2. Dashboard ma'lumotlarini yuklaymiz
            loadDashboardData();

            // 3. 🌟 ESKI FAOL PANELLARNI TOZALASH (Kompyuter keshidagi muammoni yo'qotadi)
            document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
            document.querySelectorAll(".sb-btn").forEach(b => b.classList.remove("active"));

            // 4. 🌟 Srazu Kunlik Kredit (dc) panelini ochish va sarlavhani to'g'rilash
            if (typeof openPanel === "function") {
    openPanel('dashboard');
}
        } else {
            errDiv.style.display = "block";
        }
    } catch (e) {
        errDiv.innerText = "⚠️ Server bilan aloqa yo'q!";
        errDiv.style.display = "block";
    }
}

// TIZIMDAN CHIQISH
function doLogout() {
    localStorage.removeItem("daimon_user");
    appState.currentUser = null;

    // 🌟 Chiqib ketayotganda panellarni va tugmalarni faollikdan butunlay o'chiramiz
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".sb-btn").forEach(b => b.classList.remove("active"));

    // Ekranlarni almashtirish
    document.getElementById("s-main").classList.remove("active");
    document.getElementById("s-login").classList.add("active");

    if (typeof showToast === "function") {
        showToast("Tizimdan chiqdingiz!", "blue");
    }
}

// SERVERDAN MA'LUMOTLARNI OLISH VA INTERFEYSNI YANGILASH
async function loadDashboardData() {
    try {
        const response = await fetch(`${API_URL}/api/data`);
        const data = await response.json();
        appState.transactions = data.transactions || [];

        // Ekranni almashtirish
        document.getElementById("s-login").classList.remove("active");
        document.getElementById("s-main").classList.add("active");

        // Profillarni to'ldirish
        updateUserUI();
        // Dashboard hisob-kitoblari
        renderDashboard();
    } catch (e) {
        showToast("Ma'lumot yuklashda xatolik!", "red");
    }
}

function updateUserUI() {
    const user = appState.currentUser;
    if (!user) return;

    // Ismlar
    document.getElementById("sb-uname").innerText = user.name;
    document.getElementById("tb-name").innerText = user.name;
    document.getElementById("sb-avatar").innerText = user.name[0].toUpperCase();
    document.getElementById("tb-avatar").innerText = user.name[0].toUpperCase();

    // Rollar (🌟 "Bosh Direktor" so'zi "CEO" ga almashtirildi)
    const roleText = user.role === "ceo" ? "CEO" : "Menejer";
    document.getElementById("sb-urole").innerText = roleText;
    
    const badge = document.getElementById("role-badge");
    badge.innerText = user.role.toUpperCase();
    badge.className = `role-badge ${user.role}-badge-tb`;

    // CEO maxsus ko'rinishlari
    if (user.role === "ceo") {
        document.getElementById("ceo-nav-label").style.display = "block";
        document.querySelectorAll(".ceo-only").forEach(el => el.style.display = "flex");
        document.getElementById("ceo-quick").style.display = "block";
    } else {
        document.getElementById("ceo-nav-label").style.display = "none";
        document.querySelectorAll(".ceo-only").forEach(el => el.style.display = "none");
        document.getElementById("ceo-quick").style.display = "none";
    }
}

// DASHBOARD EKOSISTEMASI (XAVFSIZ VA INTEGRATSIYALASHGAN VARIANTI)
function renderDashboard() {
    try {
        let naqdBalans = 0, kartaBalans = 0, soliqZaxira = 0;
        let buOyKredit = 0, buOyDebet = 0, jamiQarz = 0;
        
        const bugun = new Date();
        const joriyOy = bugun.toISOString().substring(0, 7); // YYYY-MM

        appState.transactions.forEach(tx => {
            const txOy = tx.date.substring(0, 7);
            const jamiSumma = parseFloat(tx.amount) || 0;

            if (tx.type === "credit") {
                let txCash = 0, txCard = 0, txTax = 0;
                
                const cashMatch = tx.reason ? tx.reason.match(/Naqd:\s*([\d.]+)/) : null;
                const cardMatch = tx.reason ? tx.reason.match(/Karta:\s*([\d.]+)/) : null;
                const taxMatch = tx.reason ? tx.reason.match(/Soliq:\s*([\d.]+)/) : null;
                
                if (cashMatch) txCash = parseFloat(cashMatch[1]) || 0;
                if (cardMatch) txCard = parseFloat(cardMatch[1]) || 0;
                if (taxMatch) txTax = parseFloat(taxMatch[1]) || 0;
                
                if (txCash === 0 && txCard === 0 && txTax === 0) txCash = jamiSumma;

                naqdBalans += txCash;
                kartaBalans += txCard;
                soliqZaxira += txTax;

                if (txOy === joriyOy) {
                    buOyKredit += txCash; // Dashboardda faqat naqd qismi bu oyning tushumi bo'lib ko'rinadi
                }

            } else if (tx.type === "debit") {
                if (txOy === joriyOy) buOyDebet += jamiSumma;

                if (tx.source === "card") {
                    kartaBalans -= jamiSumma;
                } else if (tx.source === "tax") {
                    soliqZaxira -= jamiSumma;
                } else {
                    naqdBalans -= jamiSumma;
                }

            } else if (tx.type === "debt") {
                jamiQarz += jamiSumma; 
            }
        });

        // 🌟 XAVFSIZLIK: Elementlar HTMLda bor-yo'qligini tekshirib keyin qiymat beradi (Dastur qotmaydi)
        if(document.getElementById("st-bal")) document.getElementById("st-bal").innerText = formatMoney(naqdBalans);
        if(document.getElementById("st-crd")) document.getElementById("st-crd").innerText = formatMoney(buOyKredit);
        if(document.getElementById("st-dbt")) document.getElementById("st-dbt").innerText = formatMoney(buOyDebet);
        if(document.getElementById("st-debt")) document.getElementById("st-debt").innerText = formatMoney(jamiQarz);

        // Qo'shimcha vitrinalar (Agar HTMLga qo'shgan bo'lsangiz yangilanadi)
        if(document.getElementById("st-cash")) document.getElementById("st-cash").innerText = formatMoney(naqdBalans);
        if(document.getElementById("st-card")) document.getElementById("st-card").innerText = formatMoney(kartaBalans);
        if(document.getElementById("st-tax-reserve")) document.getElementById("st-tax-reserve").innerText = formatMoney(soliqZaxira);

        if(document.getElementById("bal-trend")) {
            document.getElementById("bal-trend").innerText = naqdBalans >= 0 ? "↑" : "↓";
        }
        
        renderRecentList();

    } catch (error) {
        console.error("Dashboard chizishda xatolik:", error);
        showToast("Ma'lumot yuklashda xatolik yuz berdi!", "red");
    }
}

function renderRecentList() {
    const list = document.getElementById("recent-list");
    if (!list) return; 
    
    list.innerHTML = "";

    // O'zgaruvchi nomidagi tutuq belgisi olib tashlandi: songgilar
    const songgilar = [...appState.transactions]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    if (songgilar.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="es-icon">📭</div><div>Hozircha amallar yo\'q</div></div>';
        return;
    }

    songgilar.forEach(tx => {
        let emoji = "➕";
        let color = "var(--green)";
        let sign = "+";
        
        if (tx.type === "debit") { 
            emoji = "➖"; 
            color = "var(--red)"; 
            sign = "-"; 
        }
        if (tx.type === "debt") { 
            emoji = "📋"; 
            color = "var(--amber)"; 
            sign = ""; 
        }

        const html = `
            <div class="ri-item">
                <div class="ri-dot" style="background:#f0f0f0; color:${color}">${emoji}</div>
                <div class="ri-info">
                    <div class="ri-label">${tx.reason || (tx.type === "credit" ? "Kunlik Tushum" : "Izohsiz")}</div>
                    <div class="ri-date">${tx.date} • kiritdi: ${tx.author || 'Tizim'}</div>
                </div>
                <div class="ri-amount" style="color:${color}">${sign}${formatMoney(tx.amount)}</div>
            </div>
        `;
        list.insertAdjacentHTML("beforeend", html);
    });
}

// 2. TRANZAKSIYALARNI SAQLASH (SERVERGA)
async function sendTransactionToServer(payload) {
    payload.author = appState.currentUser.name;
    try {
        const response = await fetch(`${API_URL}/api/transactions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const res = await response.json();
        if(response.ok && res.success) {
            showToast("Ma'lumot muvaffaqiyatli saqlandi! ✨", "green");
            await loadDashboardData(); // Ma'lumotlarni qayta tortib UI yangilaydi
            showDashboard(); // Dashboard paneliga qaytadi
        } else {
            showToast("Saqlashda xatolik: " + res.message, "red");
        }
    } catch (e) {
        showToast("Server xatosi!", "red");
    }
}

// KUNLIK KREDIT SAQLASH
function saveDC() {
    const jami = parseFloat(document.getElementById("dc-total").value) || 0;
    const karta = parseFloat(document.getElementById("dc-card").value) || 0;
    const naqd = parseFloat(document.getElementById("dc-cash").value) || 0;
    const soliq = parseFloat(document.getElementById("dc-taxcash").value) || 0;
    const sana = document.getElementById("dc-date").value;

    if (jami <= 0 || !sana) { showToast("Sana va Jami summani kiriting!", "amber"); return; }

    sendTransactionToServer({
        type: "credit",
        amount: jami,
        date: sana,
        reason: `Kunlik kredit (Naqd: ${naqd}, Karta: ${karta}, Soliq: ${soliq})`
    });
    clearForm('dc');
}

// DEBET SAQLASH
function saveDB() {
    const turMap = { "1": "Xarajatlar", "2": "Maosh", "3": "Lab Debit" };
    const turId = document.getElementById("db-type").value;
    const miqdor = parseFloat(document.getElementById("db-amount").value) || 0;
    const sabab = document.getElementById("db-reason").value.trim();
    const sana = document.getElementById("db-date").value;

    if (miqdor <= 0 || !sana) { showToast("Sana va Miqdorni kiriting!", "amber"); return; }

    sendTransactionToServer({
        type: "debit",
        amount: miqdor,
        date: sana,
        reason: `[${turMap[turId]}] ${sabab}`
    });
    clearForm('db');
}

// QARZ SAQLASH (YANGILANDI: QARZNI UZISH IMKONIYaTI BILAN)
function saveDT() {
    const miqdor = parseFloat(document.getElementById("dt-total").value) || 0;
    const sabab = document.getElementById("dt-reason").value.trim();
    const action = document.getElementById("dt-action") ? document.getElementById("dt-action").value : "plus"; // html elementdan qiymat oladi
    const bugun = new Date().toISOString().split('T')[0];

    if (miqdor <= 0) { showToast("Qarz miqdorini kiriting!", "amber"); return; }

    // Agar qarzni qaytarish bo'lsa, miqdor bazaga MANFIY (-) bo'lib boradi va jami qarzdan ayriladi!
    const yakuniyMiqdor = action === "minus" ? -miqdor : miqdor;
    const qarzTafsiloti = action === "minus" ? `Qarz uzildi: ${sabab}` : `Qarz: ${sabab}`;

    sendTransactionToServer({
        type: "debt",
        amount: yakuniyMiqdor,
        date: bugun,
        reason: qarzTafsiloti
    });
    clearForm('dt');
}

// 3. TARIX PANELINI FILTRLASH VA CHIZISH (MOLIYAVIY TO'G'RI VARIANTI)
function renderHistory() {
    const tur = document.getElementById("h-type").value;
    const dan = document.getElementById("h-from").value;
    const gacha = document.getElementById("h-to").value;
    const body = document.getElementById("hist-body");

    let filtrlandi = [...appState.transactions];

    if (tur !== "all") filtrlandi = filtrlandi.filter(t => t.type === tur);
    if (dan) filtrlandi = filtrlandi.filter(t => t.date >= dan);
    if (gacha) filtrlandi = filtrlandi.filter(t => t.date <= gacha);

    if(filtrlandi.length === 0) {
        body.innerHTML = `<div class="empty-state"><div class="es-icon">🔍</div><div>Mos yozuvlar topilmadi</div></div>`;
        return;
    }

    // 🌟 MANTIQIY TO'G'RILASH: Pullarni turlariga qarab (Naqd, Karta, Soliq) alohida hisoblaymiz!
    let jamiNaqdKredit = 0;
    let jamiKartaKredit = 0;
    let jamiSoliqKredit = 0;
    let jamiDebet = 0;
    let sofQarz = 0;

    let html = `
        <div class="htable-wrap">
            <table class="htable">
                <thead>
                    <tr>
                        <th>Sana</th>
                        <th>Tur</th>
                        <th>Tafsilot / Izoh</th>
                        <th>Kiritdi</th>
                        <th>Miqdor</th>
                    </tr>
                </thead>
                <tbody>
    `;

    filtrlandi.forEach(t => {
        let bCls = "badge-green", tNm = "Kredit";
        const summa = parseFloat(t.amount) || 0;

        if (t.type === "credit") {
            // Izoh ichidan Naqd, Karta va Soliq qiymatlarini regex (qidiruv) orqali ajratib olamiz
            const cashMatch = t.reason ? t.reason.match(/Naqd:\s*([\d.]+)/) : null;
            const cardMatch = t.reason ? t.reason.match(/Karta:\s*([\d.]+)/) : null;
            const taxMatch = t.reason ? t.reason.match(/Soliq:\s*([\d.]+)/) : null;
            
            // Alohida o'zgaruvchilarga qo'shib boramiz
            jamiNaqdKredit += cashMatch ? parseFloat(cashMatch[1]) : summa; 
            jamiKartaKredit += cardMatch ? parseFloat(cardMatch[1]) : 0;
            jamiSoliqKredit += taxMatch ? parseFloat(taxMatch[1]) : 0;

        } else if(t.type === "debit") { 
            bCls = "badge-red"; 
            tNm = "Debet"; 
            jamiDebet += summa;
        } else if(t.type === "debt") { 
            bCls = "badge-amber"; 
            tNm = "Qarz"; 
            sofQarz += summa; 
        }

        html += `
            <tr>
                <td>${t.date}</td>
                <td><span class="badge ${bCls}">${tNm}</span></td>
                <td><strong>${t.reason || '-'}</strong></td>
                <td>${t.author || 'Tizim'}</td>
                <td><strong style="color: ${summa < 0 ? 'var(--red)' : ''}">${formatMoney(summa)}</strong></td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
            
            <div class="hist-total-row" style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end; padding: 15px; background: #f8fafc; border-radius: 8px; margin-top: 10px; border: 1px solid #e2e8f0;">
                ${jamiNaqdKredit > 0 ? `<div><span class="hist-total-label">💵 Naqd Tushum:</span> <span class="hist-total-val" style="color:var(--green); font-weight:700;">+${formatMoney(jamiNaqdKredit)}</span></div>` : ''}
                ${jamiKartaKredit > 0 ? `<div><span class="hist-total-label">💳 Karta Tushum:</span> <span class="hist-total-val" style="color:#3b82f6; font-weight:700;">+${formatMoney(jamiKartaKredit)}</span></div>` : ''}
                ${jamiSoliqKredit > 0 ? `<div><span class="hist-total-label">⚖️ Soliq (Zaxira):</span> <span class="hist-total-val" style="color:#64748b; font-weight:700;">+${formatMoney(jamiSoliqKredit)}</span></div>` : ''}
                ${jamiDebet > 0 ? `<div><span class="hist-total-label">📉 Xarajat (Debet):</span> <span class="hist-total-val" style="color:var(--red); font-weight:700;">-${formatMoney(jamiDebet)}</span></div>` : ''}
                ${sofQarz !== 0 ? `<div><span class="hist-total-label">🤝 Qarz Balansi:</span> <span class="hist-total-val" style="color:var(--amber); font-weight:700;">${formatMoney(sofQarz)}</span></div>` : ''}
            </div>
        </div>
    `;
    body.innerHTML = html;
}

// OYLIK HISOBOT VA ANALITIKANI MUKAMMAL CHIZISH (CEO PANEL)
function renderCEOPanels(pId) {
    // 1. OYLIK HISOBOT PANELl
    if(pId === 'report') {
        const grid = document.getElementById("report-grid");
        if (!grid) return;
        
        grid.innerHTML = ""; // Sahifani boshida tozalaymiz
        const oylar = {};
        
        appState.transactions.forEach(t => {
            const oy = t.date.substring(0, 7);
            if(!oylar[oy]) oylar[oy] = { naqdTushum: 0, kartaTushum: 0, soliqTushum: 0, xarajat: 0, qarz: 0 };
            
            const summa = parseFloat(t.amount) || 0;

            if(t.type === 'credit') {
                let txCash = 0, txCard = 0, txTax = 0;
                const cashMatch = t.reason ? t.reason.match(/Naqd:\s*([\d.]+)/) : null;
                const cardMatch = t.reason ? t.reason.match(/Karta:\s*([\d.]+)/) : null;
                const taxMatch = t.reason ? t.reason.match(/Soliq:\s*([\d.]+)/) : null;
                
                if (cashMatch) txCash = parseFloat(cashMatch[1]) || 0;
                if (cardMatch) txCard = parseFloat(cardMatch[1]) || 0;
                if (taxMatch) txTax = parseFloat(taxMatch[1]) || 0;
                
                if (txCash === 0 && txCard === 0 && txTax === 0) txCash = summa;

                oylar[oy].naqdTushum += txCash;
                oylar[oy].kartaTushum += txCard;
                oylar[oy].soliqTushum += txTax;
            }
            if(t.type === 'debit') oylar[oy].xarajat += summa;
            if(t.type === 'debt') oylar[oy].qarz += summa;
        });
        
        Object.keys(oylar).sort().reverse().forEach(o => {
            const data = oylar[o];
            const sofOylikFoyda = data.naqdTushum - data.xarajat;

            grid.innerHTML += `
                <div class="rcard" style="width: 100%; background: #fff; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.04); margin-bottom: 20px; border: 1px solid #e2e8f0;">
                    <div class="rcard-month" style="font-weight:700; margin-bottom:18px; color:#1e293b; font-size:16px;">📅 ${o} (OYLIK HISOBOT)</div>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div style="display:flex; justify-content:space-between; font-size:14px;"><span>💵 Naqd tushum (Kassa):</span><span style="color:var(--green); font-weight:600;">+${formatMoney(data.naqdTushum)}</span></div>
                        <div style="display:flex; justify-content:space-between; font-size:14px;"><span>💳 Karta tushumi (Bank):</span><span style="color:#3b82f6; font-weight:600;">+${formatMoney(data.kartaTushum)}</span></div>
                        <div style="display:flex; justify-content:space-between; font-size:14px;"><span>⚖️ Soliq fondi (Zaxira):</span><span style="color:#64748b; font-weight:600;">+${formatMoney(data.soliqTushum)}</span></div>
                        <div style="display:flex; justify-content:space-between; font-size:14px;"><span>📉 Jami Xarajat (Debet):</span><span style="color:var(--red); font-weight:600;">-${formatMoney(data.xarajat)}</span></div>
                        <div style="display:flex; justify-content:space-between; font-size:14px;"><span>🤝 Ushbu oydagi qarz balansi:</span><span style="color:var(--amber); font-weight:600;">${formatMoney(data.qarz)}</span></div>
                    </div>
                    <hr style="border: 0; border-top: 1px dashed #e2e8f0; margin: 15px 0;">
                    <div style="display:flex; justify-content:space-between; font-size:16px;">
                        <span><strong>💰 Sof Oylik Naqd Foyda:</strong></span>
                        <strong style="color:${sofOylikFoyda >= 0 ? 'var(--green)' : 'var(--red)'}">${formatMoney(sofOylikFoyda)}</strong>
                    </div>
                </div>
            `;
        });
    }

    // 2. ANALITIKA PANELl (MUKAMMAL VA UNIVERSAL VARIANT)
    if(pId === 'analytics') {
        // HTMLda qaysi biri bo'lsa o'shani avtomatik topadi (Xatolik bermaydi)
        const analyticsGrid = document.getElementById("analytics-grid") || 
                              document.getElementById("analytics-body") || 
                              document.getElementById("report-grid");
                              
        if (!analyticsGrid) return;
        analyticsGrid.innerHTML = ""; // Ichini tozalaymiz

        let jamiDaromad = 0;
        let jamiXarajat = 0;

        appState.transactions.forEach(t => {
            const summa = parseFloat(t.amount) || 0;
            if(t.type === 'credit') jamiDaromad += summa;
            if(t.type === 'debit') jamiXarajat += summa;
        });

        const xarajatUlushi = jamiDaromad > 0 ? Math.round((jamiXarajat / jamiDaromad) * 100) : 0;

        analyticsGrid.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 25px; width: 100%;">
                <div class="rcard" style="background: #fff; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 0.5px;">JAMI DAROMAD (UMUMIY)</div>
                    <div style="font-size: 24px; font-weight: 700; color: var(--green);">${formatMoney(jamiDaromad)}</div>
                </div>
                <div class="rcard" style="background: #fff; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 0.5px;">JAMI XARAJAT</div>
                    <div style="font-size: 24px; font-weight: 700; color: var(--red);">${formatMoney(jamiXarajat)}</div>
                </div>
            </div>

            <div class="rcard" style="background: #fff; padding: 25px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; width: 100%;">
                <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 15px; letter-spacing: 0.5px;">DAROMADGA NISBATAN XARAJAT BALANSI</div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="flex: 1; background: #f1f5f9; height: 12px; border-radius: 999px; overflow: hidden;">
                        <div style="background: var(--red); width: ${xarajatUlushi > 100 ? 100 : xarajatUlushi}%; height: 100%; border-radius: 999px; transition: width 0.5s ease;"></div>
                    </div>
                    <div style="font-size: 16px; font-weight: 700; color: #1e293b; min-width: 45px; text-align: right;">${xarajatUlushi}%</div>
                </div>
                <div style="font-size: 12px; color: #64748b; margin-top: 8px;">Ushbu davrda tushgan umumiy mablag'ning ${xarajatUlushi}% qismi xarajatlarga sarflandi.</div>
            </div>
        `;
    }
}

// INTERFEYS NAVIGATSIYASI (PANEL ALMASHTIRISH - ENG SO'NGGI VARIANTI)
function openPanel(panelId) {
    // 🌟 RO'LNI TEKSHIRISH CHEKLOVI: Agar kirgan odam CEO bo'lmasa, uni bosh sahifaga ('dashboard') otib yuboradi
    const ceoPanels = ['report', 'analytics', 'users'];
    if (ceoPanels.includes(panelId) && appState.currentUser && appState.currentUser.role !== 'ceo') {
        openPanel('dashboard'); 
        return;
    }

    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".sb-btn").forEach(b => b.classList.remove("active"));

    const target = document.getElementById(`panel-${panelId}`);
    if(target) target.classList.add("active");

    const navBtn = document.getElementById(`nav-${panelId}`);
    if(navBtn) navBtn.classList.add("active");

    // Sarlavhani o'zgartirish (🌟 dashboard: "Dashboard" qatori qo'shildi)
    const unvonlar = { 
        dashboard: "Dashboard",
        dc: "Kunlik Kredit", 
        db: "Debet", 
        dt: "Qarz kiritish", 
        hist: "Moliyaviy Tarix", 
        report: "Oylik Hisobot", 
        analytics: "Tizim Analitikasi", 
        users: "Foydalanuvchilar", 
        settings: "Tizim Sozlamalari" 
    };
    document.getElementById("page-title").innerText = unvonlar[panelId] || "Panel";

    if(panelId === 'hist') renderHistory();
    if(['report', 'analytics', 'users'].includes(panelId)) renderCEOPanels(panelId);
    if(panelId === 'users') loadSystemUsers();
}

function showDashboard() {
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".sb-btn").forEach(b => b.classList.remove("active"));
    
    document.getElementById("panel-dashboard").classList.add("active");
    document.getElementById("nav-dashboard").classList.add("active");
    document.getElementById("page-title").innerText = "Dashboard";
    renderDashboard();
}

// FORMALARI TOZALASH
function clearForm(prefix) {
    if(prefix === 'dc') {
        document.getElementById("dc-total").value = "";
        document.getElementById("dc-card").value = "";
        document.getElementById("dc-cash").value = "";
        document.getElementById("dc-taxcash").value = "";
    } else if(prefix === 'db') {
        document.getElementById("db-amount").value = "";
        document.getElementById("db-reason").value = "";
    } else if(prefix === 'dt') {
        document.getElementById("dt-total").value = "";
        document.getElementById("dt-reason").value = "";
    }
}

// TOAST BILDIRISHNOMASI
function showToast(msg, type = "green") {
    const toast = document.getElementById("toast");
    toast.innerText = msg;
    toast.style.background = type === "red" ? "var(--red)" : (type === "amber" ? "var(--amber)" : "var(--green)");
    toast.style.display = "block";
    setTimeout(() => { toast.style.display = "none"; }, 3500);
}

function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("open");
    document.getElementById("overlay").classList.toggle("show");
}

function formatMoney(num) {
    return new Intl.NumberFormat("uz-UZ").format(num) + " so'm";
}

// Serverdan foydalanuvchilarni yuklash va ro'yxatni chizish
async function loadSystemUsers() {
    try {
        const response = await fetch(`${API_URL}/api/ceo/users`);
        const data = await response.json();
        
        const listDiv = document.getElementById("users-list");
        if (!listDiv) return;
        listDiv.innerHTML = "";
        
        if (!data.users || data.users.length === 0) {
            listDiv.innerHTML = "<p>Foydalanuvchilar topilmadi.</p>";
            return;
        }
        
        data.users.forEach(u => {
            const avatarLet = u.name ? u.name[0].toUpperCase() : "U";
            const badgeCls = u.role === "ceo" ? "uc-ceo" : "uc-mgr";
            
            // O'chirish tugmasi (Asosiy juraev logini tasodifan o'chib ketmasligi uchun himoya)
            const deleteBtn = u.username !== "juraev" 
                ? `<button onclick="deleteSystemUser('${u.username}')" style="background:#ef4444; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-size:12px; transition: 0.2s;">🗑 O'chirish</button>`
                : `<span style="color:#94a3b8; font-size:12px; font-style:italic;">Asosiy</span>`;

            const html = `
                <div class="user-card" style="display: flex; align-items: center; justify-content: space-between; background: #fff; padding: 15px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="uc-avatar" style="width: 40px; height: 40px; background: #e2f2f2; color: #6aacac; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-weight: bold;">${avatarLet}</div>
                        <div>
                            <div class="uc-name" style="font-weight: 600; color: #1e293b;">${u.name}</div>
                            <div class="uc-login" style="font-size: 13px; color: #64748b;">@${u.username}</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="uc-badge ${badgeCls}" style="padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase;">${u.role}</div>
                        ${deleteBtn}
                    </div>
                </div>
            `;
            listDiv.insertAdjacentHTML("beforeend", html);
        });
    } catch (e) {
        showToast("Foydalanuvchilarni yuklashda xatolik!", "red");
    }
}

// Yangi foydalanuvchi qo'shish funksiyasi
async function addSystemUser() {
    const name = document.getElementById("nu-name").value.trim();
    const username = document.getElementById("nu-login").value.trim();
    const password = document.getElementById("nu-pass").value.trim();
    const role = document.getElementById("nu-role").value;

    if (!name || !username || !password) {
        showToast("Barcha maydonlarni to'ldiring!", "amber");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/ceo/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, username, password, role })
        });
        
        const res = await response.json();
        if (response.ok && res.success) {
            showToast("Foydalanuvchi muvaffaqiyatli qo'shildi! 🎉", "green");
            // Inputlarni tozalash
            document.getElementById("nu-name").value = "";
            document.getElementById("nu-login").value = "";
            document.getElementById("nu-pass").value = "";
            // Ro'yxatni qayta yuklash
            await loadSystemUsers();
        } else {
            showToast(res.detail || "Xatolik yuz berdi", "red");
        }
    } catch (e) {
        showToast("Server bilan aloqa uzildi!", "red");
    }
}

// Foydalanuvchini o'chirish funksiyasi
async function deleteSystemUser(username) {
    if (!confirm(`Haqiqatdan ham @${username} foydalanuvchisini tizimdan o'chirmoqchimisiz?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/ceo/users/${username}`, {
            method: "DELETE"
        });
        
        const res = await response.json();
        if (response.ok && res.success) {
            showToast("Foydalanuvchi tizimdan o'chirildi!", "green");
            await loadSystemUsers();
        } else {
            showToast(res.detail || "O'chirishda xatolik", "red");
        }
    } catch (e) {
        showToast("Server bilan aloqa uzildi!", "red");
    }
}