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
# ✅ Use SERVICE_ROLE_KEY for backend operations (not ANON_PUBLIC_KEY)
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_PUBLIC_KEY", "")  # Keep for reference

# Configure logging
logger = logging.getLogger("lexassist.supabase")

def get_supabase_client() -> Client:
    """
    Create and return Supabase client instance for backend operations.
    Uses SERVICE_ROLE_KEY to bypass RLS and perform admin operations.
    
    Returns:
        Client: Supabase client instance with service role privileges
    """
    # Check for missing credentials
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        logger.error("Supabase credentials are missing. Check environment variables.")
        logger.error(f"SUPABASE_URL: {'✓' if SUPABASE_URL else '✗'}")
        logger.error(f"SUPABASE_SERVICE_ROLE_KEY: {'✓' if SUPABASE_SERVICE_KEY else '✗'}")
        raise ValueError("Supabase URL and SERVICE_ROLE_KEY must be provided for backend operations")
    
    # Log Supabase URL and key info (not the actual key for security)
    logger.info(f"Initializing Supabase client with URL: {SUPABASE_URL}")
    logger.info(f"Using SERVICE_ROLE_KEY starting with: {SUPABASE_SERVICE_KEY[:20]}...")
    
    try:
        # Create Supabase client with SERVICE_ROLE_KEY for backend operations
        # This bypasses RLS and allows admin operations
        client = create_client(
            supabase_url=SUPABASE_URL, 
            supabase_key=SUPABASE_SERVICE_KEY,
            options={
                "auth": {
                    "auto_refresh_token": True,
                    "persist_session": False,  # Backend doesn't need session persistence
                    "detect_session_in_url": False,  # Backend doesn't handle URL sessions
                },
                "db": {
                    "schema": "public"
                }
            }
        )
        
        logger.info("Supabase client initialized successfully with service role")
        return client
        
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {str(e)}")
        raise

def get_supabase_anon_client() -> Client:
    """
    Create and return Supabase client instance with anon key.
    Use this for operations that should respect RLS policies.
    
    Returns:
        Client: Supabase client instance with anon privileges
    """
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise ValueError("Supabase URL and ANON_KEY must be provided")
    
    try:
        client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        logger.info("Supabase anon client initialized successfully")
        return client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase anon client: {str(e)}")
        raise