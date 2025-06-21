# LexAssist

![LexAssist Logo](https://via.placeholder.com/150x150.png?text=LexAssist)

A comprehensive legal assistance platform powered by InLegalBERT, designed specifically for Indian legal text analysis and processing. LexAssist helps legal professionals analyze briefs, extract citations, identify relevant case laws, and generate legal insights.

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Wireframe](#wireframe)
- [Deployment](#deployment)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [License](#license)

## Features

- **Legal Brief Analysis**: Upload and analyze legal documents to extract key information
- **Citation Extraction**: Automatically identify and extract legal citations from text
- **Case Law Integration**: Find relevant case laws through integration with Indian Kanoon
- **Document Generation**: Draft case files based on analyzed briefs
- **Export Functionality**: Export analysis results in various formats (PDF, DOCX, RTF)
- **Subscription Tiers**: Free, Pro, and Enterprise plans with varied feature access
- **User Management**: Role-based access control with admin, super admin and regular user roles
- **Secure Authentication**: Email/password and OTP-based authentication

## Project Structure

```
LexAssist/
├── .env                      # Environment variables
├── .env.example              # Example environment configuration
├── .git/                     # Git repository
├── .gitignore                # Git ignore file
├── README.md                 # Project documentation
├── backend/                  # Python backend application
│   ├── __init__.py           # Python package initialization
│   ├── app.py                # Main FastAPI/Flask application
│   ├── models/               # Data models and AI components
│   │   ├── __init__.py
│   │   └── legal_brief_analyzer.py
│   └── services/             # Service integrations
│       └── indian_kanoon/    # Indian Kanoon API integration
├── legal_app/                # Backend application (alt structure)
│   └── backend/              # Backend code
│       └── cloudbuild.yaml   # Cloud deployment configuration
├── legal_app_frontend/       # Frontend React application
│   ├── .env                  # Frontend environment variables
│   ├── dist/                 # Built distribution files
│   ├── public/               # Public assets
│   ├── src/                  # Source code
│   │   ├── App.tsx           # Main application component
│   │   ├── assets/           # Static assets
│   │   ├── components/       # Reusable UI components
│   │   │   └── common/       # Common components
│   │   │       └── Header.tsx # Application header component
│   │   ├── config/           # Application configuration
│   │   ├── contexts/         # React contexts
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   │   └── LexAssistApiClient.ts # API client
│   │   ├── styles/           # CSS and styling
│   │   ├── types/            # TypeScript type definitions
│   │   └── utils/            # Utility functions
│   ├── tsconfig.app.json     # TypeScript configuration
│   ├── tsconfig.json         # TypeScript configuration
│   └── vite.config.ts        # Vite bundler configuration
├── requirements.txt          # Python dependencies
└── node_modules/             # NPM dependencies
```

## Tech Stack

### Frontend
- **Framework**: React with TypeScript
- **UI Libraries**: React Bootstrap
- **State Management**: React Context API
- **API Client**: Axios
- **Authentication**: Supabase Auth
- **Build Tools**: Vite

### Backend
- **Framework**: FastAPI, Flask
- **Database**: Supabase (PostgreSQL)
- **AI Model**: InLegalBERT (specialized for Indian legal text)
- **Authentication**: JWT, Supabase Auth

### DevOps
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Google Cloud Run
- **CI/CD**: GitHub Actions, Google Cloud Build
- **Containerization**: Docker

## Wireframe

```
+------------------------------------------+
|                HEADER                    |
| [Logo]     [Navigation]     [User Menu]  |
+------------------------------------------+
|                                          |
|  +----------------+  +----------------+  |
|  |                |  |                |  |
|  |  BRIEF INPUT   |  |  ANALYSIS      |  |
|  |                |  |  RESULTS       |  |
|  |  [Text Area]   |  |                |  |
|  |                |  |  - Citations    |  |
|  |  [Submit Btn]  |  |  - Case Refs    |  |
|  |                |  |  - Key Points   |  |
|  +----------------+  |                |  |
|                      |  [Download]    |  |
|  +----------------+  |  [Share]       |  |
|  |  HISTORY       |  |                |  |
|  |                |  +----------------+  |
|  |  - Brief 1     |                      |
|  |  - Brief 2     |  +----------------+  |
|  |  - Brief 3     |  |                |  |
|  |                |  |  SUBSCRIPTION  |  |
|  +----------------+  |  PLANS         |  |
|                      |                |  |
|                      |  FREE | PRO |  |  |
|                      |  ENTERPRISE    |  |
|                      +----------------+  |
|                                          |
+------------------------------------------+
|               FOOTER                     |
+------------------------------------------+
```

## Deployment

- **Frontend**: [https://lex-assist.vercel.app/](https://lex-assist.vercel.app/)
- **Backend**: [https://lexassist-4387205875.europe-west1.run.app](https://lexassist-4387205875.europe-west1.run.app)
- **API Documentation**: [https://lexassist-4387205875.europe-west1.run.app/docs](https://lexassist-4387205875.europe-west1.run.app/docs)

## Local Development

### Frontend

```bash
# Navigate to frontend directory
cd legal_app_frontend

# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev
```

### Backend

```bash
# Navigate to backend directory
cd legal_app/backend

# Install Python dependencies
pip install -r requirements.txt

# Start the development server
uvicorn main:app --reload
```

## Environment Variables

### Backend (.env)
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ALLOWED_ORIGINS=http://localhost:3000,https://lex-assist.vercel.app
JWT_SECRET=your_jwt_secret
INDIAN_KANOON_API_KEY=your_indian_kanoon_api_key
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

See `.env.example` files in respective directories for complete required environment variables.

## API Reference

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/login-otp` - Login with OTP
- `POST /api/auth/request-otp` - Request an OTP for login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/refresh-token` - Refresh access token

### Legal Analysis
- `POST /api/analyze-brief` - Analyze a legal brief
- `POST /briefs/draft` - Draft a case file based on brief
- `GET /briefs/export/{brief_id}` - Export analysis in specified format

### User Management
- `GET /api/users/profile` - Get current user profile
- `GET /api/users/all` - Get all users (admin only)
- `PUT /api/users/{user_id}/role` - Update user role (admin only)

### Subscription Management
- `GET /api/subscriptions/tiers` - List all subscription tiers
- `PUT /api/subscriptions/tiers/{tier_id}` - Update subscription tier (admin only)
- `POST /api/subscriptions/upgrade` - Upgrade user subscription

## License

Proprietary - All rights reserved.
