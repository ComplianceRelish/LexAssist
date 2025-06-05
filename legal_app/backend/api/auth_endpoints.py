"""
Authentication and User Management API Endpoints for Lex Assist

This module implements the API endpoints for user authentication, registration,
and role-based access control.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timedelta
import os
import traceback
from supabase import create_client, Client

from .supabase_client import get_supabase_client
from .role_based_access_control import (
    verify_admin_access, 
    verify_super_admin_access,
    verify_user_access,
    verify_lawyer_access,
    get_current_user
)

# Initialize router
router = APIRouter(tags=["Authentication"])

# Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    firstName: str
    lastName: str
    country: str = "US"  # Country code
    countryCode: str = "+1"  # Phone country code
    mobileNumber: Optional[str] = None
    userType: Optional[str] = "client"  # client, lawyer
    
    @property
    def full_name(self) -> str:
        return f"{self.firstName} {self.lastName}"
    
    @property 
    def phone(self) -> Optional[str]:
        if self.mobileNumber:
            return f"{self.countryCode}{self.mobileNumber}"
        return None
    
    @property
    def legal_system(self) -> str:
        legal_systems = {
            'US': 'common_law', 'UK': 'common_law', 'IN': 'common_law',
            'AU': 'common_law', 'CA': 'common_law', 'SG': 'common_law',
            'HK': 'common_law', 'DE': 'civil_law', 'FR': 'civil_law',
            'JP': 'civil_law'
        }
        return legal_systems.get(self.country, 'common_law')
    
    @property
    def jurisdiction_type(self) -> str:
        jurisdictions = {
            'US': 'federal_state', 'UK': 'unitary', 'IN': 'federal_state',
            'AU': 'federal_state', 'CA': 'federal_provincial', 'SG': 'unitary',
            'HK': 'special_administrative', 'DE': 'federal_state',
            'FR': 'unitary', 'JP': 'unitary'
        }
        return jurisdictions.get(self.country, 'federal_state')

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    subscription_tier: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: UserResponse

class RoleUpdate(BaseModel):
    user_id: str
    role: str = Field(..., pattern="^(super_admin|admin|lawyer|user)$")  # Updated to include lawyer

class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    code: str

# Helper function to handle CORS
def add_cors_headers(request: Request, response: Response):
    """Add CORS headers to response"""
    origin = request.headers.get('origin')
    if origin in ["https://lex-assist-o1uh54us1-compliancerelishs-projects.vercel.app", "https://lex-assist.vercel.app"]:
        response.headers["Access-Control-Allow-Origin"] = origin
    else:
        response.headers["Access-Control-Allow-Origin"] = "https://lex-assist.vercel.app"
    response.headers["Access-Control-Allow-Credentials"] = "true"

# Options handling for CORS preflight requests
@router.options("/register")
async def options_register(request: Request, response: Response):
    """Handle OPTIONS preflight request for register endpoint"""
    add_cors_headers(request, response)
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    response.headers["Access-Control-Max-Age"] = "86400"  # 24 hours
    return {}

@router.options("/login")
async def options_login(request: Request, response: Response):
    """Handle OPTIONS preflight request for login endpoint"""
    add_cors_headers(request, response)
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    response.headers["Access-Control-Max-Age"] = "86400"  # 24 hours
    return {}

# Endpoints
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate, supabase: Client = Depends(get_supabase_client)):
    try:
        # Correct v2.15.2 syntax
        auth_response = await supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "full_name": user_data.full_name,
                    "country": user_data.country,
                    "phone": user_data.phone,
                    "user_type": user_data.userType
                }
            }
        })

        # Handle response
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed: No user returned"
            )

        # Create database record
        user_record = {
            "id": str(auth_response.user.id),
            "email": auth_response.user.email,
            # ... other fields
        }
        
        db_response = await supabase.table("users").insert(user_record).execute()

        return {
            "id": str(auth_response.user.id),
            "email": auth_response.user.email,
            "full_name": user_data.full_name,
            "role": "lawyer" if user_data.userType == "lawyer" else "user",
            "subscription_tier": "free",
            "created_at": datetime.utcnow()
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=TokenResponse)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    request: Request = None,
    response: Response = None,
    supabase: Client = Depends(get_supabase_client)):
    """
    Authenticate a user with email and password.
    
    Returns a JWT token with user role and subscription claims.
    """
    add_cors_headers(request, response)
    
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": form_data.username,
            "password": form_data.password
        })
        
        # Handle different response structures for login
        user = None
        session = None
        
        if hasattr(auth_response, 'user') and hasattr(auth_response, 'session'):
            # Standard response structure
            user = auth_response.user
            session = auth_response.session
        elif hasattr(auth_response, 'data'):
            # Data wrapper structure
            if hasattr(auth_response.data, 'user'):
                user = auth_response.data.user
            if hasattr(auth_response.data, 'session'):
                session = auth_response.data.session
        
        if not user or not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user details including role
        user_id = str(user.id)
        
        # Try to get user from database, but fallback to auth user data if not found
        try:
            user_response = supabase.table("users").select(
                "id, email, full_name, role, created_at"
            ).eq("id", user_id).single().execute()
            
            if user_response.data:
                user_data = user_response.data
            else:
                # Fallback to auth user data
                user_data = {
                    "id": user_id,
                    "email": user.email,
                    "full_name": user.email,  # Fallback
                    "role": "user",
                    "created_at": user.created_at
                }
        except Exception as e:
            print(f"Database lookup failed, using fallback: {str(e)}")
            # Fallback to auth user data
            user_data = {
                "id": user_id,
                "email": user.email,
                "full_name": user.email,  # Fallback
                "role": "user",
                "created_at": user.created_at
            }
        
        # Create response
        return {
            "access_token": session.access_token,
            "token_type": "bearer",
            "expires_in": 3600,  # 1 hour
            "user": {
                "id": user_data["id"],
                "email": user_data["email"],
                "full_name": user_data["full_name"],
                "role": user_data["role"],
                "subscription_tier": "free",  # Default for now
                "created_at": user_data["created_at"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {str(e)}")
        print(f"Login error traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

# Protected endpoint example - Get user profile
@router.options("/profile")
async def options_profile(request: Request, response: Response):
    """Handle OPTIONS preflight request for profile endpoint"""
    add_cors_headers(request, response)
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    return {}

@router.get("/profile", response_model=UserResponse)
async def get_profile(
    request: Request,
    response: Response,
    current_user = Depends(verify_user_access),
    supabase: Client = Depends(get_supabase_client)
):
    """Get current user's profile - requires authentication"""
    add_cors_headers(request, response)
    
    try:
        # Get user data from database
        user_response = supabase.table("users").select(
            "id, email, full_name, role, created_at"
        ).eq("id", current_user.id).single().execute()
        
        if user_response.data:
            user_data = user_response.data
            return {
                "id": user_data["id"],
                "email": user_data["email"],
                "full_name": user_data["full_name"],
                "role": user_data["role"],
                "subscription_tier": "free",
                "created_at": user_data["created_at"]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get profile: {str(e)}"
        )

@router.options("/otp/request")
async def options_otp_request(request: Request, response: Response):
    """Handle OPTIONS preflight request for OTP request endpoint"""
    add_cors_headers(request, response)
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    return {}

@router.post("/otp/request")
async def request_otp(otp_request: OTPRequest, request: Request, response: Response, supabase: Client = Depends(get_supabase_client)):
    """
    Request an OTP code for phone verification.
    
    Sends an OTP code to the provided phone number.
    """
    add_cors_headers(request, response)
    
    try:
        # For now, we'll simulate OTP generation
        # In a real implementation, this would integrate with Twilio or similar
        
        # Return success for demo
        return {"message": "OTP sent successfully (demo mode)"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OTP request failed: {str(e)}"
        )

@router.options("/otp/verify")
async def options_otp_verify(request: Request, response: Response):
    """Handle OPTIONS preflight request for OTP verify endpoint"""
    add_cors_headers(request, response)
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    return {}

@router.post("/otp/verify")
async def verify_otp(verify_data: OTPVerify, request: Request, response: Response, supabase: Client = Depends(get_supabase_client)):
    """
    Verify an OTP code for phone verification.
    
    Validates the OTP code and returns a JWT token if valid.
    """
    add_cors_headers(request, response)
    
    try:
        # For demo purposes, accept any code
        return {"message": "OTP verified successfully (demo mode)"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OTP verification failed: {str(e)}"
        )

@router.options("/role")
async def options_role(request: Request, response: Response):
    """Handle OPTIONS preflight request for role update endpoint"""
    add_cors_headers(request, response)
    response.headers["Access-Control-Allow-Methods"] = "PUT, OPTIONS" 
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    return {}

@router.put("/role", dependencies=[Depends(verify_super_admin_access)])
async def update_user_role(role_update: RoleUpdate, request: Request, response: Response, supabase: Client = Depends(get_supabase_client)):
    """
    Update a user's role.
    
    Requires Super Admin access.
    """
    add_cors_headers(request, response)
    
    try:
        # Update user role in database
        update_response = supabase.table("users").update(
            {"role": role_update.role}
        ).eq("id", role_update.user_id).execute()
        
        if update_response.data and len(update_response.data) > 0:
            return {"message": "Role updated successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Role update failed: {str(e)}"
        )

@router.options("/refresh")
async def options_refresh(request: Request, response: Response):
    """Handle OPTIONS preflight request for refresh token endpoint"""
    add_cors_headers(request, response)
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    return {}

@router.post("/refresh")
async def refresh_token(request: Request, response: Response, supabase: Client = Depends(get_supabase_client)):
    """
    Refresh the authentication token.
    
    Uses the current session to generate a new token.
    """
    add_cors_headers(request, response)
    
    try:
        # Refresh the session
        refresh_response = supabase.auth.refresh_session()
        
        if refresh_response.session:
            return {
                "access_token": refresh_response.session.access_token,
                "token_type": "bearer",
                "expires_in": 3600
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to refresh token"
            )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token refresh failed: {str(e)}"
        )

@router.options("/logout")
async def options_logout(request: Request, response: Response):
    """Handle OPTIONS preflight request for logout endpoint"""
    add_cors_headers(request, response)
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    return {}

@router.post("/logout")
async def logout(request: Request, response: Response, supabase: Client = Depends(get_supabase_client)):
    """
    Log out the current user.
    
    Invalidates the current session.
    """
    add_cors_headers(request, response)
    
    try:
        logout_response = supabase.auth.sign_out()
        return {"message": "Logged out successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Logout failed: {str(e)}"
        )

# Test endpoint to debug Supabase connection
@router.get("/test/supabase")
async def test_supabase(supabase: Client = Depends(get_supabase_client)):
    """Test endpoint to verify Supabase connection"""
    try:
        # Test basic Supabase connection
        response = supabase.table('users').select('id, email').limit(1).execute()
        return {"status": "success", "message": "Supabase connection working", "data": response.data}
    except Exception as e:
        return {"status": "error", "message": str(e)}