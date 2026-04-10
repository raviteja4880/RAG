import uuid
from datetime import datetime
from typing import List, Optional
from app.db.client import db
from app.db.schemas import Message, ChatSession
from app.core.logger import logger

class HistoryService:
    def __init__(self):
        self.sessions = None

    def _get_coll(self):
        if self.sessions is None:
            self.sessions = db.db.get_collection("chat_sessions")
        return self.sessions

    async def get_sessions_for_user(self, user_id: str) -> List[dict]:
        """Fetch all conversation history for a specific user ID, sorted by pinned and then date."""
        coll = self._get_coll()
        cursor = coll.find({"user_id": user_id}).sort([("is_pinned", -1), ("updated_at", -1)])
        sessions = await cursor.to_list(length=100)
        return sessions

    async def create_session(self, user_id: str, title: str = "New Conversation") -> dict:
        """Initialize a new persistent conversation session."""
        coll = self._get_coll()
        sess = {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": title,
            "messages": [],
            "is_pinned": False,
            "updated_at": datetime.utcnow()
        }
        await coll.insert_one(sess)
        logger.info("CHAT_SESSION_CREATED", user_id=user_id, id=sess["_id"])
        return sess

    async def add_message(self, session_id: str, role: str, content: str):
        """Append a single message (user or AI) to an active session."""
        coll = self._get_coll()
        msg = {
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow()
        }
        await coll.update_one(
            {"_id": session_id},
            {
                "$push": {"messages": msg},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        logger.debug("CHAT_MESSAGE_SAVED", session_id=session_id, role=role)

    async def update_title(self, session_id: str, title: str):
        """Refine the title of a persistent conversation."""
        coll = self._get_coll()
        await coll.update_one(
            {"_id": session_id},
            {"$set": {"title": title}}
        )

    async def delete_session(self, session_id: str):
        """Permanently remove a conversation session history."""
        coll = self._get_coll()
        await coll.delete_one({"_id": session_id})
        logger.info("CHAT_SESSION_DELETED", id=session_id)

    async def toggle_pin(self, session_id: str):
        """Toggle the pinned state of a conversation."""
        coll = self._get_coll()
        session = await coll.find_one({"_id": session_id})
        if session:
            new_state = not session.get("is_pinned", False)
            await coll.update_one({"_id": session_id}, {"$set": {"is_pinned": new_state}})
            return new_state
        return False

history_service = HistoryService()
