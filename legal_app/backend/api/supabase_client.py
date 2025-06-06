"""
Supabase client initialization module.
Creates a singleton Supabase client for reuse across the application.
"""
import os
import logging
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Supabase credentials from environment variables
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_PUBLIC_KEY", "")

# Configure logging
logger = logging.getLogger("lexassist.supabase")

def get_supabase_client() -> Client:
    """
    Create and return Supabase client instance.
    Uses a singleton pattern to ensure a single client instance is used across the application.
    
    Returns:
        Client: Supabase client instance
    """
    # Check for missing credentials
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("Supabase credentials are missing. Check environment variables.")
        # In production, this should fail hard
        raise ValueError("Supabase URL and key must be provided")
    
    # Log Supabase URL (not the key for security)
    logger.info(f"Initializing Supabase client with URL: {SUPABASE_URL}")
    
    try:
        # Create Supabase client
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        return client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {str(e)}")
        raise