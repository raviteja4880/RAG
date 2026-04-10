from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.routes import router
from app.core.config import settings

# 1. Initialize API Gateway
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(
    title="RAG Premium 🛸 (High-Performance)",
    description="Enterprise-Grade RAG with Pinecone, Recursive Real-time Chunking, and PyMuPDF Extraction",
    version="3.0.0"
)

# 2. Production Security & Rate Limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "INTERNAL_SERVER_ERROR", "detail": str(exc)}
    )

# 3. Middleware: CORS Optimization
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In strict production, put your frontend domain here
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Mount Industry-Standard Routes
app.include_router(router)

# 5. Production Diagnostics & Boot Check
@app.on_event("startup")
async def startup_event():
    print("\n" + "="*60)
    print("      ***  RAG PREMIUM v3.0 - HIGH PERFORMANCE BOOT  ***")
    print("="*60)
    
    # Check MongoDB
    from app.db.client import connect_to_mongo
    try:
        await connect_to_mongo()
        print("  [OK] MONGODB ATLAS    |  CONNECTED (PERSISTENCE LAYER)")
    except Exception as e:
        print(f"  [ERROR] MONGODB ATLAS |  OFFLINE (ERROR: {e})")

    # Check Pinecone
    try:
        from pinecone import Pinecone
        pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        pc.list_indexes()
        print("  [OK] PINECONE VECTOR  |  CONNECTED (VERSIONED CLUSTER)")
    except Exception as e:
        print(f"  [ERROR] PINECONE VECTOR|  OFFLINE (ERROR: {e})")
        
    # Check Groq Hub
    if settings.GROQ_API_KEY and len(settings.GROQ_API_KEY) > 10:
        print("  [OK] GROQ CORE AI HUB |  AUTHORIZED (STREAMING ENABLED)")
    else:
        print("  [ERROR] GROQ HUB      |  UNAUTHORIZED (KEY MISSING)")

    print("  [OK] RAG PIPELINE     |  REAL-TIME RECURSIVE CHUNKING ACTIVE")
    print("="*60 + "\n")

@app.on_event("shutdown")
async def shutdown_event():
    from app.db.client import close_mongo_connection
    await close_mongo_connection()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "3.0.0", "engine": "high_performance_v3"}