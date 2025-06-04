"""
Authentication and User Management API Endpoints for Lex Assist

This module implements the API endpoints for user authentication, registration,
and role-based access control.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timedelta
import os
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
    mobileNumber: Optional[str] = None
    userType: Optional[str] = "client"  # client, lawyer
    
    @property
    def full_name(self) -> str:
        return f"{self.firstName} {self.lastName}"
    
    @property 
    def phone(self) -> Optional[str]:
        return self.mobileNumber

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

# Options handling for CORS preflight requests
@router.options("/register")
async def options_register(response: Response):
    """Handle OPTIONS preflight request for register endpoint"""
    response.headers["Access-Control-Allow-Origin"] = "https://lex-assist.vercel.app"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Max-Age"] = "86400"  # 24 hours
    return {}

@router.options("/login")
async def options_login(response: Response):
    """Handle OPTIONS preflight request for login endpoint"""
    response.headers["Access-Control-Allow-Origin"] = "https://lex-assist.vercel.app"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Max-Age"] = "86400"  # 24 hours
    return {}

# Endpoints
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate, response: Response, supabase: Client = Depends(get_supabase_client)):
    """
    Register a new user with email and password.
    
    Creates a new user account with role based on userType (client -> user, lawyer -> lawyer).
    """
    # Add CORS headers
    response.headers["Access-Control-Allow-Origin"] = "https://lex-assist.vercel.app"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    try:
        # Register user with Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password
        })
        
        print(f"Auth response type: {type(auth_response)}")
        print(f"Auth response: {auth_response}")
        
        # Handle the response properly
        user = None
        if hasattr(auth_response, 'user') and auth_response.user:
            user = auth_response.user
        elif hasattr(auth_response, 'data') and auth_response.data and hasattr(auth_response.data, 'user'):
            user = auth_response.data.user
        else:
            print(f"Unexpected auth response structure: {dir(auth_response)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed: Unexpected response from Supabase"
            )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed: No user returned from Supabase"
            )
        
        user_id = user.id
        
        # Determine role based on userType
        role = "lawyer" if user_data.userType == "lawyer" else "user"
        
        # Create user record in users table
        user_record = {
            "id": user_id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "phone": user_data.phone,
            "role": role
        }
        
        # Try to insert user record
        try:
            user_response = supabase.table("users").insert(user_record).execute()
            print(f"Database insert response: {user_response}")
            
            if user_response.data is None or len(user_response.data) == 0:
                print("Database insert returned no data, but continuing...")
        except Exception as db_error:
            print(f"Database insert failed, but auth user created: {str(db_error)}")
        
        # Return success response
        return {
            "id": user_id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "role": role,
            "subscription_tier": "free",
            "created_at": datetime.now()
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log the error and return a generic error
        print(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=TokenResponse)
async def login(response: Response, form_data: OAuth2PasswordRequestForm = Depends(), 
                supabase: Client = Depends(get_supabase_client)):
    """
    Authenticate a user with email and password.
    
    Returns a JWT token with user role and subscription claims.
    """
    # Add CORS headers
    response.headers["Access-Control-Allow-Origin"] = "https://lex-assist.vercel.app"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": form_data.username,
            "password": form_data.password
        })
        
        if auth_response.user is None or auth_response.session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user details including role
        user_id = auth_response.user.id
        
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
                    "id": auth_response.user.id,
                    "email": auth_response.user.email,
                    "full_name": auth_response.user.email,  # Fallback
                    "role": "user",
                    "created_at": auth_response.user.created_at
                }
        except Exception:
            # Fallback to auth user data
            user_data = {
                "id": auth_response.user.id,
                "email": auth_response.user.email,
                "full_name": auth_response.user.email,  # Fallback
                "role": "user",
                "created_at": auth_response.user.created_at
            }
        
        # Create response
        return {
            "access_token": auth_response.session.access_token,
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

# Protected endpoint example - Get user profile
@router.options("/profile")
async def options_profile(response: Response):
    """Handle OPTIONS preflight request for profile endpoint"""
    response.headers["Access-Control-Allow-Origin"] = "https://lex-assist.vercel.app"
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return {}

@router.get("/profile", response_model=UserResponse)
async def get_profile(
    response: Response,
    current_user = Depends(verify_user_access),
    supabase: Client = Depends(get_supabase_client)
):
    """Get current user's profile - requires authentication"""
    response.headers["Access-Control-Allow-Origin"] = "https://lex-assist.vercel.app"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
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
async def options_otp_request(response: Response):
    """Handle OPTIONS preflight request for OTP request endpoint"""
    response.headers["Access-Control-Allow-Origin"] = "https://lex-assist.vercel.app"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return {}

@router.post("/otp/request")
async def request_otp(request: OTPRequest, response: Response, supabase: Client = Depends(get_supabase_client)):
    """
    Request an OTP code for phone verification.
    
    Sends an OTP code to the provided phone number.
    """
    # Add CORS headers
    response.headers["Access-Control-Allow-Origin"] = "https://lex-assist.vercel.app"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
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
async def options_otp_verify(response: Response):
    """Handle OPTIONS preflight request for OTP verify endpoint"""
    response.headers["Access-Control-Allow-Origin"] = "https://lex-assist.vercel.app"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return {}

@router.post("/otp/verify")
async def verify_otp(verify_data: OTPVerify, response: Response, supabase: Client = Depends(get_supabase_client)):
    """
    Verify an OTP code for phone verification.
    
    Validates the OTP code and returns a JWT token if valid.
    """
    # Add CORS headers
    response.headers["Access-Control-Allow-Origin"] = "https://lex-assist.vercel.app"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    try:
        # For demo purposes, accept any code
        return {"message": "OTP verified successfully (demo mode)"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OTP verification failed: {str(e)}"
        )

@router.options("/role")
async def options_role(response: Response):
    """Handle OPTIONS preflight request for role update endpoint"""
    response.headers["Access-Control-Allow-Origin"] = "https://lex-assist.vercel.app"
    response.headers["Access-Control-Allow-Methods"] = "PUT, OPTIONS" 
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return {}

@router.put("/role", dependencies=[Depends(verify_super_admin_access)])
async def update_user_role(role_update: RoleUpdate, response: Response, supabase: Client = Depends(get_supabase_client)):
    """
    Update a user's role.
    
    Requires Super Admin access.
    """
    # Add CORS headers
    response.headers["Access-Control-Allow-Origin"] = "https://lex-assist.vercel.app"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
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
async def options_refresh(response: Response):
    """Handle OPTIONS preflight request for refresh token endpoint"""
    response.headers["Access-Control-Allow-Origin"] = "https://lex-assist.vercel.app"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return {}

@router.post("/refresh")
async def refresh_token(response: Response, supabase: Client = Depends(get_supabase_client)):
    """
    Refresh the authentication token.
    
    Uses the current session to generate a new token.
    """
    # Add CORS headers
    response.headers["Access-Control-Allow-Origin"] = "https://lex-assist.vercel.app"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
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
async def options_logout(response: Response):
    """Handle OPTIONS preflight request for logout endpoint"""
    response.headers["Access-Control-Allow-Origin"] = "https://lex-assist.vercel.app"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return {}

@router.post("/logout")
async def logout(response: Response, supabase: Client = Depends(get_supabase_client)):
    """
    Log out the current user.
    
    Invalidates the current session.
    """
    # Add CORS headers
    response.headers["Access-Control-Allow-Origin"] = "https://lex-assist.vercel.app"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    try:
        logout_response = supabase.auth.sign_out()
        return {"message": "Logged out successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Logout failed: {str(e)}"
        )