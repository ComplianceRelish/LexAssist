"""
Lex Assist FastAPI Backend Application Entry Point

This module initializes the main FastAPI application and registers all API routers.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging

# Import API routers
# Temporarily disable other routers to focus on testing InLegalBERT
# from api.auth_endpoints import router as auth_router
# from api.chat import router as chat_router
# from api.documents import router as documents_router
from api.legal_bert import router as legal_bert_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger("lexassist")

# Create FastAPI application
app = FastAPI(
    title="LexAssist API",
    description="Legal AI Assistant API Services",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
# Temporarily disable other routers to focus on testing InLegalBERT
# app.include_router(auth_router)
# app.include_router(chat_router)
# app.include_router(documents_router)
app.include_router(legal_bert_router, prefix="/api/legal-bert", tags=["Legal BERT"])

@app.get("/", tags=["Health Check"])
async def root():
    """Root endpoint for health check"""
    return {"status": "ok", "message": "Lex Assist API is running"}

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": str(exc.detail)},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    """Handle validation errors"""
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc)},
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)