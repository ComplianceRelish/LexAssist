import difflib
import json
from datetime import datetime
import uuid

class VersionTracker:
    """
    Version Tracking System for legal documents
    Keeps track of document versions, changes, and provides comparison capabilities
    """
    def __init__(self, supabase_client, neo4j_client):
        self.supabase = supabase_client
        self.neo4j = neo4j_client
        
    async def create_version(self, document_id, new_version_data):
        """
        Create a new version of a document
        
        Args:
            document_id: Original document ID
            new_version_data: New version data
            
        Returns:
            Created version object
        """
        try:
            # Get current document
            current_doc = await self.supabase.table('documents').select('*').eq('id', document_id).single().execute()
            
            if not current_doc.data:
                raise ValueError(f"Document with ID {document_id} not found")
            
            current_doc = current_doc.data
            
            # Generate version number
            versions = await self.supabase.table('document_versions') \
                .select('version_number') \
                .eq('document_id', document_id) \
                .order('version_number', desc=True) \
                .limit(1) \
                .execute()
                
            next_version = versions.data[0]['version_number'] + 1 if versions.data else 1
            
            # Calculate content differences
            content_diff = None
            if current_doc.get('content') and new_version_data.get('content'):
                diff = difflib.unified_diff(
                    current_doc['content'].splitlines(),
                    new_version_data['content'].splitlines(),
                    lineterm=''
                )
                content_diff = '\n'.join(diff)
            
            # Create new version record
            version_data = {
                'id': str(uuid.uuid4()),
                'document_id': document_id,
                'version_number': next_version,
                'content': new_version_data.get('content', current_doc.get('content')),
                'content_diff': content_diff,
                'title': new_version_data.get('title', current_doc.get('title')),
                'changes_description': new_version_data.get('changes_description', ''),
                'effective_date': new_version_data.get('effective_date', datetime.now().isoformat()),
                'status': new_version_data.get('status', 'current'),
                'previous_version_id': current_doc.get('current_version_id'),
                'created_at': datetime.now().isoformat()
            }
            
            # Store version in Supabase
            version_result = await self.supabase.table('document_versions') \
                .insert(version_data) \
                .execute()
            
            version = version_result.data[0]
            
            # Update document with new current version
            await self.supabase.table('documents') \
                .update({'current_version_id': version['id'], 'updated_at': datetime.now().isoformat()}) \
                .eq('id', document_id) \
                .execute()
            
            # Update Neo4j
            query = """
            MATCH (d:Document {id: $document_id})
            CREATE (v:DocumentVersion {
                id: $version_id,
                document_id: $document_id,
                version_number: $version_number,
                effective_date: $effective_date,
                status: $status,
                created_at: $created_at
            })
            CREATE (d)-[r:HAS_VERSION {current: true}]->(v)
            WITH d, v
            OPTIONAL MATCH (d)-[oldRel:HAS_VERSION {current: true}]->(oldVersion:DocumentVersion)
            WHERE oldVersion.id <> $version_id
            SET oldRel.current = false
            RETURN d, v
            """
            
            await self.neo4j.execute_query(query, {
                'document_id': document_id,
                'version_id': version['id'],
                'version_number': version['version_number'],
                'effective_date': version['effective_date'],
                'status': version['status'],
                'created_at': version['created_at']
            })
            
            return version
        
        except Exception as e:
            print(f"Error creating document version: {e}")
            raise
    
    async def get_version_history(self, document_id, options=None):
        """
        Get version history for a document
        
        Args:
            document_id: Document ID
            options: Query options (limit, include_content)
            
        Returns:
            Version history list
        """
        if options is None:
            options = {}
            
        limit = options.get('limit', 10)
        include_content = options.get('include_content', False)
        
        try:
            # Build query
            query = self.supabase.table('document_versions')
            
            if not include_content:
                query = query.select('id, document_id, version_number, title, changes_description, effective_date, status, created_at')
            else:
                query = query.select('*')
            
            # Execute query    
            result = await query \
                .eq('document_id', document_id) \
                .order('version_number', desc=True) \
                .limit(limit) \
                .execute()
                
            return result.data
            
        except Exception as e:
            print(f"Error getting document version history: {e}")
            raise
    
    async def get_document_version(self, document_id, version_ref='current'):
        """
        Get a specific version of a document
        
        Args:
            document_id: Document ID
            version_ref: Version number or 'current'
            
        Returns:
            Document version object
        """
        try:
            if version_ref == 'current':
                # Get current document to find current version ID
                doc_result = await self.supabase.table('documents') \
                    .select('current_version_id') \
                    .eq('id', document_id) \
                    .single() \
                    .execute()
                
                if not doc_result.data or not doc_result.data.get('current_version_id'):
                    raise ValueError(f"No current version found for document {document_id}")
                
                # Get current version
                version_result = await self.supabase.table('document_versions') \
                    .select('*') \
                    .eq('id', doc_result.data['current_version_id']) \
                    .single() \
                    .execute()
                    
                return version_result.data
                
            else:
                # Get specific version by number
                version_result = await self.supabase.table('document_versions') \
                    .select('*') \
                    .eq('document_id', document_id) \
                    .eq('version_number', version_ref) \
                    .single() \
                    .execute()
                    
                return version_result.data
                
        except Exception as e:
            print(f"Error getting document version: {e}")
            raise
    
    async def compare_versions(self, document_id, version1, version2):
        """
        Compare two versions of a document
        
        Args:
            document_id: Document ID
            version1: First version number
            version2: Second version number
            
        Returns:
            Comparison result with diffs
        """
        try:
            # Get both versions
            versions_result = await self.supabase.table('document_versions') \
                .select('*') \
                .eq('document_id', document_id) \
                .in_('version_number', [version1, version2]) \
                .execute()
            
            versions = versions_result.data
            if len(versions) != 2:
                raise ValueError(f"Could not find both versions {version1} and {version2} for document {document_id}")
            
            # Sort versions
            versions.sort(key=lambda v: v['version_number'])
            older_version, newer_version = versions
            
            # Generate diffs
            content_diff = list(difflib.unified_diff(
                (older_version.get('content') or '').splitlines(),
                (newer_version.get('content') or '').splitlines(),
                fromfile=f"v{older_version['version_number']}",
                tofile=f"v{newer_version['version_number']}",
                lineterm=''
            ))
            
            # For title diff we'll just show both titles for simplicity
            title_diff = {
                'older': older_version.get('title', ''),
                'newer': newer_version.get('title', '')
            }
            
            # Create comparison summary
            summary = {
                'document_id': document_id,
                'older_version': older_version['version_number'],
                'newer_version': newer_version['version_number'],
                'older_date': older_version['effective_date'],
                'newer_date': newer_version['effective_date'],
                'has_content_changes': len(content_diff) > 0,
                'has_title_changes': title_diff['older'] != title_diff['newer'],
                'content_diff': content_diff,
                'title_diff': title_diff,
                'metadata_changes': self._get_metadata_changes(older_version, newer_version)
            }
            
            return summary
            
        except Exception as e:
            print(f"Error comparing document versions: {e}")
            raise
    
    def _get_metadata_changes(self, older_version, newer_version):
        """
        Get changes in metadata between versions
        
        Args:
            older_version: Older version object
            newer_version: Newer version object
            
        Returns:
            Dictionary of metadata changes
        """
        metadata_fields = [
            'title', 'status', 'effective_date', 'changes_description'
        ]
        
        changes = {}
        
        for field in metadata_fields:
            old_value = older_version.get(field)
            new_value = newer_version.get(field)
            
            if old_value != new_value:
                changes[field] = {
                    'old': old_value,
                    'new': new_value
                }
                
        return changes
    
    async def track_legal_change(self, legal_change_data):
        """
        Track a specific legal change (like amendment to a law)
        
        Args:
            legal_change_data: Data about the legal change
            
        Returns:
            Created legal change record
        """
        try:
            change_id = str(uuid.uuid4())
            
            # Prepare change record
            change_record = {
                'id': change_id,
                'document_id': legal_change_data['document_id'],
                'change_type': legal_change_data['change_type'],  # amendment, repeal, introduction
                'change_description': legal_change_data['change_description'],
                'effective_date': legal_change_data.get('effective_date', datetime.now().isoformat()),
                'authority': legal_change_data.get('authority', None),
                'affected_sections': json.dumps(legal_change_data.get('affected_sections', [])),
                'related_changes': json.dumps(legal_change_data.get('related_changes', [])),
                'created_at': datetime.now().isoformat()
            }
            
            # Store in Supabase
            result = await self.supabase.table('legal_changes') \
                .insert(change_record) \
                .execute()
                
            change = result.data[0]
            
            # Store in Neo4j
            query = """
            MATCH (d:Document {id: $document_id})
            CREATE (c:LegalChange {
                id: $change_id,
                change_type: $change_type,
                change_description: $change_description,
                effective_date: $effective_date,
                created_at: $created_at
            })
            CREATE (d)-[r:HAS_CHANGE]->(c)
            RETURN d, c
            """
            
            await self.neo4j.execute_query(query, {
                'document_id': change_record['document_id'],
                'change_id': change_id,
                'change_type': change_record['change_type'],
                'change_description': change_record['change_description'],
                'effective_date': change_record['effective_date'],
                'created_at': change_record['created_at']
            })
            
            return change
            
        except Exception as e:
            print(f"Error tracking legal change: {e}")
            raise
