import json
from datetime import datetime
import uuid

class AuditSystem:
    """
    Audit System for transparency in legal document processing
    Tracks all operations performed on documents and provides audit trail
    """
    def __init__(self, supabase_client, neo4j_client=None):
        self.supabase = supabase_client
        self.neo4j = neo4j_client
    
    async def log_action(self, action_data):
        """
        Log an action in the audit trail
        
        Args:
            action_data: Data about the action performed
            
        Returns:
            Created audit record
        """
        try:
            # Generate ID for audit record
            action_id = str(uuid.uuid4())
            
            # Basic validation
            required_fields = ['action_type', 'entity_type', 'entity_id', 'user_id']
            for field in required_fields:
                if field not in action_data:
                    raise ValueError(f"Required field {field} missing in audit data")
            
            # Prepare audit record
            audit_record = {
                'id': action_id,
                'action_type': action_data['action_type'],
                'entity_type': action_data['entity_type'],
                'entity_id': action_data['entity_id'],
                'user_id': action_data['user_id'],
                'timestamp': datetime.now().isoformat(),
                'details': json.dumps(action_data.get('details', {})),
                'ip_address': action_data.get('ip_address'),
                'session_id': action_data.get('session_id'),
                'outcome': action_data.get('outcome', 'success'),
                'related_entities': json.dumps(action_data.get('related_entities', []))
            }
            
            # Store in Supabase
            result = await self.supabase.table('audit_logs') \
                .insert(audit_record) \
                .execute()
            
            audit_log = result.data[0]
            
            # Store in Neo4j if available
            if self.neo4j:
                query = """
                MATCH (u:User {id: $user_id})
                OPTIONAL MATCH (e) WHERE e.id = $entity_id
                CREATE (a:AuditLog {
                    id: $audit_id,
                    action_type: $action_type,
                    entity_type: $entity_type,
                    entity_id: $entity_id,
                    timestamp: $timestamp,
                    outcome: $outcome
                })
                CREATE (u)-[r:PERFORMED]->(a)
                WITH a, e
                WHERE e IS NOT NULL
                CREATE (a)-[r2:AFFECTS]->(e)
                RETURN a
                """
                
                await self.neo4j.execute_query(query, {
                    'audit_id': action_id,
                    'user_id': audit_record['user_id'],
                    'action_type': audit_record['action_type'],
                    'entity_type': audit_record['entity_type'],
                    'entity_id': audit_record['entity_id'],
                    'timestamp': audit_record['timestamp'],
                    'outcome': audit_record['outcome']
                })
            
            return audit_log
            
        except Exception as e:
            print(f"Error logging audit action: {e}")
            # Even if storing the audit log fails, we don't want to break the application
            # But we should log the error for monitoring
            return None
    
    async def get_entity_audit_trail(self, entity_type, entity_id, options=None):
        """
        Get audit trail for a specific entity
        
        Args:
            entity_type: Type of entity (document, user, etc.)
            entity_id: ID of entity
            options: Query options (limit, offset, etc.)
            
        Returns:
            List of audit records for the entity
        """
        if options is None:
            options = {}
            
        limit = options.get('limit', 50)
        offset = options.get('offset', 0)
        
        try:
            result = await self.supabase.table('audit_logs') \
                .select('*') \
                .eq('entity_type', entity_type) \
                .eq('entity_id', entity_id) \
                .order('timestamp', desc=True) \
                .limit(limit) \
                .offset(offset) \
                .execute()
                
            audit_logs = result.data
            
            # Parse JSON fields
            for log in audit_logs:
                if 'details' in log and log['details']:
                    log['details'] = json.loads(log['details'])
                if 'related_entities' in log and log['related_entities']:
                    log['related_entities'] = json.loads(log['related_entities'])
                    
            return audit_logs
            
        except Exception as e:
            print(f"Error getting entity audit trail: {e}")
            raise
    
    async def get_user_actions(self, user_id, options=None):
        """
        Get all actions performed by a specific user
        
        Args:
            user_id: User ID
            options: Query options (limit, offset, etc.)
            
        Returns:
            List of audit records for the user
        """
        if options is None:
            options = {}
            
        limit = options.get('limit', 50)
        offset = options.get('offset', 0)
        
        try:
            result = await self.supabase.table('audit_logs') \
                .select('*') \
                .eq('user_id', user_id) \
                .order('timestamp', desc=True) \
                .limit(limit) \
                .offset(offset) \
                .execute()
                
            audit_logs = result.data
            
            # Parse JSON fields
            for log in audit_logs:
                if 'details' in log and log['details']:
                    log['details'] = json.loads(log['details'])
                if 'related_entities' in log and log['related_entities']:
                    log['related_entities'] = json.loads(log['related_entities'])
                    
            return audit_logs
            
        except Exception as e:
            print(f"Error getting user actions: {e}")
            raise
    
    async def get_activity_report(self, filters=None, options=None):
        """
        Generate activity report based on audit logs
        
        Args:
            filters: Filters to apply to audit logs
            options: Report options
            
        Returns:
            Activity report data
        """
        if filters is None:
            filters = {}
        if options is None:
            options = {}
            
        try:
            # Build base query
            query = self.supabase.table('audit_logs').select('*')
            
            # Apply filters
            if 'start_date' in filters:
                query = query.gte('timestamp', filters['start_date'])
            if 'end_date' in filters:
                query = query.lte('timestamp', filters['end_date'])
            if 'action_type' in filters:
                query = query.eq('action_type', filters['action_type'])
            if 'entity_type' in filters:
                query = query.eq('entity_type', filters['entity_type'])
            if 'user_id' in filters:
                query = query.eq('user_id', filters['user_id'])
            if 'outcome' in filters:
                query = query.eq('outcome', filters['outcome'])
                
            # Order and limit
            query = query.order('timestamp', desc=True)
            if 'limit' in options:
                query = query.limit(options['limit'])
                
            result = await query.execute()
            audit_logs = result.data
            
            # Group by action type
            action_type_counts = {}
            for log in audit_logs:
                action_type = log['action_type']
                if action_type not in action_type_counts:
                    action_type_counts[action_type] = 0
                action_type_counts[action_type] += 1
                
            # Group by user
            user_action_counts = {}
            for log in audit_logs:
                user_id = log['user_id']
                if user_id not in user_action_counts:
                    user_action_counts[user_id] = 0
                user_action_counts[user_id] += 1
            
            # Generate report
            report = {
                'total_actions': len(audit_logs),
                'action_type_distribution': action_type_counts,
                'user_action_distribution': user_action_counts,
                'filters_applied': filters,
                'generated_at': datetime.now().isoformat()
            }
            
            return report
            
        except Exception as e:
            print(f"Error generating activity report: {e}")
            raise
