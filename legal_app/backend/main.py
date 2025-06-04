"""
Main FastAPI application for LexAssist
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import your auth router
from api.auth_endpoints import router as auth_router

# Create FastAPI app
app = FastAPI(
    title="LexAssist API",
    description="Legal assistance application backend",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://lex-assist.vercel.app"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

# Include routers
app.include_router(auth_router, prefix="/api/auth")

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