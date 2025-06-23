# legal_app/backend/main.py

import os
import logging
from datetime import datetime

# Set up cache environment BEFORE any ML imports
def setup_cache_environment():
    """Setup cache directories and environment variables"""
    try:
        # Determine base cache path based on environment
        is_cloud_run = os.environ.get("CLOUD_RUN", "false").lower() == "true"
        base_path = "/app/cache" if is_cloud_run else "/tmp"
        print(f"Using cache base path: {base_path}")
        
        # Create cache directories
        cache_dirs = [
            f"{base_path}/huggingface", 
            f"{base_path}/huggingface/models", 
            f"{base_path}/huggingface/tokenizers",
            f"{base_path}/huggingface/datasets",
            f"{base_path}/huggingface/hub",
            f"{base_path}/huggingface/offload",
            f"{base_path}/torch"
        ]
        
        for cache_dir in cache_dirs:
            os.makedirs(cache_dir, exist_ok=True)
            os.chmod(cache_dir, 0o777)
        
        # Set comprehensive environment variables
        cache_env_vars = {
            "TRANSFORMERS_CACHE": f"{base_path}/huggingface",
            "HF_HOME": f"{base_path}/huggingface",
            "HF_DATASETS_CACHE": f"{base_path}/huggingface/datasets",
            "HUGGINGFACE_HUB_CACHE": f"{base_path}/huggingface/hub",
            "TOKENIZERS_PARALLELISM": "false",
            "TORCH_HOME": f"{base_path}/torch",
            "TORCH_CACHE": f"{base_path}/torch",
            "PYTORCH_TRANSFORMERS_CACHE": f"{base_path}/huggingface",
            "PYTORCH_PRETRAINED_BERT_CACHE": f"{base_path}/huggingface",
            "PYTORCH_CUDA_ALLOC_CONF": "max_split_size_mb:32,garbage_collection_threshold:0.6",
            "OMP_NUM_THREADS": "1",
            "MKL_NUM_THREADS": "1",
        }
        
        for key, value in cache_env_vars.items():
            os.environ.setdefault(key, value)
            
        print(f"✅ Cache environment setup complete: {len(cache_dirs)} directories created")
        
    except Exception as e:
        print(f"⚠️ Warning: Could not setup cache environment: {e}")

# Setup cache environment immediately
setup_cache_environment()

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="LexAssist Legal AI API",
    description="Advanced Legal Assistant with AI-powered analysis and Indian Legal System Support",
    version="1.0.0",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Configure CORS using environment variables or defaults
allowed_origins_str = os.environ.get('CORS_ALLOWED_ORIGINS', 'https://lex-assist.vercel.app,http://localhost:3000,http://localhost:3001,http://localhost:5173')
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(',')]
allowed_methods_str = os.environ.get('CORS_ALLOW_METHODS', 'GET,POST,PUT,DELETE,OPTIONS,PATCH')
allowed_methods = [method.strip() for method in allowed_methods_str.split(',')]
allowed_headers_str = os.environ.get('CORS_ALLOW_HEADERS', 'Content-Type,Authorization,X-Requested-With,Accept,Origin')
allowed_headers = [header.strip() for header in allowed_headers_str.split(',')]
max_age = int(os.environ.get('CORS_MAX_AGE', '600'))
allow_credentials = os.environ.get('CORS_ALLOW_CREDENTIALS', 'true').lower() == 'true'

logger.info(f"Configuring CORS with origins: {allowed_origins}")
logger.info(f"CORS config: origins={allowed_origins}, methods={allowed_methods}, headers={allowed_headers}")
logger.info(f"CORS credentials: {allow_credentials}, max_age: {max_age}")

# Add CORS middleware with explicit configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if '*' not in allowed_origins else ["*"],
    allow_credentials=allow_credentials and '*' not in allowed_origins,
    allow_methods=allowed_methods,
    allow_headers=allowed_headers,
    expose_headers=["Content-Length", "Content-Type", "Authorization", "X-Requested-With"],
    max_age=max_age,
)

# Custom middleware for enhanced CORS debugging and handling
class CORSHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Log request details for debugging
        path = request.url.path
        method = request.method
        logger.info(f"Request: {method} {path}")
        
        # Handle preflight requests for auth endpoints specifically
        if method == "OPTIONS" and path.startswith("/api/auth/"):
            logger.info(f"Processing auth preflight request: {path}")
            
            response = StarletteResponse()
            response.headers["Access-Control-Allow-Origin"] = request.headers.get("origin", "*")
            response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS,PATCH"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization,X-Requested-With,Accept,Origin"
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Max-Age"] = "600"
            
            if path == "/api/auth/login":
                response.headers["Allow"] = "OPTIONS, POST"
            
            return response
        
        response = await call_next(request)
        return response

# Add the custom middleware
app.add_middleware(CORSHeadersMiddleware)

@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as exc:
        logger.error(f"Unhandled exception: {exc}")
        
        # Always include CORS headers in error responses
        cors_headers = {
            "Access-Control-Allow-Origin": "https://lex-assist.vercel.app",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS,PATCH",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Requested-With,Accept,Origin",
            "Access-Control-Allow-Credentials": "true"
        }
        
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
            headers=cors_headers
        )

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "LexAssist Backend API", 
        "status": "running", 
        "version": "1.0.0",
        "features": [
            "Indian Legal System Support",
            "Multi-jurisdiction Legal Analysis",
            "AI-powered Legal Research",
            "Authentication with Legal Context"
        ],
        "timestamp": datetime.utcnow().isoformat()
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Check if all critical dependencies are available"""
    dependencies = {}
    
    try:
        import accelerate
        dependencies["accelerate"] = f"✅ {accelerate.__version__}"
    except ImportError as e:
        dependencies["accelerate"] = f"❌ {str(e)}"
    
    try:
        import transformers
        dependencies["transformers"] = f"✅ {transformers.__version__}"
    except ImportError as e:
        dependencies["transformers"] = f"❌ {str(e)}"
    
    try:
        import torch
        dependencies["torch"] = f"✅ {torch.__version__}"
    except ImportError as e:
        dependencies["torch"] = f"❌ {str(e)}"
    
    try:
        import fastapi
        dependencies["fastapi"] = f"✅ {fastapi.__version__}"
    except ImportError as e:
        dependencies["fastapi"] = f"❌ {str(e)}"
    
    try:
        import supabase
        dependencies["supabase"] = f"✅ {supabase.__version__}"
    except ImportError as e:
        dependencies["supabase"] = f"❌ {str(e)}"
    
    # Check cache directories
    cache_status = {}
    is_cloud_run = os.environ.get("CLOUD_RUN", "false").lower() == "true"
    base_path = "/app/cache" if is_cloud_run else "/tmp"
    cache_dirs = [f"{base_path}/huggingface", f"{base_path}/torch"]
    
    for cache_dir in cache_dirs:
        cache_status[cache_dir] = os.path.exists(cache_dir) and os.access(cache_dir, os.W_OK)
    
    return {
        "status": "healthy",
        "dependencies": dependencies,
        "cache_directories": cache_status,
        "environment": {
            "CLOUD_RUN": os.environ.get("CLOUD_RUN"),
            "TRANSFORMERS_CACHE": os.environ.get("TRANSFORMERS_CACHE"),
            "HF_HOME": os.environ.get("HF_HOME"),
            "TORCH_HOME": os.environ.get("TORCH_HOME")
        },
        "timestamp": datetime.utcnow().isoformat()
    }

# Load authentication endpoints with enhanced error handling
auth_loaded = False
try:
    from api.auth_endpoints import router as auth_router
    
    # Debug router information
    logger.info("=== AUTH ROUTER DEBUGGING ===")
    logger.info(f"Auth router type: {type(auth_router)}")
    logger.info(f"Auth router prefix: {getattr(auth_router, 'prefix', 'No prefix')}")
    
    # List all routes in the auth router
    logger.info("Auth router routes:")
    for route in auth_router.routes:
        route_path = getattr(route, 'path', 'unknown')
        route_methods = getattr(route, 'methods', {'unknown'})
        logger.info(f"  - {route_path} [{','.join(route_methods)}]")
    
    # Include the auth router
    app.include_router(
        auth_router, 
        prefix="/api",  # This + router's /auth prefix = /api/auth/*
        tags=["Authentication"]
    )
    
    auth_loaded = True
    logger.info("✅ Auth endpoints loaded successfully")
    
    # Debug: List all app routes that start with /api/auth
    logger.info("App routes after auth inclusion:")
    for route in app.routes:
        route_path = getattr(route, 'path', str(route))
        if '/api/auth' in route_path:
            route_methods = getattr(route, 'methods', {'unknown'})
            logger.info(f"  - {route_path} [{','.join(route_methods)}]")
    
except ImportError as e:
    logger.error(f"❌ Auth endpoints failed to load - ImportError: {e}")
    auth_loaded = False
except Exception as e:
    logger.error(f"❌ Auth endpoints failed to load - Unexpected error: {e}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")
    auth_loaded = False

# Fallback auth endpoint if main auth module fails to load
if not auth_loaded:
    logger.warning("🔄 Creating fallback auth endpoints")
    
    @app.post("/api/auth/login")
    async def fallback_login(request: Request):
        """Fallback login endpoint when auth module fails to load"""
        try:
            body = await request.json()
            email = body.get("email")
            password = body.get("password")
            
            logger.info(f"Fallback login attempt for: {email}")
            
            # This is a temporary fallback - replace with actual authentication
            if email and password:
                return {
                    "access_token": "fallback-token-replace-with-real-auth",
                    "token_type": "bearer",
                    "expires_in": 3600,
                    "user": {
                        "id": "fallback-user-id",
                        "email": email,
                        "full_name": "Fallback User",
                        "role": "user",
                        "subscription_tier": "free",
                        "created_at": datetime.utcnow().isoformat(),
                        "email_verified": True,
                        "phone_verified": False,
                        "country": "IN",
                        "legal_system": "plural",
                        "jurisdiction_type": "federal_union"
                    }
                }
            else:
                raise HTTPException(status_code=400, detail="Email and password required")
                
        except Exception as e:
            logger.error(f"Fallback login error: {e}")
            raise HTTPException(status_code=500, detail="Authentication service temporarily unavailable")
    
    @app.get("/api/auth/health")
    async def fallback_auth_health():
        """Fallback auth health check"""
        return {
            "status": "fallback_mode",
            "message": "Authentication service running in fallback mode",
            "main_auth_module": "failed_to_load"
        }
    
    logger.info("✅ Fallback auth endpoints created")

# Load legal endpoints
try:
    from api.legal_endpoints import router as legal_router
    app.include_router(legal_router, prefix="/api", tags=["Legal"])
    logger.info("✅ Legal endpoints loaded successfully")
except ImportError as e:
    logger.error(f"❌ Legal endpoints failed to load: {e}")
except Exception as e:
    logger.error(f"❌ Legal endpoints unexpected error: {e}")

# Load case endpoints    
try:
    from api.case_endpoints import router as case_router
    app.include_router(case_router, prefix="/api", tags=["Cases"])
    logger.info("✅ Case endpoints loaded successfully")
except ImportError as e:
    logger.error(f"❌ Case endpoints failed to load: {e}")
except Exception as e:
    logger.error(f"❌ Case endpoints unexpected error: {e}")

# Load InLegalBERT endpoints with enhanced error handling
try:
    logger.info("=== LOADING AI/ML ENDPOINTS ===")
    
    # Check ML dependencies first
    ml_dependencies = {}
    try:
        import torch
        ml_dependencies["torch"] = torch.__version__
        logger.info(f"PyTorch available: {torch.__version__}")
    except ImportError as e:
        logger.error(f"PyTorch not available: {e}")
        ml_dependencies["torch"] = None
        
    try:
        import transformers
        ml_dependencies["transformers"] = transformers.__version__
        logger.info(f"Transformers available: {transformers.__version__}")
    except ImportError as e:
        logger.error(f"Transformers not available: {e}")
        ml_dependencies["transformers"] = None
    
    # Load Legal BERT endpoints
    try:
        from api.legal_bert import router as legal_bert_router
        app.include_router(legal_bert_router, prefix="/api/inlegalbert", tags=["InLegalBERT"])
        logger.info("✅ InLegalBERT endpoints loaded successfully")
    except ImportError as e:
        logger.error(f"❌ InLegalBERT endpoints failed to load: {e}")
    except Exception as e:
        logger.error(f"❌ InLegalBERT endpoints unexpected error: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
    
    # Load Model Context Protocol endpoints
    try:
        from api.model_context_endpoints import router as model_context_router
        app.include_router(model_context_router, prefix="/api/legal-ai", tags=["LegalAI"])
        logger.info("✅ Model Context Protocol endpoints loaded successfully")
    except ImportError as e:
        logger.error(f"❌ Model Context Protocol endpoints failed to load: {e}")
    except Exception as e:
        logger.error(f"❌ Model Context Protocol endpoints unexpected error: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        
except Exception as e:
    logger.error(f"❌ ML endpoints loading failed: {e}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")

# Debug endpoint to list all routes
@app.get("/api/debug/routes")
async def debug_routes():
    """Debug endpoint to list all available routes"""
    routes = []
    for route in app.routes:
        route_info = {
            "path": getattr(route, 'path', str(route)),
            "methods": list(getattr(route, 'methods', {'unknown'})),
            "name": getattr(route, 'name', 'unknown')
        }
        routes.append(route_info)
    
    auth_routes = [r for r in routes if '/api/auth' in r['path']]
    
    return {
        "total_routes": len(routes),
        "auth_routes": auth_routes,
        "auth_routes_count": len(auth_routes),
        "auth_module_loaded": auth_loaded,
        "all_routes": routes
    }

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception on {request.method} {request.url.path}: {str(exc)}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")
    
    # Don't expose internal errors in production
    if os.environ.get("CLOUD_RUN") == "true":
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )
    else:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal server error: {str(exc)}"}
        )

# Startup event to log final status
@app.on_event("startup")
async def startup_event():
    logger.info("=== LEXASSIST API STARTUP COMPLETE ===")
    logger.info(f"Auth endpoints loaded: {auth_loaded}")
    
    # Count loaded routes
    auth_routes = [r for r in app.routes if '/api/auth' in str(getattr(r, 'path', ''))]
    logger.info(f"Total auth routes: {len(auth_routes)}")
    
    for route in auth_routes:
        logger.info(f"  - {getattr(route, 'path', 'unknown')} [{','.join(getattr(route, 'methods', {'unknown'}))}]")
    
    logger.info("=== API READY ===")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))