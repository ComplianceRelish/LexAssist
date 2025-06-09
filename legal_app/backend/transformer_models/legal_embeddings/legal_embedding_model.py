import os
import torch
import numpy as np
import json
import logging
from transformers import AutoModel, AutoTokenizer
from typing import List, Dict, Union, Optional, Tuple
from sklearn.metrics.pairwise import cosine_similarity
import faiss

logger = logging.getLogger(__name__)

class LegalEmbeddingModel:
    """
    Legal Embeddings Model - Generates and manages embeddings for legal documents
    """
    def __init__(self, model_name_or_path: str = "nlpaueb/legal-bert-base-uncased",
                 device: Optional[str] = None,
                 embedding_dim: int = 768,
                 pooling_strategy: str = "cls",
                 index_type: str = "flat",
                 cache_dir: Optional[str] = None):
        """
        Initialize Legal Embeddings Model
        
        Args:
            model_name_or_path: Path to model or model name from HuggingFace Hub
            device: Device to use for model (cpu/cuda)
            embedding_dim: Dimension of embeddings
            pooling_strategy: How to pool token embeddings (cls, mean, max)
            index_type: Type of FAISS index (flat, ivf, hnsw)
            cache_dir: Directory to cache model files
        """
        self.model_name = model_name_or_path
        self.embedding_dim = embedding_dim
        self.pooling_strategy = pooling_strategy
        self.index_type = index_type
        
        # Set device
        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        self.device = torch.device(device)
        
        logger.info(f"Loading Legal Embedding Model from {model_name_or_path} on {device}")
        
        # Load model and tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(model_name_or_path, cache_dir=cache_dir)
        self.model = AutoModel.from_pretrained(model_name_or_path, cache_dir=cache_dir)
        
        # Move model to device
        self.model.to(self.device)
        self.model.eval()
        
        # Initialize embeddings index
        self.index = None
        self.document_ids = []
        self._initialize_faiss_index()
    
    def _initialize_faiss_index(self):
        """
        Initialize FAISS index based on configured index_type
        """
        if faiss is None:
            logger.warning("FAISS not available, index search functionality will not work")
            return
            
        if self.index_type == "flat":
            # Simple flat index
            self.index = faiss.IndexFlatIP(self.embedding_dim)
        elif self.index_type == "ivf":
            # IVF index for faster but approximate search
            quantizer = faiss.IndexFlatIP(self.embedding_dim)
            self.index = faiss.IndexIVFFlat(quantizer, self.embedding_dim, 100)  # 100 centroids
            # Need to train with vectors before use
        elif self.index_type == "hnsw":
            # HNSW index for even faster approximate search
            self.index = faiss.IndexHNSWFlat(self.embedding_dim, 32)  # 32 neighbors per node
        else:
            # Default to flat index
            logger.warning(f"Unknown index type '{self.index_type}', using flat index")
            self.index = faiss.IndexFlatIP(self.embedding_dim)
    
    def _pool_embeddings(self, token_embeddings: torch.Tensor, attention_mask: torch.Tensor) -> torch.Tensor:
        """
        Pool token embeddings based on strategy
        
        Args:
            token_embeddings: Token embeddings (batch_size, sequence_length, embedding_dim)
            attention_mask: Attention mask (batch_size, sequence_length)
            
        Returns:
            Pooled embeddings (batch_size, embedding_dim)
        """
        if self.pooling_strategy == "cls":
            # Use [CLS] token embedding
            return token_embeddings[:, 0]
        elif self.pooling_strategy == "mean":
            # Mean pooling - take average of all token embeddings
            input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
            sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, 1)
            sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-9)
            return sum_embeddings / sum_mask
        elif self.pooling_strategy == "max":
            # Max pooling - take maximum over token dimension
            input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
            token_embeddings[input_mask_expanded == 0] = -1e9  # Set padding tokens to large negative value
            return torch.max(token_embeddings, 1)[0]
        else:
            # Default to CLS token
            return token_embeddings[:, 0]
    
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
                max_length=512,
                return_tensors="pt"
            )
            
            # Move inputs to device
            inputs = {name: tensor.to(self.device) for name, tensor in inputs.items()}
            
            # Get embeddings
            with torch.no_grad():
                outputs = self.model(**inputs)
                token_embeddings = outputs.last_hidden_state
                batch_embeddings = self._pool_embeddings(token_embeddings, inputs['attention_mask']).cpu().numpy()
            
            embeddings.append(batch_embeddings)
        
        # Combine all embeddings
        embeddings = np.vstack(embeddings)
        
        # Normalize if requested
        if normalize_embeddings:
            embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
        
        return embeddings
    
    def add_documents(self, documents: List[Dict[str, str]], replace_existing: bool = False):
        """
        Add documents to the embedding index
        
        Args:
            documents: List of document dictionaries with 'id' and 'text' fields
            replace_existing: Whether to replace existing index
        """
        if faiss is None or self.index is None:
            logger.warning("FAISS index not available, documents not added")
            return
            
        if replace_existing:
            self.document_ids = []
            if self.index_type == "flat":
                self.index = faiss.IndexFlatIP(self.embedding_dim)
            # Re-initialize index if needed
        
        # Extract texts and IDs
        texts = [doc['text'] for doc in documents]
        ids = [doc['id'] for doc in documents]
        
        # Generate embeddings
        embeddings = self.encode(texts)
        
        # Add to index
        if self.index_type == "ivf" and not self.index.is_trained:
            if embeddings.shape[0] > 100:  # Need enough vectors to train
                self.index.train(embeddings)
            else:
                logger.warning("Not enough vectors to train IVF index, using untrained")
        
        self.index.add(embeddings)
        self.document_ids.extend(ids)
        
        logger.info(f"Added {len(documents)} documents to index, total documents: {len(self.document_ids)}")
    
    def search(self, query: Union[str, np.ndarray], k: int = 10) -> List[Dict[str, Union[str, float]]]:
        """
        Search for similar documents
        
        Args:
            query: Query text or query embedding
            k: Number of results to return
            
        Returns:
            List of search results with document IDs and scores
        """
        if faiss is None or self.index is None or len(self.document_ids) == 0:
            logger.warning("FAISS index not available or empty, search not performed")
            return []
            
        # Generate query embedding if it's a string
        if isinstance(query, str):
            query_embedding = self.encode(query)
        else:
            query_embedding = query.reshape(1, -1)
            
        # Make sure it's normalized
        query_embedding = query_embedding / np.linalg.norm(query_embedding, axis=1, keepdims=True)
        
        # Search index
        scores, indices = self.index.search(query_embedding, min(k, len(self.document_ids)))
        
        # Format results
        results = []
        for i, idx in enumerate(indices[0]):
            if idx < len(self.document_ids) and idx >= 0:  # Ensure index is valid
                results.append({
                    'document_id': self.document_ids[idx],
                    'score': float(scores[0][i])
                })
        
        return results
    
    def save_embeddings(self, output_dir: str):
        """
        Save embeddings index and metadata
        
        Args:
            output_dir: Directory to save embeddings
        """
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        logger.info(f"Saving embeddings to {output_dir}")
        
        # Save document IDs
        with open(os.path.join(output_dir, 'document_ids.json'), 'w') as f:
            json.dump(self.document_ids, f)
        
        # Save config
        with open(os.path.join(output_dir, 'embedding_config.json'), 'w') as f:
            json.dump({
                'model_name': self.model_name,
                'embedding_dim': self.embedding_dim,
                'pooling_strategy': self.pooling_strategy,
                'index_type': self.index_type
            }, f)
        
        # Save index if available
        if faiss is not None and self.index is not None:
            index_path = os.path.join(output_dir, 'faiss_index.bin')
            faiss.write_index(self.index, index_path)
            
        logger.info("Embeddings saved successfully")
    
    @classmethod
    def load_embeddings(cls, model_dir: str, device: Optional[str] = None):
        """
        Load embeddings from directory
        
        Args:
            model_dir: Directory containing saved embeddings
            device: Device to load model on
            
        Returns:
            Loaded LegalEmbeddingModel with embeddings
        """
        # Load config
        with open(os.path.join(model_dir, 'embedding_config.json'), 'r') as f:
            config = json.load(f)
            
        # Create instance
        instance = cls(
            model_name_or_path=config['model_name'],
            device=device,
            embedding_dim=config['embedding_dim'],
            pooling_strategy=config['pooling_strategy'],
            index_type=config['index_type']
        )
        
        # Load document IDs
        with open(os.path.join(model_dir, 'document_ids.json'), 'r') as f:
            instance.document_ids = json.load(f)
        
        # Load index if available
        if faiss is not None:
            index_path = os.path.join(model_dir, 'faiss_index.bin')
            if os.path.exists(index_path):
                instance.index = faiss.read_index(index_path)
        
        logger.info(f"Loaded embeddings with {len(instance.document_ids)} documents")
        return instance