from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime
import numpy as np

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

@router.post("/similarity", response_model=float)
async def get_text_similarity(
    text1: str,
    text2: str,
    model_version: Optional[str] = "1.0"
):
    """Calculate semantic similarity between two legal texts"""
    try:
        analyzer = get_analyzer()
        embeddings1 = analyzer._get_legal_embeddings(text1)
        embeddings2 = analyzer._get_legal_embeddings(text2)
        similarity = torch.nn.functional.cosine_similarity(
            embeddings1, embeddings2, dim=1
        ).item()
        return similarity
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
            timestamp=datetime.utcnow().isoformat(),
            model_version=request.model_version
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health", response_model=Dict[str, str])
async def health_check():
    """Check InLegalBERT service health"""
    try:
        analyzer = get_analyzer()
        # Test model initialization
        analyzer._get_legal_embeddings("Test text")
        return {
            "status": "healthy",
            "service": "inlegalbert",
            "model_version": "1.0",
            "timestamp": datetime.utcnow().isoformat()
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        )
