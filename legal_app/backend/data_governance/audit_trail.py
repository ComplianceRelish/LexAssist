import logging
import json
from datetime import datetime
from typing import Dict, List, Any, Optional, Set, Tuple, Union

logger = logging.getLogger(__name__)

class ConsistencyChecker:
    """
    Consistency Checker for validating data integrity across systems
    """
    def __init__(self, supabase_client, neo4j_client=None):
        """
        Initialize Consistency Checker
        
        Args:
            supabase_client: Supabase client for database access
            neo4j_client: Optional Neo4j client for graph database access
        """
        self.supabase = supabase_client
        self.neo4j = neo4j_client
        self.validation_rules = self._load_validation_rules()
    
    def _load_validation_rules(self) -> Dict[str, Any]:
        """
        Load data validation rules
        
        Returns:
            Dictionary of validation rules
        """
        # Default validation rules
        default_rules = {
            "documents": {
                "required_fields": ["id", "title", "content", "document_type"],
                "type_checks": {
                    "id": "string",
                    "title": "string",
                    "content": "string",
                    "document_type": "string"
                },
                "constraints": {
                    "document_type": ["case_law", "statute", "regulation", "constitution"]
                }
            },
            "citations": {
                "required_fields": ["id", "document_id", "citation_text", "citation_type"],
                "type_checks": {
                    "id": "string",
                    "document_id": "string",
                    "citation_text": "string",
                    "citation_type": "string"
                }
            }
        }
        
        return default_rules
    
    async def validate_document(self, document: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate a document against consistency rules
        
        Args:
            document: Document data to validate
            
        Returns:
            Validation results
        """
        document_rules = self.validation_rules.get("documents", {})
        validation_errors = []
        
        # Check required fields
        required_fields = document_rules.get("required_fields", [])
        for field in required_fields:
            if field not in document or document[field] is None:
                validation_errors.append(f"Missing required field: {field}")
        
        # Type checks
        type_checks = document_rules.get("type_checks", {})
        for field, expected_type in type_checks.items():
            if field in document and document[field] is not None:
                if expected_type == "string" and not isinstance(document[field], str):
                    validation_errors.append(f"Field {field} should be a string")
                elif expected_type == "number" and not isinstance(document[field], (int, float)):
                    validation_errors.append(f"Field {field} should be a number")
                elif expected_type == "boolean" and not isinstance(document[field], bool):
                    validation_errors.append(f"Field {field} should be a boolean")
                elif expected_type == "array" and not isinstance(document[field], list):
                    validation_errors.append(f"Field {field} should be an array")
                elif expected_type == "object" and not isinstance(document[field], dict):
                    validation_errors.append(f"Field {field} should be an object")
        
        # Check constraints
        constraints = document_rules.get("constraints", {})
        for field, allowed_values in constraints.items():
            if field in document and document[field] is not None:
                if document[field] not in allowed_values:
                    validation_errors.append(f"Field {field} value '{document[field]}' not in allowed values: {', '.join(allowed_values)}")
        
        validation_result = {
            "valid": len(validation_errors) == 0,
            "errors": validation_errors
        }
        
        return validation_result
    
    async def check_database_consistency(self) -> Dict[str, Any]:
        """
        Check consistency between primary and graph databases
        
        Returns:
            Consistency check results
        """
        if not self.neo4j:
            return {"error": "Neo4j client not available for consistency check"}
            
        try:
            consistency_results = {
                "document_counts": {},
                "missing_documents": {
                    "in_neo4j": [],
                    "in_supabase": []
                },
                "citation_consistency": {
                    "consistent": True,
                    "issues": []
                },
                "timestamp": datetime.now().isoformat()
            }
            
            # Check document counts
            supabase_counts = {}
            
            # Count documents in Supabase
            for doc_type in ["cases", "statutes", "regulations", "constitution_provisions"]:
                result = await self.supabase.table(doc_type).select("count", count="exact").execute()
                count = result.count if hasattr(result, 'count') else 0
                supabase_counts[doc_type] = count
            
            # Count documents in Neo4j
            neo4j_query = """
            MATCH (d:Document)
            RETURN d.document_type AS type, count(d) AS count
            """
            
            neo4j_result = await self.neo4j.execute_query(neo4j_query)
            
            neo4j_counts = {}
            for record in neo4j_result.records:
                doc_type = record.get("type")
                count = record.get("count")
                if doc_type:
                    neo4j_counts[doc_type] = count
            
            consistency_results["document_counts"] = {
                "supabase": supabase_counts,
                "neo4j": neo4j_counts
            }
            
            # Check for missing documents
            for doc_type, table_name in [
                ("case_law", "cases"), 
                ("statute", "statutes"), 
                ("regulation", "regulations"),
                ("constitution", "constitution_provisions")
            ]:
                # Get IDs from Supabase
                sb_result = await self.supabase.table(table_name).select("id").execute()
                sb_ids = set(item["id"] for item in sb_result.data)
                
                # Get IDs from Neo4j
                neo4j_query = f"""
                MATCH (d:Document {{document_type: "{doc_type}"}})
                RETURN d.id AS id
                """
                
                neo4j_result = await self.neo4j.execute_query(neo4j_query)
                neo4j_ids = set(record.get("id") for record in neo4j_result.records if record.get("id"))
                
                # Find missing IDs
                missing_in_neo4j = sb_ids - neo4j_ids
                missing_in_supabase = neo4j_ids - sb_ids
                
                if missing_in_neo4j:
                    consistency_results["missing_documents"]["in_neo4j"].extend([
                        {"id": doc_id, "type": doc_type} for doc_id in missing_in_neo4j
                    ])
                
                if missing_in_supabase:
                    consistency_results["missing_documents"]["in_supabase"].extend([
                        {"id": doc_id, "type": doc_type} for doc_id in missing_in_supabase
                    ])
            
            # Check citation consistency
            citation_query = """
            MATCH (d1:Document)-[c:CITES]->(d2:Document)
            RETURN d1.id AS source_id, d2.id AS target_id, c.id AS citation_id
            LIMIT 1000
            """
            
            neo4j_citations = await self.neo4j.execute_query(citation_query)
            
            for record in neo4j_citations.records:
                citation_id = record.get("citation_id")
                source_id = record.get("source_id")
                target_id = record.get("target_id")
                
                if citation_id and source_id and target_id:
                    # Check if citation exists in Supabase
                    sb_result = await self.supabase.table("document_citations") \
                        .select("*") \
                        .eq("id", citation_id) \
                        .eq("document_id", source_id) \
                        .eq("cited_document_id", target_id) \
                        .maybeSingle() \
                        .execute()
                        
                    if not sb_result.data:
                        consistency_results["citation_consistency"]["consistent"] = False
                        consistency_results["citation_consistency"]["issues"].append({
                            "citation_id": citation_id,
                            "source_id": source_id,
                            "target_id": target_id,
                            "issue": "Citation exists in Neo4j but not in Supabase"
                        })
            
            return consistency_results
            
        except Exception as e:
            logger.error(f"Error checking database consistency: {e}")
            return {"error": str(e)}
    
    async def verify_document_integrity(self, document_id: str, document_type: str = None) -> Dict[str, Any]:
        """
        Verify integrity of a specific document
        
        Args:
            document_id: Document ID
            document_type: Optional document type
            
        Returns:
            Integrity verification results
        """
        try:
            # Determine which table to query
            if not document_type:
                # Try to determine document type from Neo4j
                if self.neo4j:
                    query = """
                    MATCH (d:Document {id: $document_id})
                    RETURN d.document_type AS document_type
                    """
                    
                    result = await self.neo4j.execute_query(query, {"document_id": document_id})
                    
                    if result.records and result.records[0].get("document_type"):
                        document_type = result.records[0].get("document_type")
            
            # Map document_type to table name
            table_mapping = {
                "case_law": "cases",
                "cases": "cases",
                "statute": "statutes",
                "statutes": "statutes",
                "regulation": "regulations",
                "regulations": "regulations",
                "constitution": "constitution_provisions",
                "constitution_provisions": "constitution_provisions"
            }
            
            if not document_type or document_type not in table_mapping:
                # Try each table
                tables_to_check = ["cases", "statutes", "regulations", "constitution_provisions"]
            else:
                tables_to_check = [table_mapping[document_type]]
            
            # Find document in Supabase
            document = None
            actual_table = None
            
            for table in tables_to_check:
                result = await self.supabase.table(table) \
                    .select("*") \
                    .eq("id", document_id) \
                    .maybeSingle() \
                    .execute()
                    
                if result.data:
                    document = result.data
                    actual_table = table
                    break
            
            if not document:
                return {
                    "document_found": False,
                    "message": f"Document {document_id} not found in any table",
                    "integrity_status": "unknown"
                }
            
            # Initialize integrity result
            integrity_result = {
                "document_found": True,
                "document_id": document_id,
                "document_type": actual_table,
                "integrity_checks": [],
                "overall_integrity": True,
                "timestamp": datetime.now().isoformat()
            }
            
            # 1. Check document validation
            validation_result = await self.validate_document(document)
            integrity_result["integrity_checks"].append({
                "check_type": "validation",
                "passed": validation_result["valid"],
                "details": validation_result
            })
            
            if not validation_result["valid"]:
                integrity_result["overall_integrity"] = False
            
            # 2. Check Neo4j consistency if available
            if self.neo4j:
                query = """
                MATCH (d:Document {id: $document_id})
                RETURN d
                """
                
                result = await self.neo4j.execute_query(query, {"document_id": document_id})
                
                neo4j_check = {
                    "check_type": "neo4j_consistency",
                    "passed": bool(result.records),
                    "details": {}
                }
                
                if result.records:
                    neo4j_doc = dict(result.records[0].get("d").items())
                    
                    # Check key properties
                    mismatches = []
                    for key in ["title", "document_type"]:
                        if key in document and key in neo4j_doc and document[key] != neo4j_doc[key]:
                            mismatches.append({
                                "property": key,
                                "supabase_value": document[key],
                                "neo4j_value": neo4j_doc[key]
                            })
                    
                    neo4j_check["details"]["property_matches"] = (len(mismatches) == 0)
                    neo4j_check["details"]["mismatches"] = mismatches
                    
                    if mismatches:
                        neo4j_check["passed"] = False
                        integrity_result["overall_integrity"] = False
                else:
                    neo4j_check["details"]["message"] = f"Document {document_id} not found in Neo4j"
                    integrity_result["overall_integrity"] = False
                
                integrity_result["integrity_checks"].append(neo4j_check)
            
            # 3. Check citations integrity
            citations_check = {
                "check_type": "citations_integrity",
                "passed": True,
                "details": {}
            }
            
            # Get citations from Supabase
            citations_result = await self.supabase.table("document_citations") \
                .select("*") \
                .eq("document_id", document_id) \
                .execute()
                
            citations = citations_result.data
            
            if self.neo4j:
                # Compare with Neo4j citations
                query = """
                MATCH (d:Document {id: $document_id})-[c:CITES]->(cited:Document)
                RETURN c.id AS citation_id, cited.id AS cited_document_id
                """
                
                result = await self.neo4j.execute_query(query, {"document_id": document_id})
                
                neo4j_citations = {record.get("citation_id"): record.get("cited_document_id") 
                                  for record in result.records if record.get("citation_id")}
                
                sb_citations = {citation["id"]: citation["cited_document_id"] for citation in citations}
                
                missing_in_neo4j = set(sb_citations.keys()) - set(neo4j_citations.keys())
                missing_in_supabase = set(neo4j_citations.keys()) - set(sb_citations.keys())
                
                citations_check["details"]["missing_in_neo4j"] = list(missing_in_neo4j)
                citations_check["details"]["missing_in_supabase"] = list(missing_in_supabase)
                
                citations_check["passed"] = len(missing_in_neo4j) == 0 and len(missing_in_supabase) == 0
                
                if not citations_check["passed"]:
                    integrity_result["overall_integrity"] = False
            
            integrity_result["integrity_checks"].append(citations_check)
            
            return integrity_result
            
        except Exception as e:
            logger.error(f"Error verifying document integrity: {e}")
            return {"error": str(e)}
    
    async def repair_inconsistencies(self, repair_type: str = "auto", document_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Repair inconsistencies between databases
        
        Args:
            repair_type: Type of repair (auto, neo4j_to_supabase, supabase_to_neo4j)
            document_id: Optional document ID to repair
            
        Returns:
            Repair results
        """
        if not self.neo4j:
            return {"error": "Neo4j client not available for repairs"}
            
        try:
            repair_results = {
                "repair_type": repair_type,
                "document_id": document_id,
                "repairs_performed": [],
                "status": "completed",
                "timestamp": datetime.now().isoformat()
            }
            
            if document_id:
                # Repair specific document
                integrity_result = await self.verify_document_integrity(document_id)
                
                if "error" in integrity_result:
                    return {"error": integrity_result["error"]}
                    
                if integrity_result["overall_integrity"]:
                    repair_results["status"] = "no_repairs_needed"
                    return repair_results
                
                # Perform needed repairs
                repairs = []
                
                # Neo4j document consistency
                neo4j_check = next((check for check in integrity_result["integrity_checks"] 
                                   if check["check_type"] == "neo4j_consistency"), None)
                
                if neo4j_check and not neo4j_check["passed"]:
                    if repair_type in ["auto", "supabase_to_neo4j"]:
                        # Get document from Supabase
                        document_type = integrity_result["document_type"]
                        result = await self.supabase.table(document_type) \
                            .select("*") \
                            .eq("id", document_id) \
                            .maybeSingle() \
                            .execute()
                            
                        if result.data:
                            document = result.data
                            
                            # Check if document exists in Neo4j
                            query = """
                            MATCH (d:Document {id: $document_id})
                            RETURN d
                            """
                            
                            neo4j_result = await self.neo4j.execute_query(query, {"document_id": document_id})
                            
                            if neo4j_result.records:
                                # Update existing document
                                update_query = """
                                MATCH (d:Document {id: $document_id})
                                SET d.title = $title,
                                    d.document_type = $document_type,
                                    d.updated_at = $updated_at
                                RETURN d
                                """
                                
                                await self.neo4j.execute_query(update_query, {
                                    "document_id": document_id,
                                    "title": document.get("title", ""),
                                    "document_type": document.get("document_type", document_type),
                                    "updated_at": datetime.now().isoformat()
                                })
                                
                                repairs.append({
                                    "type": "document_update",
                                    "document_id": document_id,
                                    "target": "neo4j",
                                    "status": "success"
                                })
                            else:
                                # Create new document
                                create_query = """
                                CREATE (d:Document {
                                    id: $document_id,
                                    title: $title,
                                    document_type: $document_type,
                                    created_at: $created_at,
                                    updated_at: $updated_at
                                })
                                RETURN d
                                """
                                
                                await self.neo4j.execute_query(create_query, {
                                    "document_id": document_id,
                                    "title": document.get("title", ""),
                                    "document_type": document.get("document_type", document_type),
                                    "created_at": document.get("created_at", datetime.now().isoformat()),
                                    "updated_at": document.get("updated_at", datetime.now().isoformat())
                                })
                                
                                repairs.append({
                                    "type": "document_create",
                                    "document_id": document_id,
                                    "target": "neo4j",
                                    "status": "success"
                                })
                
                # Citations consistency
                citations_check = next((check for check in integrity_result["integrity_checks"] 
                                      if check["check_type"] == "citations_integrity"), None)
                                      
                if citations_check and not citations_check["passed"]:
                    details = citations_check.get("details", {})
                    
                    # Citations missing in Neo4j
                    missing_in_neo4j = details.get("missing_in_neo4j", [])
                    if missing_in_neo4j and repair_type in ["auto", "supabase_to_neo4j"]:
                        # Get citation details from Supabase
                        for citation_id in missing_in_neo4j:
                            citation_result = await self.supabase.table("document_citations") \
                                .select("*") \
                                .eq("id", citation_id) \
                                .maybeSingle() \
                                .execute()
                                
                            if citation_result.data:
                                citation = citation_result.data
                                cited_id = citation.get("cited_document_id")
                                
                                if cited_id:
                                    # Create citation in Neo4j
                                    query = """
                                    MATCH (d1:Document {id: $document_id})
                                    MATCH (d2:Document {id: $cited_id})
                                    MERGE (d1)-[c:CITES {id: $citation_id}]->(d2)
                                    SET c.citation_text = $citation_text,
                                        c.citation_type = $citation_type,
                                        c.created_at = $created_at
                                    RETURN c
                                    """
                                    
                                    try:
                                        await self.neo4j.execute_query(query, {
                                            "document_id": document_id,
                                            "cited_id": cited_id,
                                            "citation_id": citation_id,
                                            "citation_text": citation.get("citation_text", ""),
                                            "citation_type": citation.get("citation_type", ""),
                                            "created_at": citation.get("created_at", datetime.now().isoformat())
                                        })
                                        
                                        repairs.append({
                                            "type": "citation_create",
                                            "citation_id": citation_id,
                                            "document_id": document_id,
                                            "cited_id": cited_id,
                                            "target": "neo4j",
                                            "status": "success"
                                        })
                                    except Exception as e:
                                        repairs.append({
                                            "type": "citation_create",
                                            "citation_id": citation_id,
                                            "document_id": document_id,
                                            "cited_id": cited_id,
                                            "target": "neo4j",
                                            "status": "error",
                                            "error": str(e)
                                        })
                    
                    # Citations missing in Supabase
                    missing_in_supabase = details.get("missing_in_supabase", [])
                    if missing_in_supabase and repair_type in ["auto", "neo4j_to_supabase"]:
                        # Get citation details from Neo4j
                        for citation_id in missing_in_supabase:
                            query = """
                            MATCH (d1:Document {id: $document_id})-[c:CITES {id: $citation_id}]->(d2:Document)
                            RETURN c, d2.id AS cited_id
                            """
                            
                            result = await self.neo4j.execute_query(query, {
                                "document_id": document_id,
                                "citation_id": citation_id
                            })
                            
                            if result.records:
                                record = result.records[0]
                                citation = dict(record.get("c").items()) if record.get("c") else {}
                                cited_id = record.get("cited_id")
                                
                                if cited_id:
                                    # Create citation in Supabase
                                    try:
                                        await self.supabase.table("document_citations") \
                                            .insert({
                                                "id": citation_id,
                                                "document_id": document_id,
                                                "cited_document_id": cited_id,
                                                "citation_text": citation.get("citation_text", ""),
                                                "citation_type": citation.get("citation_type", ""),
                                                "created_at": citation.get("created_at", datetime.now().isoformat())
                                            }) \
                                            .execute()
                                            
                                        repairs.append({
                                            "type": "citation_create",
                                            "citation_id": citation_id,
                                            "document_id": document_id,
                                            "cited_id": cited_id,
                                            "target": "supabase",
                                            "status": "success"
                                        })
                                    except Exception as e:
                                        repairs.append({
                                            "type": "citation_create",
                                            "citation_id": citation_id,
                                            "document_id": document_id,
                                            "cited_id": cited_id,
                                            "target": "supabase",
                                            "status": "error",
                                            "error": str(e)
                                        })
                
                repair_results["repairs_performed"] = repairs
            else:
                # System-wide repairs
                # Get consistency check results
                consistency_result = await self.check_database_consistency()
                
                if "error" in consistency_result:
                    return {"error": consistency_result["error"]}
                
                repairs = []
                
                # Handle missing documents
                missing_in_neo4j = consistency_result.get("missing_documents", {}).get("in_neo4j", [])
                missing_in_supabase = consistency_result.get("missing_documents", {}).get("in_supabase", [])
                
                # Process missing in Neo4j
                if repair_type in ["auto", "supabase_to_neo4j"]:
                    for doc_info in missing_in_neo4j:
                        doc_id = doc_info.get("id")
                        doc_type = doc_info.get("type")
                        
                        if not doc_id or not doc_type:
                            continue
                            
                        # Get document from Supabase
                        table_name = {
                            "case_law": "cases",
                            "statute": "statutes",
                            "regulation": "regulations",
                            "constitution": "constitution_provisions"
                        }.get(doc_type)
                        
                        if not table_name:
                            continue
                            
                        document_result = await self.supabase.table(table_name) \
                            .select("*") \
                            .eq("id", doc_id) \
                            .maybeSingle() \
                            .execute()
                            
                        if document_result.data:
                            document = document_result.data
                            
                            # Create document in Neo4j
                            query = """
                            CREATE (d:Document {
                                id: $document_id,
                                title: $title,
                                document_type: $document_type,
                                created_at: $created_at,
                                updated_at: $updated_at
                            })
                            RETURN d
                            """
                            
                            try:
                                await self.neo4j.execute_query(query, {
                                    "document_id": doc_id,
                                    "title": document.get("title", ""),
                                    "document_type": doc_type,
                                    "created_at": document.get("created_at", datetime.now().isoformat()),
                                    "updated_at": document.get("updated_at", datetime.now().isoformat())
                                })
                                
                                repairs.append({
                                    "type": "document_create",
                                    "document_id": doc_id,
                                    "document_type": doc_type,
                                    "target": "neo4j",
                                    "status": "success"
                                })
                            except Exception as e:
                                repairs.append({
                                    "type": "document_create",
                                    "document_id": doc_id,
                                    "document_type": doc_type,
                                    "target": "neo4j",
                                    "status": "error",
                                    "error": str(e)
                                })
                
                # Process missing in Supabase
                if repair_type in ["auto", "neo4j_to_supabase"]:
                    # This is more complex and potentially dangerous
                    # Only log these for manual review
                    for doc_info in missing_in_supabase:
                        repairs.append({
                            "type": "document_missing",
                            "document_id": doc_info.get("id"),
                            "document_type": doc_info.get("type"),
                            "target": "supabase",
                            "status": "skipped",
                            "reason": "Manual review required for creating documents in primary database"
                        })
                
                # Handle citation issues
                citation_issues = consistency_result.get("citation_consistency", {}).get("issues", [])
                
                for issue in citation_issues:
                    if repair_type in ["auto", "neo4j_to_supabase"] and \
                       "exists in Neo4j but not in Supabase" in issue.get("issue", ""):
                        # Add missing citation to Supabase
                        citation_id = issue.get("citation_id")
                        source_id = issue.get("source_id")
                        target_id = issue.get("target_id")
                        
                        if citation_id and source_id and target_id:
                            try:
                                await self.supabase.table("document_citations") \
                                    .insert({
                                        "id": citation_id,
                                        "document_id": source_id,
                                        "cited_document_id": target_id,
                                        "created_at": datetime.now().isoformat()
                                    }) \
                                    .execute()
                                    
                                repairs.append({
                                    "type": "citation_create",
                                    "citation_id": citation_id,
                                    "document_id": source_id,
                                    "cited_id": target_id,
                                    "target": "supabase",
                                    "status": "success"
                                })
                            except Exception as e:
                                repairs.append({
                                    "type": "citation_create",
                                    "citation_id": citation_id,
                                    "document_id": source_id,
                                    "cited_id": target_id,
                                    "target": "supabase",
                                    "status": "error",
                                    "error": str(e)
                                })
                
                repair_results["repairs_performed"] = repairs
            
            return repair_results
            
        except Exception as e:
            logger.error(f"Error repairing inconsistencies: {e}")
            return {"error": str(e)}