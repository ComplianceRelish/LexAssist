"""
WSGI entry point for LexAssist FastAPI application
"""
import os
import sys
from pathlib import Path

# Set up comprehensive cache directories BEFORE any imports
# This prevents PyTorch, transformers, and other libraries from accessing /app
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
            
        print(f"✅ Cache environment setup complete: {len(cache_dirs)} directories created")
        
    except Exception as e:
        print(f"⚠️ Warning: Could not setup cache environment: {e}")

# Setup cache environment immediately
setup_cache_environment()

# Add the backend directory to Python path
backend_dir = Path(__file__).parent / "legal_app" / "backend"
sys.path.insert(0, str(backend_dir))

try:
    # Import your FastAPI app
    from main import app
except ImportError:
    # Fallback for different directory structure
    sys.path.insert(0, str(Path(__file__).parent))
    from legal_app.backend.main import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)