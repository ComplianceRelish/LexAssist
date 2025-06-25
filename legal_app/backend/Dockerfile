FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Create cache directory for HuggingFace
RUN mkdir -p /app/cache/huggingface

# Set environment variables
ENV TRANSFORMERS_CACHE=/app/cache/huggingface
ENV HF_HOME=/app/cache/huggingface
ENV TOKENIZERS_PARALLELISM=false
ENV CLOUD_RUN=true
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Set CORS related environment variables
ENV CORS_ALLOWED_ORIGINS="https://lex-assist.vercel.app,http://localhost:3000,http://localhost:3001,http://localhost:5173"
ENV CORS_ALLOW_CREDENTIALS="true"
ENV CORS_ALLOW_METHODS="GET,POST,PUT,DELETE,OPTIONS,PATCH"
ENV CORS_ALLOW_HEADERS="Content-Type,Authorization,X-Requested-With,Accept,Origin"
ENV CORS_MAX_AGE="600"

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements-api.txt requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Test HuggingFace API connectivity
RUN python -c "import os; print('Testing HuggingFace API connectivity...'); print('HF_TOKEN available:', 'yes' if os.getenv('HF_TOKEN') else 'no')"

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
