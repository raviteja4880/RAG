from typing import List, Optional
from flashrank import Ranker, RerankRequest
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq

from app.core.config import settings
from app.services.vector_store import VectorStoreService

class RetrievalService:
    def __init__(self):
        # 1. Initialize Vector Store
        self.vector_store_service = VectorStoreService()
        
        # 2. Initialize Reranker (Local/Fast)
        self.ranker = Ranker(model_name="ms-marco-MiniLM-L-12-v2", cache_dir="/tmp/flashrank")
        
        # 3. Initialize Query Rewriter (Groq)
        self.llm = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0,
            groq_api_key=settings.GROQ_API_KEY
        )

    def rewrite_query(self, query: str, history: List = None) -> str:
        """Expand user intent into structured document field synonyms (HyDE Lite)."""
        system_prompt = (
            "You are a retrieval query expansion engine. Transform user questions into "
            "exhaustive standalone search terms optimized for government forms.\n\n"
            "MAPPING RULES:\n"
            "- 'Applicant/Name' -> 'Given Name', 'Surname', 'First Name', 'Last Name', 'Full Name'\n"
            "- 'DOB/Birth' -> 'Date of Birth', 'DOB', 'Year of Birth'\n"
            "- 'Address' -> 'Residential Address', 'Present Address', 'Permanent Address'\n"
            "- 'Passport/ID' -> 'File Number', 'Reference No', 'Passport No', 'Application No'\n\n"
            "TASK: Rephrase the question to include these field names if relevant. "
            "Example: 'Who is the applicant?' -> 'Given Name Surname Applicant Full Name'\n"
            "Output ONLY the optimized search keywords."
        )
        
        from langchain_core.messages import SystemMessage, HumanMessage
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"History: {history}\nQuestion: {query}")
        ]
        
        response = self.llm.invoke(messages)
        return response.content.strip()

    def retrieve_and_rerank(self, query: str, history: List = None, user_id: Optional[str] = None, session_id: Optional[str] = None) -> List[Document]:
        """Hybrid Search + Reranking Pipeline with Caching & Compatibility Filters."""
        from app.core.logger import logger
        from app.services.cache import cache
        
        # 1. Standalone Query Optimization (Cached)
        cache_key = {"query": query, "history": str(history), "type": "standalone"}
        standalone_query = cache.get("q_opt", cache_key)
        
        if not standalone_query:
            standalone_query = self.rewrite_query(query, history) if history else query
            cache.set("q_opt", cache_key, standalone_query, ttl=settings.CACHE_TTL_CHUNKS)
        
        # 2. Phase 1: High-Recall Vector Search (with Partitioning/Filtering)
        # Apply strict multitenancy and session isolation
        search_filters = {}
        if user_id and user_id != "all":
            search_filters["user_id"] = user_id
        if session_id:
            search_filters["session_id"] = session_id
        
        # We no longer need the BGE-specific "Represent this sentence..." prefix 
        # for all-MiniLM-L6-v2, which improves search accuracy and response speed.
        search_query = standalone_query
        logger.debug("RETRIEVAL_START", query=standalone_query, filters=search_filters)
        
        retriever = self.vector_store_service.get_retriever(search_kwargs={
            "k": settings.RETRIEVAL_K,
            "filter": search_filters
        })
        
        # Check Cache for Chunks
        chunk_cache_key = {"search_query": search_query, "filters": search_filters}
        initial_docs = cache.get("chunks", chunk_cache_key)
        
        if not initial_docs:
            initial_docs = retriever.invoke(search_query)
            if not initial_docs:
                logger.warning("RETRIEVAL_EMPTY", query=standalone_query, filters=search_filters)
                return []
            # Only cache if results were found
            cache.set("chunks", chunk_cache_key, [d.dict() for d in initial_docs], ttl=settings.CACHE_TTL_CHUNKS)
        else:
            initial_docs = [Document(**d) for d in initial_docs]

        # 3. Phase 2: Reranking (Refinement Top-K=5)
        # Convert documents to FlashRank format
        passages = [
            {"id": i, "text": doc.page_content, "meta": doc.metadata} 
            for i, doc in enumerate(initial_docs)
        ]
        
        from flashrank import RerankRequest
        rerank_request = RerankRequest(query=standalone_query, passages=passages)
        results = self.ranker.rerank(rerank_request)
        
        # 4. Phase 3: Filter & Format Final Results
        final_docs = []
        is_overview = any(word in standalone_query.lower() for word in ["overview", "summary", "summarize", "about", "context"])

        for result in results[:settings.RERANK_K]:
            score = result.get("score", 0.0)
            threshold = 0.001 if is_overview else settings.RERANK_THRESHOLD
            if score > threshold: 
                final_docs.append(Document(
                    page_content=result["text"], 
                    metadata=result["meta"]
                ))

        if not final_docs or (is_overview and len(final_docs) < 3):
            logger.warning("RERANK_LENIENT_EXPANSION", is_overview=is_overview)
            # Fill with initial docs if we need more context for an overview
            existing_ids = {d.page_content for d in final_docs}
            for d in initial_docs[:5]:
                if d.page_content not in existing_ids and len(final_docs) < 5:
                    final_docs.append(d)
        
        logger.info("RETRIEVAL_SUCCESS", count=len(final_docs), top_score=results[0].get('score') if results else 0)
            
        return final_docs
