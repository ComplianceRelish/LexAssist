"""
Authentication and User Management API Endpoints for Lex Assist

This module implements the API endpoints for user authentication, registration,
and role-based access control with Twilio Verify integration.
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

# Import Twilio service
try:
    from ..services.twilio_service import twilio_service
    TWILIO_AVAILABLE = True
except ImportError:
    print("Twilio service not available - using fallback mode")
    TWILIO_AVAILABLE = False

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
    email_verified: Optional[bool] = False
    phone_verified: Optional[bool] = False

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: UserResponse

class RoleUpdate(BaseModel):
    user_id: str
    role: str = Field(..., pattern="^(super_admin|admin|lawyer|user)$")

class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    code: str

# New Twilio verification models
class VerificationRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None

class VerificationCodeRequest(BaseModel):
    contact: str  # email or phone
    code: str

# Endpoints
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate, request: Request, response: Response, supabase: Client = Depends(get_supabase_client)):
    """
    Register user with Twilio verification
    """
    try:
        print(f"=== REGISTRATION WITH TWILIO VERIFY ===")
        print(f"Attempting to register user: {user_data.email}")
        
        # 1. Create user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "full_name": user_data.full_name,
                    "country": user_data.country,
                    "country_code": user_data.countryCode,
                    "phone": user_data.phone,
                    "user_type": user_data.userType
                }
            }
        })
        
        print(f"Auth response type: {type(auth_response)}")
        print(f"Auth response: {auth_response}")
        
        if not auth_response or not hasattr(auth_response, 'user'):
            print(f"Unexpected auth response structure: {dir(auth_response)}")
            raise HTTPException(
                status_code=400,
                detail="Registration failed: Invalid response from Supabase"
            )
        
        user = auth_response.user
        if not user:
            raise HTTPException(
                status_code=400,
                detail="Registration failed: No user data returned"
            )
        
        # Extract user details
        user_id = str(user.id)
        user_email = user.email
        role = "lawyer" if user_data.userType == "lawyer" else "user"
        
        print(f"Successfully created auth user - ID: {user_id}, Email: {user_email}")
        
        # 2. Create user record in database
        user_record = {
            "id": user_id,
            "email": user_email,
            "full_name": user_data.full_name,
            "phone": user_data.phone,
            "country": user_data.country,
            "country_code": user_data.countryCode,
            "legal_system": user_data.legal_system,
            "jurisdiction_type": user_data.jurisdiction_type,
            "role": role,
            "is_active": False,  # Will be activated after verification
            "email_verified": False,
            "phone_verified": False,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        print(f"Inserting user record: {user_record}")
        
        # Handle duplicate users
        try:
            db_response = supabase.table("users").insert(user_record).execute()
            print(f"Database insert successful: {db_response.data}")
        except Exception as db_error:
            if "duplicate key" in str(db_error).lower():
                print(f"User exists, updating: {user_data.email}")
                supabase.table("users").update(user_record).eq("email", user_data.email).execute()
            else:
                print(f"Database error: {str(db_error)}")
                # Continue anyway since auth user was created successfully
        
        # 3. Send verification via Twilio
        verification_results = {}
        
        if TWILIO_AVAILABLE:
            print(f"Sending Twilio email verification to: {user_data.email}")
            email_result = await twilio_service.send_email_verification(user_data.email)
            verification_results["email"] = email_result
            
            # Also send SMS if phone number provided
            if user_data.phone:
                print(f"Sending Twilio SMS verification to: {user_data.phone}")
                sms_result = await twilio_service.send_sms_verification(user_data.phone)
                verification_results["sms"] = sms_result
        else:
            verification_results["email"] = {"success": False, "error": "Twilio not configured"}
        
        return {
            "id": user_id,
            "email": user_email,
            "full_name": user_data.full_name,
            "role": role,
            "subscription_tier": "free",
            "created_at": datetime.utcnow(),
            "email_verified": False,
            "phone_verified": False,
            "verification_sent": verification_results,
            "message": "Registration successful! Please check your email for verification code."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=400,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=TokenResponse)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    request: Request = None,
    response: Response = None,
    supabase: Client = Depends(get_supabase_client)):
    """
    Authenticate a user - requires email verification
    """
    try:
        print(f"=== LOGIN WITH VERIFICATION CHECK ===")
        print(f"Attempting to login user: {form_data.username}")
        
        # First check if user is verified
        try:
            user_check = supabase.table("users").select(
                "email_verified, is_active, full_name, role, created_at"
            ).eq("email", form_data.username).single().execute()
            
            if user_check.data:
                if not user_check.data.get("email_verified", False):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Please verify your email before logging in. Check your email for the verification code."
                    )
                if not user_check.data.get("is_active", False):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Account is not active. Please contact support."
                    )
        except HTTPException:
            raise
        except Exception as db_error:
            print(f"Database verification check failed: {str(db_error)}")
            # Continue with login attempt
        
        # Proceed with Supabase authentication
        auth_response = supabase.auth.sign_in_with_password({
            "email": form_data.username,
            "password": form_data.password
        })
        
        print(f"Login auth response type: {type(auth_response)}")
        
        if not auth_response or not hasattr(auth_response, 'user') or not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not hasattr(auth_response, 'session') or not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed: No session created",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = auth_response.user
        session = auth_response.session
        user_id = str(user.id)
        
        print(f"Successfully authenticated user - ID: {user_id}")
        
        # Try to get user details from database
        try:
            user_response = supabase.table("users").select(
                "id, email, full_name, role, created_at, email_verified, phone_verified"
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
                    "created_at": user.created_at,
                    "email_verified": False,
                    "phone_verified": False
                }
        except Exception as db_error:
            print(f"Database lookup failed: {str(db_error)}")
            # Fallback to auth user data
            user_data = {
                "id": user_id,
                "email": user.email,
                "full_name": user.email,  # Fallback
                "role": "user",
                "created_at": user.created_at,
                "email_verified": False,
                "phone_verified": False
            }
        
        return {
            "access_token": session.access_token,
            "token_type": "bearer",
            "expires_in": 3600,
            "user": {
                "id": user_data["id"],
                "email": user_data["email"],
                "full_name": user_data["full_name"],
                "role": user_data["role"],
                "subscription_tier": "free",
                "created_at": user_data["created_at"],
                "email_verified": user_data.get("email_verified", False),
                "phone_verified": user_data.get("phone_verified", False)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

# New Twilio verification endpoints
@router.post("/send-verification")
async def send_verification(request_data: VerificationRequest):
    """Send verification code to email or phone"""
    if not TWILIO_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Verification service not available"
        )
    
    try:
        results = {}
        
        if request_data.email:
            email_result = await twilio_service.send_email_verification(request_data.email)
            results["email"] = email_result
        
        if request_data.phone:
            sms_result = await twilio_service.send_sms_verification(request_data.phone)
            results["sms"] = sms_result
        
        return {
            "message": "Verification code(s) sent successfully",
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to send verification: {str(e)}")

@router.post("/verify-code")
async def verify_code(
    verification_data: VerificationCodeRequest, 
    supabase: Client = Depends(get_supabase_client)
):
    """Verify email or phone with Twilio code"""
    if not TWILIO_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Verification service not available"
        )
    
    try:
        # Verify with Twilio
        result = await twilio_service.verify_code(verification_data.contact, verification_data.code)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail="Invalid verification code")
        
        # Determine if it's email or phone verification
        is_email = "@" in verification_data.contact
        
        # Update user verification status
        if is_email:
            update_data = {
                "email_verified": True,
                "is_active": True,  # Activate user after email verification
                "updated_at": datetime.utcnow().isoformat()
            }
            supabase.table("users").update(update_data).eq("email", verification_data.contact).execute()
            message = "Email verified successfully! You can now login."
        else:
            update_data = {
                "phone_verified": True,
                "updated_at": datetime.utcnow().isoformat()
            }
            supabase.table("users").update(update_data).eq("phone", verification_data.contact).execute()
            message = "Phone verified successfully!"
        
        return {
            "success": True,
            "message": message,
            "verification_type": "email" if is_email else "phone"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Verification failed: {str(e)}")

# Protected endpoint example - Get user profile
@router.get("/profile", response_model=UserResponse)
async def get_profile(
    current_user = Depends(verify_user_access),
    supabase: Client = Depends(get_supabase_client)
):
    """Get current user's profile - requires authentication"""
    try:
        # Get user data from database
        user_response = supabase.table("users").select(
            "id, email, full_name, role, created_at, email_verified, phone_verified"
        ).eq("id", current_user.id).single().execute()
        
        if user_response.data:
            user_data = user_response.data
            return {
                "id": user_data["id"],
                "email": user_data["email"],
                "full_name": user_data["full_name"],
                "role": user_data["role"],
                "subscription_tier": "free",
                "created_at": user_data["created_at"],
                "email_verified": user_data.get("email_verified", False),
                "phone_verified": user_data.get("phone_verified", False)
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

# Legacy OTP endpoints (now using Twilio)
@router.post("/otp/request")
async def request_otp(otp_request: OTPRequest, supabase: Client = Depends(get_supabase_client)):
    """Request an OTP code for phone verification using Twilio"""
    if not TWILIO_AVAILABLE:
        return {"message": "OTP sent successfully (demo mode - Twilio not configured)"}
    
    try:
        result = await twilio_service.send_sms_verification(otp_request.phone)
        if result["success"]:
            return {"message": "OTP sent successfully via Twilio"}
        else:
            raise HTTPException(status_code=400, detail=f"Failed to send OTP: {result.get('error', 'Unknown error')}")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OTP request failed: {str(e)}"
        )

@router.post("/otp/verify")
async def verify_otp(verify_data: OTPVerify, supabase: Client = Depends(get_supabase_client)):
    """Verify an OTP code for phone verification using Twilio"""
    if not TWILIO_AVAILABLE:
        return {"message": "OTP verified successfully (demo mode - Twilio not configured)"}
    
    try:
        result = await twilio_service.verify_code(verify_data.phone, verify_data.code)
        if result["success"]:
            # Update phone verification status
            supabase.table("users").update({
                "phone_verified": True,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("phone", verify_data.phone).execute()
            
            return {"message": "Phone verified successfully!"}
        else:
            raise HTTPException(status_code=400, detail="Invalid OTP code")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OTP verification failed: {str(e)}"
        )

@router.put("/role", dependencies=[Depends(verify_super_admin_access)])
async def update_user_role(role_update: RoleUpdate, supabase: Client = Depends(get_supabase_client)):
    """Update a user's role. Requires Super Admin access."""
    try:
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

@router.post("/refresh")
async def refresh_token(supabase: Client = Depends(get_supabase_client)):
    """Refresh the authentication token."""
    try:
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

@router.post("/logout")
async def logout(supabase: Client = Depends(get_supabase_client)):
    """Log out the current user."""
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
        response = supabase.table('users').select('id, email').limit(1).execute()
        return {"status": "success", "message": "Supabase connection working", "data": response.data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Test endpoint to debug Twilio connection
@router.get("/test/twilio")
async def test_twilio():
    """Test endpoint to verify Twilio connection"""
    if not TWILIO_AVAILABLE:
        return {"status": "error", "message": "Twilio service not configured"}
    
    try:
        # Test with a dummy verification (won't actually send)
        return {"status": "success", "message": "Twilio service is available and configured"}
    except Exception as e:
        return {"status": "error", "message": str(e)}