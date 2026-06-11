from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional
import json
import os

# ─────────────────────────────
# DATA FILE (JSON STORAGE)
# ─────────────────────────────
DATA_FILE = "data.json"

def load_db():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)

    return {
        "credits": [],
        "debits": [],
        "debts": []
    }


def save_db():
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "credits": credits_db,
            "debits": debits_db,
            "debts": debts_db
        }, f, ensure_ascii=False, indent=2)


db = load_db()

credits_db = db["credits"]
debits_db = db["debits"]
debts_db = db["debts"]

# ─────────────────────────────
# APP INIT
# ─────────────────────────────
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", response_class=HTMLResponse)
def home():
    with open("templates/index.html", "r", encoding="utf-8") as f:
        return f.read()

# ─────────────────────────────
# USERS
# ─────────────────────────────
USERS = [
    {"id": 1, "name": "Firuz Juraev", "login": "juraev", "password": "ewing1997", "role": "CEO"},
    {"id": 2, "name": "Xushnud Eshmanov", "login": "xishmanov", "password": "xushnud007", "role": "Manager"},
]

# ─────────────────────────────
# LOGIN
# ─────────────────────────────
class LoginData(BaseModel):
    login: str
    password: str


@app.post("/login")
def login(data: LoginData):
    user = next(
        (u for u in USERS if u["login"] == data.login and u["password"] == data.password),
        None
    )

    if not user:
        return {"ok": False, "user": None}

    safe = {k: v for k, v in user.items() if k != "password"}
    return {"ok": True, "user": safe}

# ─────────────────────────────
# CREDIT
# ─────────────────────────────
class CreditData(BaseModel):
    id: Optional[int] = None
    date: str
    total: float
    card: float = 0
    cash: float = 0
    taxCash: float = 0


@app.post("/credit")
def add_credit(data: CreditData):
    credits_db.append(data.dict())
    save_db()
    return {"ok": True}


@app.get("/credits")
def get_credits():
    return credits_db

# ─────────────────────────────
# DEBIT
# ─────────────────────────────
class DebitData(BaseModel):
    id: Optional[int] = None
    date: str
    type: int
    amount: float
    reason: str = ""


@app.post("/debit")
def add_debit(data: DebitData):
    debits_db.append(data.dict())
    save_db()
    return {"ok": True}


@app.get("/debits")
def get_debits():
    return debits_db

# ─────────────────────────────
# DEBT
# ─────────────────────────────
class DebtData(BaseModel):
    id: Optional[int] = None
    date: str
    total: float
    reason: str = ""


@app.post("/debt")
def add_debt(data: DebtData):
    debts_db.append(data.dict())
    save_db()
    return {"ok": True}


@app.get("/debts")
def get_debts():
    return debts_db

# ─────────────────────────────
# STATS
# ─────────────────────────────
@app.get("/stats")
def stats():
    credit = sum(i.get("total", 0) for i in credits_db)
    debit = sum(i.get("amount", 0) for i in debits_db)
    debt = sum(i.get("total", 0) for i in debts_db)

    return {
        "credit": credit,
        "debit": debit,
        "debt": debt,
        "balance": credit - debit - debt
    }