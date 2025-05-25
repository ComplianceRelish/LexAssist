import torch
from transformers import AutoModel, AutoTokenizer
from backend.utils.cache_manager import CacheManager
from backend.utils.logger import setup_logger

class InLegalBERTProcessor:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(InLegalBERTProcessor, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.logger = setup_logger("InLegalBERT")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.logger.info(f"Loading InLegalBERT model on device: {self.device}")
        self.tokenizer = AutoTokenizer.from_pretrained("law-ai/InLegalBERT")
        self.model = AutoModel.from_pretrained("law-ai/InLegalBERT").to(self.device)
        self.cache = CacheManager()
        self._initialized = True

    def encode(self, text):
        cache_key = f"inlegalbert:encode:{hash(text)}"
        cached = self.cache.get(cache_key)
        if cached:
            self.logger.info("Cache hit for encode")
            return torch.tensor(eval(cached))
        inputs = self.tokenizer(text, return_tensors="pt", truncation=True, padding=True)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        with torch.no_grad():
            outputs = self.model(**inputs)
            embedding = outputs.last_hidden_state.mean(dim=1).cpu().numpy().tolist()
        self.cache.set(cache_key, str(embedding))
        return embedding
