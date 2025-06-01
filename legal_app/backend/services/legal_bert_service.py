"""
LegalBert Service for LexAssist Application

This service provides an interface to the InLegalBERT model for legal text processing.
"""

import os
import logging
from typing import List, Dict, Any, Optional
import torch
from transformers import AutoTokenizer, AutoModel, pipeline
from huggingface_hub import login

# Configure logging
logger = logging.getLogger(__name__)

class LegalBertService:
    """Service to handle InLegalBERT model operations"""
    
    def __init__(self, load_models_async=False):
        logger.info("Initializing LegalBertService")
        # Load environment variables
        self.model_path = os.environ.get("INLEGALBERT_MODEL_PATH", "law-ai/InLegalBERT")
        self.hf_token = os.environ.get("HUGGINGFACE_TOKEN")
        self.cache_dir = os.environ.get("INLEGALBERT_CACHE_DIR", "./models/inlegalbert")
        
        logger.info(f"Model path: {self.model_path}")
        logger.info(f"HF token provided: {bool(self.hf_token)}")
        logger.info(f"Cache directory: {self.cache_dir}")
        
        # Create cache directory if it doesn't exist
        os.makedirs(self.cache_dir, exist_ok=True)
        logger.info("Cache directory created/verified")
        
        # Login to Hugging Face if token is provided
        if self.hf_token:
            try:
                logger.info("Attempting to login to Hugging Face Hub")
                login(token=self.hf_token)
                logger.info("Successfully logged in to Hugging Face Hub")
            except Exception as e:
                logger.error(f"Failed to login to Hugging Face Hub: {e}")
        else:
            logger.warning("No Hugging Face token provided, some models may not be accessible")
        
        # Initialize model components
        self.tokenizer = None
        self.model = None
        self.fill_mask_pipe = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {self.device}")
        
        # Set model loading status
        self.is_loaded = False
        self.loading_error = None
        
        # Load models - either synchronously or asynchronously
        if load_models_async:
            logger.info("Starting asynchronous model loading process")
            thread = threading.Thread(target=self._load_models_thread)
            thread.daemon = True  # Thread will exit when main thread exits
            thread.start()
        else:
            logger.info("Starting synchronous model loading process")
            self._load_models()
    
    def _load_models_thread(self):
        """Thread method to load models asynchronously"""
        try:
            self._load_models()
            logger.info("Async model loading completed successfully")
        except Exception as e:
            logger.error(f"Error in async model loading: {e}")
            import traceback
            self.loading_error = str(e) + "\n" + traceback.format_exc()
    
    def _load_models(self):
        """Load all required models and tokenizers"""
        try:
            logger.info(f"Loading InLegalBERT models from {self.model_path}")
            
            # Load tokenizer with caching
            logger.info("Step 1: Loading tokenizer...")
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_path,
                cache_dir=self.cache_dir
            )
            logger.info("Tokenizer loaded successfully")
            
            # Load model with caching
            logger.info("Step 2: Loading model...")
            self.model = AutoModel.from_pretrained(
                self.model_path,
                cache_dir=self.cache_dir
            ).to(self.device)
            logger.info("Model loaded successfully")
            
            # Put model in evaluation mode
            logger.info("Setting model to evaluation mode")
            self.model.eval()
            
            # Create fill-mask pipeline
            logger.info("Step 3: Creating fill-mask pipeline...")
            self.fill_mask_pipe = pipeline(
                "fill-mask", 
                model=self.model_path,
                tokenizer=self.tokenizer,
                device=0 if self.device == "cuda" else -1,
                cache_dir=self.cache_dir
            )
            logger.info("Fill-mask pipeline created successfully")
            
            logger.info("InLegalBERT models loaded successfully")
            self.is_loaded = True
            
        except Exception as e:
            logger.error(f"Error loading InLegalBERT models: {e}")
            import traceback
            logger.error(f"Detailed error: {traceback.format_exc()}")
            self.loading_error = str(e)
            raise
    
    def get_document_embedding(self, text: str) -> List[float]:
        """Generate embeddings for a legal document"""
        # Check if model is loaded
        if not self.is_loaded:
            if self.loading_error:
                raise RuntimeError(f"Model failed to load: {self.loading_error}")
            else:
                raise RuntimeError("Model is still loading, please try again later")
        
        # Handle empty text
        if not text or not text.strip():
            logger.warning("Empty text provided for embedding generation")
            return [0.0] * 768  # Return zero vector of BERT's output size
        
        # Truncate long text if needed
        if len(text) > 10000:
            logger.warning(f"Text too long ({len(text)} chars), truncating to 10000 chars")
            text = text[:10000]
            
        try:
            # Tokenize the input text
            inputs = self.tokenizer(
                text, 
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding="max_length"
            ).to(self.device)
            
            # Generate embeddings
            with torch.no_grad():
                outputs = self.model(**inputs)
            
            # Use [CLS] token (first token) as document embedding
            embeddings = outputs.last_hidden_state[:, 0, :].squeeze().cpu().numpy().tolist()
            return embeddings
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            raise
        
        # Get [CLS] token embedding (document representation)
        embedding = outputs.last_hidden_state[:, 0, :].cpu().numpy()[0].tolist()
        return embedding
    
    def fill_legal_mask(self, text: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Fill in [MASK] tokens in legal text"""
        # Check if model is loaded
        if not self.is_loaded:
            if self.loading_error:
                raise RuntimeError(f"Model failed to load: {self.loading_error}")
            else:
                raise RuntimeError("Model is still loading, please try again later")
        
        if "[MASK]" not in text:
            raise ValueError("Text must contain at least one [MASK] token")
        
        # Handle excessive text length
        if len(text) > 10000:
            logger.warning(f"Text too long ({len(text)} chars), truncating to 10000 chars")
            text = text[:10000]
        
        # Process text with the fill-mask pipeline
        try:
            results = self.fill_mask_pipe(text, top_k=top_k)
            
            # Format results
            predictions = []
            
            # Handle multiple mask tokens
            if isinstance(results[0], list):
                for result_set in results:
                    mask_predictions = []
                    for result in result_set:
                        mask_predictions.append({
                            "token": result["token_str"],
                            "score": float(result["score"]),
                            "sequence": result["sequence"]
                        })
                    predictions.append(mask_predictions)
            else:
                # Single mask token
                for result in results:
                    predictions.append({
                        "token": result["token_str"],
                        "score": float(result["score"]),
                        "sequence": result["sequence"]
                    })
            
            return predictions
            
        except Exception as e:
            logger.error(f"Error in fill_legal_mask: {e}")
            raise
    
    def get_legal_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two legal texts"""
        # Check if model is loaded
        if not self.is_loaded:
            if self.loading_error:
                raise RuntimeError(f"Model failed to load: {self.loading_error}")
            else:
                raise RuntimeError("Model is still loading, please try again later")
        
        # Handle empty texts
        if not text1.strip() or not text2.strip():
            logger.warning("Empty text provided for similarity calculation")
            return 0.0
            
        embedding1 = self.get_document_embedding(text1)
        embedding2 = self.get_document_embedding(text2)
        
        # Convert to tensors
        tensor1 = torch.tensor(embedding1)
        tensor2 = torch.tensor(embedding2)
        
        # Calculate cosine similarity
        similarity = torch.nn.functional.cosine_similarity(
            tensor1.unsqueeze(0), tensor2.unsqueeze(0)
        ).item()
        
        return similarity
    
    def analyze_legal_text(self, text: str) -> Dict[str, Any]:
        """Perform comprehensive analysis on legal text"""
        # Check if model is loaded
        if not self.is_loaded:
            if self.loading_error:
                raise RuntimeError(f"Model failed to load: {self.loading_error}")
            else:
                raise RuntimeError("Model is still loading, please try again later")
        
        # This method integrates multiple analyses for a complete legal text assessment
        
        # Get embedding for overall representation
        embedding = self.get_document_embedding(text)
        
        # Determine text complexity (simple heuristic based on sentence length and word length)
        words = text.split()
        avg_word_length = sum(len(word) for word in words) / max(1, len(words))
        
        # Extract key legal entities (simplified implementation)
        legal_terms = self._extract_legal_entities(text)
        
        return {
            "embedding_dimension": len(embedding),
            "complexity_score": min(1.0, avg_word_length / 10),  # Normalize to 0-1
            "key_legal_terms": legal_terms,
            "document_length": len(text),
            "word_count": len(words)
        }
    
    def _extract_legal_entities(self, text: str) -> List[str]:
        """Extract key legal entities from text (simplified implementation)"""
        # This is a simplified implementation
        # In production, this would use NER models or regex patterns specific to legal documents
        
        common_legal_terms = [
            "plaintiff", "defendant", "court", "judgment", "petition", 
            "appeal", "section", "act", "statute", "law", "rights",
            "jurisdiction", "contract", "damages", "liability"
        ]
        
        found_terms = []
        lower_text = text.lower()
        
        for term in common_legal_terms:
            if term in lower_text:
                found_terms.append(term)
                
        return found_terms

import threading

# Singleton instance
_legal_bert_service = None
_is_initializing = False
_initialization_lock = threading.Lock()

def get_legal_bert_service():
    """Get or create the LegalBertService instance"""
    global _legal_bert_service, _is_initializing
    
    # If service is already initialized, return it
    if _legal_bert_service is not None:
        return _legal_bert_service
    
    # Prevent multiple threads from initializing simultaneously
    with _initialization_lock:
        # Check again in case another thread initialized while we were waiting
        if _legal_bert_service is not None:
            return _legal_bert_service
        
        # If initialization is not in progress, start it
        if not _is_initializing:
            _is_initializing = True
            logger.info("Starting asynchronous initialization of LegalBertService")
            
            # Create a service instance without loading models
            _legal_bert_service = LegalBertService(load_models_async=True)
    
    return _legal_bert_service
