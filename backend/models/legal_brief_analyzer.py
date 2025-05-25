from backend.services.indian_kanoon.py import IndianKanoonAPI
from backend.utils.logger import setup_logger
import nltk

class LegalBriefAnalyzer:
    def __init__(self, api_key: str = None):
        self.logger = setup_logger("LegalBriefAnalyzer")
        self.api_client = IndianKanoonAPI(api_key)
        self.stopwords = set(nltk.corpus.stopwords.words('english'))

    def analyze(self, text):
        # Example: extract keywords (real implementation should use InLegalBERT, etc.)
        words = [w for w in text.split() if w.lower() not in self.stopwords]
        return {"keywords": words[:10]}
