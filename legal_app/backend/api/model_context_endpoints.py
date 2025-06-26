"""
Model Context Protocol API endpoints for LexAssist

This module exposes unified endpoints for the Model Context Protocol,
allowing access to InLegalBERT's advanced legal AI capabilities.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

# Import the Model Context Protocol models
from utils.model_context_protocol import (
    ModelRequest,
    ModelResponse,
    LegalContext,
    LawSection,
    CaseReference,
    LegalAnalysis
)

# Import the processor
try:
    from services.inlegalbert_processor import InLegalBERTProcessor
except ImportError:
    # Fallback import path for different contexts
    from services.inlegalbert_processor import InLegalBERTProcessor

import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Singleton InLegalBERT processor
_inlegalbert_processor = None

def get_inlegalbert_processor():
    """Singleton provider for Legal AI processor"""
    global _inlegalbert_processor
    
    if _inlegalbert_processor is None:
        try:
            logger.info("Initializing Legal AI processor for API endpoints")
            
            # Check if we should use the Hugging Face Inference API
            use_hf_inference = os.environ.get("USE_HF_INFERENCE_API", "true").lower() == "true"
            
            if use_hf_inference:
                # Use HF Inference API processor
                try:
                    from services.huggingface_inference_processor import HuggingFaceInferenceProcessor
                except ImportError:
                    # Fallback import path for different contexts
                    from legal_app.backend.services.huggingface_inference_processor import HuggingFaceInferenceProcessor
                
                logger.info("Using Hugging Face Inference API for InLegalBERT")
                _inlegalbert_processor = HuggingFaceInferenceProcessor()
            else:
                # Use local model processor (original behavior)
                logger.info("Using local model for InLegalBERT")
                _inlegalbert_processor = InLegalBERTProcessor()
            
            # Get model configuration
            model_path = os.getenv("INLEGALBERT_MODEL_PATH", "law-ai/InLegalBERT")
            cache_dir = os.getenv("INLEGALBERT_CACHE_DIR")
            
            logger.info(f"Using model path: {model_path}")
            logger.info(f"Using cache directory: {cache_dir}")
            
            # Initialize the processor
            _inlegalbert_processor.initialize(
                model_path=model_path,
                cache_dir=cache_dir
            )
            
            logger.info("✅ Legal AI processor initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Legal AI processor: {e}")
            raise
    
    return _inlegalbert_processor

# Request model for statute identification
class StatuteIdentificationRequest(BaseModel):
    text: str = Field(..., description="Legal text to analyze for relevant statutes")
    jurisdiction: str = Field("India", description="Legal jurisdiction")
    language: str = Field("en", description="Language code")
    max_statutes: Optional[int] = Field(5, description="Maximum number of statutes to return")
    additional_context: Optional[Dict[str, Any]] = Field(None, description="Additional context for the analysis")

# Request model for case analysis
class CaseAnalysisRequest(BaseModel):
    text: str = Field(..., description="Case brief to analyze")
    jurisdiction: str = Field("India", description="Legal jurisdiction")
    court_level: Optional[str] = Field(None, description="Court level")
    case_type: Optional[str] = Field(None, description="Type of case")
    additional_context: Optional[Dict[str, Any]] = Field(None, description="Additional context for the analysis")

# Request model for judgment prediction
class JudgmentPredictionRequest(BaseModel):
    text: str = Field(..., description="Case brief to predict judgment for")
    jurisdiction: str = Field("India", description="Legal jurisdiction")
    court_level: Optional[str] = Field(None, description="Court level")
    case_type: Optional[str] = Field(None, description="Type of case")
    additional_context: Optional[Dict[str, Any]] = Field(None, description="Additional context for the prediction")

# Request model for case history retrieval
class CaseHistoryRequest(BaseModel):
    text: str = Field(..., description="Legal query to search for relevant case history")
    jurisdiction: str = Field("India", description="Legal jurisdiction")
    start_year: Optional[int] = Field(None, description="Start year for case search")
    end_year: Optional[int] = Field(None, description="End year for case search")
    court_level: Optional[str] = Field(None, description="Court level")
    max_cases: Optional[int] = Field(5, description="Maximum number of cases to return")
    additional_context: Optional[Dict[str, Any]] = Field(None, description="Additional context for the search")

@router.post("/statute-identification", response_model=ModelResponse)
async def identify_statutes(
    request: StatuteIdentificationRequest,
    processor: InLegalBERTProcessor = Depends(get_inlegalbert_processor)
):
    """
    Identify relevant statutes for a given legal text.
    
    Uses InLegalBERT to analyze the legal text and identify applicable
    laws and sections with relevance scoring.
    """
    try:
        # Create context
        context = LegalContext(
            jurisdiction=request.jurisdiction,
            language=request.language,
            additional_context=request.additional_context
        )
        
        # Create model request
        model_request = ModelRequest(
            input_text=request.text,
            task_type="statute_identification",
            context=context,
            model_parameters={"max_statutes": request.max_statutes}
        )
        
        # Process request
        response = processor.process(model_request)
        return response
    
    except Exception as e:
        logger.error(f"Error in statute identification: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/case-analysis", response_model=ModelResponse)
async def analyze_case(
    request: CaseAnalysisRequest,
    processor: InLegalBERTProcessor = Depends(get_inlegalbert_processor)
):
    """
    Analyze a legal case brief.
    
    Uses InLegalBERT to analyze the case brief and extract key issues,
    legal principles, recommendations, and risk assessment.
    """
    try:
        # Create context
        context = LegalContext(
            jurisdiction=request.jurisdiction,
            court_level=request.court_level,
            case_type=request.case_type,
            additional_context=request.additional_context
        )
        
        # Create model request
        model_request = ModelRequest(
            input_text=request.text,
            task_type="case_analysis",
            context=context
        )
        
        # Process request
        response = processor.process(model_request)
        return response
    
    except Exception as e:
        logger.error(f"Error in case analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/judgment-prediction", response_model=ModelResponse)
async def predict_judgment(
    request: JudgmentPredictionRequest,
    processor: InLegalBERTProcessor = Depends(get_inlegalbert_processor)
):
    """
    Predict judgment for a given case brief.
    
    Uses InLegalBERT to analyze the case brief and predict potential
    judgment outcomes with confidence levels.
    """
    try:
        # Create context
        context = LegalContext(
            jurisdiction=request.jurisdiction,
            court_level=request.court_level,
            case_type=request.case_type,
            additional_context=request.additional_context
        )
        
        # Create model request
        model_request = ModelRequest(
            input_text=request.text,
            task_type="judgment_prediction",
            context=context
        )
        
        # Process request
        response = processor.process(model_request)
        return response
    
    except Exception as e:
        logger.error(f"Error in judgment prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/case-history", response_model=ModelResponse)
async def retrieve_case_history(
    request: CaseHistoryRequest,
    processor: InLegalBERTProcessor = Depends(get_inlegalbert_processor)
):
    """
    Retrieve relevant case history for a legal query.
    
    Uses InLegalBERT to analyze the query and search for relevant case
    precedents that may apply to the given legal situation.
    """
    try:
        # Create context
        context = LegalContext(
            jurisdiction=request.jurisdiction,
            court_level=request.court_level,
            additional_context={
                **(request.additional_context or {}),
                "start_year": request.start_year,
                "end_year": request.end_year,
                "max_cases": request.max_cases
            }
        )
        
        # Create model request
        model_request = ModelRequest(
            input_text=request.text,
            task_type="case_history",
            context=context
        )
        
        # Process request
        response = processor.process(model_request)
        return response
    
    except Exception as e:
        logger.error(f"Error in case history retrieval: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/capabilities")
async def get_model_capabilities(
    processor: InLegalBERTProcessor = Depends(get_inlegalbert_processor)
):
    """
    Get information about InLegalBERT model capabilities.
    """
    try:
        model_info = processor.get_model_info()
        return model_info
    except Exception as e:
        logger.error(f"Error getting model capabilities: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check(
    processor: InLegalBERTProcessor = Depends(get_inlegalbert_processor)
):
    """
    Check health status of the InLegalBERT Model Context Protocol service.
    """
    try:
        # Basic health check
        model_info = processor.get_model_info()
        
        return {
            "status": "ok" if model_info.get("initialized", False) else "loading",
            "model": model_info.get("name", "InLegalBERT"),
            "version": model_info.get("version", "unknown"),
            "capabilities": model_info.get("capabilities", []),
            "device": model_info.get("device", "unknown")
        }
    except Exception as e:
        logger.error(f"Error checking health: {e}")
        return {
            "status": "error",
            "error": str(e)
        }
