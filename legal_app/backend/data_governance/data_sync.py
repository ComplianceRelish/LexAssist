import os
import json
import hashlib
from datetime import datetime
import logging
import asyncio
from typing import Dict, List, Any, Optional, Set, Tuple

logger = logging.getLogger(__name__)

class ChangeDetector:
    """
    Change Detection system for legal documents and data
    """
    def __init__(self, supabase_client, cache_dir: Optional[str] = None):
        """
        Initialize Change Detector
        
        Args:
            supabase_client: Supabase client for database access
            cache_dir: Directory to store cache files
        """
        self.supabase = supabase_client
        self.cache_dir = cache_dir or os.path.join(os.path.dirname(__file__), "cache")
        
        # Ensure cache directory exists
        os.makedirs(self.cache_dir, exist_ok=True)
        
        # Cache for document hashes
        self.document_hashes = {}
        self._load_document_hashes()
    
    def _load_document_hashes(self):
        """
        Load document hashes from cache
        """
        hash_file = os.path.join(self.cache_dir, "document_hashes.json")
        if os.path.exists(hash_file):
            try:
                with open(hash_file, 'r') as f:
                    self.document_hashes = json.load(f)
            except Exception as e:
                logger.error(f"Error loading document hashes: {e}")
    
    def _save_document_hashes(self):
        """
        Save document hashes to cache
        """
        hash_file = os.path.join(self.cache_dir, "document_hashes.json")
        try:
            with open(hash_file, 'w') as f:
                json.dump(self.document_hashes, f)
        except Exception as e:
            logger.error(f"Error saving document hashes: {e}")
    
    def calculate_hash(self, content: str) -> str:
        """
        Calculate hash of content
        
        Args:
            content: Content to hash
            
        Returns:
            Hash string
        """
        return hashlib.sha256(content.encode('utf-8')).hexdigest()
    
    async def detect_document_changes(self, document_type: str = "all", since_timestamp: Optional[str] = None) -> Dict[str, Any]:
        """
        Detect changes in documents
        
        Args:
            document_type: Type of documents to check (case_law, statute, etc.)
            since_timestamp: Only check documents updated since this timestamp
            
        Returns:
            Dictionary of changes detected
        """
        try:
            # Build query
            tables_to_check = []
            if document_type == "all":
                tables_to_check = ["cases", "statutes", "regulations", "constitution_provisions"]
            elif document_type in ["case_law", "cases"]:
                tables_to_check = ["cases"]
            elif document_type in ["statute", "statutes"]:
                tables_to_check = ["statutes"]
            elif document_type in ["regulation", "regulations"]:
                tables_to_check = ["regulations"]
            elif document_type in ["constitution", "constitution_provisions"]:
                tables_to_check = ["constitution_provisions"]
            else:
                return {"error": f"Unknown document type: {document_type}"}
            
            changes = {
                "added": [],
                "modified": [],
                "total_checked": 0,
                "timestamp": datetime.now().isoformat()
            }
            
            # Check each table
            for table in tables_to_check:
                # Build query
                query = self.supabase.table(table).select('id, title, content, updated_at')
                
                if since_timestamp:
                    query = query.gte('updated_at', since_timestamp)
                
                result = await query.execute()
                documents = result.data
                
                changes["total_checked"] += len(documents)
                
                # Check each document for changes
                for doc in documents:
                    doc_id = doc["id"]
                    content = doc.get("content", "")
                    
                    if not content:
                        continue
                    
                    # Calculate hash
                    current_hash = self.calculate_hash(content)
                    
                    # Check if document is new or modified
                    table_key = f"{table}:{doc_id}"
                    if table_key not in self.document_hashes:
                        # New document
                        changes["added"].append({
                            "id": doc_id,
                            "type": table,
                            "title": doc.get("title"),
                            "updated_at": doc.get("updated_at")
                        })
                        self.document_hashes[table_key] = {
                            "hash": current_hash,
                            "updated_at": doc.get("updated_at")
                        }
                    elif self.document_hashes[table_key]["hash"] != current_hash:
                        # Modified document
                        changes["modified"].append({
                            "id": doc_id,
                            "type": table,
                            "title": doc.get("title"),
                            "updated_at": doc.get("updated_at"),
                            "previous_update": self.document_hashes[table_key]["updated_at"]
                        })
                        self.document_hashes[table_key] = {
                            "hash": current_hash,
                            "updated_at": doc.get("updated_at")
                        }
            
            # Save updated hashes
            self._save_document_hashes()
            
            return changes
            
        except Exception as e:
            logger.error(f"Error detecting document changes: {e}")
            return {"error": str(e)}
    
    async def compare_document_versions(self, document_id: str, document_type: str,
                                       version1: str, version2: str) -> Dict[str, Any]:
        """
        Compare two versions of a document
        
        Args:
            document_id: Document ID
            document_type: Document type
            version1: First version ID
            version2: Second version ID
            
        Returns:
            Comparison results
        """
        try:
            # Get both versions
            table_name = f"{document_type}_versions"
            result = await self.supabase.table(table_name) \
                .select('*') \
                .eq('document_id', document_id) \
                .in_('id', [version1, version2]) \
                .execute()
                
            versions = result.data
            
            if len(versions) != 2:
                return {"error": f"Could not find both versions for document {document_id}"}
                
            # Sort versions
            versions.sort(key=lambda v: v["version_number"])
            older_version, newer_version = versions
            
            # Calculate diffs
            import difflib
            
            content_diff = list(difflib.unified_diff(
                (older_version.get("content") or "").splitlines(),
                (newer_version.get("content") or "").splitlines(),
                fromfile=f"v{older_version['version_number']}",
                tofile=f"v{newer_version['version_number']}",
                lineterm=''
            ))
            
            # Extract changes
            added_lines = []
            removed_lines = []
            for line in content_diff:
                if line.startswith('+') and not line.startswith('+++'):
                    added_lines.append(line[1:])
                elif line.startswith('-') and not line.startswith('---'):
                    removed_lines.append(line[1:])
            
            return {
                "document_id": document_id,
                "document_type": document_type,
                "older_version": {
                    "id": older_version["id"],
                    "version_number": older_version["version_number"],
                    "effective_date": older_version.get("effective_date")
                },
                "newer_version": {
                    "id": newer_version["id"],
                    "version_number": newer_version["version_number"],
                    "effective_date": newer_version.get("effective_date")
                },
                "changes_summary": {
                    "added_lines_count": len(added_lines),
                    "removed_lines_count": len(removed_lines),
                    "diff_lines": len(content_diff),
                    "has_changes": len(added_lines) > 0 or len(removed_lines) > 0
                },
                "added_lines": added_lines,
                "removed_lines": removed_lines,
                "full_diff": content_diff
            }
            
        except Exception as e:
            logger.error(f"Error comparing document versions: {e}")
            return {"error": str(e)}