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

# Set CORS related environment variables
ENV CORS_ALLOWED_ORIGINS=https://lex-assist.vercel.app,http://localhost:3000,http://localhost:3001,http://localhost:5173
ENV CORS_ALLOW_CREDENTIALS=true
ENV CORS_ALLOW_METHODS=GET,POST,PUT,DELETE,OPTIONS,PATCH
ENV CORS_ALLOW_HEADERS=Content-Type,Authorization,X-Requested-With,Accept,Origin
ENV CORS_MAX_AGE=600

# Install build essentials and libraries needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Pre-install problematic packages with binary wheels
RUN pip install --no-cache-dir --only-binary=:all: blis

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Pre-download ML models to avoid cold start issues
RUN python -c "from transformers import AutoTokenizer, AutoModel; \
    model_name = 'nlpaueb/legal-bert-base-uncased'; \
    print(f'Pre-downloading {model_name}...'); \
    tokenizer = AutoTokenizer.from_pretrained(model_name); \
    model = AutoModel.from_pretrained(model_name); \
    print('Model pre-downloaded successfully')"

# Add a simple health check script
RUN echo '#!/bin/bash\necho "Health check passed"' > /app/health_check.sh && \
    chmod +x /app/health_check.sh

# Create startup script to handle initialization and timeouts
RUN echo '#!/bin/bash\n\
echo "Starting LexAssist backend..."\n\
# Use the PORT environment variable from Cloud Run\n\
export PORT="${PORT:-8000}"\n\
echo "Listening on port ${PORT}"\n\
# Run the application\n\
exec python main.py' > /app/startup.sh && \
    chmod +x /app/startup.sh

# Expose port - will use $PORT from environment in Cloud Run
EXPOSE 8000

# Command to run the application via the startup script
CMD ["bash", "/app/startup.sh"]
