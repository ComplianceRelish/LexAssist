import os
from dotenv import load_dotenv

# Load environment variables from .env.local
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env.local'))

class Config:
    INDIAN_KANOON_API_KEY = os.environ.get('INDIAN_KANOON_API_KEY')
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_ANON_PUBLIC_KEY = os.environ.get('SUPABASE_ANON_PUBLIC_KEY')
    SUPABASE_JWT_SECRET = os.environ.get('SUPABASE_JWT_SECRET')
    REDIS_URL = os.environ.get('REDIS_URL')
    # Add more config as needed
