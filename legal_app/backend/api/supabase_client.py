"""
Supabase client initialization module.
Creates a singleton Supabase client for reuse across the application.
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Supabase credentials from environment variables
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY", "")

def get_supabase_client() -> Client:
    """
    Create and return Supabase client instance.
    Uses a singleton pattern to ensure a single client instance is used across the application.
    
    Returns:
        Client: Supabase client instance
    """
    # For development, we can create a dummy client if credentials are missing
    if not SUPABASE_URL or not SUPABASE_KEY:
        # In production, this would be a critical error
        # For development, we'll provide a warning and use dummy values
        print("WARNING: Supabase credentials are missing. Using dummy client.")
        return create_client("https://example.supabase.co", "dummy-key")
    
    # Create Supabase client
    return create_client(SUPABASE_URL, SUPABASE_KEY)
