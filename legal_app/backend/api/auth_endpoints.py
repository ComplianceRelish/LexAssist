"""
Authentication and User Management API Endpoints for Lex Assist
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timedelta
import os
import logging
from supabase import create_client, Client

from .supabase_client import get_supabase_client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

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

# Pydantic models with legal system integration
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

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    subscription_tier: str
    created_at: datetime
    email_verified: Optional[bool] = False
    phone_verified: Optional[bool] = False
    # Legal system information
    country: Optional[str] = None
    legal_system: Optional[str] = None
    jurisdiction_type: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: UserResponse

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# Registration endpoint with legal system integration
@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate, 
    supabase: Client = Depends(get_supabase_client)
):
    try:
        logger.info(f"Registering user: {user_data.email}")
        logger.info(f"Country: {user_data.country}, Legal System: {user_data.legal_system}")
        
        # Create user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "full_name": user_data.full_name,
                    "country": user_data.country,
                    "user_type": user_data.userType,
                    "legal_system": user_data.legal_system,
                    "jurisdiction_type": user_data.jurisdiction_type
                }
            }
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=400,
                detail="Registration failed"
            )
        
        user = auth_response.user
        user_id = str(user.id)
        
        # Create enhanced user record with legal system data
        user_record = {
            "id": user_id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "first_name": user_data.firstName,
            "last_name": user_data.lastName,
            "phone": user_data.phone,
            "country": user_data.country,
            "country_code": user_data.countryCode,
            "legal_system": user_data.legal_system,
            "jurisdiction_type": user_data.jurisdiction_type,
            "role": "lawyer" if user_data.userType == "lawyer" else "user",
            "subscription_tier": "free",
            "email_verified": False,
            "phone_verified": False,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Add Indian legal system data if user is from India
        if user_data.country == 'IN':
            user_record["indian_legal_sources"] = IndianLegalSystemMixin.get_indian_legal_sources()
            user_record["court_hierarchy"] = user_data.court_hierarchy
            logger.info(f"✅ Added enhanced Indian legal system data for user: {user_data.email}")
        
        # Insert into database
        try:
            supabase.table("users").insert(user_record).execute()
            logger.info(f"User record created successfully: {user_data.email}")
        except Exception as db_error:
            logger.warning(f"Database insert failed: {db_error}")
            # Continue anyway since auth user was created
        
        return {
            "message": "Registration successful! Please check your email for verification.",
            "user_id": user_id,
            "email": user_data.email,
            "legal_system": user_data.legal_system,
            "jurisdiction": user_data.jurisdiction_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Registration failed: {str(e)}"
        )

# Login endpoint with legal system data
@router.post("/login", response_model=TokenResponse)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Authenticate a user and return access token with legal system information
    """
    try:
        logger.info(f"Login attempt for user: {form_data.username}")
        
        # Authenticate with Supabase
        auth_response = supabase.auth.sign_in_with_password({
            "email": form_data.username,
            "password": form_data.password
        })
        
        if not auth_response.user or not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = auth_response.user
        session = auth_response.session
        user_id = str(user.id)
        
        logger.info(f"Authentication successful for user: {user_id}")
        
        # Get user details from database with legal system data
        try:
            user_response = supabase.table("users").select(
                "id, email, full_name, first_name, last_name, role, subscription_tier, created_at, email_verified, phone_verified, country, legal_system, jurisdiction_type, indian_legal_sources, court_hierarchy"
            ).eq("id", user_id).single().execute()
            
            if user_response.data:
                user_data = user_response.data
                full_name = user_data.get("full_name") or f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip()
                
                # Log legal system info for debugging
                if user_data.get("legal_system"):
                    logger.info(f"User legal system: {user_data.get('legal_system')}")
                    logger.info(f"User jurisdiction: {user_data.get('jurisdiction_type')}")
                
            else:
                # Fallback to auth user data
                user_data = {
                    "id": user_id,
                    "email": user.email,
                    "role": "user",
                    "subscription_tier": "free",
                    "created_at": user.created_at,
                    "email_verified": False,
                    "phone_verified": False,
                    "country": "IN",  # Default
                    "legal_system": "plural",  # Default for India
                    "jurisdiction_type": "federal_union"  # Default for India
                }
                full_name = user.email  # Fallback
                
        except Exception as db_error:
            logger.warning(f"Database lookup failed: {db_error}")
            # Fallback to auth user data with defaults
            user_data = {
                "id": user_id,
                "email": user.email,
                "role": "user",
                "subscription_tier": "free",
                "created_at": user.created_at,
                "email_verified": False,
                "phone_verified": False,
                "country": "IN",  # Default
                "legal_system": "plural",  # Default for India
                "jurisdiction_type": "federal_union"  # Default for India
            }
            full_name = user.email  # Fallback
        
        return TokenResponse(
            access_token=session.access_token,
            token_type="bearer",
            expires_in=3600,
            user=UserResponse(
                id=user_data["id"],
                email=user_data["email"],
                full_name=full_name,
                role=user_data.get("role", "user"),
                subscription_tier=user_data.get("subscription_tier", "free"),
                created_at=user_data.get("created_at", datetime.utcnow()),
                email_verified=user_data.get("email_verified", False),
                phone_verified=user_data.get("phone_verified", False),
                country=user_data.get("country"),
                legal_system=user_data.get("legal_system"),
                jurisdiction_type=user_data.get("jurisdiction_type")
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

# Get user profile with legal system data
@router.get("/profile", response_model=UserResponse)
async def get_user_profile(
    request: Request,
    supabase: Client = Depends(get_supabase_client)
):
    """Get current user's profile with legal system information"""
    try:
        # Get token from Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No valid authorization token provided"
            )
        
        token = auth_header.split(" ")[1]
        
        # Get user from token
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        user_id = str(user_response.user.id)
        
        # Get user details from database with legal system data
        db_response = supabase.table("users").select(
            "id, email, full_name, first_name, last_name, role, subscription_tier, created_at, email_verified, phone_verified, country, legal_system, jurisdiction_type"
        ).eq("id", user_id).single().execute()
        
        if not db_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        user_data = db_response.data
        full_name = user_data.get("full_name") or f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip()
        
        return UserResponse(
            id=user_data["id"],
            email=user_data["email"],
            full_name=full_name,
            role=user_data.get("role", "user"),
            subscription_tier=user_data.get("subscription_tier", "free"),
            created_at=user_data.get("created_at", datetime.utcnow()),
            email_verified=user_data.get("email_verified", False),
            phone_verified=user_data.get("phone_verified", False),
            country=user_data.get("country"),
            legal_system=user_data.get("legal_system"),
            jurisdiction_type=user_data.get("jurisdiction_type")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get profile"
        )

# Legal system utility endpoints
@router.get("/legal-systems")
async def get_legal_systems():
    """Get available legal systems and their classifications"""
    return {
        "legal_systems": {
            "plural": "Multiple legal systems coexisting",
            "common_law": "Common law tradition",
            "civil_law": "Civil law tradition", 
            "mixed": "Mixed legal systems",
            "religious_law": "Religious law systems"
        },
        "countries": {
            "IN": {
                "legal_system": "plural",
                "jurisdiction": "federal_union",
                "description": "India - Constitutional, Common Law, Personal Laws, Customary Law"
            },
            "US": {
                "legal_system": "common_law",
                "jurisdiction": "federal_state",
                "description": "United States - Federal common law system"
            },
            "UK": {
                "legal_system": "common_law", 
                "jurisdiction": "unitary_devolved",
                "description": "United Kingdom - Common law with devolution"
            }
        }
    }

@router.get("/indian-legal-sources")
async def get_indian_legal_sources():
    """Get detailed Indian legal system sources"""
    return IndianLegalSystemMixin.get_indian_legal_sources()

@router.get("/indian-court-hierarchy")
async def get_indian_court_hierarchy():
    """Get detailed Indian court system hierarchy"""
    return IndianLegalSystemMixin.get_indian_court_hierarchy()

# Other standard auth endpoints
@router.post("/logout")
async def logout(supabase: Client = Depends(get_supabase_client)):
    """Log out the current user"""
    try:
        supabase.auth.sign_out()
        return {"message": "Logged out successfully"}
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return {"message": "Logout completed"}

@router.get("/health")
async def auth_health_check():
    """Check if auth endpoints are working"""
    return {
        "status": "healthy",
        "message": "Authentication service with legal system integration is running",
        "features": [
            "User registration with legal system classification",
            "Authentication with legal context",
            "Indian legal system support",
            "Multi-jurisdiction support"
        ],
        "endpoints": [
            "/api/auth/register",
            "/api/auth/login", 
            "/api/auth/profile",
            "/api/auth/legal-systems",
            "/api/auth/indian-legal-sources",
            "/api/auth/indian-court-hierarchy"
        ]
    }

@router.get("/test")
async def test_auth():
    """Test endpoint to verify auth router is working"""
    return {
        "message": "Auth endpoints with legal system integration are working!",
        "timestamp": datetime.utcnow().isoformat(),
        "legal_system_support": True,
        "indian_legal_system": True
    }