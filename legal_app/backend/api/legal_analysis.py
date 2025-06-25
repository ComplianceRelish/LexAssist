from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
import numpy as np
from numpy.linalg import norm

from models.legal_brief_analyzer import LegalBriefAnalyzer

router = APIRouter()

class TextAnalysisRequest(BaseModel):
    text: str
    model_version: Optional[str] = "1.0"

class TextAnalysisResponse(BaseModel):
    summary: str
    relevant_laws: List[str]
    case_references: List[str]
    legal_concepts: List[str]
    confidence_score: float
    timestamp: str
    model_version: str

# Lazy initialization of analyzer
analyzer = None

def get_analyzer():
    """Get or initialize the LegalBriefAnalyzer instance"""
    global analyzer
    if analyzer is None:
        try:
            analyzer = LegalBriefAnalyzer()
            return analyzer
        except Exception as e:
            raise HTTPException(
                status_code=503,
                detail=f"Failed to initialize LegalBriefAnalyzer: {str(e)}"
            )
    return analyzer

@router.post("/embeddings", response_model=Dict[str, List[float]])
async def get_text_embeddings(request: TextAnalysisRequest):
    """Get embeddings for legal text using InLegalBERT"""
    try:
        analyzer = get_analyzer()
        embeddings = analyzer._get_legal_embeddings(request.text)
        return {"embeddings": embeddings.tolist() if isinstance(embeddings, np.ndarray) else embeddings}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Calculate cosine similarity between two vectors"""
    return np.dot(a, b) / (norm(a) * norm(b))

@router.post("/similarity", response_model=float)
async def get_text_similarity(
    text1: str,
    text2: str,
    model_version: Optional[str] = "1.0"
):
    """Calculate semantic similarity between two legal texts using cosine similarity"""
    try:
        analyzer = get_analyzer()
        
        # Get embeddings for both texts
        emb1 = analyzer._get_legal_embeddings(text1)
        emb2 = analyzer._get_legal_embeddings(text2)
        
        # Convert to numpy arrays if they're not already
        emb1 = np.array(emb1).flatten()
        emb2 = np.array(emb2).flatten()
        
        # Calculate and return cosine similarity
        return float(cosine_similarity(emb1, emb2))
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze", response_model=TextAnalysisResponse)
async def analyze_legal_text(request: TextAnalysisRequest):
    """Analyze legal text and return comprehensive analysis"""
    try:
        analyzer = get_analyzer()
        analysis = analyzer.analyze(request.text)
        return TextAnalysisResponse(
            summary=analysis["summary"],
            relevant_laws=analysis["relevant_laws"],
            case_references=analysis["case_references"],
            legal_concepts=analysis.get("legal_concepts", []),
            confidence_score=analysis.get("confidence_score", 0.0),
            timestamp=datetime.now(timezone.utc).isoformat(),
            model_version=request.model_version
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health", response_model=Dict[str, Any])
async def health_check():
    """Health check endpoint that verifies HuggingFace API connectivity"""
    from huggingface_hub import HfApi
    import os
    
    hf_token = os.getenv("HF_TOKEN")
    if not hf_token:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "error",
                "message": "HF_TOKEN environment variable not set",
                "huggingface_connected": False,
                "services": {
                    "huggingface_api": False,
                    "model_loading": False
                }
            }
        )
    
    try:
        # Test HuggingFace API connection
        api = HfApi(token=hf_token)
        api.whoami()  # This will raise an exception if token is invalid
        
        # Test model loading
        analyzer = get_analyzer()
        test_embeddings = analyzer._get_legal_embeddings("Test health check")
        
        if not isinstance(test_embeddings, np.ndarray) or test_embeddings.size == 0:
            raise ValueError("Invalid embeddings received from model")
            
        return {
            "status": "healthy",
            "huggingface_connected": True,
            "services": {
                "huggingface_api": True,
                "model_loading": True
            },
            "embedding_shape": list(test_embeddings.shape) if hasattr(test_embeddings, 'shape') else None,
            "environment": {
                "hf_home": os.getenv("HF_HOME"),
                "transformers_cache": os.getenv("TRANSFORMERS_CACHE")
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )
