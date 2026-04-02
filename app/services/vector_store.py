import os
import time
from typing import List, Optional
from pinecone import Pinecone, ServerlessSpec
from langchain_pinecone import PineconeVectorStore
from app.core.logger import logger

from app.core.config import settings
from app.services.embedding import get_embeddings

class VectorStoreService:
    def __init__(self):
        # 1. Warm Start Shared Singleton Embeddings (384-Dim for Real-time speed)
        self.embeddings = get_embeddings()
        self.dimension = 384
        
        # 2. Check for Pinecone Keys
        if not settings.PINECONE_API_KEY:
             logger.error("PINECONE_API_KEY_MISSING")
             return

        # 3. Connect to Pinecone Client
        pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        
        # 4. Dimension Guard & Self-Healing Index Creation
        try:
            existing_indexes = pc.list_indexes().names()
            
            # If migrating from v2 (1024d) to v3 (384d), we must use a different index name 
            # to prevent Pinecone dimension mismatch errors (500).
            active_index = settings.PINECONE_INDEX
            
            if active_index in existing_indexes:
                desc = pc.describe_index(active_index)
                if desc.dimension != self.dimension:
                    logger.warning("PINECONE_DIMENSION_MISMATCH", 
                        index=active_index, 
                        expected=self.dimension, 
                        found=desc.dimension
                    )
                    # Use a versioned index automatically to prevent 500 errors
                    active_index = f"{active_index}-v3"
                    logger.info("ROUTING_TO_VERSIONED_INDEX", index=active_index)

            if active_index not in existing_indexes:
                logger.info("CREATING_PINECONE_INDEX", index=active_index, dimension=self.dimension)
                pc.create_index(
                    name=active_index,
                    dimension=self.dimension,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1")
                )
                while not pc.describe_index(active_index).status['ready']:
                    time.sleep(1)

            # 5. Connect LangChain VectorStore
            self.vector_store = PineconeVectorStore(
                index_name=active_index,
                embedding=self.embeddings,
                pinecone_api_key=settings.PINECONE_API_KEY
            )
            logger.info("VECTOR_STORE_READY", index=active_index)
            
        except Exception as e:
            logger.error("VECTOR_STORE_INIT_FAILED", error=str(e))
            raise e

    def upsert_documents(self, documents: List):
        """Add semantic chunks to Pinecone cloud with batch ingestion."""
        logger.info("UPSERT_START", count=len(documents))
        try:
            self.vector_store.add_documents(documents)
            logger.info("UPSERT_SUCCESS")
        except Exception as e:
            logger.error("UPSERT_FAILED", error=str(e))
            raise e

    def get_retriever(self, search_kwargs: Optional[dict] = None):
        """Return a production retriever with custom top-K."""
        kwargs = search_kwargs or {"k": settings.RETRIEVAL_K}
        return self.vector_store.as_retriever(search_kwargs=kwargs)