# Lex Assist Deployment Instructions

This document provides detailed instructions for deploying the Lex Assist application, including both the frontend and backend components, as well as setting up the required Supabase database.

## Prerequisites

Before deploying Lex Assist, you'll need:

1. Your GitHub repository: https://github.com/LexAssist-relish/LexAssist.git
2. Your Supabase project (already created):
   - Project ID: meuyiktpkeomskqornnu
   - URL: https://meuyiktpkeomskqornnu.supabase.co
   - ANON Public Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldXlpa3Rwa2VvbXNrcW9ybm51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNDM0NDQsImV4cCI6MjA2MzYxOTQ0NH0.ADWjENLW1GdjdQjrrqjG8KtXndRoTxXy8zBffm4mweU
3. A Netlify account (https://netlify.com)
4. A server for hosting the backend API (e.g., Heroku, AWS, DigitalOcean)
5. Your Indian Kanoon API key: d053cb3e0082a68b58def9f16e1b43c7a497faf4

## 1. Supabase Setup

### 1.1 Access Your Existing Project

Your Supabase project has already been created with the following details:
- Project ID: meuyiktpkeomskqornnu
- URL: https://meuyiktpkeomskqornnu.supabase.co
- ANON Public Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldXlpa3Rwa2VvbXNrcW9ybm51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNDM0NDQsImV4cCI6MjA2MzYxOTQ0NH0.ADWjENLW1GdjdQjrrqjG8KtXndRoTxXy8zBffm4mweU

### 1.2 Configure Database Tables

Once your project is created, set up the following tables using the SQL Editor:

```sql
-- Users table (extends Supabase Auth)
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT,
  phone TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Briefs table
CREATE TABLE public.briefs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Analysis results table
CREATE TABLE public.analysis_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  brief_id UUID REFERENCES public.briefs NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  law_sections JSONB,
  case_histories JSONB,
  analysis JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Case files table
CREATE TABLE public.case_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  brief_id UUID REFERENCES public.briefs NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  document_type TEXT NOT NULL,
  court TEXT,
  parties JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

### 1.3 Configure Authentication

1. Go to Authentication > Settings
2. Enable Email and Phone auth providers
3. Configure Email templates with Lex Assist branding
4. Set up SMS provider for OTP verification (Twilio recommended)

### 1.4 Get API Credentials

1. Go to Project Settings > API
2. Copy the "URL" and "anon" key
3. These will be used for configuring the frontend and backend

## 2. Backend Deployment

### 2.1 Prepare the Backend Code

1. Ensure all dependencies are listed in `requirements.txt`:

```
flask==2.0.1
flask-cors==3.0.10
requests==2.26.0
python-dotenv==0.19.0
gunicorn==20.1.0
reportlab==3.6.1
python-docx==0.8.11
```

2. Create a `.env` file with the following variables:

```
INDIAN_KANOON_API_KEY=d053cb3e0082a68b58def9f16e1b43c7a497faf4
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
PORT=5000
```

### 2.2 Deploy to Heroku (Recommended Option)

1. Create a `Procfile` in the root directory:

```
web: gunicorn app:app
```

2. Install the Heroku CLI and log in
3. Create a new Heroku app:

```bash
heroku create lex-assist-api
```

4. Set environment variables:

```bash
heroku config:set INDIAN_KANOON_API_KEY=d053cb3e0082a68b58def9f16e1b43c7a497faf4
heroku config:set SUPABASE_URL=your_supabase_url
heroku config:set SUPABASE_KEY=your_supabase_anon_key
```

5. Deploy the application:

```bash
git add .
git commit -m "Initial deployment"
git push heroku main
```

6. Verify the deployment:

```bash
heroku open
```

### 2.3 Alternative Deployment Options

#### AWS Elastic Beanstalk

1. Install the EB CLI
2. Initialize the EB application:

```bash
eb init -p python-3.8 lex-assist-api
```

3. Create an environment:

```bash
eb create lex-assist-api-env
```

4. Set environment variables:

```bash
eb setenv INDIAN_KANOON_API_KEY=d053cb3e0082a68b58def9f16e1b43c7a497faf4 SUPABASE_URL=your_supabase_url SUPABASE_KEY=your_supabase_anon_key
```

5. Deploy the application:

```bash
eb deploy
```

#### DigitalOcean App Platform

1. Create a new App
2. Connect your GitHub repository
3. Configure environment variables
4. Deploy the application

## 3. Frontend Deployment

### 3.1 Configure Frontend Environment

1. Create a `.env` file in the frontend directory:

```
REACT_APP_API_URL=your_backend_api_url
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

2. Build the frontend:

```bash
npm run build
```

### 3.2 Deploy to Netlify

1. Install the Netlify CLI and log in
2. Deploy the frontend:

```bash
netlify deploy --prod
```

3. Configure environment variables in the Netlify dashboard
4. Set up redirects for SPA routing by creating a `_redirects` file in the `public` directory:

```
/*    /index.html   200
```

### 3.3 Configure Custom Domain (Optional)

1. Purchase a domain name (e.g., lexassist.in)
2. Configure DNS settings to point to Netlify
3. Set up SSL certificate through Netlify

## 4. Testing the Deployment

After deploying both the frontend and backend, perform the following tests:

1. User registration and login
2. Brief submission and analysis
3. Document generation and download
4. Case file drafting
5. Sharing via email and WhatsApp

## 5. Maintenance and Updates

### 5.1 Monitoring

1. Set up logging and monitoring for the backend API
2. Configure error tracking (e.g., Sentry)
3. Monitor database performance in Supabase

### 5.2 Updates

1. Implement CI/CD for automated deployments
2. Regularly update dependencies
3. Back up database regularly

## 6. Troubleshooting

### 6.1 Common Issues

1. CORS errors: Ensure CORS is properly configured in the backend
2. Authentication issues: Verify Supabase credentials and configuration
3. API connection problems: Check network connectivity and API endpoints

### 6.2 Support Resources

1. Supabase documentation: https://supabase.com/docs
2. Netlify documentation: https://docs.netlify.com
3. Flask documentation: https://flask.palletsprojects.com

## 7. Security Considerations

1. Keep API keys secure and never expose them in client-side code
2. Implement rate limiting for API endpoints
3. Regularly audit user permissions in Supabase
4. Set up proper authentication and authorization checks

For additional support or custom modifications, please contact the development team.
