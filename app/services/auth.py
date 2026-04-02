import bcrypt
import uuid
from datetime import datetime
from typing import Optional
from app.db.client import db
from app.db.schemas import UserSchema, RegisterRequest, LoginRequest
from app.core.logger import logger

class AuthService:
    def __init__(self):
        self.collection = None

    def _get_collection(self):
        if self.collection is None:
            self.collection = db.db.get_collection("users")
        return self.collection

    async def register(self, req: RegisterRequest) -> Optional[dict]:
        """Register a new verified user."""
        coll = self._get_collection()
        
        # Check if exists
        existing = await coll.find_one({"email": req.email})
        if existing:
            return None
        
        hashed = bcrypt.hashpw(req.password.encode('utf-8'), bcrypt.gensalt())
        
        user_data = {
            "_id": str(uuid.uuid4()),
            "email": req.email,
            "hashed_password": hashed.decode('utf-8'),
            "is_verified": True, # For this request, we auto-verify
            "created_at": datetime.utcnow()
        }
        
        await coll.insert_one(user_data)
        logger.info("USER_REGISTERED", email=req.email)
        return user_data

    async def login(self, req: LoginRequest) -> Optional[dict]:
        """Authenticate a user."""
        coll = self._get_collection()
        user = await coll.find_one({"email": req.email})
        
        if not user:
            return None
            
        if bcrypt.checkpw(req.password.encode('utf-8'), user['hashed_password'].encode('utf-8')):
            logger.info("USER_LOGIN_SUCCESS", email=req.email)
            return user
            
        logger.warning("USER_LOGIN_FAILED", email=req.email)
        return None

auth_service = AuthService()
