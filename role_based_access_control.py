import os
import json
import logging
from typing import Dict, Any, Optional, List, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('role_based_access_control')

class RoleBasedAccessControl:
    """
    Role-based access control system for Lex Assist.
    """
    
    def __init__(self):
        """
        Initialize the RBAC system.
        """
        # Define roles and their hierarchy
        self.roles = {
            'super_admin': {
                'level': 3,
                'description': 'Full access to all features and settings'
            },
            'admin': {
                'level': 2,
                'description': 'Limited administrative access'
            },
            'user': {
                'level': 1,
                'description': 'Standard user access'
            }
        }
        
        # Define permissions for each role
        self.role_permissions = {
            'super_admin': [
                'manage_all_users',
                'manage_admins',
                'assign_roles',
                'manage_subscriptions',
                'configure_system',
                'view_analytics',
                'manage_currencies',
                'manage_api_keys',
                'access_all_features'
            ],
            'admin': [
                'manage_regular_users',
                'view_basic_analytics',
                'manage_content'
            ],
            'user': [
                'manage_own_profile',
                'access_tier_features'
            ]
        }
        
        # Define subscription tiers and their features
        self.subscription_tiers = {
            'free': {
                'max_searches_per_day': 10,
                'max_law_sections': 5,
                'max_case_histories': 5,
                'document_formats': ['pdf'],
                'case_file_types': [],
                'sharing_enabled': False,
                'price': 0,
                'currency': '₹'
            },
            'pro': {
                'max_searches_per_day': 50,
                'max_law_sections': 20,
                'max_case_histories': 20,
                'document_formats': ['pdf', 'docx', 'txt'],
                'case_file_types': ['petition', 'reply'],
                'sharing_enabled': True,
                'price': 499,
                'currency': '₹'
            },
            'enterprise': {
                'max_searches_per_day': float('inf'),  # Unlimited
                'max_law_sections': float('inf'),  # Unlimited
                'max_case_histories': float('inf'),  # Unlimited
                'document_formats': ['pdf', 'docx', 'txt'],
                'case_file_types': ['petition', 'reply', 'rejoinder', 'affidavit', 'written_statement', 'legal_notice'],
                'sharing_enabled': True,
                'price': 4999,
                'currency': '₹'
            }
        }
    
    def get_user_role(self, user_id: str) -> str:
        """
        Get the role of a user.
        
        Args:
            user_id: User's ID
            
        Returns:
            User's role
        """
        # In a real implementation, this would query the database
        # For now, we'll return a default role
        return 'user'
    
    def get_user_permissions(self, user_id: str) -> List[str]:
        """
        Get the permissions of a user.
        
        Args:
            user_id: User's ID
            
        Returns:
            List of permissions
        """
        role = self.get_user_role(user_id)
        return self.role_permissions.get(role, [])
    
    def has_permission(self, user_id: str, permission: str) -> bool:
        """
        Check if a user has a specific permission.
        
        Args:
            user_id: User's ID
            permission: Permission to check
            
        Returns:
            True if the user has the permission, False otherwise
        """
        permissions = self.get_user_permissions(user_id)
        return permission in permissions
    
    def get_user_subscription(self, user_id: str) -> Dict[str, Any]:
        """
        Get the subscription of a user.
        
        Args:
            user_id: User's ID
            
        Returns:
            User's subscription details
        """
        # In a real implementation, this would query the database
        # For now, we'll return a default subscription
        return {
            'tier': 'free',
            'status': 'active',
            'start_date': '2025-05-01T00:00:00Z',
            'end_date': None
        }
    
    def get_tier_limits(self, tier: str) -> Dict[str, Any]:
        """
        Get the limits for a subscription tier.
        
        Args:
            tier: Subscription tier
            
        Returns:
            Tier limits
        """
        return self.subscription_tiers.get(tier, self.subscription_tiers['free'])
    
    def can_access_feature(self, user_id: str, feature: str) -> bool:
        """
        Check if a user can access a specific feature based on their subscription tier.
        
        Args:
            user_id: User's ID
            feature: Feature to check
            
        Returns:
            True if the user can access the feature, False otherwise
        """
        subscription = self.get_user_subscription(user_id)
        tier = subscription.get('tier', 'free')
        tier_limits = self.get_tier_limits(tier)
        
        if feature == 'pdf_download':
            return True  # Available on all tiers
        elif feature in ['docx_download', 'txt_download', 'sharing']:
            return tier in ['pro', 'enterprise']
        elif feature == 'basic_case_file_drafting':
            return tier in ['pro', 'enterprise'] and len(tier_limits['case_file_types']) > 0
        elif feature == 'advanced_case_file_drafting':
            return tier == 'enterprise'
        else:
            return False
    
    def get_available_document_formats(self, user_id: str) -> List[str]:
        """
        Get the document formats available to a user.
        
        Args:
            user_id: User's ID
            
        Returns:
            List of available document formats
        """
        subscription = self.get_user_subscription(user_id)
        tier = subscription.get('tier', 'free')
        tier_limits = self.get_tier_limits(tier)
        return tier_limits.get('document_formats', ['pdf'])
    
    def get_available_case_file_types(self, user_id: str) -> List[str]:
        """
        Get the case file types available to a user.
        
        Args:
            user_id: User's ID
            
        Returns:
            List of available case file types
        """
        subscription = self.get_user_subscription(user_id)
        tier = subscription.get('tier', 'free')
        tier_limits = self.get_tier_limits(tier)
        return tier_limits.get('case_file_types', [])
    
    def get_search_limit(self, user_id: str) -> Union[int, float]:
        """
        Get the search limit for a user.
        
        Args:
            user_id: User's ID
            
        Returns:
            Search limit
        """
        subscription = self.get_user_subscription(user_id)
        tier = subscription.get('tier', 'free')
        tier_limits = self.get_tier_limits(tier)
        return tier_limits.get('max_searches_per_day', 10)
    
    def get_law_section_limit(self, user_id: str) -> Union[int, float]:
        """
        Get the law section limit for a user.
        
        Args:
            user_id: User's ID
            
        Returns:
            Law section limit
        """
        subscription = self.get_user_subscription(user_id)
        tier = subscription.get('tier', 'free')
        tier_limits = self.get_tier_limits(tier)
        return tier_limits.get('max_law_sections', 5)
    
    def get_case_history_limit(self, user_id: str) -> Union[int, float]:
        """
        Get the case history limit for a user.
        
        Args:
            user_id: User's ID
            
        Returns:
            Case history limit
        """
        subscription = self.get_user_subscription(user_id)
        tier = subscription.get('tier', 'free')
        tier_limits = self.get_tier_limits(tier)
        return tier_limits.get('max_case_histories', 5)
    
    def is_sharing_enabled(self, user_id: str) -> bool:
        """
        Check if sharing is enabled for a user.
        
        Args:
            user_id: User's ID
            
        Returns:
            True if sharing is enabled, False otherwise
        """
        subscription = self.get_user_subscription(user_id)
        tier = subscription.get('tier', 'free')
        tier_limits = self.get_tier_limits(tier)
        return tier_limits.get('sharing_enabled', False)
    
    def apply_tier_limits(self, user_id: str, results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Apply subscription tier limits to analysis results.
        
        Args:
            user_id: User's ID
            results: Analysis results
            
        Returns:
            Limited analysis results
        """
        law_section_limit = self.get_law_section_limit(user_id)
        case_history_limit = self.get_case_history_limit(user_id)
        
        if results.get('lawSections') and len(results['lawSections']) > law_section_limit:
            results['lawSections'] = results['lawSections'][:int(law_section_limit)]
            results['limitedLawSections'] = True
        
        if results.get('caseHistories') and len(results['caseHistories']) > case_history_limit:
            results['caseHistories'] = results['caseHistories'][:int(case_history_limit)]
            results['limitedCaseHistories'] = True
        
        return results
    
    def track_usage(self, user_id: str, action_type: str, action_details: Dict[str, Any] = None) -> bool:
        """
        Track user usage.
        
        Args:
            user_id: User's ID
            action_type: Type of action
            action_details: Details of the action
            
        Returns:
            True if the action is allowed, False otherwise
        """
        # In a real implementation, this would check current usage against limits
        # and record the action in the database
        
        if action_type == 'search':
            search_limit = self.get_search_limit(user_id)
            # Check current search count for the day
            current_searches = 0  # This would be fetched from the database
            
            if current_searches >= search_limit:
                return False
        
        # Record the action
        # This would be stored in the database
        
        return True
    
    def get_subscription_plans(self) -> List[Dict[str, Any]]:
        """
        Get all subscription plans.
        
        Returns:
            List of subscription plans
        """
        plans = []
        
        for tier, details in self.subscription_tiers.items():
            plans.append({
                'id': tier,
                'name': tier.capitalize(),
                'price': details['price'],
                'currency': details['currency'],
                'features': self._get_tier_features(tier)
            })
        
        return plans
    
    def _get_tier_features(self, tier: str) -> List[str]:
        """
        Get the features for a subscription tier.
        
        Args:
            tier: Subscription tier
            
        Returns:
            List of features
        """
        tier_limits = self.get_tier_limits(tier)
        
        features = []
        
        if tier == 'free':
            features = [
                'Basic case brief analysis',
                f"Limited law section results ({tier_limits['max_law_sections']})",
                f"Limited case history results ({tier_limits['max_case_histories']})",
                'Basic document generation (PDF only)',
                f"Limited searches per day ({tier_limits['max_searches_per_day']})"
            ]
        elif tier == 'pro':
            features = [
                'Advanced case brief analysis',
                f"Comprehensive law section results ({tier_limits['max_law_sections']})",
                f"Comprehensive case history results ({tier_limits['max_case_histories']})",
                'Document generation in all formats',
                'Basic case file drafting',
                'Email and WhatsApp sharing',
                f"Increased searches per day ({tier_limits['max_searches_per_day']})",
                'Priority processing'
            ]
        elif tier == 'enterprise':
            features = [
                'All Pro tier features',
                'Unlimited law section results',
                'Unlimited case history results',
                'Advanced case file drafting',
                'Custom document templates',
                'API access for integration',
                'Unlimited searches',
                'Dedicated support',
                'Team collaboration features'
            ]
        
        return features
    
    def assign_role(self, admin_user_id: str, target_user_id: str, role: str) -> bool:
        """
        Assign a role to a user.
        
        Args:
            admin_user_id: ID of the admin user making the change
            target_user_id: ID of the user to assign the role to
            role: Role to assign
            
        Returns:
            True if the role was assigned, False otherwise
        """
        # Check if the admin user has permission to assign roles
        if not self.has_permission(admin_user_id, 'assign_roles'):
            return False
        
        # Check if the role is valid
        if role not in self.roles:
            return False
        
        # Check if the admin user has permission to assign this specific role
        admin_role = self.get_user_role(admin_user_id)
        admin_level = self.roles[admin_role]['level']
        target_level = self.roles[role]['level']
        
        # Admin can only assign roles with lower level than their own
        if target_level >= admin_level:
            return False
        
        # In a real implementation, this would update the database
        # For now, we'll just return success
        return True
    
    def update_subscription(self, admin_user_id: str, target_user_id: str, tier: str) -> bool:
        """
        Update a user's subscription.
        
        Args:
            admin_user_id: ID of the admin user making the change
            target_user_id: ID of the user to update the subscription for
            tier: Subscription tier to assign
            
        Returns:
            True if the subscription was updated, False otherwise
        """
        # Check if the admin user has permission to manage subscriptions
        if not self.has_permission(admin_user_id, 'manage_subscriptions'):
            return False
        
        # Check if the tier is valid
        if tier not in self.subscription_tiers:
            return False
        
        # In a real implementation, this would update the database
        # For now, we'll just return success
        return True
    
    def get_system_settings(self, user_id: str) -> Dict[str, Any]:
        """
        Get system settings.
        
        Args:
            user_id: User's ID
            
        Returns:
            System settings
        """
        # Check if the user has permission to configure the system
        if not self.has_permission(user_id, 'configure_system'):
            return {}
        
        # In a real implementation, this would fetch settings from the database
        # For now, we'll return default settings
        return {
            'application_name': 'Lex Assist',
            'support_email': 'support@lexassist.com',
            'default_currency': 'INR',
            'available_currencies': ['INR', 'USD', 'EUR', 'GBP'],
            'api_keys': {
                'indian_kanoon': 'd053cb3e0082a68b58def9f16e1b43c7a497faf4'
            }
        }
    
    def update_system_settings(self, user_id: str, settings: Dict[str, Any]) -> bool:
        """
        Update system settings.
        
        Args:
            user_id: User's ID
            settings: New settings
            
        Returns:
            True if the settings were updated, False otherwise
        """
        # Check if the user has permission to configure the system
        if not self.has_permission(user_id, 'configure_system'):
            return False
        
        # In a real implementation, this would update the database
        # For now, we'll just return success
        return True
    
    def add_currency(self, user_id: str, currency_code: str, currency_symbol: str) -> bool:
        """
        Add a new currency.
        
        Args:
            user_id: User's ID
            currency_code: Currency code (e.g., USD)
            currency_symbol: Currency symbol (e.g., $)
            
        Returns:
            True if the currency was added, False otherwise
        """
        # Check if the user has permission to manage currencies
        if not self.has_permission(user_id, 'manage_currencies'):
            return False
        
        # In a real implementation, this would update the database
        # For now, we'll just return success
        return True
    
    def get_analytics_data(self, user_id: str, data_type: str) -> Dict[str, Any]:
        """
        Get analytics data.
        
        Args:
            user_id: User's ID
            data_type: Type of data to retrieve
            
        Returns:
            Analytics data
        """
        # Check if the user has permission to view analytics
        if not self.has_permission(user_id, 'view_analytics') and not self.has_permission(user_id, 'view_basic_analytics'):
            return {}
        
        # For basic analytics permission, limit the data types
        if self.has_permission(user_id, 'view_basic_analytics') and not self.has_permission(user_id, 'view_analytics'):
            if data_type not in ['user_count', 'brief_count', 'case_file_count']:
                return {}
        
        # In a real implementation, this would fetch data from the database
        # For now, we'll return mock data
        if data_type == 'user_count':
            return {
                'total': 227,
                'active': 185,
                'new_last_30_days': 52
            }
        elif data_type == 'subscription_distribution':
            return {
                'free': 125,
                'pro': 78,
                'enterprise': 24
            }
        elif data_type == 'revenue':
            return {
                'current_month': 158743,
                'previous_month': 142567,
                'growth_percentage': 11.3
            }
        elif data_type == 'brief_count':
            return {
                'total': 1245,
                'last_30_days': 412
            }
        elif data_type == 'case_file_count':
            return {
                'total': 387,
                'last_30_days': 128
            }
        else:
            return {}
