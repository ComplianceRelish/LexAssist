"""
WSGI entry point for LexAssist FastAPI application
"""
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent / "legal_app" / "backend"
sys.path.insert(0, str(backend_dir))

# Import your FastAPI app
from main import app  # Assuming your main FastAPI app is in legal_app/backend/main.py

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)