from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.core.logger import logger

class MongoDB:
    client: AsyncIOMotorClient = None
    db = None

db = MongoDB()

async def connect_to_mongo():
    """Establish async connection to MongoDB Atlas."""
    try:
        db.client = AsyncIOMotorClient(settings.MONGODB_URI)
        db.db = db.client.get_database("rag_premium")
        # Verify connection
        await db.client.admin.command('ping')
        logger.info("MONGO_CONNECTED", db="rag_premium")
    except Exception as e:
        logger.error("MONGO_CONNECTION_FAILED", error=str(e))
        raise e

async def close_mongo_connection():
    if db.client:
        db.client.close()
        logger.info("MONGO_DISCONNECTED")
