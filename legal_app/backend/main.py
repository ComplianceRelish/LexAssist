# legal_app/backend/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import os

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

# Import and include routers
try:
    from api.auth_endpoints import router as auth_router
    app.include_router(auth_router)  # This will now add /api/auth/* endpoints
    logger.info("✅ Auth endpoints loaded successfully")
except ImportError as e:
    logger.error(f"❌ Auth endpoints failed to load: {e}")

try:
    from api.legal_endpoints import router as legal_router
    app.include_router(legal_router)  # This adds /api/* endpoints
    logger.info("✅ Legal endpoints loaded successfully")
except ImportError as e:
    logger.error(f"❌ Legal endpoints failed to load: {e}")

# Register InLegalBERT endpoints
try:
    logger.info("Attempting to load InLegalBERT endpoints")
    
    # Check if torch and transformers are available
    try:
        import torch
        logger.info(f"PyTorch available: {torch.__version__}")
    except ImportError as e:
        logger.error(f"PyTorch not available: {e}")
        
    try:
        import transformers
        logger.info(f"Transformers available: {transformers.__version__}")
    except ImportError as e:
        logger.error(f"Transformers not available: {e}")
    
    try:
        # Import the standard legal bert router
        from api.legal_bert import router as legal_bert_router
        logger.info("InLegalBERT router imported")
        
        # Register the router
        app.include_router(legal_bert_router, prefix="/api/inlegalbert", tags=["InLegalBERT"])
        logger.info("✅ InLegalBERT endpoints loaded successfully")
    except Exception as e:
        import traceback
        logger.error(f"❌ InLegalBERT endpoints failed to load: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
    
    try:
        # Import the Model Context Protocol router
        from api.model_context_endpoints import router as model_context_router
        logger.info("Model Context Protocol router imported")
        
        # Register the router
        app.include_router(model_context_router, prefix="/api/legal-ai", tags=["LegalAI"])
        logger.info("✅ Model Context Protocol endpoints loaded successfully")
    except Exception as e:
        import traceback
        logger.error(f"❌ Model Context Protocol endpoints failed to load: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        
except Exception as e:
    import traceback
    logger.error(f"❌ InLegalBERT dependencies failed to load: {e}")
    logger.error(f"Traceback: {traceback.format_exc()}")

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