#!/bin/bash
set -e

echo "=== Setting up Python environment ==="
python -m venv venv
source venv/bin/activate

echo "=== Python and pip versions ==="
python --version
pip --version

# Install core dependencies first
echo "=== Installing core dependencies ==="
pip install --no-cache-dir -U pip

# Check if requirements-core.txt exists, if not use requirements.txt
if [ -f "requirements-core.txt" ]; then
    echo "Installing from requirements-core.txt..."
    pip install --no-cache-dir -r requirements-core.txt
elif [ -f "requirements.txt" ]; then
    echo "Installing from requirements.txt..."
    pip install --no-cache-dir -r requirements.txt
else
    echo "No core requirements file found!"
    exit 1
fi

echo "=== Installing ML dependencies ==="
# Check if requirements-ml.txt exists
if [ -f "requirements-ml.txt" ]; then
    echo "Installing from requirements-ml.txt..."
    pip install --no-cache-dir -r requirements-ml.txt
else
    echo "No ML requirements file found, installing accelerate manually..."
    pip install --no-cache-dir accelerate==0.29.3
fi

# Verify installation of critical packages
echo "=== Verifying critical packages ==="
echo "Checking accelerate..."
pip show accelerate || { echo "accelerate not installed"; exit 1; }

echo "Checking transformers..."
pip show transformers || { echo "transformers not installed"; exit 1; }

echo "Checking fastapi..."
pip show fastapi || { echo "fastapi not installed"; exit 1; }

echo "Checking gunicorn..."
pip show gunicorn || { echo "gunicorn not installed"; exit 1; }

# Test accelerate import in Python
echo "=== Testing critical imports ==="
python -c "import accelerate; print(f' Accelerate {accelerate.__version__} imported successfully')" || {
    echo " Failed to import accelerate in Python"
    exit 1
}

python -c "import transformers; print(f' Transformers {transformers.__version__} imported successfully')" || {
    echo " Failed to import transformers in Python"
    exit 1
}

python -c "import fastapi; print(f' FastAPI {fastapi.__version__} imported successfully')" || {
    echo " Failed to import fastapi in Python"
    exit 1
}

# List installed packages for debugging
echo "=== Installed ML packages ==="
pip list | grep -E "(accelerate|torch|transformers|fastapi|gunicorn)" || echo "No matching packages found"

echo " Build completed successfully!"

# Run verification to prove this script executed
echo " Running build verification..."
if [ -f "verify-build.sh" ]; then
    bash ./verify-build.sh
else
    echo "verify-build.sh not found, skipping verification"
fi
