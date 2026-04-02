import json
import redis
import hashlib
from typing import Optional, Any
from app.core.config import settings
from app.core.logger import logger

class CacheService:
    def __init__(self):
        try:
            self.client = redis.Redis(
                host=getattr(settings, "REDIS_HOST", "localhost"),
                port=getattr(settings, "REDIS_PORT", 6379),
                password=getattr(settings, "REDIS_PASSWORD", None),
                db=0,
                decode_responses=True
            )
            # Test connectivity
            self.client.ping()
            self.is_active = True
            logger.info("REDIS_CONNECTED", host=getattr(settings, "REDIS_HOST", "localhost"))
        except Exception as e:
            logger.warning("REDIS_DISABLED_FALLBACK", error=str(e))
            self.is_active = False

    def _get_key(self, prefix: str, data: Any) -> str:
        """Create a unique deterministic key."""
        serialized = json.dumps(data, sort_keys=True)
        return f"{prefix}:{hashlib.md5(serialized.encode()).hexdigest()}"

    def get(self, prefix: str, data: Any) -> Optional[Any]:
        if not self.is_active: return None
        key = self._get_key(prefix, data)
        val = self.client.get(key)
        if val:
            logger.debug("CACHE_HIT", key=key)
            return json.loads(val)
        return None

    def set(self, prefix: str, data: Any, value: Any, ttl: int = 3600):
        if not self.is_active: return
        key = self._get_key(prefix, data)
        self.client.setex(key, ttl, json.dumps(value))
        logger.debug("CACHE_SET", key=key, ttl=ttl)

cache = CacheService()
