import os
import torch
from transformers import AutoModel, AutoTokenizer, AutoConfig
from typing import List, Dict, Optional, Union
import numpy as np
import json
import logging

logger = logging.getLogger(__name__)

class InLegalBERT:
    """
    InLegalBERT - Custom legal domain BERT model for legal text understanding
    Built on top of domain-adapted BERT with custom pretraining for legal corpus
    """
    def __init__(self, model_name_or_path: str = "nlpaueb/legal-bert-base-uncased", 
                 device: Optional[str] = None,
                 max_seq_length: int = 512,
                 do_lower_case: bool = True,
                 cache_dir: Optional[str] = None):
        """
        Initialize InLegalBERT model
        
        Args:
            model_name_or_path: Path to model or model name from HuggingFace Hub
            device: Device to use for model (cpu/cuda)
            max_seq_length: Maximum sequence length
            do_lower_case: Whether to lowercase text
            cache_dir: Directory to cache model files
        """
        self.model_name = model_name_or_path
        self.max_seq_length = max_seq_length
        self.do_lower_case = do_lower_case
        
        # Set device
        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        self.device = torch.device(device)
        
        logger.info(f"Loading InLegalBERT model from {model_name_or_path} on {device}")
        
        # Load model and tokenizer
        self.config = AutoConfig.from_pretrained(model_name_or_path, cache_dir=cache_dir)
        self.tokenizer = AutoTokenizer.from_pretrained(
            model_name_or_path, 
            do_lower_case=do_lower_case,
            cache_dir=cache_dir
        )
        self.model = AutoModel.from_pretrained(model_name_or_path, config=self.config, cache_dir=cache_dir)
        
        # Move model to device
        self.model.to(self.device)
        self.model.eval()
        
        # Load legal domain knowledge if available
        self._load_legal_domain_knowledge()
    
    def _load_legal_domain_knowledge(self):
        """
        Load legal domain knowledge if available
        """
        self.legal_domain_knowledge = {}
        
        # Try to load domain knowledge from files
        domain_knowledge_path = os.path.join(os.path.dirname(__file__), 'domain_knowledge')
        
        if os.path.exists(domain_knowledge_path):
            # Load legal terminology
            terminology_path = os.path.join(domain_knowledge_path, 'legal_terminology.json')
            if os.path.exists(terminology_path):
                try:
                    with open(terminology_path, 'r') as f:
                        self.legal_domain_knowledge['terminology'] = json.load(f)
                except Exception as e:
                    logger.warning(f"Error loading legal terminology: {e}")
            
            # Load legal concepts
            concepts_path = os.path.join(domain_knowledge_path, 'legal_concepts.json')
            if os.path.exists(concepts_path):
                try:
                    with open(concepts_path, 'r') as f:
                        self.legal_domain_knowledge['concepts'] = json.load(f)
                except Exception as e:
                    logger.warning(f"Error loading legal concepts: {e}")
            
            # Load jurisdictions
            jurisdictions_path = os.path.join(domain_knowledge_path, 'jurisdictions.json')
            if os.path.exists(jurisdictions_path):
                try:
                    with open(jurisdictions_path, 'r') as f:
                        self.legal_domain_knowledge['jurisdictions'] = json.load(f)
                except Exception as e:
                    logger.warning(f"Error loading jurisdictions: {e}")
    
    def encode(self, texts: Union[List[str], str], batch_size: int = 8,
               show_progress_bar: bool = False, normalize_embeddings: bool = True) -> np.ndarray:
        """
        Encode texts to embeddings
        
        Args:
            texts: List of texts or single text to encode
            batch_size: Batch size for encoding
            show_progress_bar: Whether to show progress bar during encoding
            normalize_embeddings: Whether to normalize embeddings to unit length
            
        Returns:
            Text embeddings as numpy array
        """
        # Convert single text to list
        if isinstance(texts, str):
            texts = [texts]
        
        # Prepare batches
        embeddings = []
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i+batch_size]
            
            # Tokenize
            inputs = self.tokenizer(
                batch_texts,
                add_special_tokens=True,
                padding=True,
                truncation=True,
                max_length=self.max_seq_length,
                return_tensors="pt"
            )
            
            # Move inputs to device
            inputs = {name: tensor.to(self.device) for name, tensor in inputs.items()}
            
            # Get embeddings
            with torch.no_grad():
                outputs = self.model(**inputs)
                batch_embeddings = outputs.last_hidden_state[:, 0].cpu().numpy()  # Use [CLS] token
            
            embeddings.append(batch_embeddings)
        
        # Combine all embeddings
        embeddings = np.vstack(embeddings)
        
        # Normalize if requested
        if normalize_embeddings:
            embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
        
        return embeddings
    
    def get_semantic_similarity(self, texts1: List[str], texts2: List[str]) -> np.ndarray:
        """
        Calculate semantic similarity between two lists of texts
        
        Args:
            texts1: First list of texts
            texts2: Second list of texts
            
        Returns:
            Matrix of cosine similarities
        """
        # Encode both lists
        embeddings1 = self.encode(texts1)
        embeddings2 = self.encode(texts2)
        
        # Calculate cosine similarity
        similarity_matrix = np.matmul(embeddings1, embeddings2.T)
        
        return similarity_matrix
    
    def extract_legal_entities(self, text: str) -> Dict[str, List[str]]:
        """
        Extract legal entities from text
        
        Args:
            text: Text to extract entities from
            
        Returns:
            Dictionary of entity types and extracted entities
        """
        # Placeholder for legal entity extraction
        # In a real implementation, this would use NER or pattern matching with legal domain knowledge
        
        entities = {
            'citations': [],
            'statutes': [],
            'case_names': [],
            'legal_terms': [],
            'judges': [],
            'parties': []
        }
        
        # Basic pattern matching for citations
        citation_patterns = [
            r'(\d+\s+U\.S\.\s+\d+)',                    # US Reports
            r'(\d+\s+S\.\s*Ct\.\s+\d+)',                # Supreme Court Reporter
            r'(\d+\s+SCC\s+\d+)',                       # Supreme Court Cases (India)
            r'(\[\d{4}\]\s+\d+\s+SCR\s+\d+)',           # Supreme Court Reports
            r'(\d{4}\s+AIR\s+SC\s+\d+)',                # All India Reporter
            r'([A-Za-z]+\s+v\.?\s+[A-Za-z]+)'           # Case names
        ]
        
        for pattern in citation_patterns:
            matches = re.findall(pattern, text)
            if matches:
                if '[' in pattern or ']' in pattern:
                    entities['citations'].extend(matches)
                elif 'v.' in pattern or 'v ' in pattern:
                    entities['case_names'].extend(matches)
                else:
                    entities['citations'].extend(matches)
        
        # Extract legal terms using domain knowledge
        if 'terminology' in self.legal_domain_knowledge:
            legal_terms = self.legal_domain_knowledge['terminology']
            for term in legal_terms:
                if term.lower() in text.lower():
                    entities['legal_terms'].append(term)
        
        return entities
    
    def classify_legal_domain(self, text: str) -> Dict[str, float]:
        """
        Classify text into legal domains
        
        Args:
            text: Text to classify
            
        Returns:
            Dictionary of legal domains and confidence scores
        """
        # Placeholder for legal domain classification
        # In a real implementation, this would use a fine-tuned classifier
        
        # Legal domains
        legal_domains = [
            'constitutional_law',
            'criminal_law',
            'civil_law',
            'corporate_law',
            'intellectual_property',
            'tax_law',
            'administrative_law',
            'environmental_law',
            'family_law',
            'labor_law'
        ]
        
        # Extract embeddings
        embedding = self.encode(text)
        
        # Simulate classification scores
        # This should be replaced with actual classification model
        import random
        random.seed(hash(text) % 10000)  # Use text hash for deterministic results
        
        scores = {}
        raw_scores = [random.random() for _ in legal_domains]
        total = sum(raw_scores)
        
        for domain, score in zip(legal_domains, raw_scores):
            scores[domain] = score / total
        
        return scores
    
    def save_model(self, output_dir: str):
        """
        Save model to directory
        
        Args:
            output_dir: Directory to save model
        """
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        logger.info(f"Saving model to {output_dir}")
        
        # Save model and tokenizer
        self.model.save_pretrained(output_dir)
        self.tokenizer.save_pretrained(output_dir)
        
        # Save config
        with open(os.path.join(output_dir, 'inlegal_bert_config.json'), 'w') as f:
            json.dump({
                'model_name': self.model_name,
                'max_seq_length': self.max_seq_length,
                'do_lower_case': self.do_lower_case
            }, f)
            
        logger.info("Model saved successfully")
    
    @classmethod
    def load_model(cls, model_dir: str, device: Optional[str] = None):
        """
        Load model from directory
        
        Args:
            model_dir: Directory containing saved model
            device: Device to load model on
            
        Returns:
            Loaded InLegalBERT model
        """
        # Load config
        with open(os.path.join(model_dir, 'inlegal_bert_config.json'), 'r') as f:
            config = json.load(f)
            
        # Create instance
        instance = cls(
            model_name_or_path=model_dir,
            device=device,
            max_seq_length=config['max_seq_length'],
            do_lower_case=config['do_lower_case']
        )
        
        return instance
