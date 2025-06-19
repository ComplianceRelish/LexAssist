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

echo "=== Build completed successfully ==="
