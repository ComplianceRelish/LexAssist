import os
from supabase import create_client, Client
from backend.config import Config
from backend.utils.logger import setup_logger

class SupabaseClient:
    def __init__(self, url: str = None, key: str = None):
        self.logger = setup_logger("SupabaseClient")
        self.url = url or Config.SUPABASE_URL
        # Backend uses the service-role key so it can bypass RLS.
        # Auth is validated separately via JWT cookies in app.py.
        self.key = key or Config.SUPABASE_SERVICE_ROLE_KEY or Config.SUPABASE_ANON_PUBLIC_KEY
        self.client = None
        if self.url and self.key:
            try:
                self.client = create_client(self.url, self.key)
            except Exception as e:
                self.logger.error(f"Supabase client init error: {e}")
