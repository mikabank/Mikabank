from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from pymongo import MongoClient
from datetime import datetime, timedelta
import jwt
import os
import uuid
import re
from typing import Optional, List

# Environment variables
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
SECRET_KEY = os.environ.get('SECRET_KEY', 'mikabank-secret-key-2024')

# MongoDB setup
client = MongoClient(MONGO_URL)
db = client.mikabank
users_collection = db.users
transactions_collection = db.transactions

# FastAPI app
app = FastAPI(title="MikaBank API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Pydantic models
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    cpf: str
    password: str

class UserLogin(BaseModel):
    email_or_cpf: str
    password: str

class TransferRequest(BaseModel):
    recipient_identifier: str  # email ou CPF
    amount: float
    description: Optional[str] = "Transferência"

class User(BaseModel):
    id: str
    name: str
    email: str
    cpf: str
    balance: float
    created_at: datetime

class Transaction(BaseModel):
    id: str
    from_user_id: str
    from_user_name: str
    to_user_id: str
    to_user_name: str
    amount: float
    description: str
    timestamp: datetime
    type: str

# Utility functions
def validate_cpf(cpf: str) -> bool:
    """Basic CPF validation"""
    cpf = re.sub(r'[^0-9]', '', cpf)
    return len(cpf) == 11 and cpf.isdigit()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    user = users_collection.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    
    return user

# API Routes
@app.get("/")
async def root():
    return {"message": "MikaBank API funcionando!"}

@app.post("/api/register")
async def register(user_data: UserRegister):
    # Validate CPF
    if not validate_cpf(user_data.cpf):
        raise HTTPException(status_code=400, detail="CPF inválido")
    
    # Check if user already exists
    existing_user = users_collection.find_one({
        "$or": [
            {"email": user_data.email},
            {"cpf": user_data.cpf}
        ]
    })
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Usuário já existe com este email ou CPF")
    
    # Create new user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "name": user_data.name,
        "email": user_data.email,
        "cpf": user_data.cpf,
        "password": hash_password(user_data.password),
        "balance": 10.0,  # R$10 initial balance
        "created_at": datetime.utcnow()
    }
    
    users_collection.insert_one(user)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_id})
    
    return {
        "message": "Usuário criado com sucesso!",
        "access_token": access_token,
        "user": {
            "id": user_id,
            "name": user_data.name,
            "email": user_data.email,
            "cpf": user_data.cpf,
            "balance": 10.0
        }
    }

@app.post("/api/login")
async def login(login_data: UserLogin):
    # Find user by email or CPF
    user = users_collection.find_one({
        "$or": [
            {"email": login_data.email_or_cpf},
            {"cpf": login_data.email_or_cpf}
        ]
    })
    
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Email/CPF ou senha incorretos")
    
    # Create access token
    access_token = create_access_token(data={"sub": user["id"]})
    
    return {
        "message": "Login realizado com sucesso!",
        "access_token": access_token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "cpf": user["cpf"],
            "balance": user["balance"]
        }
    }

@app.get("/api/profile")
async def get_profile(current_user = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "cpf": current_user["cpf"],
        "balance": current_user["balance"]
    }

@app.post("/api/transfer")
async def transfer_money(transfer_data: TransferRequest, current_user = Depends(get_current_user)):
    # Find recipient by email or CPF
    recipient = users_collection.find_one({
        "$or": [
            {"email": transfer_data.recipient_identifier},
            {"cpf": transfer_data.recipient_identifier}
        ]
    })
    
    if not recipient:
        raise HTTPException(status_code=404, detail="Usuário destinatário não encontrado")
    
    if recipient["id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="Não é possível transferir para si mesmo")
    
    if transfer_data.amount <= 0:
        raise HTTPException(status_code=400, detail="Valor deve ser maior que zero")
    
    if current_user["balance"] < transfer_data.amount:
        raise HTTPException(status_code=400, detail="Saldo insuficiente")
    
    # Perform transfer
    new_sender_balance = current_user["balance"] - transfer_data.amount
    new_recipient_balance = recipient["balance"] + transfer_data.amount
    
    # Update balances
    users_collection.update_one(
        {"id": current_user["id"]},
        {"$set": {"balance": new_sender_balance}}
    )
    
    users_collection.update_one(
        {"id": recipient["id"]},
        {"$set": {"balance": new_recipient_balance}}
    )
    
    # Create transaction record
    transaction_id = str(uuid.uuid4())
    transaction = {
        "id": transaction_id,
        "from_user_id": current_user["id"],
        "from_user_name": current_user["name"],
        "to_user_id": recipient["id"],
        "to_user_name": recipient["name"],
        "amount": transfer_data.amount,
        "description": transfer_data.description,
        "timestamp": datetime.utcnow(),
        "type": "transfer"
    }
    
    transactions_collection.insert_one(transaction)
    
    return {
        "message": "Transferência realizada com sucesso!",
        "transaction_id": transaction_id,
        "new_balance": new_sender_balance,
        "recipient_name": recipient["name"]
    }

@app.get("/api/transactions")
async def get_transactions(current_user = Depends(get_current_user)):
    transactions = list(transactions_collection.find({
        "$or": [
            {"from_user_id": current_user["id"]},
            {"to_user_id": current_user["id"]}
        ]
    }).sort("timestamp", -1).limit(50))
    
    # Remove MongoDB _id field and format for frontend
    formatted_transactions = []
    for transaction in transactions:
        transaction.pop("_id", None)
        transaction["timestamp"] = transaction["timestamp"].isoformat()
        formatted_transactions.append(transaction)
    
    return {"transactions": formatted_transactions}

@app.get("/api/users/search")
async def search_user(q: str, current_user = Depends(get_current_user)):
    """Search for users by email or CPF (for transfer purposes)"""
    if len(q) < 3:
        return {"users": []}
    
    users = list(users_collection.find({
        "$and": [
            {"id": {"$ne": current_user["id"]}},  # Exclude current user
            {
                "$or": [
                    {"email": {"$regex": q, "$options": "i"}},
                    {"cpf": {"$regex": q}},
                    {"name": {"$regex": q, "$options": "i"}}
                ]
            }
        ]
    }).limit(5))
    
    # Format response
    formatted_users = []
    for user in users:
        formatted_users.append({
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "cpf": user["cpf"]
        })
    
    return {"users": formatted_users}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)