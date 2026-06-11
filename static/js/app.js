/* ══════════════════════════════════════════════════
   DAIMON FERTILITY — APP.JS v2.0
   CEO / Manager role separation + full logic
══════════════════════════════════════════════════ */

/* ── YORDAMCHI ── */
function formatMoney(n) {
  return Number(n || 0).toLocaleString('uz-UZ') + " so'm";
}
function getToday() {
  return new Date().toISOString().split('T')[0];
}
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isError ? '#E05252' : '#16A374';
  t.style.display = 'block';
  clearTimeout(t._t);
  t._t = setTimeout(() => t.style.display = 'none', 2600);
}

/* ── LOGIN ── */
let currentUser = null;

function doLogin() {
  const login    = document.getElementById('inp-login').value.trim();
  const password = document.getElementById('inp-pass').value.trim();

  // Serverga yuborish
  fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password })
  })
  .then(r => r.json())
  .then(data => {
    if (!data.ok) {
      document.getElementById('login-err').style.display = 'block';
      return;
    }
    document.getElementById('login-err').style.display = 'none';
    currentUser = data.user;
    enterApp();
  })
  .catch(() => {
    // Agar server ishlamasa, local USERS dan ham tekshirish
    const user = (typeof USERS !== 'undefined')
      ? USERS.find(u => u.login === login && u.password === password)
      : null;
    if (!user) {
      document.getElementById('login-err').style.display = 'block';
      return;
    }
    document.getElementById('login-err').style.display = 'none';
    currentUser = user;
    enterApp();
  });
}

function enterApp() {
  document.getElementById('s-login').classList.remove('active');
  document.getElementById('s-main').classList.add('active');

  const u = currentUser;
  const isCEO = u.role === 'CEO';

  // Sidebar user info
  document.getElementById('sb-avatar').textContent = u.name[0];
  document.getElementById('sb-uname').textContent  = u.name;
  document.getElementById('sb-urole').textContent  = u.role;

  // Topbar
  document.getElementById('tb-avatar').textContent = u.name[0];
  document.getElementById('tb-name').textContent   = u.name;
  const rb = document.getElementById('role-badge');
  rb.textContent = u.role;
  rb.className   = 'role-badge ' + (isCEO ? 'ceo-badge-tb' : 'mgr-badge-tb');

  // CEO menuları ko'rsatish
  if (isCEO) {
    document.getElementById('ceo-nav-label').style.display = 'block';
    document.querySelectorAll('.ceo-only').forEach(el => el.style.display = 'flex');
    document.getElementById('ceo-quick').style.display = 'block';
  }

  setDefaultDates();
  loadAllData();
  showDashboard();
}

function doLogout() {
  currentUser = null;
  document.getElementById('s-main').classList.remove('active');
  document.getElementById('s-login').classList.add('active');
  document.getElementById('inp-login').value = '';
  document.getElementById('inp-pass').value  = '';
  // CEO menu yashirish
  document.getElementById('ceo-nav-label').style.display = 'none';
  document.querySelectorAll('.ceo-only').forEach(el => el.style.display = 'none');
  document.getElementById('ceo-quick').style.display = 'none';
  // Sidebar yopish
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

/* ── SIDEBAR TOGGLE (mobile) ── */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}

/* ── PANELLAR ── */
const ALL_PANELS = ['dashboard','dc','db','dt','hist','report','analytics','users','settings'];
const PANEL_TITLES = {
  dashboard:'Dashboard', dc:'Kunlik kredit', db:'Debet',
  dt:'Qarz', hist:'Tarix', report:'Hisobot',
  analytics:'Analitika', users:'Foydalanuvchilar', settings:'Sozlamalar'
};

function showDashboard() {
  openPanel('dashboard');
}

function openPanel(name) {
  // CEO panelini faqat CEO ko'radi
  const ceoPanels = ['report','analytics','users','settings'];
  if (ceoPanels.includes(name) && (!currentUser || currentUser.role !== 'CEO')) {
    showToast('⛔ Bu panel faqat CEO uchun!', true);
    return;
  }

  ALL_PANELS.forEach(p => {
    const panel = document.getElementById('panel-' + p);
    if (panel) panel.classList.remove('active');
    const btn = document.getElementById('nav-' + p);
    if (btn) btn.classList.remove('active');
  });

  const panel = document.getElementById('panel-' + name);
  if (panel) panel.classList.add('active');
  const btn = document.getElementById('nav-' + name);
  if (btn) btn.classList.add('active');

  document.getElementById('page-title').textContent = PANEL_TITLES[name] || name;

  // Panel ochilganda to'ldirish
  if (name === 'hist')      renderHistory();
  if (name === 'dashboard') renderDashboard();
  if (name === 'report')    renderReport();
  if (name === 'analytics') renderAnalytics();
  if (name === 'users')     renderUsers();

  // Mobile sidebar yopish
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

/* ── DATA YUKLASH ── */
function loadAllData() {
  credits = loadData('df_credits') || [];
  debits  = loadData('df_debits')  || [];
  debts   = loadData('df_debts')   || [];
}

/* ── DEFAULT SANALAR ── */
function setDefaultDates() {
  const today = getToday();
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setVal('dc-date', today);
  setVal('db-date', today);
  setVal('h-from', today.substring(0,7) + '-01');
  setVal('h-to', today);
}

/* ── STATISTIKA ── */
function getStats() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  function isThisMonth(d) {
    const dt = new Date(d);
    return dt.getFullYear() === year && dt.getMonth() === month;
  }
  const totalCredit = credits.filter(c => isThisMonth(c.date)).reduce((s,c) => s + (c.total||0), 0);
  const totalDebit  = debits.filter(d  => isThisMonth(d.date)).reduce((s,d) => s + (d.amount||0), 0);
  const totalDebt   = debts.reduce((s,d) => s + (d.total||0), 0);
  const balance     = totalCredit - totalDebit - totalDebt;
  return { totalCredit, totalDebit, totalDebt, balance };
}

function updateStats() {
  const { totalCredit, totalDebit, totalDebt, balance } = getStats();
  const balEl = document.getElementById('st-bal');
  if (balEl) {
    balEl.textContent = formatMoney(balance);
    balEl.style.color = balance >= 0 ? 'var(--green)' : 'var(--red)';
  }
  const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setT('st-crd',  formatMoney(totalCredit));
  setT('st-dbt',  formatMoney(totalDebit));
  setT('st-debt', formatMoney(totalDebt));
}

/* ── DASHBOARD ── */
function renderDashboard() {
  updateStats();

  // So'nggi 8 ta amal
  let all = [];
  credits.forEach(c => all.push({ date: c.date, kind: 'credit', label: 'Kunlik kredit', amount: c.total }));
  debits.forEach(d  => all.push({ date: d.date, kind: 'debit',  label: DEBIT_TYPES[d.type] || 'Debet', amount: d.amount }));
  debts.forEach(d   => all.push({ date: d.date, kind: 'debt',   label: 'Qarz', amount: d.total }));
  all.sort((a,b) => b.date.localeCompare(a.date));
  all = all.slice(0, 8);

  const el = document.getElementById('recent-list');
  if (!el) return;

  if (all.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="es-icon">📭</div><p>Hali ma'lumot kiritilmagan</p></div>`;
    return;
  }

  el.innerHTML = all.map(row => {
    const bg    = row.kind === 'credit' ? 'var(--green-light)' : row.kind === 'debit' ? 'var(--red-light)' : 'var(--amber-light)';
    const color = row.kind === 'credit' ? 'var(--green)'       : row.kind === 'debit' ? 'var(--red)'       : 'var(--amber)';
    const icon  = row.kind === 'credit' ? '➕' : row.kind === 'debit' ? '➖' : '📋';
    const sign  = row.kind === 'credit' ? '+' : '-';
    return `
      <div class="ri-item">
        <div class="ri-dot" style="background:${bg}">${icon}</div>
        <div class="ri-info">
          <div class="ri-label">${row.label}</div>
          <div class="ri-date">${row.date}</div>
        </div>
        <div class="ri-amount" style="color:${color}">${sign}${Number(row.amount).toLocaleString('uz-UZ')}</div>
      </div>`;
  }).join('');
}

/* ── SAQLASH ── */
function saveDC() {
  const date    = document.getElementById('dc-date').value;
  const total   = +document.getElementById('dc-total').value   || 0;
  const card    = +document.getElementById('dc-card').value    || 0;
  const cash    = +document.getElementById('dc-cash').value    || 0;
  const taxCash = +document.getElementById('dc-taxcash').value || 0;

  if (!date || total <= 0) { showToast('⚠️ Sana va jami summani kiriting!', true); return; }

  const entry = { id: Date.now(), date, total, card, cash, taxCash };
  credits.push(entry);
  saveData('df_credits', credits);

  // Serverga ham yuborish
  fetch('/credit', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(entry) }).catch(()=>{});

  clearForm('dc');
  updateStats();
  showToast('✅ Kredit muvaffaqiyatli saqlandi');
}

function saveDB() {
  const date   = document.getElementById('db-date').value;
  const type   = +document.getElementById('db-type').value;
  const amount = +document.getElementById('db-amount').value || 0;
  const reason = document.getElementById('db-reason').value.trim();

  if (!date || amount <= 0) { showToast('⚠️ Sana va summani kiriting!', true); return; }

  const entry = { id: Date.now(), type, amount, reason, date };
  debits.push(entry);
  saveData('df_debits', debits);
  fetch('/debit', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(entry) }).catch(()=>{});

  clearForm('db');
  updateStats();
  showToast('✅ Debet muvaffaqiyatli saqlandi');
}

function saveDT() {
  const total  = +document.getElementById('dt-total').value || 0;
  const reason = document.getElementById('dt-reason').value.trim();

  if (total <= 0) { showToast('⚠️ Summani kiriting!', true); return; }

  const entry = { id: Date.now(), total, reason, date: getToday() };
  debts.push(entry);
  saveData('df_debts', debts);
  fetch('/debt', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(entry) }).catch(()=>{});

  clearForm('dt');
  updateStats();
  showToast('✅ Qarz muvaffaqiyatli saqlandi');
}

/* ── FORM TOZALASH ── */
function clearForm(type) {
  if (type === 'dc') {
    ['dc-total','dc-card','dc-cash','dc-taxcash'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('dc-date').value = getToday();
  }
  if (type === 'db') {
    ['db-amount','db-reason'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('db-date').value = getToday();
  }
  if (type === 'dt') {
    ['dt-total','dt-reason'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
  }
}

/* ── TARIX ── */
function renderHistory() {
  const filterType = document.getElementById('h-type').value;
  const fromDate   = document.getElementById('h-from').value;
  const toDate     = document.getElementById('h-to').value;

  function inRange(d) {
    return (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
  }

  let rows = [];
  if (filterType === 'all' || filterType === 'credit') {
    credits.filter(c => inRange(c.date)).forEach(c => rows.push({
      date: c.date, kind: 'credit', label: 'Kunlik kredit', amount: c.total,
      detail: `Karta: ${Number(c.card||0).toLocaleString('uz-UZ')} | Naqd: ${Number(c.cash||0).toLocaleString('uz-UZ')}`
    }));
  }
  if (filterType === 'all' || filterType === 'debit') {
    debits.filter(d => inRange(d.date)).forEach(d => rows.push({
      date: d.date, kind: 'debit', label: DEBIT_TYPES[d.type] || 'Debet', amount: d.amount, detail: d.reason || '—'
    }));
  }
  if (filterType === 'all' || filterType === 'debt') {
    debts.filter(d => inRange(d.date)).forEach(d => rows.push({
      date: d.date, kind: 'debt', label: 'Qarz', amount: d.total, detail: d.reason || '—'
    }));
  }

  rows.sort((a,b) => b.date.localeCompare(a.date));
  const body = document.getElementById('hist-body');

  if (rows.length === 0) {
    body.innerHTML = `<div class="empty-state"><div class="es-icon">📭</div><p>Bu davr uchun ma'lumot topilmadi</p></div>`;
    return;
  }

  let grand = 0;
  let html = `<div class="htable-wrap"><table class="htable">
    <thead><tr><th>Sana</th><th>Tur</th><th>Summa</th><th>Izoh</th></tr></thead><tbody>`;

  rows.forEach(r => {
    grand += r.kind === 'credit' ? r.amount : -r.amount;
    const bc = r.kind === 'credit' ? 'badge-green' : r.kind === 'debit' ? 'badge-red' : 'badge-amber';
    html += `<tr>
      <td>${r.date}</td>
      <td><span class="badge ${bc}">${r.label}</span></td>
      <td style="font-weight:700">${Number(r.amount).toLocaleString('uz-UZ')}</td>
      <td style="color:var(--muted)">${r.detail}</td>
    </tr>`;
  });

  html += `</tbody></table>
    <div class="hist-total-row">
      <span class="hist-total-label">Jami natija:</span>
      <span class="hist-total-val" style="color:${grand >= 0 ? 'var(--green)' : 'var(--red)'}">${formatMoney(grand)}</span>
    </div>
  </div>`;

  body.innerHTML = html;
}

/* ── CEO: HISOBOT ── */
function renderReport() {
  // Oyma-oy kredit/debet hisobi
  const monthMap = {};
  credits.forEach(c => {
    const m = c.date.substring(0,7);
    if (!monthMap[m]) monthMap[m] = { credit:0, debit:0 };
    monthMap[m].credit += c.total || 0;
  });
  debits.forEach(d => {
    const m = d.date.substring(0,7);
    if (!monthMap[m]) monthMap[m] = { credit:0, debit:0 };
    monthMap[m].debit += d.amount || 0;
  });

  const months = Object.keys(monthMap).sort().reverse().slice(0,6);
  const el = document.getElementById('report-grid');
  if (!el) return;

  if (months.length === 0) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="es-icon">📭</div><p>Hali ma'lumot yo'q</p></div>`;
    return;
  }

  const monthNames = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];

  el.innerHTML = months.map(m => {
    const [y, mo] = m.split('-');
    const name   = monthNames[parseInt(mo)-1] + ' ' + y;
    const d      = monthMap[m];
    const profit = d.credit - d.debit;
    return `
      <div class="rcard">
        <div class="rcard-month">${name}</div>
        <div class="rcard-row">
          <span style="color:var(--muted)">Kredit</span>
          <span style="color:var(--green);font-weight:700">+${Number(d.credit).toLocaleString('uz-UZ')}</span>
        </div>
        <div class="rcard-row">
          <span style="color:var(--muted)">Debet</span>
          <span style="color:var(--red);font-weight:700">-${Number(d.debit).toLocaleString('uz-UZ')}</span>
        </div>
        <div class="rcard-row">
          <span style="font-weight:700">Foyda</span>
          <span style="color:${profit>=0?'var(--green)':'var(--red)'};font-weight:800">${formatMoney(profit)}</span>
        </div>
      </div>`;
  }).join('');
}

/* ── CEO: ANALITIKA ── */
function renderAnalytics() {
  const { totalCredit, totalDebit, totalDebt, balance } = getStats();
  const el = document.getElementById('analytics-body');
  if (!el) return;

  const allCredit = credits.reduce((s,c) => s + (c.total||0), 0);
  const allDebit  = debits.reduce((s,d) => s + (d.amount||0), 0);
  const maxVal    = Math.max(allCredit, allDebit, 1);

  // Debet tur bo'yicha
  const byType = {};
  debits.forEach(d => {
    const t = DEBIT_TYPES[d.type] || 'Boshqa';
    byType[t] = (byType[t] || 0) + (d.amount || 0);
  });

  const bars = Object.entries(byType).sort((a,b) => b[1]-a[1]).map(([label, val]) => `
    <div class="bar-row">
      <div class="bar-label">${label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(val/Math.max(...Object.values(byType),1)*100).toFixed(1)}%;background:var(--red)"></div></div>
      <div class="bar-val" style="color:var(--red)">${Number(val).toLocaleString('uz-UZ')}</div>
    </div>`).join('');

  el.innerHTML = `
    <div class="analytics-cards">
      <div class="ac-item">
        <div class="ac-title">Jami kredit (barcha vaqt)</div>
        <div class="ac-val" style="color:var(--green)">+${Number(allCredit).toLocaleString('uz-UZ')}</div>
        <div class="ac-sub">so'm</div>
      </div>
      <div class="ac-item">
        <div class="ac-title">Jami debet (barcha vaqt)</div>
        <div class="ac-val" style="color:var(--red)">-${Number(allDebit).toLocaleString('uz-UZ')}</div>
        <div class="ac-sub">so'm</div>
      </div>
      <div class="ac-item">
        <div class="ac-title">Bu oy balans</div>
        <div class="ac-val" style="color:${balance>=0?'var(--green)':'var(--red)'}">${formatMoney(balance)}</div>
        <div class="ac-sub">kredit - debet - qarz</div>
      </div>
      <div class="ac-item">
        <div class="ac-title">Jami qarz</div>
        <div class="ac-val" style="color:var(--amber)">${formatMoney(totalDebt)}</div>
        <div class="ac-sub">to'lanmagan qarzlar</div>
      </div>
    </div>
    <div style="background:var(--card);border-radius:var(--radius);border:1px solid var(--border);padding:20px;box-shadow:var(--shadow)">
      <div class="section-title">Debet turlari bo'yicha</div>
      ${bars || '<div class="empty-state"><div class="es-icon">📊</div><p>Ma\'lumot yo\'q</p></div>'}
    </div>
    <div style="background:var(--card);border-radius:var(--radius);border:1px solid var(--border);padding:20px;box-shadow:var(--shadow);margin-top:14px">
      <div class="section-title">Kredit vs Debet (jami)</div>
      <div class="bar-row">
        <div class="bar-label">Kredit</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(allCredit/maxVal*100).toFixed(1)}%;background:var(--green)"></div></div>
        <div class="bar-val" style="color:var(--green)">${Number(allCredit).toLocaleString('uz-UZ')}</div>
      </div>
      <div class="bar-row">
        <div class="bar-label">Debet</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(allDebit/maxVal*100).toFixed(1)}%;background:var(--red)"></div></div>
        <div class="bar-val" style="color:var(--red)">${Number(allDebit).toLocaleString('uz-UZ')}</div>
      </div>
    </div>`;
}

/* ── CEO: FOYDALANUVCHILAR ── */
function renderUsers() {
  const el = document.getElementById('users-list');
  if (!el) return;
  const users = (typeof USERS !== 'undefined') ? USERS : [
    { name:'Firuz Juraev',    login:'juraev',    role:'CEO'     },
    { name:'Xushnud Eshmanov',login:'xishmanov', role:'Manager' }
  ];
  el.innerHTML = users.map(u => `
    <div class="user-card">
      <div class="uc-avatar">${u.name[0]}</div>
      <div>
        <div class="uc-name">${u.name}</div>
        <div class="uc-login">@${u.login}</div>
      </div>
      <span class="uc-badge ${u.role==='CEO'?'uc-ceo':'uc-mgr'}">${u.role}</span>
    </div>`).join('');
}

/* ── CEO: SOZLAMALAR ── */
function clearAllData() {
  if (!confirm("Barcha ma'lumotlarni o'chirishga ishonchingiz komilmi?")) return;
  credits = []; debits = []; debts = [];
  saveData('df_credits', credits);
  saveData('df_debits',  debits);
  saveData('df_debts',   debts);
  updateStats();
  renderDashboard();
  showToast("🗑 Barcha ma'lumotlar tozalandi");
}

function exportData() {
  const data = { credits, debits, debts, exportDate: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'daimon_fertility_' + getToday() + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 Ma\'lumotlar yuklab olindi');
}
