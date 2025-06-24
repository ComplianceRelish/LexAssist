"""
LegalBert Service for LexAssist Application

This service provides an interface to the InLegalBERT model for legal text processing.
Using Hugging Face Inference API only - no local model loading.
"""

import os
import logging
import requests
from typing import List, Dict, Any, Optional
import asyncio
import aiohttp
from concurrent.futures import ThreadPoolExecutor

# Configure logging
logger = logging.getLogger(__name__)


class InLegalBERTService:
    """Service to handle InLegalBERT model operations using Hugging Face API only"""
    
    def __init__(self):
        self.use_hf_api = os.getenv("USE_HF_INFERENCE_API", "false").lower() == "true"
        self.model_name = os.getenv("INLEGALBERT_MODEL_PATH", "nlpaueb/legal-bert-base-uncased")
        self.hf_token = os.getenv("HUGGINGFACE_API_TOKEN")
        self.api_url = f"https://api-inference.huggingface.co/models/{self.model_name}"
        
        # Only initialize API client, NO local model loading
        if self.use_hf_api:
            logger.info(f"🚀 InLegalBERT configured for API-only mode: {self.model_name}")
            if not self.hf_token:
                logger.warning("⚠️ HUGGINGFACE_API_TOKEN not set - using public API (may have rate limits)")
        else:
            logger.error("❌ Local model loading disabled. Set USE_HF_INFERENCE_API=true")
            raise ValueError("Local model loading is disabled. Use Hugging Face API instead.")
    
    async def analyze_legal_text(self, text: str, max_length: int = 512) -> Dict[str, Any]:
        """Analyze legal text using Hugging Face API only"""
        if not self.use_hf_api:
            raise ValueError("API mode required")
        
        try:
            headers = {}
            if self.hf_token:
                headers["Authorization"] = f"Bearer {self.hf_token}"
            
            # Truncate text to avoid API limits
            if len(text) > max_length:
                text = text[:max_length]
            
            payload = {"inputs": text}
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url, 
                    headers=headers, 
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            "status": "success",
                            "model": self.model_name,
                            "analysis": result,
                            "method": "huggingface_api"
                        }
                    else:
                        error_text = await response.text()
                        logger.error(f"HF API error {response.status}: {error_text}")
                        return {
                            "status": "error",
                            "error": f"API returned {response.status}",
                            "details": error_text
                        }
        
        except Exception as e:
            logger.error(f"InLegalBERT API analysis failed: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "model": self.model_name
            }
    
    async def batch_analyze_legal_texts(self, texts: List[str], max_length: int = 512) -> List[Dict[str, Any]]:
        """Analyze multiple legal texts in parallel using Hugging Face API"""
        if not self.use_hf_api:
            raise ValueError("API mode required")
        
        # Process each text with a maximum of 5 concurrent requests
        tasks = [self.analyze_legal_text(text, max_length) for text in texts]
        results = await asyncio.gather(*tasks)
        return results
    
    def analyze_legal_text_sync(self, text: str, max_length: int = 512) -> Dict[str, Any]:
        """Synchronous version of analyze_legal_text for non-async contexts"""
        if not self.use_hf_api:
            raise ValueError("API mode required")
        
        loop = asyncio.new_event_loop()
        try:
            result = loop.run_until_complete(self.analyze_legal_text(text, max_length))
            return result
        finally:
            loop.close()
    
    def batch_analyze_legal_texts_sync(self, texts: List[str], max_length: int = 512) -> List[Dict[str, Any]]:
        """Synchronous version of batch_analyze_legal_texts for non-async contexts"""
        if not self.use_hf_api:
            raise ValueError("API mode required")
        
        loop = asyncio.new_event_loop()
        try:
            results = loop.run_until_complete(self.batch_analyze_legal_texts(texts, max_length))
            return results
        finally:
            loop.close()
    
    def get_api_status(self) -> Dict[str, Any]:
        """Check if the Hugging Face API is available"""
        try:
            headers = {}
            if self.hf_token:
                headers["Authorization"] = f"Bearer {self.hf_token}"
            
            response = requests.get(
                self.api_url, 
                headers=headers,
                timeout=5
            )
            
            return {
                "status": "available" if response.status_code == 200 else "unavailable",
                "code": response.status_code,
                "model": self.model_name,
                "api_mode": self.use_hf_api
            }
        except Exception as e:
            logger.error(f"Failed to check API status: {e}")
            return {
                "status": "error",
                "error": str(e),
                "model": self.model_name,
                "api_mode": self.use_hf_api
            }


# Singleton instance
_inlegalbert_service = None
_initialization_lock = threading.RLock()

def get_inlegalbert_service():
    """Get or create the InLegalBERTService singleton instance"""
    global _inlegalbert_service
    
    # If service is already initialized, return it
    if _inlegalbert_service is not None:
        return _inlegalbert_service
    
    # Prevent multiple threads from initializing simultaneously
    with _initialization_lock:
        # Check again in case another thread initialized while we were waiting
        if _inlegalbert_service is not None:
            return _inlegalbert_service
        
        # Create new service instance using API-only mode
        try:
            logger.info("Initializing InLegalBERTService in API-only mode")
            _inlegalbert_service = InLegalBERTService()
            logger.info("InLegalBERTService initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize InLegalBERTService: {e}")
            raise
    
    return _inlegalbert_service