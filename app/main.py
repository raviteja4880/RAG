import time
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from fastapi.exceptions import RequestValidationError
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

print("STEP 1: App Gateway Loading...")
from app.api.routes import router
from app.core.config import settings
from app.core.logger import logger
print("STEP 4: Security & Middleware Ready.")

# --- 1. Production Diagnostics & Boot ---
def create_application() -> FastAPI:
    application = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description="Production-Ready RAG with Pinecone & Groq",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
    )
    return application

print("STEP 5: Server binding to port...")
app = create_application()
limiter = Limiter(key_func=get_remote_address)

# --- 2. Middleware: Logging & Performance ---
class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
        logger.info(
            "API_REQUEST",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            latency=f"{process_time:.4f}s"
        )
        response.headers["X-Process-Time"] = f"{process_time:.4f}s"
        return response

app.add_middleware(LoggingMiddleware)

# --- 3. Middleware: Security & CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 4. Global Exception Handlers ---
@app.exception_handler(RateLimitExceeded)
async def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "success": False,
            "data": None,
            "error": "RATE_LIMIT_EXCEEDED",
            "message": "Too many requests. Please try again later."
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error("VALIDATION_ERROR", errors=exc.errors(), body=await request.body())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "data": None,
            "error": "VALIDATION_ERROR",
            "message": "Validation failed",
            "details": exc.errors()
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log the full stack trace internally
    logger.exception("GLOBAL_EXCEPTION", error=str(exc), path=request.url.path)
    
    # Hide details in production
    detail = str(exc) if settings.DEBUG else "Internal Server Error"
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "data": None,
            "error": "INTERNAL_SERVER_ERROR",
            "message": detail
        }
    )

# --- 5. Routing (Versioned) ---
app.include_router(router, prefix=settings.API_V1_STR)

# --- 6. Production Health check ---
@app.get("/health")
@app.get("/")
async def health_check():
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "version": settings.VERSION,
            "environment": settings.ENV
        },
        "error": None
    }

# --- 7. Lifecycle Events ---
@app.on_event("startup")
async def startup_event():
    logger.info("BOOT_START", env=settings.ENV, debug=settings.DEBUG)
    
    # Check MongoDB (Async - Safe)
    from app.db.client import connect_to_mongo
    try:
        await connect_to_mongo()
        logger.info("DB_STATUS", engine="MongoDB", status="CONNECTED")
    except Exception as e:
        logger.error("DB_STATUS", engine="MongoDB", status="OFFLINE", error=str(e))

    # Diagnostic check (Silent)
    logger.info("BOOT_COMPLETE", status="LISTENING")

@app.on_event("shutdown")
async def shutdown_event():
    from app.db.client import close_mongo_connection
    await close_mongo_connection()
    logger.info("BOOT_SHUTDOWN", status="CLEAN")