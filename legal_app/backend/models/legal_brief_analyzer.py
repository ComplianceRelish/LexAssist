"""
Legal Brief Analyzer model that processes legal text input
and provides analysis, relevant laws, and case references using InLegalBERT.
"""

import os
from typing import Dict, List, Tuple, Union
import numpy as np
from numpy.linalg import norm
from huggingface_hub import InferenceClient
from backend.services.indian_kanoon import IndianKanoonAPI

class LegalBriefAnalyzer:
    def __init__(self):
        """Initialize the LegalBriefAnalyzer with HuggingFace Inference API and IndianKanoon API"""
        self.kanoon_api = IndianKanoonAPI()
        
        # Initialize HuggingFace Inference client
        try:
            self.client = InferenceClient(
                provider="hf-inference",
                api_key=os.environ["HF_TOKEN"]
            )
            self.model_name = "law-ai/InLegalBERT"
        except Exception as e:
            raise Exception(f"Failed to initialize HuggingFace client: {str(e)}")
        
    def analyze(self, brief_text: str) -> Dict[str, any]:
        """
        Analyze a legal brief and return comprehensive analysis using HuggingFace API.
        
        Args:
            brief_text (str): The legal brief text to analyze
            
        Returns:
            dict: Analysis results containing summary, relevant laws, case references, and legal concepts
        """
        try:
            # Get embeddings for the text
            embeddings = self._get_legal_embeddings(brief_text)
            
            # Generate analysis components
            results = {
                "summary": self._generate_summary(brief_text),
                "relevant_laws": self._find_relevant_laws(brief_text, embeddings),
                "case_references": self._find_case_references(brief_text, embeddings),
                "legal_concepts": self._extract_legal_concepts(brief_text, embeddings),
                "confidence_score": self._calculate_confidence(embeddings)
            }
            return results
        except Exception as e:
            raise Exception(f"Error analyzing legal brief: {str(e)}")
    
    def _get_legal_embeddings(self, text: str) -> np.ndarray:
        """Get embeddings for the text using HuggingFace Inference API"""
        try:
            if not text.strip():
                raise ValueError("Input text cannot be empty")
                
            # Use feature-extraction task from HF Inference API
            result = self.client.feature_extraction(
                text,
                model=self.model_name
            )
            
            # Ensure we have valid embeddings
            if not result or not isinstance(result, (list, np.ndarray)):
                raise ValueError("Invalid embeddings format received from API")
                
            # Convert to numpy array and ensure 1D vector
            embeddings = np.array(result)
            if embeddings.ndim > 1:
                # If we get multiple vectors (e.g., for multiple tokens), average them
                embeddings = np.mean(embeddings, axis=0)
                
            return embeddings.astype(np.float32)
            
        except Exception as e:
            raise Exception(f"Error getting embeddings from HuggingFace API: {str(e)}")
    
    def _generate_summary(self, text: str) -> str:
        """Generate a concise summary of the legal brief using InLegalBERT"""
        try:
            # Use a simple approach for now - implement proper summarization later
            sentences = text.split('.')[:3]  # Get first 3 sentences
            summary = '. '.join(sentences) + '.'
            return summary
        except Exception as e:
            raise Exception(f"Error generating summary: {str(e)}")
    
    def _find_relevant_laws(self, text: str, embeddings: torch.Tensor) -> List[Dict[str, any]]:
        """Find laws relevant to the legal brief using IndianKanoon API"""
        try:
            # Use embeddings to find similar laws
            laws = self.kanoon_api.search_relevant_laws(text, embeddings)
            return laws
        except Exception as e:
            raise Exception(f"Error finding relevant laws: {str(e)}")
    
    def _find_case_references(self, text: str, embeddings: torch.Tensor) -> List[Dict[str, any]]:
        """Find relevant case references using IndianKanoon API"""
        try:
            # Use embeddings to find similar cases
            cases = self.kanoon_api.search_similar_cases(text, embeddings)
            return cases
        except Exception as e:
            raise Exception(f"Error finding case references: {str(e)}")
    
    def _extract_legal_concepts(self, text: str, embeddings: torch.Tensor) -> List[str]:
        """Extract key legal concepts from the text using InLegalBERT"""
        try:
            # Use embeddings to identify key legal concepts
            # This is a placeholder - implement proper concept extraction later
            return ["contract law", "civil procedure", "legal interpretation"]
        except Exception as e:
            raise Exception(f"Error extracting legal concepts: {str(e)}")
    
    def _calculate_confidence(self, embeddings: torch.Tensor) -> float:
        """Calculate confidence score based on embeddings"""
        try:
            # Calculate confidence based on embedding variance
            variance = torch.var(embeddings).item()
            confidence = 1.0 - (variance / 2.0)
            return max(0.0, min(1.0, confidence))
        except Exception as e:
            raise Exception(f"Error calculating confidence: {str(e)}")