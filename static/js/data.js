/* ══════════════════════════════════════════════════
   DAIMON FERTILITY — DATA.JS v2.0
   Ma'lumotlar va LocalStorage
══════════════════════════════════════════════════ */

// Foydalanuvchilar (login uchun fallback)
const USERS = [
  { id:1, name:"Firuz Juraev",     login:"juraev",    password:"ewing1997", role:"CEO"     },
  { id:2, name:"Xushnud Eshmanov", login:"xishmanov", password:"xushnud007",role:"Manager" }
];

// Debet turlari
const DEBIT_TYPES = {
  1: "Xarajatlar",
  2: "Maosh",
  3: "Lab Debit"
};

// Ma'lumotlar massivlari
let credits = [];
let debits  = [];
let debts   = [];

// LocalStorage — saqlash
function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch(e) {
    console.warn('saveData error:', e);
  }
}

// LocalStorage — yuklash
function loadData(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch(e) {
    console.warn('loadData error:', e);
    return [];
  }
}