from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime

class Message(BaseModel):
    role: str # user or ai
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatSession(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    title: str
    messages: List[Message] = []
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserSchema(BaseModel):
    id: str = Field(alias="_id")
    email: EmailStr
    hashed_password: str
    is_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
