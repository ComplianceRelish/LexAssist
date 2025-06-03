"""
Lex Assist FastAPI Backend Application Entry Point

This module initializes the main FastAPI application and registers all API routers.
"""

import os
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger("lexassist")

# Custom middleware for CORS debugging and control
class CORSDebugMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Log request information
        logger.info(f"Request: {request.method} {request.url}")
        
        # Process the request
        response = await call_next(request)
        
        # Add CORS headers to all responses
        origins = ["https://lex-assist.vercel.app", "http://localhost:3000", "http://localhost:5173"]
        origin = request.headers.get("origin", "")
        
        # Only add specific origin if it's in our allowed list
        if origin in origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        
        # For OPTIONS requests, ensure all necessary CORS headers are set
        if request.method == "OPTIONS":
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
            response.headers["Access-Control-Max-Age"] = "86400"
        
        # Log response headers for debugging
        logger.info(f"Response headers: {dict(response.headers)}")
        
        return response

# Create FastAPI application
app = FastAPI(
    title="LexAssist API",
    description="Legal AI Assistant API Services",
    version="1.0.0",
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://lex-assist.vercel.app", "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    expose_headers=["Content-Type", "Authorization"],
    max_age=86400,
)

# Add custom CORS debugging middleware
app.add_middleware(CORSDebugMiddleware)

# Import API routers
from api.auth_endpoints import router as auth_router
# from api.chat import router as chat_router
# from api.documents import router as documents_router
from api.legal_bert import router as legal_bert_router

# Register routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
# app.include_router(chat_router)
# app.include_router(documents_router)
app.include_router(legal_bert_router, prefix="/api/legal-bert", tags=["Legal BERT"])

# Test endpoint for CORS verification
@app.get("/api/test-cors", tags=["Test"])
async def test_cors(response: Response):
    """Test endpoint for CORS configuration"""
    response.headers["Access-Control-Allow-Origin"] = "https://lex-assist.vercel.app"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return {"message": "CORS test successful", "timestamp": str(datetime.now())}

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
    from datetime import datetime
    
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)