from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import uuid
from datetime import datetime
from .supabase_client import get_supabase_client
from .auth_endpoints import get_current_user

router = APIRouter(prefix="/api", tags=["cases"])

@router.post("/cases")
async def create_case(
    case_data: dict,
    current_user = Depends(get_current_user)
):
    """Create a new case record"""
    try:
        supabase = get_supabase_client()
        
        # Create case record
        case_record = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "title": case_data.get("title"),
            "status": "active",
            "case_type": case_data.get("case_type"),
            "court": case_data.get("court"),
            "jurisdiction": case_data.get("jurisdiction"),
            "urgency_level": case_data.get("urgency_level", "medium"),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # First attempt: try inserting all fields
        try:
            result = supabase.table("cases").insert(case_record).execute()
        except Exception as insert_err:
            msg = str(insert_err)
            # Handle PostgREST unknown-column error (PGRST204)
            if "column" in msg and "cases" in msg:
                import re
                col_match = re.search(r"'([^']+)' column", msg)
                if col_match:
                    unknown_col = col_match.group(1)
                    logger.warning(f"Retrying insert without unknown column '{unknown_col}'")
                    case_record.pop(unknown_col, None)
                    result = supabase.table("cases").insert(case_record).execute()
            else:
                # Re-raise if it's a different error
                raise
        # `return=minimal` (the default). In that scenario, fall back to the UUID we
        # generated locally so the caller still receives a valid case identifier.
        inserted_id = case_record["id"]
        if result and getattr(result, "data", None):
            try:
                inserted_id = result.data[0].get("id", inserted_id)
            except (IndexError, AttributeError, TypeError):
                # Keep the locally-generated id if the response structure is unexpected
                pass
        
        return {"id": inserted_id, "case_id": inserted_id, "status": "created"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/{user_id}/cases")
async def get_user_cases(
    user_id: str,
    current_user = Depends(get_current_user)
):
    """Get all cases for a user with latest analysis"""
    try:
        supabase = get_supabase_client()
        
        # Join cases with their latest brief_analyses
        result = supabase.table("cases").select(
            """
            id,
            title,
            status,
            case_type,
            court,
            urgency_level,
            created_at,
            updated_at,
            brief_analyses (
                id,
                ai_analysis,
                brief_text,
                created_at
            )
            """
        ).eq("user_id", user_id).order("updated_at", desc=True).execute()
        
        return result.data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Duplicate endpoint (superseded by legal_endpoints.get_user_stats)
# @router.get("/users/{user_id}/stats")
async def _legacy_get_user_stats(
    user_id: str,
    current_user = Depends(get_current_user)
):
    """Get user statistics"""
    try:
        supabase = get_supabase_client()
        
        # Get case statistics
        cases_result = supabase.table("cases").select("id,status,created_at").eq("user_id", user_id).execute()
        
        # Get documents statistics  
        docs_result = supabase.table("documents").select("id").eq("user_id", user_id).execute()
        
        # Get brief analyses statistics
        analyses_result = supabase.table("brief_analyses").select("id,created_at,status").eq("user_id", user_id).execute()
        
        cases = cases_result.data
        total_cases = len(cases)
        active_cases = len([c for c in cases if c.get("status") != "completed"])
        completed_cases = len([c for c in cases if c.get("status") == "completed"])
        
        return {
            "active_cases": active_cases,
            "pending_deadlines": 0,  # Implement deadline logic
            "documents_reviewed": len(docs_result.data),
            "success_rate": (completed_cases / total_cases * 100) if total_cases > 0 else 85,
            "total_cases": total_cases,
            "total_analyses": len(analyses_result.data)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cases/{case_id}/analysis")
async def save_case_analysis(
    case_id: str,
    analysis_data: dict,
    current_user = Depends(get_current_user)
):
    """Save analysis result to a specific case"""
    try:
        supabase = get_supabase_client()
        
        # Link the analysis to the case
        analysis_record = {
            **analysis_data,
            "case_id": case_id,
            "user_id": current_user["id"],
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table("brief_analyses").insert(analysis_record).execute()
        
        # Update case timestamp
        supabase.table("cases").update({
            "updated_at": datetime.utcnow().isoformat(),
            "status": "analyzed"
        }).eq("id", case_id).execute()
        
        return {"analysis_id": result.data[0]["id"], "status": "saved"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))