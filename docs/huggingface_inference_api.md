# Hugging Face Inference API Integration for LexAssist

This document explains how LexAssist has been updated to use the Hugging Face Inference API instead of loading the InLegalBERT model locally, which helps to:
- Reduce server resource usage
- Prevent app crashes due to memory exhaustion
- Scale more effectively with usage

## How It Works

The implementation creates a new `HuggingFaceInferenceProcessor` class that:
1. Implements the same `LegalModelInterface` as the original `InLegalBERTProcessor`
2. Uses the Hugging Face Inference API instead of loading models locally
3. Can be toggled via environment variables

## Configuration

Add the following to your `.env` file:

```
# Required - Your Hugging Face API token
HF_TOKEN=your-huggingface-api-token

# Optional - Set to "true" to use the Hugging Face Inference API (default),
# or "false" to use the local model
USE_HF_INFERENCE_API=true

# Optional - The model path/ID to use with Hugging Face
INLEGALBERT_MODEL_PATH=law-ai/InLegalBERT
```

## API Usage

The backend will automatically use the new Hugging Face Inference processor if `USE_HF_INFERENCE_API=true`.

All existing API endpoints continue to work without changes:
- `/api/inlegalbert/statute-identification`
- `/api/inlegalbert/case-analysis`
- `/api/inlegalbert/judgment-prediction`
- `/api/inlegalbert/case-history`
- `/api/inlegalbert/capabilities`
- `/api/inlegalbert/health`

## Pricing and Limits

Remember that the Hugging Face Inference API has usage-based pricing:

1. Free tier: Limited requests per day
2. Pro tier ($9/month): Higher rate limits
3. Enterprise: Custom pricing

For production use, ensure your Hugging Face account has appropriate billing set up.

## Error Handling

The implementation includes fallback mechanisms:

1. If the API is temporarily unavailable, it will use simulated responses 
2. If the API token is missing, it will provide clear error messages
3. Connection timeouts and other errors are logged and reported

## Monitoring

Monitor your Hugging Face API usage:
- https://ui.endpoints.huggingface.co/

## Reverting to Local Model

If you need to revert to the local model approach:

1. Set `USE_HF_INFERENCE_API=false` in your `.env` file
2. Restart the application
