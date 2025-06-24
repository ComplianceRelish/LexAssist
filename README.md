# LexAssist: Comprehensive Operational Guide

LexAssist is an advanced legal assistance platform powered by InLegalBERT, specifically designed for Indian legal text analysis and processing. This guide provides a detailed overview of the system architecture, workflow, and operational aspects.

## Table of Contents

- [System Overview](#system-overview)
- [Architecture](#architecture)
  - [Frontend Architecture](#frontend-architecture)
  - [Backend Architecture](#backend-architecture)
  - [Database Architecture](#database-architecture)
- [Logic Flow](#logic-flow)
  - [User Authentication Flow](#user-authentication-flow)
  - [Text Analysis Flow](#text-analysis-flow)
  - [Document Similarity Flow](#document-similarity-flow)
  - [Legal Text Completion Flow](#legal-text-completion-flow)
- [Environment Setup](#environment-setup)
- [Local Development](#local-development)
- [Deployment Information](#deployment-information)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## System Overview

LexAssist is a comprehensive legal AI platform that combines natural language processing, document analysis, and legal expertise to assist legal professionals in India. The system leverages the InLegalBERT model, which is specifically trained on Indian legal corpus, to provide accurate and relevant assistance within the Indian legal context.

### Core Features

- **Legal Text Analysis**: Analyzes legal documents for complexity, readability, and key metrics
- **Document Similarity**: Compares legal documents to identify similarities and relevant precedents
- **Text Completion**: Uses masked language modeling to suggest completions for legal text
- **Case Law Integration**: Connects relevant case law to user queries
- **Statute Reference**: Automatically identifies and references relevant statutes
- **Role-Based Access Control**: Different access levels for users, admins, and super-admins
- **Document Management**: Secure storage and retrieval of legal documents
- **Customized Analytics**: Reports and insights based on document analysis

## Architecture

LexAssist follows a modern client-server architecture with a clean separation of concerns:

### Frontend Architecture

The frontend is built with React and TypeScript, providing a responsive and intuitive user interface:

- **Technologies**: React, TypeScript, React Bootstrap, Chakra UI
- **State Management**: React Context API for global state
- **Authentication**: JWT-based authentication with Supabase integration
- **Routing**: React Router for navigation
- **API Integration**: Axios for HTTP requests
- **Styling**: CSS modules and Bootstrap components

The frontend is organized into the following main directories:
- `/src/components`: Reusable UI components
- `/src/pages`: Page components corresponding to application routes
- `/src/services`: API service layer for backend communication
- `/src/contexts`: React context providers for global state
- `/src/utils`: Helper functions and utilities
- `/src/types`: TypeScript type definitions

### Backend Architecture

The backend is built with FastAPI and Python, providing a robust API layer:

- **API Framework**: FastAPI for high-performance API endpoints
- **ML Integration**: PyTorch for deep learning with InLegalBERT
- **Authentication**: JWT-based auth with role-based access control
- **Database Access**: Supabase client for data operations
- **Middleware**: CORS, exception handling, and request/response processing

The backend is organized into:
- `/api`: API endpoints organized by feature
- `/models`: Data models and schemas
- `/services`: Business logic and external service integrations
- `/utils`: Helper functions and utilities
- `/transformer_models`: AI model integration and processing

### Database Architecture

LexAssist uses Supabase as its database and authentication provider:

- **Data Storage**: PostgreSQL for structured data
- **Authentication**: Built-in auth system with JWT
- **Storage**: Object storage for documents
- **Row-Level Security**: Policy-based access control

## Logic Flow

### User Authentication Flow

When a user attempts to log in through the frontend URL (lex-assist.vercel.app):

1. **Login Request**: User enters credentials on the LoginPage component
2. **Frontend Processing**:
   - The login form submits credentials to AuthContext's login function
   - AuthContext calls the LexAssistApiClient which makes a POST request to `/api/auth/login`

3. **Backend Processing**:
   - The request is handled by the auth_endpoints.py router
   - The server validates credentials against the Supabase user table
   - If valid, it generates a JWT token and returns user information

4. **Response Handling**:
   - On successful login, the frontend stores the JWT in local storage
   - The user state is updated in AuthContext
   - The user is redirected to the Dashboard page

### Text Analysis Flow

When a user submits text for analysis:

1. **User Interaction**:
   - User enters legal text in the LegalTextAnalysis component
   - User clicks "Analyze Text" button

2. **Frontend Processing**:
   - Sets loading state to true to show spinner
   - Calls legalAiService.analyzeText() with the provided text
   - This service creates a POST request to `/api/legal-ai/analyze`

3. **Backend Processing**:
   - Request is received by the model_context_endpoints.py router
   - The backend validates the user's authorization token and subscription tier
   - It preprocesses the text and passes it to the InLegalBERT model
   - The model performs analysis and returns metrics such as complexity and token count

4. **Response Handling**:
   - The frontend receives analysis results and displays them in the UI
   - Results include text complexity, token count, and embedding dimensions

### Document Similarity Flow

When a user compares legal documents:

1. **User Interaction**:
   - User uploads or pastes two legal documents in the LegalDocumentSimilarity component
   - User clicks "Compare Documents" button

2. **Frontend Processing**:
   - Sets loading state to true to show processing indicator
   - Sends both documents to the backend via LexAssistApiClient

3. **Backend Processing**:
   - The legal_endpoints.py router handles the request
   - Documents are processed and converted to embeddings using InLegalBERT
   - Similarity algorithm measures semantic similarity between documents
   - Returns similarity score and common legal concepts

4. **Response Handling**:
   - Frontend displays similarity metrics and visualizations
   - Highlights common sections and legal concepts

### Legal Text Completion Flow

When a user requests text completion:

1. **User Interaction**:
   - User enters partial legal text in the LegalTextCompletion component
   - User clicks "Complete Text" button

2. **Frontend Processing**:
   - Request is sent to the backend through legalAiService
   - The service sends a POST request to `/api/inlegalbert/complete`

3. **Backend Processing**:
   - The legal_bert.py router handles the request
   - The text is tokenized and processed by the InLegalBERT masked language model
   - Multiple completion candidates are generated and ranked
   - The most appropriate completion is selected based on legal context

4. **Response Handling**:
   - Frontend receives completion suggestions
   - User can select and apply suggested completions

## Environment Setup

### Required Environment Variables

**Frontend (.env file):**
```
VITE_BACKEND_URL=https://lexassist-4387205875.europe-west1.run.app
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Backend (.env file):**
```
CLOUD_RUN=true  # For production deployment
CORS_ALLOWED_ORIGINS=https://lex-assist.vercel.app,http://localhost:3000,http://localhost:5173
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-service-key
JWT_SECRET=your-jwt-secret
```

## Local Development

### Frontend

```bash
cd legal_app_frontend
npm install --legacy-peer-deps
npm run dev
```

### Backend

```bash
cd legal_app/backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Deployment Information

### Current Deployments

- **Frontend**: [https://lex-assist.vercel.app/](https://lex-assist.vercel.app/) (Vercel)
- **Backend**: [https://lexassist-4387205875.europe-west1.run.app](https://lexassist-4387205875.europe-west1.run.app) (Google Cloud Run)

### Deployment Process

**Frontend:**
- The frontend is deployed on Vercel using their CI/CD pipeline
- Pushes to main branch trigger automatic builds and deployments
- Environment variables are configured in the Vercel project settings

**Backend:**
- The backend is deployed on Google Cloud Run
- The cloudbuild.yaml file defines the build process
- Containerized using Docker with the provided Dockerfile
- Environment variables are stored in Cloud Secret Manager

## Security Considerations

- All API endpoints require authentication except for public routes
- JWT tokens are used for session management
- Role-based access control restricts user capabilities
- Passwords are hashed and encrypted
- Environment variables are never exposed to the client
- API rate limiting is implemented to prevent abuse
- CORS policies restrict API access to authorized domains

## Troubleshooting

### Common Issues

**Frontend connectivity issues:**
- Verify CORS configuration in backend settings
- Check network tab for API errors
- Ensure valid JWT token is present

**Backend startup failures:**
- Verify all environment variables are properly set
- Check for required dependencies in requirements.txt
- Ensure database connection is properly configured

**Model loading issues:**
- Verify cache directories are writable
- Check for sufficient disk space for model storage
- Look for specific error messages in backend logs

For detailed troubleshooting, consult the backend logs or contact the development team.

## License

Proprietary - All rights reserved.
