import requests
from backend.config import Config
from backend.utils.logger import setup_logger

class IndianKanoonAPI:
    def __init__(self, api_key: str = None):
        self.logger = setup_logger("IndianKanoonAPI")
        self.api_key = api_key or Config.INDIAN_KANOON_API_KEY
        self.base_url = "https://api.indiankanoon.org"
        self.headers = {
            "Authorization": f"Token {self.api_key}",
            "Accept": "application/json"
        }

    def search_judgments(self, query, **kwargs):
        url = f"{self.base_url}/search/"
        params = {"query": query}
        params.update(kwargs)
        try:
            resp = requests.get(url, headers=self.headers, params=params, timeout=10)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            self.logger.error(f"Error in search_judgments: {e}")
            return {"error": str(e)}
