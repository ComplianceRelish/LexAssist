# Legal Assist Backend API

This is the backend service for the Legal Assist application, providing legal document analysis using HuggingFace's Inference API.

## Features

- Legal document analysis using HuggingFace's Inference API
- Secure authentication and authorization
- RESTful API endpoints for legal document processing
- Health check endpoint for monitoring

## Prerequisites

- Python 3.9+
- Google Cloud SDK (for deployment)
- Docker (for containerization)
- HuggingFace account with API token
- Supabase project for database

## Setup

1. Clone the repository
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy `.env.example` to `.env` and update the values:
   ```bash
   cp .env.example .env
   ```
5. Set your HuggingFace token and other environment variables in the `.env` file

## Running Locally

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, you can access:

- Interactive API docs: `http://localhost:8000/docs`
- Alternative API docs: `http://localhost:8000/redoc`
- Health check: `http://localhost:8000/api/inlegalbert/health`

## Deployment to Google Cloud Run

1. Install Google Cloud SDK and Docker
2. Authenticate with Google Cloud:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   gcloud auth configure-docker
   ```
3. Make the deployment script executable:
   ```bash
   chmod +x ../deploy-cloud-run.sh
   ```
4. Run the deployment script:
   ```bash
   HF_TOKEN=your_hf_token SUPABASE_URL=your_supabase_url SUPABASE_KEY=your_supabase_key ./deploy-cloud-run.sh
   ```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HF_TOKEN` | Yes | HuggingFace API token |
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_KEY` | Yes | Your Supabase anon/public key |
| `CORS_ALLOWED_ORIGINS` | No | Comma-separated list of allowed origins |
| `ENVIRONMENT` | No | Environment (development/production) |
| `LOG_LEVEL` | No | Logging level (DEBUG, INFO, WARNING, ERROR) |

## Health Check

The health check endpoint (`/api/inlegalbert/health`) returns:

- Status of the HuggingFace API connection
- Model loading status
- Environment information
- Service status

## Error Handling

All API endpoints return appropriate HTTP status codes and JSON error responses with details about what went wrong.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
