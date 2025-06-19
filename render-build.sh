#!/bin/bash
set -e

echo "=== Setting up Python environment ==="
python -m venv .venv
source .venv/bin/activate

# Install core dependencies first
pip install --no-cache-dir -U pip
pip install --no-cache-dir -r requirements-core.txt

echo "=== Installing ML dependencies ==="
pip install --no-cache-dir -r requirements-ml.txt

# Verify installation of critical packages
echo "Verifying accelerate installation..."
pip show accelerate || { echo "accelerate not installed"; exit 1; }

# Verify accelerate installation explicitly
if ! pip show accelerate > /dev/null 2>&1; then
    echo " Accelerate package not installed! Attempting reinstall..."
    pip install accelerate==0.29.3 --no-cache-dir --force-reinstall
    if ! pip show accelerate > /dev/null 2>&1; then
        echo " Critical error: Accelerate still not installed after reattempt!"
        exit 1
    fi
fi

# Test accelerate import in Python
echo "Testing accelerate import..."
python -c "import accelerate; print(f' Accelerate {accelerate.__version__} imported successfully')" || {
    echo " Failed to import accelerate in Python"
    exit 1
}

# List installed packages for debugging
echo "=== Installed packages ==="
pip list | grep -E "(accelerate|torch|transformers)"

echo "=== Build completed successfully ==="
