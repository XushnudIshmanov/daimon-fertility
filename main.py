import os
import json
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

app = FastAPI()

# Barcha qurilmalardan keladigan so'rovlarga ruxsat berish
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Papkalarni ulash
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

DATA_FILE = "data.json"

def load_data():
    if not os.path.exists(DATA_FILE):
        initial_data = {
            "users": [
                {"name": "Juraev", "username": "juraev", "password": "ewing1997", "role": "ceo"},
                {"name": "Xishmanov", "username": "xishmanov", "password": "xushnud007", "role": "mgr"}
            ],
            "transactions": []
        }
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(initial_data, f, indent=4, ensure_ascii=False)
        return initial_data
    
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"users": [], "transactions": []}

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

# Pydantic modellar
class LoginModel(BaseModel):
    username: str
    password: str

class TransactionModel(BaseModel):
    type: str
    amount: float
    date: str
    reason: Optional[str] = "-"
    author: Optional[str] = "Tizim"

# ── FRONTEND SAHIFANI KO'RSATISH ──
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")

# ── API: LOGIN CHEK ──
@app.post("/api/login")
async def api_login(data: LoginModel):
    db = load_data()
    for user in db.get("users", []):
        if user["username"] == data.username and user["password"] == data.password:
            return {
                "success": True, 
                "user": {"name": user["name"], "username": user["username"], "role": user["role"]}
            }
    raise HTTPException(status_code=401, detail="Login yoki parol noto'g'ri!")

# ── API: BARCHA MA'LUMOTLARNI TORTIB OLISH ──
@app.get("/api/data")
async def api_get_data():
    db = load_data()
    return {"transactions": db.get("transactions", [])}

# ── API: YANGI TRANZAKSIYA QO'SHISH ──
@app.post("/api/transactions")
async def api_add_transaction(tx: TransactionModel):
    db = load_data()
    new_tx_dict = tx.dict()
    new_tx_dict["id"] = len(db["transactions"]) + 1
    db["transactions"].append(new_tx_dict)
    save_data(db)
    return {"success": True, "message": "Muvaffaqiyatli saqlandi!"}

# UptimeRobot uchun ping
@app.get("/ping")
async def ping():
    return {"status": "OK"}

# ── API: CEO BARCHA MA'LUMOTLARNI TOZALASH ──
@app.post("/api/clear-data")
async def clear_all_data():
    db = load_data()
    
    # Faqat tranzaksiyalarni (kredit, debet, qarz) tozalaymiz, userlar qoladi!
    db["transactions"] = []
    
    save_data(db)
    return {
        "success": True,
        "message": "Barcha ma'lumotlar muvaffaqiyatli tozalandi!"
    }
from datetime import datetime

@app.get("/api/ceo/monthly-report")
async def get_monthly_report(month: str = None):
    """
    month formati: "2026-06" kabi keladi. 
    Agar oy yuborilmasa, avtomatik joriy oyni hisoblaydi.
    """
    db = load_data()
    transactions = db.get("transactions", [])
    
    # Agar oy tanlanmagan bo'lsa, hozirgi yil va oyni aniqlaymiz
    if not month:
        month = datetime.now().strftime("%Y-%m")
        
    # Barcha bor oylarni ro'yxatini shakllantiramiz (Dropdown tugmasi ichida ko'rsatish uchun)
    available_months = set()
    for tx in transactions:
        if "date" in tx and len(tx["date"]) >= 7:
            available_months.add(tx["date"][:7]) # "2026-06" qismini oladi
            
    # Agar joriy oy tranzaksiyalarda hali bo'lmasa, uni ham ro'yxatga qo'shamiz
    current_month = datetime.now().strftime("%Y-%m")
    available_months.add(current_month)
    
    # Faqat tanlangan oyga tegishli tranzaksiyalarni filtrlash
    filtered_tx = [tx for tx in transactions if tx.get("date", "").startswith(month)]
    
    # Matematik hisob-kitoblar
    total_kirim = sum(tx["amount"] for tx in filtered_tx if tx["type"] == "kredit")
    total_chiqim = sum(tx["amount"] for tx in filtered_tx if tx["type"] == "debet")
    sof_foyda = total_kirim - total_chiqim
    
    return {
        "selected_month": month,
        "available_months": sorted(list(available_months), reverse=True),
        "summary": {
            "kirim": total_kirim,
            "chiqim": total_chiqim,
            "foyda": sof_foyda
        },
        "transactions": filtered_tx
    }