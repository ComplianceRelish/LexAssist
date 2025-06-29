"""
API endpoints for InLegalBERT model functionality using Hugging Face API
"""

import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

# Configure logging
logger = logging.getLogger(__name__)

# Import the service
try:
    from services.legal_bert_service import get_inlegalbert_service, InLegalBERTService
except ImportError:
    try:
        from legal_app.backend.services.legal_bert_service import get_inlegalbert_service, InLegalBERTService
    except ImportError:
        logger.error("Could not import legal_bert_service")
        # Create dummy functions to prevent import errors
        def get_inlegalbert_service():
            raise HTTPException(status_code=503, detail="Legal BERT service not available")
        
        class InLegalBERTService:
            pass

router = APIRouter()

class TextRequest(BaseModel):
    text: str = Field(..., description="Legal text to analyze")

class MaskFillRequest(BaseModel):
    text: str = Field(..., description="Text with [MASK] tokens")
    top_k: Optional[int] = Field(5, description="Number of predictions to return")

class SimilarityRequest(BaseModel):
    text1: str = Field(..., description="First legal text")
    text2: str = Field(..., description="Second legal text")

@router.post("/analyze", response_model=Dict[str, Any])
async def analyze_text(
    request: TextRequest,
    legal_bert_service: InLegalBERTService = Depends(get_inlegalbert_service)
):
    """Analyze legal text using Hugging Face API"""
    try:
        analysis = await legal_bert_service.analyze_legal_text(request.text)
        return analysis
    except ValueError as e:
        if "API mode required" in str(e):
            raise HTTPException(status_code=500, detail="Service not properly configured for API mode")
        else:
            raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error analyzing text: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing text: {str(e)}")

@router.post("/embeddings", response_model=Dict[str, Any])
async def get_text_embeddings(
    request: TextRequest,
    legal_bert_service: InLegalBERTService = Depends(get_inlegalbert_service)
):
    """Generate embeddings for legal text via Hugging Face API"""
    try:
        analysis = await legal_bert_service.analyze_legal_text(request.text)
        return {
            "status": analysis.get("status", "error"),
            "model": analysis.get("model", "unknown"),
            "method": "huggingface_api"
        }
    except Exception as e:
        logger.error(f"Error generating embeddings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating embeddings: {str(e)}")

@router.post("/fill-mask", response_model=Dict[str, Any])
async def fill_masked_text(
    request: MaskFillRequest,
    legal_bert_service: InLegalBERTService = Depends(get_inlegalbert_service)
):
    """Fill masked tokens in legal text using Hugging Face API"""
    try:
        text_with_mask = request.text if "[MASK]" in request.text else f"{request.text} [MASK]"
        
        result = await legal_bert_service.analyze_legal_text(text_with_mask)
        return {
            "status": "success",
            "model": result.get("model", "unknown"),
            "method": "huggingface_api",
            "text": text_with_mask
        }
    except Exception as e:
        logger.error(f"Error filling mask: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error filling mask: {str(e)}")

@router.post("/similarity", response_model=Dict[str, Any])
async def get_text_similarity(
    request: SimilarityRequest,
    legal_bert_service: InLegalBERTService = Depends(get_inlegalbert_service)
):
    """Calculate similarity between two legal texts using Hugging Face API"""
    try:
        results = await legal_bert_service.batch_analyze_legal_texts(
            texts=[request.text1, request.text2]
        )
        
        return {
            "status": "success",
            "model": legal_bert_service.model_name,
            "method": "huggingface_api",
            "text_lengths": [len(request.text1), len(request.text2)]
        }
    except Exception as e:
        logger.error(f"Error calculating similarity: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calculating similarity: {str(e)}")

@router.get("/health")
async def health_check():
    """Check the health of the InLegalBERT service using Hugging Face API"""
    try:
        legal_bert_service = get_inlegalbert_service()
        api_status = legal_bert_service.get_api_status()
        
        return {
            "status": api_status.get("status", "unknown"),
            "model": api_status.get("model", "law-ai/InLegalBERT"),
            "api_mode": True,
            "service": "huggingface_api",
            "code": api_status.get("code"),
            "time": api_status.get("time"),
            "details": {
                "api_available": api_status.get("status") == "available",
                "has_token": bool(getattr(legal_bert_service, 'hf_token', None))
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "error",
            "error": str(e),
            "api_mode": True,
            "service": "huggingface_api",
            "model": "law-ai/InLegalBERT"
        }
