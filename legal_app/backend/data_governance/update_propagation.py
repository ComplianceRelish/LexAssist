import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Set, Union

logger = logging.getLogger(__name__)

class UpdatePropagationSystem:
    """
    Update Propagation System for synchronizing changes across the system
    """
    def __init__(self, supabase_client, neo4j_client=None, change_detector=None):
        """
        Initialize Update Propagation System
        
        Args:
            supabase_client: Supabase client for database access
            neo4j_client: Neo4j client for graph database access
            change_detector: Change detector instance
        """
        self.supabase = supabase_client
        self.neo4j = neo4j_client
        self.change_detector = change_detector
        self.listeners = {}
        self.update_queue = asyncio.Queue()
        self.is_running = False
    
    async def start(self):
        """
        Start the update propagation system
        """
        if self.is_running:
            return
            
        self.is_running = True
        asyncio.create_task(self._process_updates())
        logger.info("Update propagation system started")
    
    async def stop(self):
        """
        Stop the update propagation system
        """
        self.is_running = False
        logger.info("Update propagation system stopped")
    
    async def _process_updates(self):
        """
        Process updates from the queue
        """
        while self.is_running:
            try:
                update = await self.update_queue.get()
                
                # Extract update info
                update_type = update.get("type")
                entity_type = update.get("entity_type")
                entity_id = update.get("entity_id")
                data = update.get("data", {})
                
                # Process based on update type
                if update_type == "create":
                    await self._handle_create(entity_type, entity_id, data)
                elif update_type == "update":
                    await self._handle_update(entity_type, entity_id, data)
                elif update_type == "delete":
                    await self._handle_delete(entity_type, entity_id, data)
                elif update_type == "batch":
                    await self._handle_batch_update(update.get("updates", []))
                
                # Notify listeners
                await self._notify_listeners(update_type, entity_type, entity_id, data)
                
                self.update_queue.task_done()
                
            except Exception as e:
                logger.error(f"Error processing update: {e}")
                if self.update_queue.qsize() > 0:
                    # Continue processing other updates
                    self.update_queue.task_done()
                else:
                    # Sleep a bit before next check
                    await asyncio.sleep(1)
    
    async def _handle_create(self, entity_type: str, entity_id: str, data: Dict[str, Any]):
        """
        Handle entity creation
        
        Args:
            entity_type: Type of entity
            entity_id: Entity ID
            data: Entity data
        """
        try:
            # Update Neo4j if available
            if self.neo4j and entity_type in ["document", "case", "statute", "regulation"]:
                # Create node in graph database
                query = """
                CREATE (d:Document {
                    id: $id,
                    title: $title,
                    document_type: $document_type,
                    created_at: $created_at,
                    updated_at: $updated_at
                })
                RETURN d
                """
                
                await self.neo4j.execute_query(query, {
                    'id': entity_id,
                    'title': data.get('title', ''),
                    'document_type': entity_type,
                    'created_at': data.get('created_at', datetime.now().isoformat()),
                    'updated_at': data.get('updated_at', datetime.now().isoformat())
                })
                
                logger.info(f"Created {entity_type} node in graph database: {entity_id}")
                
        except Exception as e:
            logger.error(f"Error handling create for {entity_type} {entity_id}: {e}")
    
    async def _handle_update(self, entity_type: str, entity_id: str, data: Dict[str, Any]):
        """
        Handle entity update
        
        Args:
            entity_type: Type of entity
            entity_id: Entity ID
            data: Updated entity data
        """
        try:
            # Update Neo4j if available
            if self.neo4j and entity_type in ["document", "case", "statute", "regulation"]:
                # Update node in graph database
                properties_to_set = []
                params = {'id': entity_id}
                
                for key, value in data.items():
                    if key not in ['id']:  # Skip ID property
                        property_name = key
                        param_name = f"param_{key}"
                        properties_to_set.append(f"d.{property_name} = ${param_name}")
                        params[param_name] = value
                
                if properties_to_set:
                    # Add updated_at timestamp
                    properties_to_set.append("d.updated_at = $updated_at")
                    params['updated_at'] = datetime.now().isoformat()
                    
                    # Build and execute query
                    set_clause = ", ".join(properties_to_set)
                    query = f"""
                    MATCH (d:Document {{id: $id}})
                    SET {set_clause}
                    RETURN d
                    """
                    
                    await self.neo4j.execute_query(query, params)
                    
                    logger.info(f"Updated {entity_type} node in graph database: {entity_id}")
                
        except Exception as e:
            logger.error(f"Error handling update for {entity_type} {entity_id}: {e}")
    
    async def _handle_delete(self, entity_type: str, entity_id: str, data: Dict[str, Any]):
        """
        Handle entity deletion
        
        Args:
            entity_type: Type of entity
            entity_id: Entity ID
            data: Additional data
        """
        try:
            # Update Neo4j if available
            if self.neo4j and entity_type in ["document", "case", "statute", "regulation"]:
                # Delete node in graph database
                query = """
                MATCH (d:Document {id: $id})
                DETACH DELETE d
                """
                
                await self.neo4j.execute_query(query, {'id': entity_id})
                
                logger.info(f"Deleted {entity_type} node from graph database: {entity_id}")
                
        except Exception as e:
            logger.error(f"Error handling delete for {entity_type} {entity_id}: {e}")
    
    async def _handle_batch_update(self, updates: List[Dict[str, Any]]):
        """
        Handle batch updates
        
        Args:
            updates: List of update operations
        """
        for update in updates:
            update_type = update.get("type")
            entity_type = update.get("entity_type")
            entity_id = update.get("entity_id")
            data = update.get("data", {})
            
            if update_type == "create":
                await self._handle_create(entity_type, entity_id, data)
            elif update_type == "update":
                await self._handle_update(entity_type, entity_id, data)
            elif update_type == "delete":
                await self._handle_delete(entity_type, entity_id, data)
    
    async def _notify_listeners(self, update_type: str, entity_type: str, entity_id: str, data: Dict[str, Any]):
        """
        Notify listeners of an update
        
        Args:
            update_type: Type of update (create, update, delete)
            entity_type: Type of entity
            entity_id: Entity ID
            data: Update data
        """
        # Check for listeners for this entity type
        if entity_type in self.listeners:
            for listener in self.listeners[entity_type]:
                try:
                    await listener({
                        "type": update_type,
                        "entity_type": entity_type,
                        "entity_id": entity_id,
                        "data": data,
                        "timestamp": datetime.now().isoformat()
                    })
                except Exception as e:
                    logger.error(f"Error notifying listener for {entity_type}: {e}")
        
        # Check for general listeners
        if "*" in self.listeners:
            for listener in self.listeners["*"]:
                try:
                    await listener({
                        "type": update_type,
                        "entity_type": entity_type,
                        "entity_id": entity_id,
                        "data": data,
                        "timestamp": datetime.now().isoformat()
                    })
                except Exception as e:
                    logger.error(f"Error notifying general listener: {e}")
    
    async def add_update(self, update_type: str, entity_type: str, entity_id: str, data: Optional[Dict[str, Any]] = None):
        """
        Add an update to the propagation system
        
        Args:
            update_type: Type of update (create, update, delete)
            entity_type: Type of entity
            entity_id: Entity ID
            data: Update data
        """
        await self.update_queue.put({
            "type": update_type,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "data": data or {},
            "timestamp": datetime.now().isoformat()
        })
    
    async def add_batch_update(self, updates: List[Dict[str, Any]]):
        """
        Add a batch of updates
        
        Args:
            updates: List of update operations
        """
        await self.update_queue.put({
            "type": "batch",
            "updates": updates,
            "timestamp": datetime.now().isoformat()
        })
    
    def add_listener(self, entity_type: str, listener_func):
        """
        Add a listener for updates to a specific entity type
        Use "*" for all entity types
        
        Args:
            entity_type: Type of entity to listen for
            listener_func: Async function to call with updates
        """
        if entity_type not in self.listeners:
            self.listeners[entity_type] = set()
            
        self.listeners[entity_type].add(listener_func)
        logger.info(f"Added listener for {entity_type}")
    
    def remove_listener(self, entity_type: str, listener_func):
        """
        Remove a listener
        
        Args:
            entity_type: Type of entity
            listener_func: Listener function to remove
        """
        if entity_type in self.listeners and listener_func in self.listeners[entity_type]:
            self.listeners[entity_type].remove(listener_func)
            logger.info(f"Removed listener for {entity_type}")