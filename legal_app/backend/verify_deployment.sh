#!/bin/bash
# Verify deployment configuration before triggering build
echo "🔍 Verifying deployment configuration..."
echo "=================================="

# Check if env-vars.yaml exists
if [ -f "env-vars.yaml" ]; then
  echo "✅ env-vars.yaml file found"
  echo
  echo "📋 Environment variables to be deployed:"
  cat env-vars.yaml
  echo
else
  echo "❌ ERROR: env-vars.yaml file not found!"
  exit 1
fi

# Check if cloudbuild.yaml exists
if [ -f "cloudbuild.yaml" ]; then
  echo "✅ cloudbuild.yaml file found"
  echo
  echo "📋 Deployment configuration:"
  grep -A 20 "Deploy using environment" cloudbuild.yaml
  echo
else
  echo "❌ ERROR: cloudbuild.yaml file not found!"
  exit 1
fi

# Verify CORS settings
echo "🔍 Checking CORS configuration..."
CORS_ORIGINS=$(grep CORS_ALLOWED_ORIGINS env-vars.yaml)
echo "  $CORS_ORIGINS"
if [[ "$CORS_ORIGINS" == *"438720587503"* ]]; then
  echo "✅ Correct Cloud Run URL found in CORS settings"
else
  echo "⚠️ WARNING: Correct Cloud Run URL may be missing in CORS settings!"
fi

echo
echo "✅ Verification complete! Ready to deploy."
echo "=================================="
echo "To trigger the build manually, run:"
echo "gcloud builds submit --config=cloudbuild.yaml"
echo
