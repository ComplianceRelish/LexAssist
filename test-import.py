#!/usr/bin/env python3
"""
Test script to verify all imports work correctly for the lexassist service
"""
import os
import sys
from pathlib import Path

# Add the backend directory to Python path (same as wsgi.py)
current_dir = Path(__file__).parent
backend_dir = current_dir / "legal_app" / "backend"

print(f"Current directory: {current_dir}")
print(f"Backend directory: {backend_dir}")
print(f"Backend directory exists: {backend_dir.exists()}")

# Add directories to Python path
paths_to_add = [
    str(backend_dir),
    str(current_dir),
    str(current_dir / "legal_app")
]

for path in paths_to_add:
    if path not in sys.path:
        sys.path.insert(0, path)
        print(f"Added to Python path: {path}")

# Test critical imports
def test_import(module_name, import_statement):
    """Test importing a module and report the result"""
    try:
        exec(import_statement)
        print(f"✅ {module_name}: OK")
        return True
    except ImportError as e:
        print(f"❌ {module_name}: Failed - {e}")
        return False
    except Exception as e:
        print(f"⚠️ {module_name}: Error - {e}")
        return False

print("\n=== Testing Critical Imports ===")
tests = [
    ("Accelerate", "import accelerate; print(f'Version: {accelerate.__version__}')"),
    ("Transformers", "import transformers; print(f'Version: {transformers.__version__}')"),
    ("FastAPI", "import fastapi; print(f'Version: {fastapi.__version__}')"),
    ("Gunicorn", "import gunicorn; print(f'Version: {gunicorn.__version__}')"),
    ("Uvicorn", "import uvicorn; print(f'Version: {uvicorn.__version__}')"),
    ("Main App (direct)", "from main import app; print(f'App type: {type(app)}')"),
    ("Main App (backend)", "from legal_app.backend.main import app; print(f'App type: {type(app)}')"),
]

results = []
for test_name, import_stmt in tests:
    result = test_import(test_name, import_stmt)
    results.append((test_name, result))

print(f"\n=== Test Results ===")
passed = sum(1 for _, result in results if result)
total = len(results)
print(f"Passed: {passed}/{total}")

if passed == total:
    print("🎉 All tests passed! The lexassist service should work correctly.")
else:
    print("⚠️ Some tests failed. Check the error messages above.")

print(f"\nPython version: {sys.version}")
print(f"Python executable: {sys.executable}")
