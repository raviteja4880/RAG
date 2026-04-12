import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List
from functools import lru_cache

class Settings(BaseSettings):
    # Environment State
    ENV: str = "local"  # local, staging, production
    DEBUG: bool = True
    
    # API Metadata
    PROJECT_NAME: str = "RAG Premium"
    VERSION: str = "3.0.0"
    API_V1_STR: str = "/api/v1"
    FRONTEND_URL: str = "http://localhost:5173"
    
    # LLM & AI Keys
    GROQ_API_KEY: str
    PINECONE_API_KEY: str
    HF_TOKEN: Optional[str] = None
    
    # Databases
    MONGODB_URI: str
    PINECONE_INDEX: str = "rag-premium"
    
    # Redis Caching
    REDIS_URL: Optional[str] = None # Standard URI format
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    
    # Security
    JWT_SECRET_KEY: str = "HACK_ME_PROJECT_SECRET_123" # Change in production
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173", "https://rag-three-tau.vercel.app"]
    
    # RAG Hyperparameters
    RETRIEVAL_K: int = 15
    RERANK_K: int = 5
    RERANK_THRESHOLD: float = 0.01
    
    # Reliability
    LOG_LEVEL: str = "INFO"
    RATE_LIMIT_PER_MINUTE: int = 30
    CACHE_TTL_RESPONSE: int = 3600
    CACHE_TTL_CHUNKS: int = 1200

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()