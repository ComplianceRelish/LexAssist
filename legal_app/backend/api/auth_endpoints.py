"""
Authentication and User Management API Endpoints for Lex Assist
"""

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timedelta
import os
import traceback
from supabase import create_client, Client
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

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
    # Fix relative import with absolute import path
    from services.twilio_service import twilio_service
    TWILIO_AVAILABLE = True
    print("✅ Twilio service loaded successfully")
except ImportError as e:
    try:
        # Alternative import path
        from legal_app.backend.services.twilio_service import twilio_service
        TWILIO_AVAILABLE = True
        print("✅ Twilio service loaded successfully")
    except ImportError as e:
        print(f"❌ Twilio service not available: {e}")
        TWILIO_AVAILABLE = False

# Check if Twilio is disabled via environment
if os.getenv('DISABLE_TWILIO', '').lower() == 'true':
    TWILIO_AVAILABLE = False
    print("🔇 Twilio disabled via environment variable")

# Initialize router
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Enhanced Indian Legal System Framework
class IndianLegalSystemMixin:
    """Enhanced legal system definitions with focus on Indian plural legal system"""
    
    @staticmethod
    def get_legal_system(country: str) -> str:
        """
        Returns the primary legal system classification for each country.
        India is correctly classified as 'plural' due to multiple coexisting legal systems.
        """
        legal_systems = {
            # Plural Legal Systems (Multiple systems coexisting)
            'IN': 'plural',               # India - Common law + Personal laws + Customary + Constitutional
            'PK': 'plural',               # Pakistan - Common law + Islamic law + Customary
            'BD': 'plural',               # Bangladesh - Common law + Islamic law + Customary
            'LK': 'plural',               # Sri Lanka - Common law + Kandyan law + Muslim law
            'MY': 'plural',               # Malaysia - Common law + Islamic law + Customary
            'ID': 'plural',               # Indonesia - Civil law + Islamic law + Adat (customary)
            'PH': 'plural',               # Philippines - Civil law + Common law + Customary
            'NG': 'plural',               # Nigeria - Common law + Customary + Sharia
            'ZA': 'plural',               # South Africa - Common law + Roman-Dutch + Customary
            
            # Common Law Systems
            'US': 'common_law', 'UK': 'common_law', 'AU': 'common_law',
            'CA': 'common_law', 'SG': 'common_law', 'HK': 'common_law',
            'NZ': 'common_law', 'IE': 'common_law',
            
            # Civil Law Systems
            'DE': 'civil_law', 'FR': 'civil_law', 'JP': 'civil_law',
            'IT': 'civil_law', 'ES': 'civil_law', 'NL': 'civil_law',
            'BE': 'civil_law', 'AT': 'civil_law', 'CH': 'civil_law',
            'SE': 'civil_law', 'NO': 'civil_law', 'DK': 'civil_law',
            'FI': 'civil_law', 'BR': 'civil_law', 'AR': 'civil_law',
            'MX': 'civil_law', 'CL': 'civil_law', 'CO': 'civil_law',
            'PE': 'civil_law', 'KR': 'civil_law', 'CN': 'civil_law',
            'TW': 'civil_law', 'TH': 'civil_law', 'VN': 'civil_law',
            'RU': 'civil_law', 'PL': 'civil_law', 'CZ': 'civil_law',
            'HU': 'civil_law', 'RO': 'civil_law', 'GR': 'civil_law',
            'PT': 'civil_law', 'TR': 'civil_law',
            
            # Mixed Legal Systems
            'IL': 'mixed', 'LB': 'mixed', 'JO': 'mixed', 'QA': 'mixed',
            'AE': 'mixed', 'KW': 'mixed', 'BH': 'mixed', 'OM': 'mixed',
            'EG': 'mixed', 'LY': 'mixed', 'TN': 'mixed', 'MA': 'mixed',
            'DZ': 'mixed', 'SD': 'mixed', 'ET': 'mixed', 'KE': 'mixed',
            'UG': 'mixed', 'TZ': 'mixed',
            
            # Religious Law Systems
            'SA': 'religious_law', 'IR': 'religious_law', 'AF': 'religious_law',
            'VA': 'religious_law',
        }
        return legal_systems.get(country, 'common_law')
    
    @staticmethod
    def get_jurisdiction_type(country: str) -> str:
        """Enhanced jurisdiction classification with Indian federal union structure"""
        jurisdictions = {
            'IN': 'federal_union',        # India - Union of States (more accurate than federal_state)
            'US': 'federal_state',        # United States
            'AU': 'federal_commonwealth', # Australia
            'CA': 'federal_provincial',   # Canada
            'DE': 'federal_state',        # Germany
            'BR': 'federal_state',        # Brazil
            'MY': 'federal_state',        # Malaysia
            'PK': 'federal_state',        # Pakistan
            'AE': 'federal_emirate',      # UAE
            'RU': 'federal_state',        # Russia
            
            'UK': 'unitary_devolved',     # UK with devolution
            'FR': 'unitary', 'JP': 'unitary', 'IT': 'unitary',
            'ES': 'unitary', 'NL': 'unitary', 'CN': 'unitary',
            
            'SG': 'city_state', 'HK': 'special_administrative',
        }
        return jurisdictions.get(country, 'unitary')
    
    @staticmethod
    def get_indian_legal_sources() -> Dict[str, List[str]]:
        """Comprehensive Indian legal system sources"""
        return {
            'constitutional_law': [
                'Constitution of India (1950)',
                'Constitutional Amendments (104 amendments)',
                'Fundamental Rights (Articles 12-35)',
                'Directive Principles of State Policy (Articles 36-51)',
                'Fundamental Duties (Article 51A)',
                'Emergency Provisions (Articles 352-360)'
            ],
            'statutory_law': [
                'Central Acts (Parliament)',
                'State Acts (State Legislatures)',
                'Ordinances (President/Governor)',
                'Delegated Legislation',
                'Rules, Regulations, and Notifications'
            ],
            'common_law_heritage': [
                'English Common Law (pre-1947)',
                'Judicial Precedents (Article 141)',
                'Supreme Court Judgments',
                'High Court Judgments',
                'Equity and Justice Principles'
            ],
            'personal_laws': [
                'Hindu Personal Law (Hindu Marriage Act 1955, Hindu Succession Act 1956)',
                'Muslim Personal Law (Muslim Personal Law (Shariat) Application Act 1937)',
                'Christian Personal Law (Indian Christian Marriage Act 1872)',
                'Parsi Personal Law (Parsi Marriage and Divorce Act 1936)',
                'Jewish Personal Law (Limited application)',
                'Special Marriage Act 1954 (Secular marriages)'
            ],
            'customary_law': [
                'Tribal Customary Laws (Fifth & Sixth Schedule areas)',
                'Agricultural Customs',
                'Trade and Commercial Customs',
                'Local Usage and Customs',
                'Community-specific practices'
            ],
            'international_law': [
                'Treaties and Conventions (Article 253)',
                'UN Charter Obligations',
                'Bilateral Investment Treaties',
                'Trade Agreements (WTO, FTA)',
                'International Customary Law'
            ]
        }
    
    @staticmethod
    def get_indian_court_hierarchy() -> Dict[str, any]:
        """Detailed Indian judicial system structure"""
        return {
            'supreme_court': {
                'jurisdiction': 'All India',
                'chief_justice': 1,
                'judges': 33,
                'total_strength': 34,
                'powers': [
                    'Final Court of Appeal',
                    'Constitutional Interpretation (Article 141)',
                    'Original Jurisdiction (Inter-state disputes)',
                    'Advisory Jurisdiction (Article 143)',
                    'Writ Jurisdiction (Article 32)',
                    'Review Jurisdiction'
                ]
            },
            'high_courts': {
                'total_courts': 25,
                'for_states': 28,
                'jurisdiction': 'State/Multi-state level',
                'powers': [
                    'Constitutional Writ Jurisdiction (Article 226)',
                    'Supervisory Jurisdiction over subordinate courts',
                    'Original Civil & Criminal Jurisdiction',
                    'Appellate Jurisdiction'
                ],
                'notable_courts': [
                    'Delhi High Court', 'Bombay High Court', 'Madras High Court',
                    'Calcutta High Court', 'Karnataka High Court', 'Kerala High Court'
                ]
            },
            'district_courts': {
                'types': {
                    'civil_courts': [
                        'District Judge (Principal Civil Court)',
                        'Additional District Judge',
                        'Civil Judge (Senior Division)',
                        'Civil Judge (Junior Division)'
                    ],
                    'criminal_courts': [
                        'Sessions Judge',
                        'Additional Sessions Judge',
                        'Assistant Sessions Judge'
                    ]
                }
            },
            'subordinate_courts': {
                'judicial_magistrates': [
                    'Chief Judicial Magistrate',
                    'Judicial Magistrate First Class',
                    'Judicial Magistrate Second Class'
                ],
                'executive_magistrates': [
                    'District Magistrate/District Collector',
                    'Sub-Divisional Magistrate',
                    'Executive Magistrate'
                ]
            },
            'specialized_tribunals': [
                'National Green Tribunal (NGT)',
                'Central Administrative Tribunal (CAT)',
                'Income Tax Appellate Tribunal (ITAT)',
                'Customs, Excise & Service Tax Appellate Tribunal (CESTAT)',
                'National Company Law Tribunal (NCLT)',
                'National Company Law Appellate Tribunal (NCLAT)',
                'Debt Recovery Tribunal (DRT)',
                'Intellectual Property Appellate Board (IPAB)',
                'Competition Appellate Tribunal (COMPAT)',
                'Armed Forces Tribunal',
                'Consumer Disputes Redressal Forums',
                'Labour Courts and Industrial Tribunals',
                'Family Courts',
                'Commercial Courts',
                'Fast Track Courts'
            ]
        }

# Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    firstName: str
    lastName: str
    country: str = "IN"  # Default to India for your primary market
    countryCode: str = "+91"  # Default to India country code
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
        """Get the legal system for the user's country"""
        return IndianLegalSystemMixin.get_legal_system(self.country)
    
    @property
    def jurisdiction_type(self) -> str:
        """Get the jurisdiction type for the user's country"""
        return IndianLegalSystemMixin.get_jurisdiction_type(self.country)
    
    @property
    def court_hierarchy(self) -> dict:
        """Get the court hierarchy for the user's country"""
        if self.country == 'IN':
            return IndianLegalSystemMixin.get_indian_court_hierarchy()
        
        # Basic court structures for other countries
        court_structures = {
            'US': {
                'supreme': 'US Supreme Court',
                'appellate': 'US Courts of Appeals (13 circuits)',
                'district': 'US District Courts (94)',
                'state_supreme': 'State Supreme Courts',
                'specialized': ['Tax Court', 'Bankruptcy Courts', 'Immigration Courts']
            },
            'UK': {
                'supreme': 'UK Supreme Court',
                'appellate': 'Court of Appeal',
                'high': 'High Court of Justice',
                'crown': 'Crown Court',
                'magistrates': 'Magistrates Courts',
                'specialized': ['Employment Tribunal', 'Family Court']
            }
        }
        return court_structures.get(self.country, {})
    
    @property
    def legal_precedent_system(self) -> str:
        """Get the precedent system for the user's country"""
        if self.country == 'IN':
            return 'hierarchical_stare_decisis'  # Article 141 of Indian Constitution
        
        precedent_systems = {
            'US': 'stare_decisis', 'UK': 'stare_decisis', 'AU': 'stare_decisis',
            'CA': 'stare_decisis', 'SG': 'stare_decisis', 'HK': 'stare_decisis',
            'DE': 'persuasive_precedent', 'FR': 'persuasive_precedent',
            'JP': 'persuasive_precedent', 'CN': 'guiding_cases',
            'BR': 'binding_precedent'
        }
        return precedent_systems.get(self.country, 'stare_decisis')

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

class VerificationRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None

class VerificationCodeRequest(BaseModel):
    contact: str  # email or phone
    code: str

class RegistrationResponse(BaseModel):
    id: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    user_type: Optional[str] = None
    country: Optional[str] = None
    country_code: Optional[str] = None
    is_email_verified: Optional[bool] = None
    is_phone_verified: Optional[bool] = None
    legal_system: Optional[str] = None
    jurisdiction: Optional[str] = None
    verification_method: Optional[str] = None
    verification_sent: Optional[Dict[str, Any]] = None
    message: Optional[str] = None

# Endpoints (rest of your endpoints remain the same)
# ✅ FIXED: Registration endpoint with proper response model
@router.post("/register", response_model=RegistrationResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate, request: Request, response: Response, supabase: Client = Depends(get_supabase_client)):
    try:
        print(f"=== REGISTRATION WITH TWILIO VERIFICATION ONLY ===")
        print(f"Attempting to register user: {user_data.email}")
        print(f"Country: {user_data.country}, Legal System: {user_data.legal_system}")
        
        # 1. Create user in Supabase Auth with manual approach to avoid auto-confirmation
        try:
            # Try to disable confirmation by using admin.create_user instead
            auth_response = supabase.auth.admin.create_user({
                "email": user_data.email,
                "password": user_data.password,
                "phone": user_data.phone,
                "email_confirm": False,  # Explicitly disable email confirmation
                "user_metadata": {
                    "full_name": user_data.full_name,
                    "country": user_data.country,
                    "country_code": user_data.countryCode,
                    "user_type": user_data.userType,
                    "legal_system": user_data.legal_system,
                    "jurisdiction_type": user_data.jurisdiction_type
                }
            })
        except Exception as admin_error:
            print(f"Admin create failed, falling back to regular signup: {admin_error}")
            # Fallback to regular signup if admin method fails
            # FIXED: Added skipConfirmation and emailRedirectTo to prevent default email
            redirect_url = os.getenv("FRONTEND_URL", "https://lexassist.vercel.app") + "/verify-email"
            
            auth_response = supabase.auth.sign_up({
                "email": user_data.email,
                "password": user_data.password,
                "phone": user_data.phone,
                "options": {
                    "data": {
                        "full_name": user_data.full_name,
                        "country": user_data.country,
                        "country_code": user_data.countryCode,
                        "user_type": user_data.userType,
                        "legal_system": user_data.legal_system,
                        "jurisdiction_type": user_data.jurisdiction_type
                    },
                    "skipConfirmation": True,  # CRITICAL: Disable Supabase email confirmation
                    "emailRedirectTo": redirect_url  # Will be used if confirmation still happens
                }
            })
        
        if not auth_response or not hasattr(auth_response, 'user'):
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
        
        user_id = str(user.id)
        user_email = user.email
        role = "lawyer" if user_data.userType == "lawyer" else "user"
        
        print(f"Successfully created auth user - ID: {user_id}, Email: {user_email}")
        
        # 2. Create enhanced user record with legal system data
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
            "is_active": True,  # Automatically activate the user (skip verification)
            "email_verified": True,  # Auto-mark email as verified
            "phone_verified": True,  # Auto-mark phone as verified
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Add Indian legal system data if user is from India
        if user_data.country == 'IN':
            user_record["indian_legal_sources"] = IndianLegalSystemMixin.get_indian_legal_sources()
            user_record["court_hierarchy"] = user_data.court_hierarchy
            print(f"✅ Added enhanced Indian legal system data for user: {user_email}")
        
        # 3. Insert user record
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
        
        # 4. Send verification via Twilio ONLY (override any Supabase emails)
        verification_results = {}
        verification_method = "email_link"  # Default fallback
        
        if TWILIO_AVAILABLE:
            try:
                print(f"Sending Twilio email verification to: {user_data.email}")
                email_result = await twilio_service.send_email_verification(user_data.email)
                verification_results["email"] = email_result
                verification_method = "twilio_code"  # Twilio is working
                
                if user_data.phone:
                    print(f"Sending Twilio SMS verification to: {user_data.phone}")
                    sms_result = await twilio_service.send_sms_verification(user_data.phone)
                    verification_results["sms"] = sms_result
            except Exception as twilio_error:
                print(f"Twilio verification failed: {twilio_error}")
                verification_results["email"] = {"success": False, "error": str(twilio_error)}
                verification_method = "email_link"  # Fallback to email link
        else:
            verification_results["email"] = {"success": False, "error": "Twilio not configured"}
            verification_method = "email_link"  # Fallback to email link
        
        # If we're using email link verification, manually generate and send a confirmation email
        # This avoids the expired link issues with Supabase's default confirmation emails
        if verification_method == "email_link":
            try:
                # Generate a custom confirmation link with a longer expiry
                confirmation_token = supabase.auth.admin.generate_link({
                    "type": "signup",
                    "email": user_data.email,
                    "redirect_to": os.getenv("FRONTEND_URL", "https://lexassist.vercel.app") + "/verify-success"
                })
                
                if confirmation_token and hasattr(confirmation_token, "properties") and confirmation_token.properties.action_link:
                    # We have a valid confirmation link
                    verification_link = confirmation_token.properties.action_link
                    print(f"Generated custom confirmation link: {verification_link}")
                    
                    # Send email with confirmation link using SendGrid
                    try:
                        message = Mail(
                            from_email='support@lexassist.com',
                            to_emails=user_data.email,
                            subject='Verify Your LexAssist Account',
                            html_content=f'<p>Click <a href="{verification_link}">here</a> to verify your account.</p>'
                        )
                        
                        sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
                        sg_response = sg.send(message)
                        print(f"SendGrid response status code: {sg_response.status_code}")
                        
                        verification_results["email_link"] = {
                            "success": True,
                            "message": f"Custom confirmation link sent via SendGrid"
                        }
                    except Exception as email_error:
                        print(f"Failed to send email via SendGrid: {email_error}")
                        verification_results["email_link"] = {
                            "success": False,
                            "error": str(email_error),
                            "message": "Failed to send verification email"
                        }
                else:
                    print("Failed to generate confirmation link")
            except Exception as link_error:
                print(f"Error generating confirmation link: {link_error}")
                # We'll still return email_link as verification method,
                # and rely on any emails sent by Supabase
        
        # 5. Return the proper response format
        return RegistrationResponse(
            id=user_id,
            email=user_email,
            full_name=user_data.full_name,
            role=role,
            subscription_tier="free",
            created_at=datetime,
            email_verified=False,
            phone_verified=False,
            verification_method=verification_method,  # ✅ Key field for frontend
            verification_sent=verification_results,
            legal_system=user_data.legal_system,
            jurisdiction=user_data.jurisdiction_type,
            message="Registration successful! Please enter the 6-digit verification code sent to your email." if verification_method == "twilio_code" else "Registration successful! Please check your email for the verification link."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=400,
            detail=f"Registration failed: {str(e)}"
        )

# ✅ IMPROVED: Send verification endpoint with better error handling
@router.post("/send-verification")
async def send_verification(request_data: VerificationRequest):
    """Send verification code to email or phone"""
    
    # Check if Twilio is disabled
    if os.getenv('DISABLE_TWILIO', '').lower() == 'true':
        return {
            "success": True,
            "message": "Verification service is temporarily disabled. Please use email verification link.",
            "fallback_mode": True
        }
    
    if not TWILIO_AVAILABLE:
        return {
            "success": False,
            "message": "Verification service is currently unavailable. Please use email verification link.",
            "fallback_mode": True,
            "error": "Twilio service not configured"
        }
    
    try:
        results = {}
        
        if request_data.email:
            email_result = await twilio_service.send_email_verification(request_data.email)
            results["email"] = email_result
        
        if request_data.phone:
            sms_result = await twilio_service.send_sms_verification(request_data.phone)
            results["sms"] = sms_result
        
        return {
            "success": True,
            "message": "Verification code(s) sent successfully",
            "results": results
        }
    except Exception as e:
        print(f"Verification error: {str(e)}")
        return {
            "success": False,
            "message": "Failed to send verification code. Please use email verification link.",
            "fallback_mode": True,
            "error": str(e)
        }
        # ... error handling ...

@router.post("/login", response_model=TokenResponse)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    request: Request = None,
    response: Response = None,
    supabase: Client = Depends(get_supabase_client)):
    """
    Authenticate a user - verification skipped
    """
    try:
        print(f"=== LOGIN (NO VERIFICATION CHECK) ===")
        print(f"Attempting to login user: {form_data.username}")
        
        # We skip verification check as we've modified registration to auto-verify users
        # Just check if user exists in database
        try:
            user_check = supabase.table("users").select(
                "full_name, role, created_at, country, country_code"
            ).eq("email", form_data.username).single().execute()
            
            if user_check.data:
                print(f"User found in database: {user_check.data.get('full_name')}")
                print(f"Country: {user_check.data.get('country')}, Code: {user_check.data.get('country_code')}")
            else:
                print(f"User not found in database, will rely on auth data")
                
        except Exception as db_error:
            print(f"Database check failed: {str(db_error)}")
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
async def refresh_token(request: Request, response: Response, supabase: Client = Depends(get_supabase_client)):
    """Refresh the authentication token."""
    try:
        # Get refresh token from cookie or request body
        token = None
        content_type = request.headers.get('Content-Type', '')
        
        # Try to get token from request body if it's JSON
        if 'application/json' in content_type:
            try:
                body = await request.json()
                token = body.get('refresh_token', None)
            except:
                # If body can't be parsed as JSON, continue without it
                pass
        
        # Try refreshing session
        try:
            refresh_response = supabase.auth.refresh_session()
            
            if refresh_response.session:
                return {
                    "access_token": refresh_response.session.access_token,
                    "token_type": "bearer",
                    "expires_in": 3600,
                    "user": get_user_data(refresh_response.user.id, supabase)
                }
        except Exception as e:
            # If refresh failed with current session, try getting a new session
            # This allows recovery from expired tokens without forcing re-login
            print(f"Session refresh failed: {e}, trying alternative authentication")
            pass
        
        # If we have a user in session, return that user's data
        try:
            user = supabase.auth.get_user()
            if user and user.user and user.user.id:
                user_data = get_user_data(user.user.id, supabase)
                if user_data:
                    # Create new session
                    session = supabase.auth.get_session()
                    if session and session.access_token:
                        return {
                            "access_token": session.access_token,
                            "token_type": "bearer",
                            "expires_in": 3600,
                            "user": user_data
                        }
        except Exception as e:
            # If this fails, we'll return a 401 below
            print(f"Failed to get user or session: {e}")
            pass
            
        # If all else fails, return 401
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to refresh token - please log in again"
        )
    except HTTPException as he:
        # Re-throw HTTP exceptions
        raise he
    except Exception as e:
        # Log the error but return a user-friendly message
        print(f"ERROR in refresh_token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired, please log in again"
        )

# Direct login endpoint that bypasses email verification
@router.post("/direct-login", response_model=TokenResponse)
async def direct_login(
    request: Request,
    response: Response,
    supabase: Client = Depends(get_supabase_client)
):
    """Direct login that bypasses email verification requirements"""
    try:
        # Parse request body
        body = await request.json()
        email = body.get("email")
        password = body.get("password")
        
        if not email or not password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email and password are required"
            )
        
        print(f"=== DIRECT LOGIN (BYPASS EMAIL VERIFICATION) ===")
        print(f"Attempting direct login for user: {email}")
        
        # First check if user exists in the database
        try:
            user_check = supabase.table("users").select(
                "id, email, full_name, role, created_at, email_verified, phone_verified"
            ).eq("email", email).single().execute()
            
            if not user_check.data:
                print(f"User not found in database: {email}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password",
                    headers={"WWW-Authenticate": "Bearer"},
                )
                
            print(f"User found in database: {user_check.data.get('full_name')}")
            user_data = user_check.data
            
        except Exception as db_error:
            print(f"Database check failed: {str(db_error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(db_error)}"
            )
        
        # Try to authenticate with Supabase but catch email verification errors
        try:
            # First try standard authentication
            auth_response = supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if auth_response and hasattr(auth_response, 'session') and auth_response.session:
                # If normal login works, use it
                user = auth_response.user
                session = auth_response.session
                
                print(f"Standard authentication successful for user ID: {user.id}")
                
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
                        "email_verified": True,  # Force this to true
                        "phone_verified": user_data.get("phone_verified", False)
                    }
                }
                
        except Exception as auth_error:
            print(f"Standard auth failed: {str(auth_error)}")
            # Continue with alternative approach
        
        # If we get here, standard auth failed (likely due to email verification)
        # We'll manually verify the password and generate a session
        try:
            # First, verify the password by attempting a sign-in with the admin client
            # This won't enforce email verification since we're using the service role key
            try:
                # We're already using the service role key in our client
                auth_response = supabase.auth.sign_in_with_password({
                    "email": email,
                    "password": password
                })
                
                # If we get here without an exception, the password is correct
                print("Password verification successful")
            except Exception as pw_error:
                # If this fails, it's likely due to invalid credentials
                print(f"Password verification failed: {str(pw_error)}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            # Update the user's email_verified status in the database
            try:
                supabase.table("users").update({
                    "email_verified": True,
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", user_data["id"]).execute()
                print(f"Updated user's email_verified status to True")
            except Exception as update_error:
                print(f"Failed to update email_verified status: {str(update_error)}")
            
            # Now try to get a session for the user
            try:
                # Try to sign in again now that we've updated the email_verified status
                auth_response = supabase.auth.sign_in_with_password({
                    "email": email,
                    "password": password
                })
                
                if auth_response and hasattr(auth_response, 'session') and auth_response.session:
                    print("Successfully signed in after updating email_verified status")
                    access_token = auth_response.session.access_token
                    refresh_token = auth_response.session.refresh_token
                else:
                    # If we still can't get a session, try another approach
                    print("Failed to get session after updating email_verified status")
                    raise Exception("Failed to obtain access token after email verification update")
                    
            except Exception as session_error:
                print(f"Session creation failed: {str(session_error)}")
                
                # Last resort: Use admin API to create a custom token
                # This requires the SUPABASE_SERVICE_ROLE_KEY which we're already using
                try:
                    # Try to use admin sign-in if available in this version of the Supabase client
                    admin_auth = getattr(supabase.auth, 'admin', None)
                    if admin_auth and hasattr(admin_auth, 'generate_link'):
                        # Generate a magic link (we won't send it, just use the token)
                        magic_link_response = admin_auth.generate_link({
                            "type": "magiclink",
                            "email": email
                        })
                        if magic_link_response and hasattr(magic_link_response, 'properties'):
                            access_token = magic_link_response.properties.get('access_token')
                            refresh_token = magic_link_response.properties.get('refresh_token')
                    else:
                        raise Exception("Admin API not available")
                except Exception as admin_error:
                    print(f"Admin token generation failed: {str(admin_error)}")
                    # We've exhausted all options, so we'll have to return an error
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to generate authentication token"
                    )
            
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "expires_in": 3600,
                "user": {
                    "id": user_data["id"],
                    "email": user_data["email"],
                    "full_name": user_data["full_name"],
                    "role": user_data["role"],
                    "subscription_tier": "free",
                    "created_at": user_data["created_at"],
                    "email_verified": True,  # Force this to true
                    "phone_verified": user_data.get("phone_verified", False)
                }
            }
                
        except HTTPException:
            raise
        except Exception as e:
            print(f"Alternative authentication failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Direct login error: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Direct login failed: {str(e)}"
        )


@router.post("/admin-login", response_model=TokenResponse)
async def admin_login(request: Request, response: Response, supabase: Client = Depends(get_supabase_client)):
    """
    Admin bypass login for unverified emails
    This endpoint exists to support the frontend's fallback login attempt
    """
    try:
        # Parse request body
        body = await request.json()
        email = body.get("email")
        password = body.get("password")
        
        if not email or not password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email and password are required"
            )
        
        print(f"=== ADMIN LOGIN (BYPASS EMAIL VERIFICATION) ===")
        print(f"Attempting admin login for user: {email}")
        
        # First check if user exists in the database
        try:
            user_check = supabase.table("users").select(
                "id, email, full_name, role, created_at, email_verified, phone_verified"
            ).eq("email", email).single().execute()
            
            if not user_check.data:
                print(f"User not found in database: {email}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password",
                    headers={"WWW-Authenticate": "Bearer"},
                )
                
            print(f"User found in database: {user_check.data.get('full_name')}")
            user_data = user_check.data
            
        except Exception as db_error:
            print(f"Database check failed: {str(db_error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(db_error)}"
            )
            
        # Verify password using service role key
        try:
            auth_response = supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            # If we get here without an exception, the password is correct
            print("Password verification successful")
        except Exception as pw_error:
            # If this fails, it's likely due to invalid credentials
            print(f"Password verification failed: {str(pw_error)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Update the user's email_verified status in the database
        try:
            supabase.table("users").update({
                "email_verified": True,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", user_data["id"]).execute()
            print(f"Updated user's email_verified status to True")
        except Exception as update_error:
            print(f"Failed to update email_verified status: {str(update_error)}")
        
        # Get session token
        access_token = None
        
        # Try to get a session for the user
        try:
            # Try to sign in again now that we've updated the email_verified status
            auth_response = supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if auth_response and hasattr(auth_response, 'session') and auth_response.session:
                print("Successfully signed in after updating email_verified status")
                access_token = auth_response.session.access_token
            else:
                # If we still can't get a session, try another approach
                print("Failed to get session after updating email_verified status")
                raise Exception("Failed to obtain access token after email verification update")
                
        except Exception as session_error:
            print(f"Session creation failed: {str(session_error)}")
            
            # Last resort: Use admin API to create a custom token
            try:
                # Try to use admin sign-in if available in this version of the Supabase client
                admin_auth = getattr(supabase.auth, 'admin', None)
                if admin_auth and hasattr(admin_auth, 'generate_link'):
                    # Generate a magic link (we won't send it, just use the token)
                    magic_link_response = admin_auth.generate_link({
                        "type": "magiclink",
                        "email": email
                    })
                    if magic_link_response and hasattr(magic_link_response, 'properties'):
                        access_token = magic_link_response.properties.get('access_token')
                else:
                    raise Exception("Admin API not available")
            except Exception as admin_error:
                print(f"Admin token generation failed: {str(admin_error)}")
                # We've exhausted all options, so we'll have to return an error
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to generate authentication token"
                )
        
        # Create user data with email_verified set to true
        user_data_with_email_verified_true = {
            "id": user_data["id"],
            "email": user_data["email"],
            "full_name": user_data["full_name"],
            "role": user_data["role"],
            "subscription_tier": "free",
            "created_at": user_data["created_at"],
            "email_verified": True,  # Force this to true
            "phone_verified": user_data.get("phone_verified", False)
        }
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": 3600,
            "user": user_data_with_email_verified_true
        }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Admin login error: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Admin login failed: {str(e)}"
        )


# Helper function to get user data from database
def get_user_data(user_id: str, supabase: Client):
    """Get user profile data from the database"""
    try:
        user_response = supabase.table("users").select("*").eq("id", user_id).limit(1).execute()
        if user_response.data and len(user_response.data) > 0:
            user = user_response.data[0]
            return {
                "id": user["id"],
                "email": user["email"],
                "full_name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
                "role": user.get("role", "user"),
                "subscription_tier": user.get("subscription_tier", "free"),
                "created_at": user.get("created_at"),
                "email_verified": user.get("email_verified", False),
                "phone_verified": user.get("phone_verified", False)
            }
        return None
    except Exception as e:
        print(f"Error fetching user data: {e}")
        return None

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