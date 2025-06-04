# legal_app/backend/api/role_based_access_control.py
"""
Role-based access control for LexAssist API
"""
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from .supabase_client import get_supabase_client

security = HTTPBearer()

async def verify_admin_access(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client)
):
    """Verify that the user has admin access"""
    try:
        # Verify the token and get user
        user = supabase.auth.get_user(credentials.credentials)
        if not user.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Check user role
        user_response = supabase.table("users").select("role").eq("id", user.user.id).single().execute()
        if user_response.error or user_response.data["role"] not in ["admin", "super_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        return user.user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

async def verify_super_admin_access(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client)
):
    """Verify that the user has super admin access"""
    try:
        # Verify the token and get user
        user = supabase.auth.get_user(credentials.credentials)
        if not user.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Check user role
        user_response = supabase.table("users").select("role").eq("id", user.user.id).single().execute()
        if user_response.error or user_response.data["role"] != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Super admin access required"
            )
        
        return user.user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )