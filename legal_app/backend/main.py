"""
Main FastAPI application for LexAssist
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import routers
from legal_app.backend.api.auth_endpoints import router as auth_router
from legal_app.backend.api.legal_endpoints import router as legal_router

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