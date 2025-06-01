"""
API endpoints for InLegalBERT model functionality
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from ..services.legal_bert_service import get_legal_bert_service, LegalBertService

router = APIRouter()

class TextRequest(BaseModel):
    text: str = Field(..., description="Legal text to analyze")

class MaskFillRequest(BaseModel):
    text: str = Field(..., description="Text with [MASK] tokens")
    top_k: Optional[int] = Field(5, description="Number of predictions to return")

class SimilarityRequest(BaseModel):
    text1: str = Field(..., description="First legal text")
    text2: str = Field(..., description="Second legal text")

@router.post("/embeddings", response_model=Dict[str, List[float]])
async def get_text_embeddings(
    request: TextRequest,
    legal_bert_service: LegalBertService = Depends(get_legal_bert_service)
):
    """Generate embeddings for legal text"""
    try:
        embeddings = legal_bert_service.get_document_embedding(request.text)
        return {"embeddings": embeddings}
    except RuntimeError as e:
        if "still loading" in str(e):
            raise HTTPException(status_code=503, detail="Model is still loading, please try again later")
        elif "failed to load" in str(e):
            raise HTTPException(status_code=500, detail=str(e))
        else:
            raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating embeddings: {str(e)}")

@router.post("/fill-mask", response_model=Dict[str, List[Dict[str, Any]]])
async def fill_masked_text(
    request: MaskFillRequest,
    legal_bert_service: LegalBertService = Depends(get_legal_bert_service)
):
    """Fill masked tokens in legal text"""
    try:
        predictions = legal_bert_service.fill_legal_mask(request.text, request.top_k)
        return {"predictions": predictions}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        if "still loading" in str(e):
            raise HTTPException(status_code=503, detail="Model is still loading, please try again later")
        elif "failed to load" in str(e):
            raise HTTPException(status_code=500, detail=str(e))
        else:
            raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error filling mask: {str(e)}")

@router.post("/similarity", response_model=Dict[str, float])
async def get_text_similarity(
    request: SimilarityRequest,
    legal_bert_service: LegalBertService = Depends(get_legal_bert_service)
):
    """Calculate similarity between two legal texts"""
    try:
        similarity = legal_bert_service.get_legal_similarity(request.text1, request.text2)
        return {"similarity": similarity}
    except RuntimeError as e:
        if "still loading" in str(e):
            raise HTTPException(status_code=503, detail="Model is still loading, please try again later")
        elif "failed to load" in str(e):
            raise HTTPException(status_code=500, detail=str(e))
        else:
            raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating similarity: {str(e)}")

@router.post("/analyze", response_model=Dict[str, Any])
async def analyze_text(
    request: TextRequest,
    legal_bert_service: LegalBertService = Depends(get_legal_bert_service)
):
    """Analyze legal text and extract information"""
    try:
        analysis = legal_bert_service.analyze_legal_text(request.text)
        return analysis
    except RuntimeError as e:
        if "still loading" in str(e):
            raise HTTPException(status_code=503, detail="Model is still loading, please try again later")
        elif "failed to load" in str(e):
            raise HTTPException(status_code=500, detail=str(e))
        else:
            raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing text: {str(e)}")

@router.get("/health", tags=["Health Check"])
async def health_check(legal_bert_service: LegalBertService = Depends(get_legal_bert_service)):
    """Check the health of the InLegalBERT service"""
    status = "loading"
    details = {}
    
    if hasattr(legal_bert_service, "is_loaded"):
        if legal_bert_service.is_loaded:
            status = "ok"
        elif legal_bert_service.loading_error:
            status = "error"
            details["error"] = str(legal_bert_service.loading_error)
    
    return {
        "status": status,
        "model": "InLegalBERT",
        "details": details
    }
