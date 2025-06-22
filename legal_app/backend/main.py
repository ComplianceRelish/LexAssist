# legal_app/backend/main.py

import os
import logging

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
    version="1.0.0",
    # Don't validate methods by default - we'll handle it explicitly
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Configure CORS using environment variables or defaults
allowed_origins_str = os.environ.get('CORS_ALLOWED_ORIGINS', 'https://lex-assist.vercel.app,http://localhost:3000,http://localhost:3001')
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(',')]
allowed_methods_str = os.environ.get('CORS_ALLOW_METHODS', 'GET,POST,PUT,DELETE,OPTIONS,PATCH')
allowed_methods = [method.strip() for method in allowed_methods_str.split(',')]
allowed_headers_str = os.environ.get('CORS_ALLOW_HEADERS', 'Content-Type,Authorization,X-Requested-With,Accept,Origin')
allowed_headers = [header.strip() for header in allowed_headers_str.split(',')]
max_age = int(os.environ.get('CORS_MAX_AGE', '600'))
allow_credentials = os.environ.get('CORS_ALLOW_CREDENTIALS', 'true').lower() == 'true'

logger.info(f"Configuring CORS with origins: {allowed_origins}")

# For debugging purposes - log all CORS settings
for key, value in os.environ.items():
    if key.startswith('CORS_'):
        logger.info(f"CORS environment variable: {key}={value}")

# Enhanced CORS debugging - print all values being used
logger.info(f"CORS config: origins={allowed_origins}, methods={allowed_methods}, headers={allowed_headers}")
logger.info(f"CORS credentials: {allow_credentials}, max_age: {max_age}")

# In Cloud Run, we might need to handle '*' for development
if '*' in allowed_origins:
    logger.warning("CORS is configured to allow all origins ('*')")

# Add CORS middleware with explicit configuration and additional headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if '*' not in allowed_origins else ["*"],
    allow_credentials=allow_credentials and '*' not in allowed_origins,
    allow_methods=allowed_methods,
    allow_headers=allowed_headers,
    expose_headers=["Content-Length", "Content-Type", "Authorization", "X-Requested-With"],
    max_age=max_age,  # Cache preflight requests
)

# Add explicit OPTIONS handler for troubleshooting
@app.options("/{path:path}", include_in_schema=False)
async def options_handler(path: str):
    """Global OPTIONS handler to support CORS preflight requests"""
    from fastapi.responses import Response
    logger.info(f"OPTIONS request received for path: /{path}")
    
    # Define allowed methods based on the endpoint
    allowed_methods_list = ["OPTIONS", "GET", "POST", "PUT", "DELETE", "PATCH"]
    
    # Special handling for login endpoint and related auth paths
    if path.startswith("api/auth/"):
        if path == "api/auth/login":
            # Critical: Ensure login endpoint accepts POST
            logger.info(f"OPTIONS for login endpoint, ensuring POST method is allowed")
            allowed_methods_list = ["OPTIONS", "POST"]
            
            # Log detailed debugging information for login endpoint
            logger.info(f"Login endpoint CORS debug:")
            logger.info(f"  - Origin header: {allowed_origins}")
            logger.info(f"  - Allow credentials: {allow_credentials}")
        elif path.endswith("/refresh"):
            logger.info(f"OPTIONS for token refresh endpoint")
            allowed_methods_list = ["OPTIONS", "POST", "GET"]
        else:
            logger.info(f"OPTIONS for other auth endpoint: {path}")
    
    allowed_methods_str = ",".join(allowed_methods_list)
    logger.info(f"Responding with allowed methods: {allowed_methods_str}")
    
    # Construct response headers
    cors_headers = {
        "Access-Control-Allow-Origin": ",".join(allowed_origins) if "*" not in allowed_origins else "*",
        "Access-Control-Allow-Methods": allowed_methods_str,
        "Access-Control-Allow-Headers": ",".join(allowed_headers),
        "Access-Control-Allow-Credentials": "true" if allow_credentials else "false",
        "Access-Control-Max-Age": str(max_age),
        "Content-Length": "0",
        "Allow": allowed_methods_str  # Also add standard Allow header
    }
    
    # Log the full response headers
    logger.info(f"CORS response headers: {cors_headers}")
    
    # Return response with proper CORS headers
    return Response(
        status_code=200,
        headers=cors_headers
    )

# Health check endpoint
@app.get("/")
async def root():
    return {"message": "LexAssist Backend API", "status": "running", "version": "1.0.0"}

# Dependency verification endpoint
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
    
    # Check cache directories
    cache_status = {}
    cache_dirs = ["/tmp/huggingface", "/tmp/torch"]
    for cache_dir in cache_dirs:
        cache_status[cache_dir] = os.path.exists(cache_dir) and os.access(cache_dir, os.W_OK)
    
    return {
        "status": "healthy",
        "dependencies": dependencies,
        "cache_directories": cache_status,
        "environment": {
            "TRANSFORMERS_CACHE": os.environ.get("TRANSFORMERS_CACHE"),
            "HF_HOME": os.environ.get("HF_HOME"),
            "TORCH_HOME": os.environ.get("TORCH_HOME")
        }
    }

# Import and include routers with debug logging for auth routes
try:
    from api.auth_endpoints import router as auth_router
    
    # Add debug information before including router
    logger.info(f"Auth router routes before inclusion:")
    for route in auth_router.routes:
        logger.info(f"  - {route.path} [{','.join(route.methods)}]")
    
    # Include the router with explicit prefix
    app.include_router(
        auth_router, 
        prefix="/api",  # This prefix + router's /auth prefix = /api/auth/* endpoints
        tags=["Authentication"]
    )
    
    # Add debug route info after inclusion
    logger.info("✅ Auth endpoints loaded successfully")
    for route in app.routes:
        if str(route.path).startswith("/api/auth"):
            logger.info(f"  - {route.path} [{','.join(route.methods) if hasattr(route, 'methods') else 'unknown'}]")

except ImportError as e:
    logger.error(f"❌ Auth endpoints failed to load: {e}")

try:
    from api.legal_endpoints import router as legal_router
    app.include_router(legal_router, prefix="/api")  # Now properly prefixed as /api/* endpoints
    logger.info("✅ Legal endpoints loaded successfully")
except ImportError as e:
    logger.error(f"❌ Legal endpoints failed to load: {e}")
    
try:
    from api.case_endpoints import router as case_router
    app.include_router(case_router, prefix="/api")  # Now properly prefixed as /api/* endpoints
    logger.info("✅ Case endpoints loaded successfully")
except ImportError as e:
    logger.error(f"❌ Case endpoints failed to load: {e}")

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