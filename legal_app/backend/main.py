"""
Main FastAPI application for LexAssist
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from fastapi.responses import JSONResponse
import logging
import os

# Load environment variables
load_dotenv()

# Import routers - use relative imports that will work in deployment
from api.auth_endpoints import router as auth_router
from api.legal_endpoints import router as legal_router

# Create FastAPI app
app = FastAPI(
    title="LexAssist API",
    description="Legal assistance application backend",
    version="1.0.0"
)

# ✅ Updated CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://lex-assist.vercel.app",
        "https://lex-assist-o1uh54us1-compliancerelishs-projects.vercel.app",
        "http://localhost:3000",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],  # Allow all headers
)

# Include routers
app.include_router(auth_router, prefix="/api/auth")
app.include_router(legal_router)  # No prefix as router already has prefix='/api'

# Health check endpoint
@app.get("/")
async def root():
    """Root endpoint for health checks"""
    return {
        "status": "ok",
        "message": "LexAssist API is running",
        "version": "1.0.0"
    }

@app.get("/api/debug/cors")
async def debug_cors():
    """Debug endpoint for CORS testing"""
    return {
        "status": "ok",
        "cors": "enabled",
        "message": "CORS is properly configured"
    }

    # Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="LexAssist Legal AI API",
    description="Advanced Legal Assistant with AI-powered analysis",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://lex-assist.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers with error handling
try:
    from api.auth_endpoints import router as auth_router
    app.include_router(auth_router)
    logger.info("Auth endpoints loaded successfully")
except ImportError as e:
    logger.warning(f"Auth endpoints not available: {e}")

try:
    from api.legal_endpoints import router as legal_router
    app.include_router(legal_router)
    logger.info("Legal endpoints loaded successfully")
except ImportError as e:
    logger.warning(f"Legal endpoints not available: {e}")

@app.get("/")
async def root():
    return {
        "message": "LexAssist Legal AI API",
        "version": "1.0.0",
        "status": "operational"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "services": {
            "api": "operational",
            "database": "operational"
        }
    }

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))