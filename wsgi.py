"""
WSGI entry point for LexAssist FastAPI application
"""
import os
import sys
import subprocess
import logging
import importlib.util
from pathlib import Path

# Configure logging first
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Early accelerate import test
def test_accelerate_import():
    """Test if accelerate can be imported"""
    try:
        import accelerate
        logger.info(f"✅ Accelerate {accelerate.__version__} imported successfully")
        return True
    except ImportError as e:
        logger.error(f"❌ Failed to import accelerate: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error importing accelerate: {e}")
        return False

# Test accelerate before proceeding
if not test_accelerate_import():
    logger.error("CRITICAL: Accelerate module cannot be imported. Deployment will fail.")
    # Don't exit here, let the app start so we can see logs

# Set up comprehensive cache directories BEFORE any imports
def setup_cache_environment():
    """Setup all cache directories and environment variables"""
    try:
        # Create cache directories
        cache_dirs = [
            "/tmp/huggingface", 
            "/tmp/huggingface/models", 
            "/tmp/huggingface/tokenizers",
            "/tmp/huggingface/datasets",
            "/tmp/huggingface/hub",
            "/tmp/huggingface/offload",
            "/tmp/torch"
        ]
        
        for cache_dir in cache_dirs:
            os.makedirs(cache_dir, exist_ok=True)
            os.chmod(cache_dir, 0o777)
        
        # Set comprehensive environment variables to prevent any /app access
        cache_env_vars = {
            "TRANSFORMERS_CACHE": "/tmp/huggingface",
            "HF_HOME": "/tmp/huggingface",
            "HF_DATASETS_CACHE": "/tmp/huggingface/datasets",
            "HUGGINGFACE_HUB_CACHE": "/tmp/huggingface/hub",
            "TOKENIZERS_PARALLELISM": "false",
            "TORCH_HOME": "/tmp/torch",
            "TORCH_CACHE": "/tmp/torch",
            "PYTORCH_TRANSFORMERS_CACHE": "/tmp/huggingface",
            "PYTORCH_PRETRAINED_BERT_CACHE": "/tmp/huggingface",
            # Additional PyTorch memory and CUDA settings
            "PYTORCH_CUDA_ALLOC_CONF": "max_split_size_mb:32,garbage_collection_threshold:0.6",
            "OMP_NUM_THREADS": "1",
            "MKL_NUM_THREADS": "1",
        }
        
        for key, value in cache_env_vars.items():
            os.environ.setdefault(key, value)
            
        logger.info(f"✅ Cache environment setup complete: {len(cache_dirs)} directories created")
        
    except Exception as e:
        logger.error(f"⚠️ Warning: Could not setup cache environment: {e}")

# Setup cache environment immediately
setup_cache_environment()

# Log current working directory and environment
logger.info(f"Current working directory: {os.getcwd()}")
logger.info(f"Python executable: {sys.executable}")
logger.info(f"Python version: {sys.version}")

# Setup Python path for importing the backend app
def setup_python_path():
    """Setup Python path to find the backend application"""
    current_dir = Path(__file__).parent
    backend_dir = current_dir / "legal_app" / "backend"
    
    logger.info(f"Current directory: {current_dir}")
    logger.info(f"Backend directory: {backend_dir}")
    logger.info(f"Backend directory exists: {backend_dir.exists()}")
    
    # Add directories to Python path
    paths_to_add = [
        str(backend_dir),
        str(current_dir),
        str(current_dir / "legal_app")
    ]
    
    for path in paths_to_add:
        if path not in sys.path:
            sys.path.insert(0, path)
            logger.info(f"Added to Python path: {path}")

# Setup Python path
setup_python_path()

# Import the FastAPI app with comprehensive error handling
app = None
try:
    # Try direct import from main
    logger.info("Attempting to import main.app directly...")
    from main import app
    logger.info("✅ Successfully imported app from main")
except ImportError as e:
    logger.warning(f"Direct import failed: {e}")
    try:
        # Try import from legal_app.backend.main
        logger.info("Attempting to import from legal_app.backend.main...")
        from legal_app.backend.main import app
        logger.info("✅ Successfully imported app from legal_app.backend.main")
    except ImportError as e:
        logger.error(f"Failed to import from legal_app.backend.main: {e}")
        try:
            # Last resort: check if main.py exists and import it
            backend_dir = Path(__file__).parent / "legal_app" / "backend"
            main_file = backend_dir / "main.py"
            if main_file.exists():
                logger.info(f"Found main.py at {main_file}, importing...")
                spec = importlib.util.spec_from_file_location("main", main_file)
                main_module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(main_module)
                app = main_module.app
                logger.info("✅ Successfully imported app using importlib")
            else:
                logger.error(f"main.py not found at {main_file}")
                raise ImportError("Could not find main.py")
        except Exception as final_e:
            logger.error(f"All import attempts failed: {final_e}")
            # Create a minimal FastAPI app as fallback
            from fastapi import FastAPI
            app = FastAPI(title="LexAssist - Import Error", description="Backend import failed")
            
            @app.get("/")
            async def root():
                return {"error": "Backend import failed", "message": str(final_e)}
            
            logger.info("Created fallback FastAPI app")
except Exception as e:
    logger.error(f"Unexpected error during import: {e}")
    # Create a minimal FastAPI app as fallback
    from fastapi import FastAPI
    app = FastAPI(title="LexAssist - Error", description="Unexpected error")
    
    @app.get("/")
    async def root():
        return {"error": "Unexpected import error", "message": str(e)}

# Log Python path and environment info
logger.info(f"Final Python sys.path: {sys.path[:3]}...")  # Only log first 3 entries to avoid spam

# Log installed packages for debugging
try:
    installed_packages = subprocess.check_output([sys.executable, '-m', 'pip', 'freeze']).decode().splitlines()
    # Only log the key packages we care about
    key_packages = [pkg for pkg in installed_packages if any(name in pkg.lower() for name in ['accelerate', 'torch', 'transformers', 'fastapi', 'gunicorn'])]
    logger.info(f"Key packages: {key_packages}")
except Exception as e:
    logger.error(f"Failed to get installed packages: {e}")

# Verify the app is properly imported
if app is None:
    logger.error("CRITICAL: app is None after all import attempts")
else:
    logger.info(f"✅ App successfully imported: {type(app)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)