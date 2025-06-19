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
    pip install accelerate --no-cache-dir
    if ! pip show accelerate > /dev/null 2>&1; then
        echo " Critical error: Accelerate still not installed after reattempt!"
        exit 1
    fi
fi

echo "=== Build completed successfully ==="
