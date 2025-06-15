"""
Supabase client initialization module.
Working version for Supabase 2.15.2
"""
import os
import logging
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Supabase credentials from environment variables
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# Configure logging
logger = logging.getLogger("lexassist.supabase")

def get_supabase_client() -> Client:
    """
    Create and return Supabase client instance for backend operations.
    Simple version for Supabase 2.15.2
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        logger.error("Supabase credentials are missing. Check environment variables.")
        logger.error(f"SUPABASE_URL: {'✓' if SUPABASE_URL else '✗'}")
        logger.error(f"SUPABASE_SERVICE_ROLE_KEY: {'✓' if SUPABASE_SERVICE_KEY else '✗'}")
        raise ValueError("Supabase URL and SERVICE_ROLE_KEY must be provided")
    
    logger.info(f"Initializing Supabase client with URL: {SUPABASE_URL}")
    logger.info(f"Using SERVICE_ROLE_KEY starting with: {SUPABASE_SERVICE_KEY[:20]}...")
    
    try:
        # Simple initialization that works with Supabase 2.15.2
        client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        logger.info("Supabase client initialized successfully")
        return client
        
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {str(e)}")
        raise