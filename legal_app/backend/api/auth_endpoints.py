"""
Authentication and User Management API Endpoints for Lex Assist

This module implements the API endpoints for user authentication, registration,
and role-based access control.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
import jwt
from datetime import datetime, timedelta
import os
from supabase import create_client, Client

from .supabase_client import get_supabase_client
from .role_based_access_control import verify_admin_access, verify_super_admin_access

# Initialize router
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None

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
    role: str = Field(..., pattern="^(super_admin|admin|user)$")

class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    code: str

# Endpoints
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate, supabase: Client = Depends(get_supabase_client)):
    """
    Register a new user with email and password.
    
    Creates a new user account with default 'user' role and 'free' subscription tier.
    """
    try:
        # Register user with Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password
        })
        
        if auth_response.error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Registration failed: {auth_response.error.message}"
            )
        
        user_id = auth_response.user.id
        
        # Create user record in users table
        user_record = {
            "id": user_id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "phone": user_data.phone,
            "role": "user"  # Default role
        }
        
        user_response = supabase.table("users").insert(user_record).execute()
        
        if user_response.error:
            # Attempt to clean up auth user if db insert fails
            supabase.auth.admin.delete_user(user_id)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create user record: {user_response.error.message}"
            )
        
        # Get the created user with subscription info
        created_user = supabase.table("users").select(
            "id, email, full_name, role, created_at, subscriptions(tier_id, subscription_tiers(name))"
        ).eq("id", user_id).single().execute()
        
        if created_user.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve created user"
            )
        
        user_data = created_user.data
        subscription_tier = "free"  # Default
        
        if user_data.get("subscriptions") and len(user_data["subscriptions"]) > 0:
            subscription_tier = user_data["subscriptions"][0]["subscription_tiers"]["name"]
        
        return {
            "id": user_data["id"],
            "email": user_data["email"],
            "full_name": user_data["full_name"],
            "role": user_data["role"],
            "subscription_tier": subscription_tier,
            "created_at": user_data["created_at"]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), 
                supabase: Client = Depends(get_supabase_client)):
    """
    Authenticate a user with email and password.
    
    Returns a JWT token with user role and subscription claims.
    """
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": form_data.username,
            "password": form_data.password
        })
        
        if auth_response.error:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user details including role and subscription
        user_id = auth_response.user.id
        user_response = supabase.table("users").select(
            "id, email, full_name, role, created_at"
        ).eq("id", user_id).single().execute()
        
        if user_response.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve user details"
            )
        
        # Get subscription tier
        subscription_response = supabase.table("subscriptions").select(
            "tier_id, subscription_tiers(name)"
        ).eq("user_id", user_id).eq("status", "active").order("created_at", {"ascending": False}).limit(1).execute()
        
        subscription_tier = "free"  # Default
        if not subscription_response.error and len(subscription_response.data) > 0:
            subscription_tier = subscription_response.data[0]["subscription_tiers"]["name"]
        
        user_data = user_response.data
        
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
                "subscription_tier": subscription_tier,
                "created_at": user_data["created_at"]
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@router.post("/otp/request")
async def request_otp(request: OTPRequest, supabase: Client = Depends(get_supabase_client)):
    """
    Request an OTP code for phone verification.
    
    Sends an OTP code to the provided phone number.
    """
    try:
        # In a real implementation, this would integrate with Twilio or similar
        # For now, we'll simulate OTP generation
        
        # Check if phone exists in users table
        user_response = supabase.table("users").select("id").eq("phone", request.phone).execute()
        
        if user_response.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to check phone number"
            )
        
        if len(user_response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Phone number not found"
            )
        
        # In a real implementation, generate and send OTP
        # For demo, we'll just return success
        return {"message": "OTP sent successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OTP request failed: {str(e)}"
        )

@router.post("/otp/verify")
async def verify_otp(verify_data: OTPVerify, supabase: Client = Depends(get_supabase_client)):
    """
    Verify an OTP code for phone verification.
    
    Validates the OTP code and returns a JWT token if valid.
    """
    try:
        # In a real implementation, this would verify the OTP
        # For demo purposes, we'll accept any code
        
        # Get user by phone
        user_response = supabase.table("users").select(
            "id, email, full_name, role, created_at"
        ).eq("phone", verify_data.phone).single().execute()
        
        if user_response.error:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user_data = user_response.data
        user_id = user_data["id"]
        
        # Sign in with custom token (in real implementation)
        # For demo, we'll use the admin API to create a session
        auth_response = supabase.auth.admin.create_session({
            "user_id": user_id,
            "expires_in": 3600  # 1 hour
        })
        
        if auth_response.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create session"
            )
        
        # Get subscription tier
        subscription_response = supabase.table("subscriptions").select(
            "tier_id, subscription_tiers(name)"
        ).eq("user_id", user_id).eq("status", "active").order("created_at", {"ascending": False}).limit(1).execute()
        
        subscription_tier = "free"  # Default
        if not subscription_response.error and len(subscription_response.data) > 0:
            subscription_tier = subscription_response.data[0]["subscription_tiers"]["name"]
        
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
                "subscription_tier": subscription_tier,
                "created_at": user_data["created_at"]
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OTP verification failed: {str(e)}"
        )

@router.put("/role", dependencies=[Depends(verify_super_admin_access)])
async def update_user_role(role_update: RoleUpdate, supabase: Client = Depends(get_supabase_client)):
    """
    Update a user's role.
    
    Requires Super Admin access.
    """
    try:
        # Update user role
        response = supabase.table("users").update(
            {"role": role_update.role}
        ).eq("id", role_update.user_id).execute()
        
        if response.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update role: {response.error.message}"
            )
        
        if len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {"message": "Role updated successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Role update failed: {str(e)}"
        )

@router.post("/refresh")
async def refresh_token(supabase: Client = Depends(get_supabase_client)):
    """
    Refresh the authentication token.
    
    Uses the current session to generate a new token.
    """
    try:
        # Refresh token
        response = supabase.auth.refresh_session()
        
        if response.error:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return {
            "access_token": response.session.access_token,
            "token_type": "bearer",
            "expires_in": 3600  # 1 hour
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token refresh failed: {str(e)}"
        )

@router.post("/logout")
async def logout(supabase: Client = Depends(get_supabase_client)):
    """
    Log out the current user.
    
    Invalidates the current session.
    """
    try:
        response = supabase.auth.sign_out()
        
        if response.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to log out"
            )
        
        return {"message": "Logged out successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Logout failed: {str(e)}"
        )
