import os
import json
import logging
import torch
from typing import Dict, Any, List, Optional
from transformers import AutoTokenizer, AutoModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('inlegalbert_processor')

class InLegalBERTProcessor:
    """
    Processor for the InLegalBERT model for enhanced legal text analysis.
    This is used for Pro and Enterprise tier subscribers.
    """
    
    def __init__(self):
        """
        Initialize the InLegalBERT processor.
        """
        try:
            # Load the InLegalBERT model and tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained("law-ai/InLegalBERT")
            self.model = AutoModel.from_pretrained("law-ai/InLegalBERT")
            self.model_loaded = True
            logger.info("InLegalBERT model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading InLegalBERT model: {str(e)}")
            self.model_loaded = False
    
    def is_model_loaded(self) -> bool:
        """
        Check if the model is loaded successfully.
        
        Returns:
            True if the model is loaded, False otherwise
        """
        return self.model_loaded
    
    def get_text_embeddings(self, text: str) -> Optional[torch.Tensor]:
        """
        Get embeddings for a piece of text.
        
        Args:
            text: Input text
            
        Returns:
            Text embeddings or None if model is not loaded
        """
        if not self.model_loaded:
            logger.warning("Model not loaded, cannot get embeddings")
            return None
        
        try:
            # Tokenize the text and get model output
            encoded_input = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
            with torch.no_grad():
                output = self.model(**encoded_input)
            
            # Return the last hidden state
            return output.last_hidden_state
        except Exception as e:
            logger.error(f"Error getting embeddings: {str(e)}")
            return None
    
    def get_document_embedding(self, text: str) -> Optional[torch.Tensor]:
        """
        Get a single embedding vector for a document by averaging token embeddings.
        
        Args:
            text: Input document text
            
        Returns:
            Document embedding or None if model is not loaded
        """
        if not self.model_loaded:
            logger.warning("Model not loaded, cannot get document embedding")
            return None
        
        try:
            # Get token embeddings
            token_embeddings = self.get_text_embeddings(text)
            if token_embeddings is None:
                return None
            
            # Average the token embeddings (excluding special tokens)
            # Use the first token ([CLS]) as the document embedding
            return token_embeddings[:, 0, :]
        except Exception as e:
            logger.error(f"Error getting document embedding: {str(e)}")
            return None
    
    def segment_document(self, text: str) -> Dict[str, Any]:
        """
        Segment a legal document into functional parts (Facts, Arguments, etc.).
        
        Args:
            text: Input document text
            
        Returns:
            Dictionary with segmented document parts
        """
        if not self.model_loaded:
            logger.warning("Model not loaded, cannot segment document")
            return {"error": "Model not loaded"}
        
        try:
            # Split the document into sentences
            sentences = self._split_into_sentences(text)
            
            # Classify each sentence into a segment
            segments = {
                "facts": [],
                "arguments": [],
                "reasoning": [],
                "statute": [],
                "precedent": [],
                "ruling": [],
                "other": []
            }
            
            # This is a simplified implementation
            # In a real implementation, we would use a fine-tuned model for sequence labeling
            # For now, we'll use a simple heuristic approach
            for sentence in sentences:
                sentence = sentence.strip()
                if not sentence:
                    continue
                
                # Get sentence embedding
                sentence_embedding = self.get_document_embedding(sentence)
                if sentence_embedding is None:
                    continue
                
                # Classify the sentence based on keywords and patterns
                # This is a placeholder for actual classification logic
                if any(keyword in sentence.lower() for keyword in ["fact", "facts", "background", "brief facts"]):
                    segments["facts"].append(sentence)
                elif any(keyword in sentence.lower() for keyword in ["argue", "argument", "contend", "submission", "submitted"]):
                    segments["arguments"].append(sentence)
                elif any(keyword in sentence.lower() for keyword in ["reason", "because", "therefore", "thus", "hence"]):
                    segments["reasoning"].append(sentence)
                elif any(keyword in sentence.lower() for keyword in ["section", "act", "article", "rule", "regulation"]):
                    segments["statute"].append(sentence)
                elif any(keyword in sentence.lower() for keyword in ["case", "judgment", "decision", "precedent", "cited"]):
                    segments["precedent"].append(sentence)
                elif any(keyword in sentence.lower() for keyword in ["order", "direct", "dismiss", "allow", "grant", "deny"]):
                    segments["ruling"].append(sentence)
                else:
                    segments["other"].append(sentence)
            
            return segments
        except Exception as e:
            logger.error(f"Error segmenting document: {str(e)}")
            return {"error": str(e)}
    
    def identify_statutes(self, text: str) -> List[Dict[str, Any]]:
        """
        Identify relevant statutes based on the facts of a case.
        
        Args:
            text: Input case facts
            
        Returns:
            List of identified statutes with relevance scores
        """
        if not self.model_loaded:
            logger.warning("Model not loaded, cannot identify statutes")
            return [{"error": "Model not loaded"}]
        
        try:
            # This is a simplified implementation
            # In a real implementation, we would use a fine-tuned model for multi-label classification
            # For now, we'll use a simple pattern matching approach
            
            # Common Indian statutes and their patterns
            statutes = [
                {"name": "Indian Penal Code", "pattern": r"IPC|Indian Penal Code|section (\d+)"},
                {"name": "Code of Criminal Procedure", "pattern": r"CrPC|Criminal Procedure|section (\d+)"},
                {"name": "Code of Civil Procedure", "pattern": r"CPC|Civil Procedure|Order \w+|section (\d+)"},
                {"name": "Constitution of India", "pattern": r"Constitution|Article (\d+)"},
                {"name": "Indian Contract Act", "pattern": r"Contract Act|section (\d+)"},
                {"name": "Indian Evidence Act", "pattern": r"Evidence Act|section (\d+)"},
                {"name": "Income Tax Act", "pattern": r"Income Tax|section (\d+)"},
                {"name": "Companies Act", "pattern": r"Companies Act|section (\d+)"}
            ]
            
            # Identify statutes based on patterns
            identified_statutes = []
            for statute in statutes:
                import re
                matches = re.findall(statute["pattern"], text, re.IGNORECASE)
                if matches:
                    identified_statutes.append({
                        "name": statute["name"],
                        "relevance": 0.85,  # Placeholder for actual relevance score
                        "sections": list(set(matches))
                    })
            
            return identified_statutes
        except Exception as e:
            logger.error(f"Error identifying statutes: {str(e)}")
            return [{"error": str(e)}]
    
    def predict_judgment(self, text: str) -> Dict[str, Any]:
        """
        Predict the outcome of a case based on the facts and arguments.
        
        Args:
            text: Input case facts and arguments
            
        Returns:
            Dictionary with prediction results
        """
        if not self.model_loaded:
            logger.warning("Model not loaded, cannot predict judgment")
            return {"error": "Model not loaded"}
        
        try:
            # This is a simplified implementation
            # In a real implementation, we would use a fine-tuned model for binary classification
            # For now, we'll use a simple heuristic approach
            
            # Get document embedding
            document_embedding = self.get_document_embedding(text)
            if document_embedding is None:
                return {"error": "Failed to get document embedding"}
            
            # Placeholder for actual prediction logic
            # In a real implementation, we would use a classifier on top of the embeddings
            
            # Count positive and negative sentiment words as a simple heuristic
            positive_words = ["grant", "allow", "accept", "favorable", "merit", "valid", "legitimate", "right"]
            negative_words = ["dismiss", "deny", "reject", "unfavorable", "no merit", "invalid", "illegitimate", "wrong"]
            
            positive_count = sum(1 for word in positive_words if word in text.lower())
            negative_count = sum(1 for word in negative_words if word in text.lower())
            
            # Calculate a simple prediction score
            total = positive_count + negative_count
            if total == 0:
                prediction = 0.5  # Neutral
            else:
                prediction = positive_count / total
            
            return {
                "prediction": prediction,
                "outcome": "Accepted" if prediction > 0.5 else "Rejected",
                "confidence": abs(prediction - 0.5) * 2,  # Scale to [0, 1]
                "factors": {
                    "positive_indicators": positive_count,
                    "negative_indicators": negative_count
                }
            }
        except Exception as e:
            logger.error(f"Error predicting judgment: {str(e)}")
            return {"error": str(e)}
    
    def enhance_brief_analysis(self, brief: str, basic_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enhance the basic brief analysis with InLegalBERT insights.
        
        Args:
            brief: Input case brief
            basic_analysis: Basic analysis results
            
        Returns:
            Enhanced analysis results
        """
        if not self.model_loaded:
            logger.warning("Model not loaded, cannot enhance brief analysis")
            return basic_analysis
        
        try:
            enhanced_analysis = basic_analysis.copy()
            
            # Add document segmentation
            enhanced_analysis["segments"] = self.segment_document(brief)
            
            # Add statute identification
            enhanced_analysis["identified_statutes"] = self.identify_statutes(brief)
            
            # Add judgment prediction
            enhanced_analysis["judgment_prediction"] = self.predict_judgment(brief)
            
            # Add enhanced relevance scores for law sections and case histories
            if "lawSections" in enhanced_analysis:
                for i, section in enumerate(enhanced_analysis["lawSections"]):
                    # Calculate enhanced relevance score
                    # In a real implementation, this would use semantic similarity with embeddings
                    enhanced_analysis["lawSections"][i]["enhanced_relevance"] = min(section.get("relevance", 0.5) * 1.2, 1.0)
            
            if "caseHistories" in enhanced_analysis:
                for i, case in enumerate(enhanced_analysis["caseHistories"]):
                    # Calculate enhanced relevance score
                    # In a real implementation, this would use semantic similarity with embeddings
                    enhanced_analysis["caseHistories"][i]["enhanced_relevance"] = min(case.get("relevance", 0.5) * 1.2, 1.0)
            
            return enhanced_analysis
        except Exception as e:
            logger.error(f"Error enhancing brief analysis: {str(e)}")
            return basic_analysis
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """
        Split a text into sentences.
        
        Args:
            text: Input text
            
        Returns:
            List of sentences
        """
        # Simple sentence splitting based on common punctuation
        import re
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return sentences
