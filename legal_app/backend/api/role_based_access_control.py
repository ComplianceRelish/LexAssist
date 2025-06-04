"""
Role-based access control for LexAssist API
"""
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from .supabase_client import get_supabase_client
import logging

security = HTTPBearer()
logger = logging.getLogger(__name__)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get the current authenticated user from the JWT token
    """
    try:
        # Verify the token with Supabase
        user_response = supabase.auth.get_user(credentials.credentials)
        
        if not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user_response.user
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_user_role(
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get the user's role from the database
    """
    try:
        user_response = supabase.table("users").select("role").eq("id", current_user.id).single().execute()
        
        if user_response.data:
            return user_response.data["role"]
        else:
            # Default role if not found in database
            return "user"
    except Exception as e:
        logger.error(f"Error getting user role: {str(e)}")
        # Default to basic user role if we can't determine role
        return "user"

async def verify_user_access(
    current_user = Depends(get_current_user),
    user_role: str = Depends(get_user_role)
):
    """
    Verify that the user has basic user access
    """
    if user_role not in ["user", "lawyer", "admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    return current_user

async def verify_lawyer_access(
    current_user = Depends(get_current_user),
    user_role: str = Depends(get_user_role)
):
    """
    Verify that the user has lawyer access or higher
    """
    if user_role not in ["lawyer", "admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lawyer access required"
        )
    return current_user

async def verify_admin_access(
    current_user = Depends(get_current_user),
    user_role: str = Depends(get_user_role)
):
    """
    Verify that the user has admin access or higher
    """
    if user_role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

async def verify_super_admin_access(
    current_user = Depends(get_current_user),
    user_role: str = Depends(get_user_role)
):
    """
    Verify that the user has super admin access
    """
    if user_role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    return current_user

# Role hierarchy for easy checking
ROLE_HIERARCHY = {
    "user": 1,
    "lawyer": 2,
    "admin": 3,
    "super_admin": 4
}

async def verify_minimum_role(
    minimum_role: str,
    current_user = Depends(get_current_user),
    user_role: str = Depends(get_user_role)
):
    """
    Verify that the user has at least the minimum required role
    """
    user_level = ROLE_HIERARCHY.get(user_role, 0)
    required_level = ROLE_HIERARCHY.get(minimum_role, 0)
    
    if user_level < required_level:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Minimum role required: {minimum_role}"
        )
    return current_user

# Helper function to check if user can access another user's data
async def verify_user_access_or_admin(
    target_user_id: str,
    current_user = Depends(get_current_user),
    user_role: str = Depends(get_user_role)
):
    """
    Verify that the user can access data for the target user
    (either it's their own data or they're an admin)
    """
    # Admins can access any user's data
    if user_role in ["admin", "super_admin"]:
        return current_user
    
    # Users can only access their own data
    if current_user.id != target_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own data"
        )
    
    return current_user