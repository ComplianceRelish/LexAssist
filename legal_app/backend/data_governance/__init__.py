"""
Data Governance System for LexAssist

This package provides comprehensive data governance capabilities including:
1. Source Verification - Validating legal document sources and their authority levels
2. Authority Hierarchy Management - Managing and comparing document authority levels
3. Version Tracking - Tracking changes to legal documents over time
4. Audit System - Maintaining transparency with complete audit trails
"""

from .source_verification import SourceVerificationSystem
from .authority_hierarchy import AuthorityHierarchyManager
from .version_tracker import VersionTracker
from .audit_system import AuditSystem

__all__ = [
    'SourceVerificationSystem',
    'AuthorityHierarchyManager',
    'VersionTracker',
    'AuditSystem'
]
