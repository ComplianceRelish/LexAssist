#!/usr/bin/env bash

echo "🔍 Build Verification Script"
echo "============================="

echo "📋 Checking Python version..."
python --version

echo "📋 Checking pip version..."
pip --version

echo "📋 Virtual environment status..."
if [ -n "$VIRTUAL_ENV" ]; then
    echo "✅ Virtual environment active: $VIRTUAL_ENV"
else
    echo "❌ No virtual environment detected"
fi

echo "📋 Checking accelerate package..."
if python -c "import accelerate; print(f'✅ accelerate {accelerate.__version__} available')" 2>/dev/null; then
    echo "✅ accelerate import successful"
else
    echo "❌ accelerate import failed"
    echo "📦 Attempting to list accelerate package..."
    pip show accelerate || echo "❌ accelerate package not found"
fi

echo "📋 Checking torch package..."
if python -c "import torch; print(f'✅ torch {torch.__version__} available')" 2>/dev/null; then
    echo "✅ torch import successful"
else
    echo "❌ torch import failed"
fi

echo "📋 Checking transformers package..."
if python -c "import transformers; print(f'✅ transformers {transformers.__version__} available')" 2>/dev/null; then
    echo "✅ transformers import successful"
else
    echo "❌ transformers import failed"
fi

echo "📋 Checking cache directories..."
if [ -d "/tmp/huggingface" ]; then
    echo "✅ /tmp/huggingface directory exists"
    ls -la /tmp/huggingface/ 2>/dev/null || echo "📁 Directory empty"
else
    echo "❌ /tmp/huggingface directory missing"
fi

echo "📋 Checking environment variables..."
echo "TRANSFORMERS_CACHE: ${TRANSFORMERS_CACHE:-'not set'}"
echo "HF_HOME: ${HF_HOME:-'not set'}"
echo "TORCH_HOME: ${TORCH_HOME:-'not set'}"

echo "============================="
echo "🏁 Verification complete"
