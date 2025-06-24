from fastapi import APIRouter, HTTPException, Depends, Request, Body
from .supabase_client import get_supabase_client
import logging
from datetime import datetime
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)
router = APIRouter()

# Simple fallback auth handler - works with your existing fallback auth system
async def get_current_user(request: Request):
    """Extract user from auth header - compatible with fallback system"""
    try:
        # Try to get authorization header
        auth_header = request.headers.get("Authorization", "")
        if not auth_header or not auth_header.startswith("Bearer "):
            logger.warning("No valid auth header found")
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # For fallback token
        token = auth_header.replace("Bearer ", "")
        if token == "fallback-token-replace-with-real-auth":
            return {
                "id": "fallback-user-id",
                "email": "fallback@example.com",
                "full_name": "Fallback User"
            }
        
        # For real tokens, try to get user from Supabase
        # This part would be implemented with real auth
        supabase = get_supabase_client()
        # Note: In a real implementation, you'd validate the token with Supabase
        
        # Return fallback user for now
        return {
            "id": "fallback-user-id",
            "email": "fallback@example.com",
            "full_name": "Fallback User"
        }
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

@router.get("/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    """Get user profile endpoint"""
    try:
        # Handle fallback user
        if user.get("id") == "fallback-user-id":
            return {
                "id": "fallback-user-id",
                "email": user.get("email", "fallback@example.com"),
                "full_name": "Fallback User",
                "role": "user",
                "subscription_tier": "free",
                "created_at": datetime.utcnow().isoformat(),
                "email_verified": True,
                "phone_verified": False,
                "country": "IN",
                "legal_system": "plural",
                "jurisdiction_type": "federal_union",
                "profile_picture": None
            }
        
        # For real users, fetch from database
        # This would be implemented with your actual DB
        supabase = get_supabase_client()
        result = supabase.table("user_profiles").select("*").eq("id", user["id"]).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        
        # If no profile exists, return a default one
        return {
            "id": user["id"],
            "email": user.get("email", ""),
            "full_name": user.get("full_name", ""),
            "role": "user",
            "subscription_tier": "free",
            "created_at": datetime.utcnow().isoformat(),
            "email_verified": True,
            "phone_verified": False
        }
        
    except Exception as e:
        logger.error(f"Error fetching profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch profile")

@router.put("/profile")
async def update_profile(
    profile_data: Dict[str, Any] = Body(...),
    user: dict = Depends(get_current_user)
):
    """Update user profile endpoint"""
    try:
        # Handle fallback user
        if user.get("id") == "fallback-user-id":
            # Just return the merged data for fallback users
            return {
                **{
                    "id": "fallback-user-id",
                    "email": user.get("email", "fallback@example.com"),
                    "full_name": "Fallback User",
                    "role": "user",
                    "subscription_tier": "free",
                    "created_at": datetime.utcnow().isoformat(),
                    "email_verified": True,
                    "phone_verified": False,
                    "country": "IN",
                    "legal_system": "plural",
                    "jurisdiction_type": "federal_union",
                    "profile_picture": None
                },
                **profile_data
            }
        
        # For real users, update in database
        # This would be implemented with your actual DB
        supabase = get_supabase_client()
        
        # Ensure user ID is properly set
        profile_data["id"] = user["id"]
        
        # Update profile
        result = supabase.table("user_profiles").upsert(profile_data).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to update profile")
            
        return result.data[0]
        
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile")
