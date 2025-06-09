#!/bin/bash
# render-build.sh

# Install dependencies
pip install -r requirements.txt

# Download model files during build to avoid cold starts
python -c "
from transformers import AutoTokenizer, AutoModel, pipeline
import os
from huggingface_hub import login

# Login if token is provided
token = os.environ.get('HUGGINGFACE_TOKEN')
if token:
    login(token=token)

# Set cache directory
os.environ['TRANSFORMERS_CACHE'] = '/app/huggingface'

# Download model files
model_path = os.environ.get('INLEGALBERT_MODEL_PATH', 'law-ai/InLegalBERT')
print(f'Pre-downloading model: {model_path}')
AutoTokenizer.from_pretrained(model_path)
AutoModel.from_pretrained(model_path)
"

echo "Build completed successfully!"
