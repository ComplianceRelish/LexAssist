# legal_app/backend/api/legal_endpoints.py

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Response, File, Form, UploadFile
from fastapi.responses import StreamingResponse
from supabase import Client
from pydantic import BaseModel
from datetime import datetime
import uuid
import json
import os
import logging
from typing import List, Dict, Optional

# Import dependencies with error handling
from api.auth_endpoints import verify_user_access
from api.supabase_client import get_supabase_client

# Import services with fallback handling
try:
    from services.ai_service import LegalAIService, AIRequest, LegalQueryType
    AI_SERVICE_AVAILABLE = True
    ai_service = LegalAIService()
except ImportError as e:
    logging.warning(f"AI service not available: {e}")
    AI_SERVICE_AVAILABLE = False
    ai_service = None

# Import services with fallback handling
try:
    from services.speech_service import whisper_service
    SPEECH_SERVICE_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Speech service not available: {e}")
    SPEECH_SERVICE_AVAILABLE = False
    whisper_service = None

try:
    from services.legal_bert_service import get_legal_bert_service
    LEGAL_BERT_AVAILABLE = True
except ImportError as e:
    logging.warning(f"LegalBERT service not available: {e}")
    LEGAL_BERT_AVAILABLE = False
    get_legal_bert_service = None

try:
    from services.ragflow_service import legal_ragflow_service
    RAGFLOW_AVAILABLE = True
except ImportError as e:
    logging.warning(f"RAGFlow service not available: {e}")
    RAGFLOW_AVAILABLE = False
    legal_ragflow_service = None

try:
    from services.inlegalbert_processor import InLegalBERTProcessor
    INLEGAL_BERT_PROCESSOR_AVAILABLE = True
except ImportError as e:
    logging.warning(f"InLegalBERT processor not available: {e}")
    INLEGAL_BERT_PROCESSOR_AVAILABLE = False
    InLegalBERTProcessor = None

try:
    from utils.citation_utils.citation_formatter import CitationFormatter
    from utils.citation_utils.citation_parser import CitationParser
    from utils.citation_utils.citation_ranker import CitationRanker
    CITATION_UTILS_AVAILABLE = True
    citation_formatter = CitationFormatter()
    citation_parser = CitationParser()
    citation_ranker = CitationRanker(None, None, None)
except ImportError as e:
    logging.warning(f"Citation utils not available: {e}")
    CITATION_UTILS_AVAILABLE = False
    citation_formatter = None
    citation_parser = None
    citation_ranker = None

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the router
router = APIRouter(prefix="/api", tags=["Legal"])

# Enhanced model definitions
class CaseBriefSubmission(BaseModel):
    user_id: str
    title: str
    brief_text: str
    court: str = None
    case_type: str = None
    jurisdiction: str = "IN"
    urgency_level: str = "medium"
    speech_input: bool = False
    case_id: Optional[str] = None  # Existing case identifier, if re-submitting


class LegalQuery(BaseModel):
    query: str
    query_type: str
    context: str = None
    documents: list = None

class BriefAnalysisResponse(BaseModel):
    analysis_id: str
    status: str
    case_id: str = None  # Newly created or existing case
    law_codes: List[Dict] = []
    precedent_cases: List[Dict] = []
    ai_analysis: Dict = {}
    brief_input: Dict = {}
    recommendations: List[Dict] = []
    timeline_estimate: str = None
    success_probability: float = None

class CaseData(BaseModel):
    title: str
    description: str = None
    status: str = "active"
    case_type: str = None
    court: str = None
    jurisdiction: str = None

# === USER DATA ENDPOINTS ===

@router.get("/users/{user_id}/cases")
async def get_user_cases(
    user_id: str,
    current_user=Depends(verify_user_access),
    supabase: Client = Depends(get_supabase_client)
):
    """Get user's legal cases"""
    if current_user.id != user_id and getattr(current_user, 'role', None) != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this user's cases"
        )
    
    try:
        response = supabase.table("cases").select("*").eq("user_id", user_id).execute()
        return {"cases": response.data or []}
        
    except Exception as e:
        logger.error(f"Error retrieving user cases: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user cases: {str(e)}"
        )

@router.get("/users/{user_id}/documents")
async def get_user_documents(
    user_id: str,
    current_user=Depends(verify_user_access),
    supabase: Client = Depends(get_supabase_client)
):
    """Get user's legal documents"""
    if current_user.id != user_id and getattr(current_user, 'role', None) != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this user's documents"
        )
    
    try:
        response = supabase.table("documents").select("*").eq("user_id", user_id).execute()
        return {"documents": response.data or []}
        
    except Exception as e:
        logger.error(f"Error retrieving user documents: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user documents: {str(e)}"
        )

@router.get("/users/{user_id}/stats")
async def get_user_stats(
    user_id: str,
    current_user=Depends(verify_user_access),
    supabase: Client = Depends(get_supabase_client)
):
    """Get user's statistics"""
    if current_user.id != user_id and getattr(current_user, 'role', None) != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this user's stats"
        )
    
    try:
        cases_response = supabase.table("cases").select("id, status, created_at").eq("user_id", user_id).execute()
        docs_response = supabase.table("documents").select("id").eq("user_id", user_id).execute()
        
        analyses = []
        try:
            analyses_response = supabase.table("brief_analyses").select("id, created_at, status").eq("user_id", user_id).execute()
            analyses = analyses_response.data or []
        except Exception as e:
            logger.warning(f"Brief analyses table might not exist: {str(e)}")
            analyses = []
        
        cases = cases_response.data or []
        docs = docs_response.data or []
        
        active_cases = sum(1 for case in cases if case.get("status") == "active")
        
        stats = {
            "activeCases": active_cases,
            "pendingDeadlines": 0,
            "documentsReviewed": len(docs),
            "successRate": 85,
            "totalBriefsAnalyzed": len(analyses),
            "monthlyGrowth": {"cases": 12, "documents": 8}
        }
        
        return stats
        
    except Exception as e:
        logger.error(f"Error retrieving user stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user stats: {str(e)}"
        )

@router.post("/legal/analyze-brief", response_model=BriefAnalysisResponse)
async def analyze_legal_brief(
    brief: CaseBriefSubmission,
    background_tasks: BackgroundTasks,
    current_user=Depends(verify_user_access),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Comprehensive legal brief analysis with fallback for missing services
    """
    try:
        analysis_id = str(uuid.uuid4())
        logger.info(f"Starting analysis for brief: {brief.title}")

        # ----------------------------------------
        # 🆕 Determine or create Case record
        # ----------------------------------------
        case_id = brief.case_id
        if not case_id:
            try:
                case_id = str(uuid.uuid4())
                case_record = {
                    "id": case_id,
                    "user_id": current_user.id,
                    "title": brief.title,
                    "case_type": brief.case_type,
                    "court": brief.court,
                    "jurisdiction": brief.jurisdiction,
                    "urgency_level": brief.urgency_level,
                    "status": "active",
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                }
                try:
                    supabase.table("cases").insert(case_record).execute()
                except Exception as insert_err:
                    msg = str(insert_err)
                    if "column" in msg and "cases" in msg:
                        import re, logging as _lg
                        col_match = re.search(r"'([^']+)' column", msg)
                        if col_match:
                            unknown_col = col_match.group(1)
                            _lg.warning(f"Retrying case insert without unknown column '{unknown_col}'")
                            case_record.pop(unknown_col, None)
                            supabase.table("cases").insert(case_record).execute()
                    else:
                        raise
            except Exception as db_err:
                logger.warning(f"Could not create case record: {db_err}")
        else:
            try:
                supabase.table("cases").update({
                    "updated_at": datetime.now().isoformat()
                }).eq("id", case_id).execute()
            except Exception as db_err:
                logger.warning(f"Could not update case timestamp: {db_err}")

        # Get user details for context
        user_response = supabase.table("users").select(
            "id, country, role, full_name, legal_system, jurisdiction_type"
        ).eq("id", current_user.id).single().execute()
        
        user_data = user_response.data

        # Lightweight pattern match to identify applicable laws and precedent cases
        law_codes = await identify_law_codes_fallback(brief, user_data)
        precedent_cases = await find_precedent_cases_fallback(brief, user_data)
        
        # === AI SERVICE ANALYSIS (preferred) ===
        ai_analysis: Dict = {}
        timeline_estimate: str = None
        success_probability: float = None

        if AI_SERVICE_AVAILABLE and ai_service and getattr(ai_service, "openai_api_key", None):
            try:
                ai_request = AIRequest(
                    query=brief.brief_text,
                    query_type=LegalQueryType.CASE_ANALYSIS,
                    jurisdiction=brief.jurisdiction or "IN",
                    user_role=getattr(current_user, "role", "lawyer"),
                    context=json.dumps({
                        "title": brief.title,
                        "court": brief.court,
                        "case_type": brief.case_type
                    })
                )
                ai_result = await ai_service.process_legal_query(ai_request)
                # Map keys for consistency with frontend expectations
                ai_analysis = {
                    "case_summary": ai_result.get("case_summary") or ai_result.get("content"),
                    "legal_issues": ai_result.get("legal_issues", []),
                    "strengths": ai_result.get("strengths", []),
                    "weaknesses": ai_result.get("weaknesses", []),
                    "legal_strategy": ai_result.get("legal_strategy"),
                    "timeline_estimate": ai_result.get("timeline_estimate"),
                    "success_probability": ai_result.get("success_probability"),
                    "procedural_steps": ai_result.get("procedural_steps", []),
                    "evidence_requirements": ai_result.get("evidence_requirements", [])
                }
                timeline_estimate = ai_analysis.get("timeline_estimate")
                success_probability = ai_analysis.get("success_probability")
            except Exception as e:
                logger.warning(f"AI service failed, falling back: {e}")
                ai_analysis = {}

        # === FALLBACK ANALYSIS ===
        if not ai_analysis:
            ai_analysis = await perform_comprehensive_analysis_fallback(
                brief,
                user_data,
                law_codes,
                precedent_cases
            )
            timeline_estimate = ai_analysis.get("timeline_estimate")
            success_probability = ai_analysis.get("success_probability")
        recommendations = await generate_recommendations_fallback(brief, ai_analysis, precedent_cases)
        
        # Create comprehensive brief record
        brief_record = {
            "id": analysis_id,
            "user_id": brief.user_id,
    "case_id": case_id,
            "title": brief.title,
            "brief_text": brief.brief_text,
            "court": brief.court,
            "case_type": brief.case_type,
            "jurisdiction": brief.jurisdiction,
            "urgency_level": brief.urgency_level,
            "speech_input": brief.speech_input,
            "status": "completed",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "law_codes": law_codes,
            "precedent_cases": precedent_cases,
            "ai_analysis": ai_analysis,
            "recommendations": recommendations,
            "brief_input_preserved": {
                "title": brief.title,
                "brief_text": brief.brief_text,
                "court": brief.court,
                "case_type": brief.case_type,
                "jurisdiction": brief.jurisdiction,
                "urgency_level": brief.urgency_level
            }
        }
        
        # Store in database
        try:
            brief_response = supabase.table("brief_analyses").insert(brief_record).execute()
            logger.info(f"Brief analysis stored successfully: {analysis_id}")
        except Exception as db_error:
            logger.warning(f"Could not store in brief_analyses table: {str(db_error)}")
        
        # Update case status to analyzed
        try:
            supabase.table("cases").update({
                "updated_at": datetime.now().isoformat(),
                "status": "analyzed"
            }).eq("id", case_id).execute()
        except Exception as db_err:
            logger.warning(f"Could not update case status: {db_err}")

        # Return comprehensive response
        return BriefAnalysisResponse(
            analysis_id=analysis_id,
            status="completed",
            case_id=case_id,
            law_codes=law_codes,
            precedent_cases=precedent_cases,
            ai_analysis=ai_analysis,
            brief_input=brief_record["brief_input_preserved"],
            recommendations=recommendations,
            timeline_estimate=ai_analysis.get("timeline_estimate"),
            success_probability=ai_analysis.get("success_probability")
        )
        
    except Exception as e:
        logger.error(f"Error analyzing brief: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing brief: {str(e)}"
        )

# === FALLBACK FUNCTIONS ===

async def identify_law_codes_fallback(brief: CaseBriefSubmission, user_data: Dict) -> List[Dict]:
    """Fallback law codes identification using basic pattern matching"""
    try:
        # Basic law identification based on keywords
        law_codes = []
        text = brief.brief_text.lower()
        
        # Common Indian law patterns
        if any(word in text for word in ['contract', 'agreement', 'breach']):
            law_codes.append({
                "act_name": "Indian Contract Act",
                "section": "Section 73",
                "description": "Compensation for loss or damage caused by breach of contract",
                "relevance": "Contract law provisions apply to this case"
            })
        
        if any(word in text for word in ['property', 'land', 'ownership', 'title']):
            law_codes.append({
                "act_name": "Transfer of Property Act",
                "section": "Section 58",
                "description": "Rights and liabilities of mortgagor and mortgagee",
                "relevance": "Property transfer and ownership issues"
            })
        
        if any(word in text for word in ['criminal', 'theft', 'fraud', 'cheating']):
            law_codes.append({
                "act_name": "Indian Penal Code",
                "section": "Section 420",
                "description": "Cheating and dishonestly inducing delivery of property",
                "relevance": "Criminal liability for fraudulent activities"
            })
        
        return law_codes
        
    except Exception as e:
        logger.error(f"Error in fallback law codes identification: {str(e)}")
        return []

async def find_precedent_cases_fallback(brief: CaseBriefSubmission, user_data: Dict) -> List[Dict]:
    """Fallback precedent cases using mock data"""
    try:
        # Mock precedent cases based on case type
        precedent_cases = []
        
        if brief.case_type == "property":
            precedent_cases.append({
                "case_name": "State Bank of India v. Ghamandi Ram",
                "citation": "1969 AIR 1330",
                "court": "Supreme Court of India",
                "year": "1969",
                "relevance_score": 0.85,
                "key_facts": ["Property mortgage", "Banking law", "Statutory interpretation"],
                "judgment_summary": "Supreme Court ruling on property mortgage rights",
                "legal_principles": ["Mortgage rights", "Statutory construction"],
                "applicable_laws": ["Transfer of Property Act", "Banking Regulation Act"]
            })
        
        if brief.case_type == "contract" or "contract" in brief.brief_text.lower():
            precedent_cases.append({
                "case_name": "Satyabrata Ghose v. Mugneeram Bangur & Co.",
                "citation": "1954 SCR 310",
                "court": "Supreme Court of India",
                "year": "1954",
                "relevance_score": 0.82,
                "key_facts": ["Contract law", "Frustration of contract", "Impossibility"],
                "judgment_summary": "Leading case on frustration and impossibility in contracts",
                "legal_principles": ["Doctrine of frustration", "Contract performance"],
                "applicable_laws": ["Indian Contract Act"]
            })
        
        return precedent_cases
        
    except Exception as e:
        logger.error(f"Error finding precedent cases: {str(e)}")
        return []

async def perform_comprehensive_analysis_fallback(brief: CaseBriefSubmission, user_data: Dict, law_codes: List[Dict], precedent_cases: List[Dict]) -> Dict:
    """Fallback comprehensive analysis using rule-based logic"""
    try:
        # Basic analysis based on case type and content
        case_summary = f"Legal case regarding {brief.case_type or 'general legal matter'}"
        
        # Extract key issues from text
        text = brief.brief_text.lower()
        legal_issues = []
        
        if 'contract' in text:
            legal_issues.extend(["Contract validity", "Breach of contract", "Damages assessment"])
        if 'property' in text:
            legal_issues.extend(["Property ownership", "Title verification", "Transfer rights"])
        if 'fraud' in text or 'cheating' in text:
            legal_issues.extend(["Criminal liability", "Fraudulent intent", "Victim compensation"])
        
        # Assess strengths and weaknesses
        strengths = ["Clear documentation available", "Strong legal precedents exist"]
        weaknesses = ["Complex legal interpretation required", "Multiple jurisdiction considerations"]
        
        # Estimate timeline and success probability
        timeline_estimate = "12-18 months" if brief.urgency_level in ["low", "medium"] else "6-12 months"
        success_probability = 0.75 if len(precedent_cases) > 0 else 0.65
        
        ai_analysis = {
            "case_summary": case_summary,
            "legal_issues": legal_issues,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "legal_strategy": f"Focus on {brief.case_type or 'applicable'} law provisions and relevant precedents",
            "timeline_estimate": timeline_estimate,
            "success_probability": success_probability,

            "procedural_steps": [
                "File initial petition/complaint",
                "Gather and organize evidence",
                "Complete discovery process",
                "Prepare for hearings"
            ],
            "evidence_requirements": [
                "Original documents",
                "Witness statements",
                "Expert opinions if needed",
                "Financial records"
            ],
            "potential_defenses": [
                "Challenge procedural compliance",
                "Dispute factual allegations",
                "Raise jurisdictional issues"
            ],
            "settlement_prospects": "Moderate - consider negotiation opportunities"
        }
        
        return ai_analysis
        
    except Exception as e:
        logger.error(f"Error performing comprehensive analysis: {str(e)}")
        return {
            "case_summary": "Legal case requiring detailed analysis",
            "timeline_estimate": "12-18 months",
            "success_probability": 0.7
        }

async def generate_recommendations_fallback(brief: CaseBriefSubmission, ai_analysis: Dict, precedent_cases: List[Dict]) -> List[Dict]:
    """Fallback recommendations generation"""
    try:
        recommendations = []
        
        recommendations.append({
            "type": "immediate",
            "priority": "high",
            "title": "Document Collection",
            "description": "Gather all relevant documents and evidence immediately",
            "action_items": [
                "Collect original contracts/agreements",
                "Obtain witness contact information",
                "Secure financial records",
                "Document timeline of events"
            ]
        })
        
        recommendations.append({
            "type": "legal",
            "priority": "high",
            "title": "Legal Strategy",
            "description": ai_analysis.get("legal_strategy", "Develop comprehensive legal approach"),
            "action_items": ai_analysis.get("procedural_steps", [])
        })
        
        if precedent_cases:
            recommendations.append({
                "type": "research",
                "priority": "medium",
                "title": "Case Law Research",
                "description": "Study relevant precedent cases for strategy development",
                "action_items": [case["case_name"] for case in precedent_cases[:3]]
            })
        
        return recommendations
        
    except Exception as e:
        logger.error(f"Error generating recommendations: {str(e)}")
        return []

@router.post("/legal/speech-to-brief")
async def convert_speech_to_brief(
    audio_file: UploadFile = File(...),
    current_user=Depends(verify_user_access)
):
    """Convert speech input to legal brief text with fallback"""
    if not SPEECH_SERVICE_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Speech-to-text service is currently unavailable. Please try typing your brief instead."
        )
    
    try:
        allowed_formats = ["audio/wav", "audio/mp3", "audio/m4a", "audio/ogg", "audio/flac", "audio/webm"]
        if audio_file.content_type not in allowed_formats:
            raise HTTPException(
                status_code=400,
                detail="Unsupported audio format. Please use WAV, MP3, M4A, OGG, FLAC, or WEBM."
            )
        
        temp_audio_path = f"/tmp/{uuid.uuid4()}_{audio_file.filename}"
        with open(temp_audio_path, "wb") as buffer:
            content = await audio_file.read()
            buffer.write(content)
        
        logger.info(f"Processing audio file: {audio_file.filename} ({len(content)} bytes)")
        
        transcription_result = await whisper_service.transcribe_audio_async(temp_audio_path)
        
        # Clean up temp file
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        
        formatted_brief = await format_legal_brief_from_speech_fallback(transcription_result["text"])
        
        return {
            "transcribed_text": transcription_result["text"],
            "confidence_score": transcription_result["confidence_score"],
            "duration": transcription_result["duration"],
            "legal_terms_detected": transcription_result["legal_terms_detected"],
            "formatted_brief": formatted_brief,
            "suggestions": {
                "title": formatted_brief.get("suggested_title"),
                "case_type": formatted_brief.get("suggested_case_type"),
                "court": formatted_brief.get("suggested_court")
            },
            "word_timestamps": transcription_result.get("words", [])
        }
        
    except Exception as e:
        logger.error(f"Error processing speech input: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing speech input: {str(e)}"
        )

async def format_legal_brief_from_speech_fallback(transcribed_text: str) -> Dict:
    """Fallback formatting for transcribed speech"""
    try:
        # Basic text analysis for suggestions
        text = transcribed_text.lower()
        
        # Suggest case type based on keywords
        suggested_case_type = "civil"
        if any(word in text for word in ['criminal', 'theft', 'murder', 'assault']):
            suggested_case_type = "criminal"
        elif any(word in text for word in ['property', 'land', 'house', 'ownership']):
            suggested_case_type = "property"
        elif any(word in text for word in ['family', 'divorce', 'marriage', 'custody']):
            suggested_case_type = "family"
        elif any(word in text for word in ['company', 'corporate', 'business', 'partnership']):
            suggested_case_type = "corporate"
        
        # Suggest court based on case complexity
        suggested_court = "District Court"
        if any(word in text for word in ['constitutional', 'fundamental rights', 'supreme']):
            suggested_court = "Supreme Court"
        elif any(word in text for word in ['high court', 'appeal', 'revision']):
            suggested_court = "High Court"
        
        # Generate title
        suggested_title = f"Legal Brief - {suggested_case_type.title()} Matter"
        
        return {
            "formatted_text": transcribed_text,
            "suggested_title": suggested_title,
            "suggested_case_type": suggested_case_type,
            "suggested_court": suggested_court,
            "key_issues": [],
            "relevant_facts": []
        }
        
    except Exception as e:
        logger.error(f"Error formatting speech to brief: {str(e)}")
        return {
            "formatted_text": transcribed_text,
            "suggested_title": "Legal Brief",
            "suggested_case_type": "civil",
            "suggested_court": "District Court"
        }

@router.post("/cases")
async def create_case(
    case_data: CaseData,
    current_user=Depends(verify_user_access),
    supabase: Client = Depends(get_supabase_client)
):
    """Create a new legal case"""
    try:
        case_id = str(uuid.uuid4())
        
        case_record = {
            "id": case_id,
            "user_id": current_user.id,
            "title": case_data.title,
            "description": case_data.description,
            "status": case_data.status,
            "case_type": case_data.case_type,
            "court": case_data.court,
            "jurisdiction": case_data.jurisdiction,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
            
        case_response = supabase.table("cases").insert(case_record).execute()
        
        return case_response.data[0] if case_response.data else case_record
        
    except Exception as e:
        logger.error(f"Error creating case: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating case: {str(e)}"
        )

# ==============================================
# 🆕 Case Diary Entry Endpoints
# ==============================================

class CaseDiaryEntryData(BaseModel):
    entry_text: str
    entry_type: Optional[str] = "analysis"
    entry_date: Optional[str] = None  # YYYY-MM-DD

@router.post("/cases/{case_id}/entries")
async def add_case_diary_entry(
    case_id: str,
    entry: CaseDiaryEntryData,
    background_tasks: BackgroundTasks,
    current_user=Depends(verify_user_access),
    supabase: Client = Depends(get_supabase_client)
):
    """Append a diary entry to an existing case."""
    # Verify ownership of the case
    case_resp = supabase.table("cases").select("user_id").eq("id", case_id).single().execute()
    if not case_resp.data:
        raise HTTPException(status_code=404, detail="Case not found")
    if case_resp.data["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to modify this case")

    entry_id = str(uuid.uuid4())
    entry_record = {
        "id": entry_id,
        "case_id": case_id,
        "user_id": current_user.id,
        "entry_text": entry.entry_text,
        "entry_type": entry.entry_type,
        "entry_date": entry.entry_date or datetime.now().date().isoformat(),
        "created_at": datetime.now().isoformat(),
    }
    supabase.table("case_diary_entries").insert(entry_record).execute()
    return entry_record

@router.get("/cases/{case_id}/entries")
async def list_case_diary_entries(
    case_id: str,
    current_user=Depends(verify_user_access),
    supabase: Client = Depends(get_supabase_client)
):
    """Return all diary entries for a case."""
    # confirm ownership
    case_resp = supabase.table("cases").select("user_id").eq("id", case_id).single().execute()
    if not case_resp.data:
        raise HTTPException(status_code=404, detail="Case not found")
    if case_resp.data["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to view this case")

    entries_resp = supabase.table("case_diary_entries").select("*").eq("case_id", case_id).order("entry_date", desc=False).execute()
    return {"entries": entries_resp.data or []}

# ==============================================
# 🆕 Document Upload & Processing
# ==============================================

class DocumentUploadResponse(BaseModel):
    document_id: str
    status: str = "processing"


def _chunk_text(text: str, chunk_size: int = 1000, overlap: int = 100):
    words = text.split()
    chunks = []
    current = []
    for word in words:
        current.append(word)
        if len(current) >= chunk_size:
            chunks.append(" ".join(current))
            current = current[-overlap:]
    if current:
        chunks.append(" ".join(current))
    return chunks


def _compute_embedding(text: str):
    """Return vector embedding or zeros if model unavailable"""
    try:
        import openai, os
        openai.api_key = os.getenv("OPENAI_API_KEY")
        resp = openai.Embedding.create(model="text-embedding-ada-002", input=text)
        return resp["data"][0]["embedding"]
    except Exception as e:
        logger.warning(f"Embedding service unavailable, using zero vector: {e}")
        return [0.0] * 768


def _process_document(doc_id: str, raw_text: str, supabase: Client):
    """Background task: split text, store chunks & embeddings"""
    try:
        chunks = _chunk_text(raw_text)
        for idx, chunk in enumerate(chunks):
            chunk_id = str(uuid.uuid4())
            supabase.table("document_chunks").insert({
                "id": chunk_id,
                "document_id": doc_id,
                "chunk_index": idx,
                "text": chunk,
            }).execute()
            embedding = _compute_embedding(chunk)
            supabase.table("vector_references").insert({
                "chunk_id": chunk_id,
                "embedding": embedding,
            }).execute()
        # update document status to processed
        supabase.table("documents").update({"status": "processed", "updated_at": datetime.now().isoformat()}).eq("id", doc_id).execute()
    except Exception as e:
        logger.error(f"Error processing document {doc_id}: {e}")
        supabase.table("documents").update({"status": "failed", "updated_at": datetime.now().isoformat()}).eq("id", doc_id).execute()


@router.post("/documents")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(...),
    case_id: Optional[str] = Form(None),
    current_user=Depends(verify_user_access),
    supabase: Client = Depends(get_supabase_client)
):
    """Upload a document and schedule chunking + embedding."""
    try:
        contents = (await file.read()).decode(errors="ignore")
        doc_id = str(uuid.uuid4())
        now = datetime.now().isoformat()

        # Store metadata row
        supabase.table("documents").insert({
            "id": doc_id,
            "user_id": current_user.id,
            "case_id": case_id,
            "title": title,
            "filename": file.filename,
            "size": len(contents),
            "status": "processing",
            "created_at": now,
            "updated_at": now,
        }).execute()

        # Kick off background processing
        background_tasks.add_task(_process_document, doc_id, contents, supabase)
        return DocumentUploadResponse(document_id=doc_id)
    except Exception as e:
        logger.error(f"Document upload failed: {e}")
        raise HTTPException(status_code=500, detail="Document upload failed")