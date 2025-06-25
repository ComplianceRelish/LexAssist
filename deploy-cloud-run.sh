#!/bin/bash
set -e

# Configuration
PROJECT_ID="your-gcp-project-id"
SERVICE_NAME="lexassist-backend"
REGION="us-central1"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Build the Docker image
echo "Building Docker image..."
docker build -t ${IMAGE} -f legal_app/backend/Dockerfile .

# Push the Docker image
echo "Pushing Docker image to Google Container Registry..."
docker push ${IMAGE}

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --set-env-vars="HF_TOKEN=${HF_TOKEN}" \
  --set-env-vars="SUPABASE_URL=${SUPABASE_URL}" \
  --set-env-vars="SUPABASE_KEY=${SUPABASE_KEY}" \
  --memory=1Gi \
  --cpu=1 \
  --concurrency=80 \
  --timeout=300s

echo "Deployment complete!"
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)')
echo "Service URL: ${SERVICE_URL}"
