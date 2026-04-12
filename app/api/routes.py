import os
import shutil
import tempfile
import time
from typing import List, Optional
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Request, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings
from app.services.ingestion import IngestionService
from app.services.retrieval import RetrievalService
from app.services.llm import LLMService
from app.services.vector_store import VectorStoreService
from app.services.auth import auth_service
from app.services.history import history_service
from app.db.schemas import LoginRequest, RegisterRequest
from app.core.logger import logger

# 1. Setup API Router & Services
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Lazy Service Singletons (Prevents blocking server startup)
_services = {}

def get_ingestion() -> IngestionService:
    if "ingestion" not in _services:
        _services["ingestion"] = IngestionService()
    return _services["ingestion"]

def get_retrieval() -> RetrievalService:
    if "retrieval" not in _services:
        _services["retrieval"] = RetrievalService()
    return _services["retrieval"]

def get_llm() -> LLMService:
    if "llm" not in _services:
        _services["llm"] = LLMService()
    return _services["llm"]

def get_vector_store() -> VectorStoreService:
    if "vector_store" not in _services:
        _services["vector_store"] = VectorStoreService()
    return _services["vector_store"]

# 2. Pydantic Models
class MessageRequest(BaseModel):
    session_id: str
    role: str
    content: str

class QuestionRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=2000)
    session_id: Optional[str] = None
    history: Optional[List[dict]] = []

# 3. Auth Endpoints
@router.post("/auth/register")
async def register(req: RegisterRequest):
    user = await auth_service.register(req)
    if not user:
        raise HTTPException(status_code=400, detail="EMAIL_EXISTS")
    return {"status": "success", "user_id": user["_id"], "email": user["email"]}

@router.post("/auth/login")
async def login(req: LoginRequest):
    user = await auth_service.login(req)
    if not user:
        raise HTTPException(status_code=401, detail="INVALID_CREDENTIALS")
    return {"status": "success", "user_id": user["_id"], "email": user["email"]}

# 4. History Endpoints
@router.get("/history/sessions")
async def get_sessions(user_id: str):
    sessions = await history_service.get_sessions_for_user(user_id)
    return {"sessions": sessions}

@router.post("/history/create")
async def create_session(user_id: str):
    sess = await history_service.create_session(user_id)
    return sess

@router.delete("/history/session/{session_id}")
async def delete_session(session_id: str):
    # 1. Clear Database Messages
    await history_service.delete_session(session_id)
    # 2. Clear Vectors for strict data isolation
    get_vector_store().delete_by_session(session_id)
    return {"status": "deleted"}

@router.post("/history/add_message")
async def add_message(req: MessageRequest):
    await history_service.add_message(req.session_id, req.role, req.content)
    return {"status": "success"}

@router.post("/history/toggle_pin/{session_id}")
async def toggle_pin(session_id: str):
    new_state = await history_service.toggle_pin(session_id)
    return {"is_pinned": new_state}

@router.post("/history/rename/{session_id}")
async def rename_session(session_id: str, title: str):
    await history_service.update_title(session_id, title)
    return {"status": "renamed", "title": title}

# 5. Core RAG Routes
@router.post("/upload")
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def upload_file(
    request: Request, 
    file: UploadFile = File(...), 
    user_id: str = Query("guest"), 
    session_id: Optional[str] = Query(None)
):
    """Deep ingestion pipeline with synchronous persistence for verified indexing."""
    start_time = time.time()
    logger.info("UPLOAD_REQUEST", filename=file.filename, user_id=user_id)
    
    try:
        ext = os.path.splitext(file.filename)[1].lower()
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        # --- SYNCHRONOUS PROCESSING (Ensures data is ready) ---
        docs = get_ingestion().process_file(tmp_path, user_id=user_id, session_id=session_id)
        get_vector_store().upsert_documents(docs)
        
        # PERSIST: Add document marker to chat history
        if session_id:
             await history_service.add_message(session_id, "user", f"[Document Uploaded: {file.filename}]")
        
        os.remove(tmp_path)
        latency = time.time() - start_time
        logger.info("UPLOAD_SUCCESS", chunks=len(docs), latency=round(latency, 2))
        
        return {
            "status": "success",
            "filename": file.filename,
            "chunks_indexed": len(docs),
            "latency": round(latency, 2)
        }
    except Exception as e:
        logger.error("UPLOAD_FAILURE", error=str(e), filename=file.filename)
        raise HTTPException(status_code=500, detail="Internal server error during ingestion.")

@router.post("/ask")
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def ask_question(request: Request, body: QuestionRequest, user_id: str = "guest"):
    """Enhanced Retrieval + Reranking + Cached Streaming Pipeline with Persistence."""
    start_time = time.time()
    logger.info("ASK_REQUEST", question=body.question[:50], user_id=user_id)

    try:
        # History formatting for Services
        history_list = body.history or []
        
        # 0. Persist User Question Immediately
        if body.session_id:
            await history_service.add_message(body.session_id, "user", body.question)

        # 1. Phase A: Retrieval (Cached & Filtered by user_id AND session_id)
        top_docs = get_retrieval().retrieve_and_rerank(
            body.question, 
            history_list, 
            user_id=user_id, 
            session_id=body.session_id
        )
        
        if not top_docs:
             context = "No relevant documents found for this query in your database."
        else:
             context = "\n\n".join([f"[Ref: {d.metadata.get('source')}] {d.page_content}" for d in top_docs])

        # 2. Phase B: Context-Aware Streaming with Persistence hook
        async def stream_and_persist():
            full_response = ""
            async for chunk in get_llm().generate_stream(body.question, context, history_list):
                full_response += chunk
                yield chunk
            
            # Persist AI response
            if body.session_id:
                await history_service.add_message(body.session_id, "ai", full_response)
                # Auto-title update
                if not history_list or len(history_list) < 2:
                    await history_service.update_title(body.session_id, body.question[:25] + "...")

        return StreamingResponse(stream_and_persist(), media_type="text/event-stream")

    except Exception as e:
         logger.exception("GEN_PIPELINE_FAILED", error=str(e))
         raise HTTPException(status_code=500, detail="An error occurred while generating the answer.")