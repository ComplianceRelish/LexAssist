"""
Supabase client initialization module.
Working version for Supabase 2.15.2
"""
import os
import logging
from supabase import create_client, Client
from dotenv import load_dotenv

# Configure logging
logger = logging.getLogger("lexassist.supabase")

def get_supabase_client() -> Client:
    """
    Create and return Supabase client instance for backend operations.
    Simple version for Supabase 2.15.2
    """
    # Load environment variables at runtime
    load_dotenv()
    
    # Get Supabase credentials directly from environment
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    # Validate credentials are available
    if not supabase_url or not supabase_key:
        logger.error("Supabase credentials are missing. Check environment variables.")
        logger.error(f"SUPABASE_URL: {'✓' if supabase_url else '✗'}")
        logger.error(f"SUPABASE_SERVICE_ROLE_KEY: {'✓' if supabase_key else '✗'}")
        raise ValueError("Supabase URL and SERVICE_ROLE_KEY must be provided")
    
    logger.info(f"Initializing Supabase client with URL: {supabase_url}")
    logger.info(f"Using SERVICE_ROLE_KEY starting with: {supabase_key[:5]}...")
    
    # Print all environment variables for debugging
    logger.debug(f"All environment variables: {[key for key in os.environ.keys()]}")
    logger.debug(f"SUPABASE_URL length: {len(supabase_url) if supabase_url else 0}")
    logger.debug(f"SUPABASE_SERVICE_ROLE_KEY length: {len(supabase_key) if supabase_key else 0}")
    
    try:
        # Simple initialization that works with Supabase 2.15.2
        client = create_client(supabase_url, supabase_key)
        logger.info("Supabase client initialized successfully")
        return client
        
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {str(e)}")
        raise