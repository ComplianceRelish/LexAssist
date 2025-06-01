# LexAssist

A legal assistance platform powered by InLegalBERT for Indian legal text analysis and processing.

## Features

- Text completion using masked language modeling
- Document similarity analysis
- Legal text analysis and metrics
- Role-based access control
- Document management

## Tech Stack

- **Frontend**: React with TypeScript, React Bootstrap
- **Backend**: FastAPI, Python
- **AI Model**: InLegalBERT (specialized for Indian legal text)
- **Database**: Supabase

## Deployment

- Frontend: [https://lex-assist.vercel.app/](https://lex-assist.vercel.app/)
- Backend: [https://lexassist-backend.onrender.com](https://lexassist-backend.onrender.com)

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
uvicorn main:app --reload
```

## Environment Variables

See `.env.example` files in respective directories for required environment variables.

## License

Proprietary - All rights reserved.
