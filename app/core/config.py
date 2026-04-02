import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # LLM & AI Keys
    GROQ_API_KEY: str
    PINECONE_API_KEY: str
    HF_TOKEN: Optional[str] = None
    
    # Cloud Infrastructure
    MONGODB_URI: str
    PINECONE_INDEX: str = "rag-premium"
    
    # Redis Caching (Infrastructure)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    
    # RAG Hyperparameters (Advanced)
    RETRIEVAL_K: int = 15      # Chunks to pull for reranking
    RERANK_K: int = 5         # Final chunks for LLM
    RERANK_THRESHOLD: float = 0.01
    
    # Reliability & Production (Guardrails)
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    RATE_LIMIT_PER_MINUTE: int = 30
    CACHE_TTL_RESPONSE: int = 3600
    CACHE_TTL_CHUNKS: int = 1200
    
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

settings = Settings()