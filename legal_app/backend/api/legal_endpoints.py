# Add to legal_app/backend/api/legal_endpoints.py

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Response, File, Form, UploadFile
from fastapi.responses import StreamingResponse
from supabase import Client
from pydantic import BaseModel
from datetime import datetime
import uuid
import json
import os

# Import dependencies
import sys

# Add the current directory to path to help with relative imports
from api.auth_endpoints import verify_user_access
from api.supabase_client import get_supabase_client

# Define the router
router = APIRouter(prefix="/api", tags=["Legal"])

# Model definitions for type checking
class CaseBriefSubmission(BaseModel):
    user_id: str
    title: str
    brief_text: str
    court: str = None
    case_type: str = None
    jurisdiction: str = None

class LegalQuery(BaseModel):
    query: str
    query_type: str
    context: str = None
    documents: list = None

@router.post("/legal-query/stream")
async def stream_legal_query(
    query_data: LegalQuery,
    response: Response,
    current_user=Depends(verify_user_access),
    supabase=Depends(get_supabase_client)
):
    """Stream legal query response for better UX"""
    response.headers["Access-Control-Allow-Origin"] = "https://lex-assist.vercel.app"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    async def generate_stream():
        try:
            # Get user details
            user_response = supabase.table("users").select(
                "id, country, role, full_name"
            ).eq("id", current_user.id).single().execute()
            
            user_data = user_response.data
            
            # Create AI request
            ai_request = AIRequest(
                query=query_data.query,
                query_type=LegalQueryType(query_data.query_type),
                jurisdiction=user_data["country"],
                user_role=user_data["role"],
                context=query_data.context,
                documents=query_data.documents
            )
            
            # Stream response
            async for chunk in streaming_ai_service.process_legal_query_stream(ai_request):
                yield f"data: {json.dumps(chunk)}\n\n"
            
            # Send completion signal
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"
            
        except Exception as e:
            error_chunk = {
                "type": "error",
                "content": f"Error processing query: {str(e)}"
            }
            yield f"data: {json.dumps(error_chunk)}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "https://lex-assist.vercel.app",
            "Access-Control-Allow-Credentials": "true"
        }
    )

@router.post("/legal-documents/upload")
async def upload_legal_document(
    file: UploadFile = File(...),
    document_type: str = Form("legal"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user=Depends(verify_user_access),
    supabase=Depends(get_supabase_client)
):
    """Upload and process legal document with RAGFlow"""
    
    # Save uploaded file
    file_path = f"/tmp/{file.filename}"
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
    
    # Create user-specific knowledge base if doesn't exist
    kb_name = f"user_{current_user.id}_legal_kb"
    
    # Process in background
    background_tasks.add_task(
        process_document_background,
        file_path, kb_name, document_type, current_user.id
    )
    
    return {
        "message": "Document uploaded successfully and is being processed",
        "file_name": file.filename,
        "document_type": document_type
    }

async def process_document_background(file_path: str, kb_name: str, doc_type: str, user_id: str):
    """Background task to process document with RAGFlow"""
    try:
        # Create knowledge base
        kb_result = await legal_ragflow_service.create_legal_knowledge_base(kb_name)
        kb_id = kb_result.get("id")
        
        # Upload document
        await legal_ragflow_service.upload_legal_document(kb_id, file_path, doc_type)
        
        # Clean up temp file
        os.remove(file_path)
        
    except Exception as e:
        print(f"Background processing failed: {e}")

# === NEWLY ADDED ENDPOINTS ===

@router.get("/users/{user_id}/cases")
async def get_user_cases(
    user_id: str,
    current_user=Depends(verify_user_access),
    supabase: Client = Depends(get_supabase_client)
):
    """Get user's legal cases"""
    # Verify user is accessing their own data or is an admin
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this user's cases"
        )
    
    try:
        # NEW SYNTAX: No .error check needed, exceptions are raised automatically
        response = supabase.table("cases").select("*").eq("user_id", user_id).execute()
        
        # Return cases as a list
        return {"cases": response.data or []}
        
    except Exception as e:
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
    # Verify user is accessing their own data or is an admin
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this user's documents"
        )
    
    try:
        # NEW SYNTAX: Direct access to response.data
        response = supabase.table("documents").select("*").eq("user_id", user_id).execute()
        
        # Return documents as a list
        return {"documents": response.data or []}
        
    except Exception as e:
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
    # Verify user is accessing their own data or is an admin
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this user's stats"
        )
    
    try:
        # Get user cases - NEW SYNTAX
        cases_response = supabase.table("cases").select("id, status, created_at").eq("user_id", user_id).execute()
        
        # Get user documents - NEW SYNTAX  
        docs_response = supabase.table("documents").select("id").eq("user_id", user_id).execute()
        
        # Get user brief analyses - NEW SYNTAX
        try:
            analyses_response = supabase.table("brief_analyses").select("id, created_at, status").eq("user_id", user_id).execute()
            analyses = analyses_response.data or []
        except:
            # If brief_analyses table doesn't exist yet, default to empty
            analyses = []
        
        # Calculate stats
        cases = cases_response.data or []
        docs = docs_response.data or []
        
        active_cases = sum(1 for case in cases if case.get("status") == "active")
        
        # Simple stats calculation
        stats = {
            "activeCases": active_cases,
            "pendingDeadlines": 0,  # Would require more data
            "documentsReviewed": len(docs),
            "successRate": 0,  # Would require outcome data
            "totalBriefsAnalyzed": len(analyses),
            "monthlyGrowth": {"cases": 0, "documents": 0}  # Would require time-based analysis
        }
        
        return stats
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user stats: {str(e)}"
        )

@router.get("/users/{user_id}/stats")
async def get_user_stats(
    user_id: str,
    current_user=Depends(verify_user_access),
    supabase: Client = Depends(get_supabase_client)
):
    """Get user's statistics"""
    # Verify user is accessing their own data or is an admin
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this user's stats"
        )
    
    try:
        # Get user cases
        cases_response = supabase.table("cases").select("id, status, created_at").eq("user_id", user_id).execute()
        
        # Get user documents
        docs_response = supabase.table("documents").select("id").eq("user_id", user_id).execute()
        
        # Get user brief analyses
        analyses_response = supabase.table("brief_analyses").select("id, created_at, status").eq("user_id", user_id).execute()
        
        # Calculate stats
        cases = cases_response.data or []
        docs = docs_response.data or []
        analyses = analyses_response.data or []
        
        active_cases = sum(1 for case in cases if case.get("status") == "active")
        
        # Simple stats calculation
        stats = {
            "activeCases": active_cases,
            "pendingDeadlines": 0,  # Would require more data
            "documentsReviewed": len(docs),
            "successRate": 0,  # Would require outcome data
            "totalBriefsAnalyzed": len(analyses),
            "monthlyGrowth": {"cases": 0, "documents": 0}  # Would require time-based analysis
        }
        
        return stats
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user stats: {str(e)}"
        )

@router.post("/legal/analyze-brief")
async def analyze_legal_brief(
    brief: CaseBriefSubmission,
    current_user=Depends(verify_user_access),
    supabase: Client = Depends(get_supabase_client)
):
    """Analyze a legal brief and return analysis ID"""
    try:
        # Generate unique analysis ID
        analysis_id = str(uuid.uuid4())
        
        # Store the brief in the database
        brief_record = {
            "id": analysis_id,
            "user_id": brief.user_id,
            "title": brief.title,
            "brief_text": brief.brief_text,
            "court": brief.court,
            "case_type": brief.case_type,
            "jurisdiction": brief.jurisdiction,
            "status": "processing",
            "created_at": datetime.now().isoformat()
        }
        
        # Insert brief into database
        brief_response = supabase.table("brief_analyses").insert(brief_record).execute()
        
        if brief_response.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to store brief: {brief_response.error.message}"
            )
        
        # Start background task to analyze the brief
        # This is a placeholder - you would implement the actual analysis logic
        
        return {"analysis_id": analysis_id, "status": "processing"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing brief: {str(e)}"
        )

@router.post("/cases")
async def create_case(
    case_data: dict,
    current_user=Depends(verify_user_access),
    supabase: Client = Depends(get_supabase_client)
):
    """Create a new legal case"""
    try:
        # Add user_id and created_at to case data
        case_data["user_id"] = current_user.id
        case_data["created_at"] = datetime.now().isoformat()
        case_data["updated_at"] = datetime.now().isoformat()
        
        # Generate a case ID if not provided
        if "id" not in case_data:
            case_data["id"] = str(uuid.uuid4())
            
        # Insert case into database
        case_response = supabase.table("cases").insert(case_data).execute()
        
        if case_response.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create case: {case_response.error.message}"
            )
            
        return case_response.data[0]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating case: {str(e)}"
        )

@router.get("/legal/analysis/{analysis_id}")
async def get_analysis_results(
    analysis_id: str,
    current_user=Depends(verify_user_access),
    supabase: Client = Depends(get_supabase_client)
):
    """Get results of a brief analysis"""
    try:
        # Query the analysis from database
        analysis_response = supabase.table("brief_analyses").select("*").eq("id", analysis_id).single().execute()
        
        if analysis_response.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve analysis: {analysis_response.error.message}"
            )
            
        analysis = analysis_response.data
        
        # Verify user is authorized to access this analysis
        if analysis["user_id"] != current_user.id and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this analysis"
            )
            
        return analysis
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving analysis: {str(e)}"
        )