from datetime import datetime, timedelta

import requests
from backend.config import Config
from backend.utils.logger import setup_logger


class IndianKanoonAPI:
    """Client for the Indian Kanoon case-law search API.

    The Indian Kanoon API uses POST (form-encoded) for search and
    Token-based authentication via the Authorization header.
    """

    def __init__(self, api_key: str = None):
        self.logger = setup_logger("IndianKanoonAPI")
        self.api_key = api_key or Config.INDIAN_KANOON_API_KEY
        self.base_url = "https://api.indiankanoon.org"
        self.headers = {
            "Authorization": f"Token {self.api_key}",
        }
        self._available = bool(self.api_key)

    @property
    def is_available(self) -> bool:
        return self._available

    def search_judgments(self, query: str, **kwargs) -> dict:
        """Search Indian Kanoon for judgments matching *query*.

        The API requires a POST request with form-encoded body.
        Returns the parsed JSON response or {"error": ...} on failure.
        """
        url = f"{self.base_url}/search/"
        form_data = {"formInput": query, "pagenum": kwargs.get("pagenum", 0)}
        # Pass through any extra params (e.g. filters)
        for k, v in kwargs.items():
            if k != "pagenum":
                form_data[k] = v
        try:
            resp = requests.post(
                url,
                headers=self.headers,
                data=form_data,
                timeout=15,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            self.logger.error("search_judgments failed: %s", e)
            return {"error": str(e)}

    def get_doc(self, doc_id: str) -> dict:
        """Fetch a single document/judgment by its Indian Kanoon doc ID."""
        url = f"{self.base_url}/doc/{doc_id}/"
        try:
            resp = requests.post(
                url,
                headers=self.headers,
                timeout=15,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            self.logger.error("get_doc(%s) failed: %s", doc_id, e)
            return {"error": str(e)}

    def get_doc_excerpt(self, doc_id: str, max_chars: int = 3000) -> str:
        """Fetch a judgment and return a trimmed excerpt of the core text.

        Strips HTML, takes the tail portion (where the ratio decidendi
        and operative order typically appear), capped at *max_chars*.
        Returns an empty string on failure.
        """
        import re as _re

        data = self.get_doc(doc_id)
        if "error" in data or "doc" not in data:
            return ""
        raw = data["doc"]
        # Strip HTML tags
        text = _re.sub(r"<[^>]+>", " ", raw)
        # Collapse whitespace
        text = _re.sub(r"\s+", " ", text).strip()
        if not text:
            return ""
        # Take the last `max_chars` characters — the holding / ratio
        # decidendi is almost always near the end of Indian judgments.
        if len(text) > max_chars:
            text = "…" + text[-max_chars:]
        return text

    def search_recent(self, query: str, years: int = 3, **kwargs) -> dict:
        """Search Indian Kanoon sorted by most-recent, filtered to the last *years*.

        Appends ``sortby:mostrecent`` and ``fromdate:DD-MM-YYYY`` qualifiers
        to the query so the API returns newest judgments first.
        """
        cutoff = datetime.now() - timedelta(days=years * 365)
        date_str = cutoff.strftime("%d-%m-%Y")
        recent_query = f"{query} sortby:mostrecent fromdate:{date_str}"
        self.logger.info("search_recent query: %s", recent_query)
        return self.search_judgments(recent_query, **kwargs)
