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

// 1. TIZIMGA KIRISH (LOGIN)
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
            appState.currentUser = res.user;
            localStorage.setItem("daimon_user", JSON.stringify(res.user));
            loadDashboardData();
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
    document.getElementById("s-main").classList.remove("active");
    document.getElementById("s-login").classList.add("active");
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

    // Rollar
    const roleText = user.role === "ceo" ? "Bosh Direktor" : "Menejer";
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

// DASHBOARD EKOSISTEMASI
function renderDashboard() {
    let joriyBalans = 0, buOyKredit = 0, buOyDebet = 0, jamiQarz = 0;
    const bugun = new Date();
    const joriyOy = bugun.toISOString().substring(0, 7); // YYYY-MM

    appState.transactions.forEach(tx => {
        const txOy = tx.date.substring(0, 7);
        const summa = parseFloat(tx.amount) || 0;

        if (tx.type === "credit") {
            joriyBalans += summa;
            if (txOy === joriyOy) buOyKredit += summa;
        } else if (tx.type === "debit") {
            joriyBalans -= summa;
            if (txOy === joriyOy) buOyDebet += summa;
        } else if (tx.type === "debt") {
            jamiQarz += summa;
        }
    });

    // Kartalarga yozish
    document.getElementById("st-bal").innerText = formatMoney(joriyBalans);
    document.getElementById("st-crd").innerText = formatMoney(buOyKredit);
    document.getElementById("st-dbt").innerText = formatMoney(buOyDebet);
    document.getElementById("st-debt").innerText = formatMoney(jamiQarz);

    // Trend belgisi
    document.getElementById("bal-trend").innerText = joriyBalans >= 0 ? "↑" : "↓";

    // So'nggi amallar ro'yxati (Top 5)
    renderRecentList();
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

// QARZ SAQLASH
function saveDT() {
    const miqdor = parseFloat(document.getElementById("dt-total").value) || 0;
    const sabab = document.getElementById("dt-reason").value.trim();
    const bugun = new Date().toISOString().split('T')[0];

    if (miqdor <= 0) { showToast("Qarz miqdorini kiriting!", "amber"); return; }

    sendTransactionToServer({
        type: "debt",
        amount: miqdor,
        date: bugun,
        reason: `Qarz: ${sabab}`
    });
    clearForm('dt');
}

// 3. TARIX PANELINI FILTRLASH VA CHIZISH
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

    let jamiSumma = filtrlandi.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

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
        if(t.type === "debit") { bCls = "badge-red"; tNm = "Debet"; }
        if(t.type === "debt") { bCls = "badge-amber"; tNm = "Qarz"; }

        html += `
            <tr>
                <td>${t.date}</td>
                <td><span class="badge ${bCls}">${tNm}</span></td>
                <td><strong>${t.reason || '-'}</strong></td>
                <td>${t.author || 'Tizim'}</td>
                <td><strong>${formatMoney(t.amount)}</strong></td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
            <div class="hist-total-row">
                <span class="hist-total-label">Filtrlangan jami miqdor:</span>
                <span class="hist-total-val" style="color:var(--green)">${formatMoney(jamiSumma)}</span>
            </div>
        </div>
    `;
    body.innerHTML = html;
}

// CEO MAKSUS: HISOBOT VA ANALITIKA GENERATSIYASI
function renderCEOPanels(pId) {
    if(pId === 'report') {
        const grid = document.getElementById("report-grid");
        grid.innerHTML = "";
        const oylar = {};
        appState.transactions.forEach(t => {
            const oy = t.date.substring(0, 7);
            if(!oylar[oy]) oylar[oy] = { c: 0, d: 0, db: 0 };
            if(t.type === 'credit') oylar[oy].c += t.amount;
            if(t.type === 'debit') oylar[oy].d += t.amount;
            if(t.type === 'debt') oylar[oy].db += t.amount;
        });
        Object.keys(oylar).sort().reverse().forEach(o => {
            const data = oylar[o];
            grid.insertAdjacentHTML("beforeend", `
                <div class="rcard">
                    <div class="rcard-month">📅 ${o}</div>
                    <div class="rcard-row"><span>Kredit (Tushum):</span><span class="green-t">+${formatMoney(data.c)}</span></div>
                    <div class="rcard-row"><span>Debet (Xarajat):</span><span class="red-t">-${formatMoney(data.d)}</span></div>
                    <div class="rcard-row"><span>Olingan qarzlar:</span><span class="amber-t">${formatMoney(data.db)}</span></div>
                    <div class="rcard-row"><span>Sof Foyda:</span><strong style="color:var(--text)">${formatMoney(data.c - data.d)}</strong></div>
                </div>
            `);
        });
    }
    if(pId === 'analytics') {
        const body = document.getElementById("analytics-body");
        let jamiKredit = 0, jamiDebet = 0;
        appState.transactions.forEach(t => {
            if(t.type === 'credit') jamiKredit += t.amount;
            if(t.type === 'debit') jamiDebet += t.amount;
        });
        let xarajatFoiz = jamiKredit > 0 ? Math.min(100, Math.round((jamiDebet / jamiKredit) * 100)) : 0;
        body.innerHTML = `
            <div class="analytics-cards">
                <div class="ac-item"><div class="ac-title">Jami Daromad</div><div class="ac-val">${formatMoney(jamiKredit)}</div></div>
                <div class="ac-item"><div class="ac-title">Jami Xarajat</div><div class="ac-val" style="color:var(--red)">${formatMoney(jamiDebet)}</div></div>
            </div>
            <div class="scard" style="margin-top:15px">
                <div class="section-title">Daromadga nisbatan xarajat balansi</div>
                <div class="bar-chart">
                    <div class="bar-row">
                        <div class="bar-label">Xarajat ulushi</div>
                        <div class="bar-track"><div class="bar-fill" style="width:${xarajatFoiz}%; background:var(--red)"></div></div>
                        <div class="bar-val">${xarajatFoiz}%</div>
                    </div>
                </div>
            </div>
        `;
    }
    if(pId === 'users') {
        loadSystemUsers();
    }
}

// INTERFEYS NAVIGATSIYASI (PANEL ALMASHTIRISH)
function openPanel(panelId) {
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".sb-btn").forEach(b => b.classList.remove("active"));

    const target = document.getElementById(`panel-${panelId}`);
    if(target) target.classList.add("active");

    const navBtn = document.getElementById(`nav-${panelId}`);
    if(navBtn) navBtn.classList.add("active");

    // Sarlavhani o'zgartirish
    const unvonlar = { dc: "Kunlik Kredit", db: "Debet", dt: "Qarz kiritish", hist: "Moliyaviy Tarix", report: "Oylik Hisobot", analytics: "Tizim Analitikasi", users: "Foydalanuvchilar", settings: "Tizim Sozlamalari" };
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