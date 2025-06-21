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

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["python", "main.py"]
