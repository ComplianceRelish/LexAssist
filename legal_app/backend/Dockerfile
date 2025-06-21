FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Create cache directories for ML models
RUN mkdir -p /app/cache/huggingface /app/cache/torch

# Set environment variables for cache
ENV TRANSFORMERS_CACHE=/app/cache/huggingface
ENV HF_HOME=/app/cache/huggingface
ENV TORCH_HOME=/app/cache/torch
ENV TOKENIZERS_PARALLELISM=false
ENV CLOUD_RUN=true

# Install build essentials for packages like blis
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Pre-install problematic packages with binary wheels
RUN pip install --no-cache-dir --only-binary=:all: blis

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["python", "main.py"]
