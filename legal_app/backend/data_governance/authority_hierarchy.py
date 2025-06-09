import json
from datetime import datetime
import uuid

class AuthorityHierarchyManager:
    """
    Authority Hierarchy Manager for legal sources
    """
    def __init__(self, supabase_client, neo4j_client=None):
        self.supabase = supabase_client
        self.neo4j = neo4j_client
        
        # Define authority hierarchy
        self.hierarchy_definition = {
            # Primary authorities (binding)
            'PRIMARY': {
                'weight': 10,
                'categories': {
                    'CONSTITUTION': {'weight': 100, 'order': 1},
                    'STATUTE': {'weight': 90, 'order': 2},
                    'SUPREME_COURT': {'weight': 80, 'order': 3},
                    'HIGH_COURT': {'weight': 70, 'order': 4},
                    'DISTRICT_COURT': {'weight': 60, 'order': 5},
                    'REGULATION': {'weight': 50, 'order': 6}
                }
            },
            # Secondary authorities (persuasive)
            'SECONDARY': {
                'weight': 5,
                'categories': {
                    'TREATISE': {'weight': 40, 'order': 7},
                    'RESTATEMENT': {'weight': 35, 'order': 8},
                    'LAW_REVIEW': {'weight': 30, 'order': 9},
                    'LEGAL_ENCYCLOPEDIA': {'weight': 25, 'order': 10}
                }
            },
            # Tertiary authorities (informative)
            'TERTIARY': {
                'weight': 2,
                'categories': {
                    'LEGAL_DICTIONARY': {'weight': 20, 'order': 11},
                    'LEGAL_PERIODICAL': {'weight': 15, 'order': 12},
                    'LEGAL_BLOG': {'weight': 10, 'order': 13},
                    'OTHER': {'weight': 5, 'order': 14}
                }
            }
        }
        
        # Jurisdiction hierarchy for precedent weight
        self.jurisdiction_hierarchy = {
            'supreme_court': {'level': 10, 'name': 'Supreme Court'},
            'high_court': {'level': 8, 'name': 'High Court'},
            'district_court': {'level': 6, 'name': 'District Court'},
            'tribunal': {'level': 5, 'name': 'Tribunal'},
            'administrative_body': {'level': 3, 'name': 'Administrative Body'}
        }
    
    def get_authority_weight(self, document):
        """
        Get the authority weight for a document
        
        Args:
            document: Document information
            
        Returns:
            Authority weight information
        """
        document_type = document.get('document_type')
        jurisdiction = document.get('jurisdiction')
        
        authority_level = 'TERTIARY'
        category_type = 'OTHER'
        jurisdiction_weight = 1
        
        # Determine authority level and category based on document type
        if document_type:
            doc_type = document_type.lower()
            
            if doc_type == 'constitution' or 'constitution' in doc_type:
                authority_level = 'PRIMARY'
                category_type = 'CONSTITUTION'
            elif doc_type == 'statute' or 'act' in doc_type or 'legislation' in doc_type:
                authority_level = 'PRIMARY'
                category_type = 'STATUTE'
            elif doc_type == 'regulation' or 'regulation' in doc_type or 'rule' in doc_type:
                authority_level = 'PRIMARY'
                category_type = 'REGULATION'
            elif doc_type == 'case_law' or 'case' in doc_type or 'judgment' in doc_type:
                authority_level = 'PRIMARY'
                
                # Determine court level from jurisdiction
                if jurisdiction:
                    jur_type = jurisdiction.lower()
                    
                    if 'supreme' in jur_type or jur_type == 'sc':
                        category_type = 'SUPREME_COURT'
                    elif 'high' in jur_type or jur_type == 'hc':
                        category_type = 'HIGH_COURT'
                    elif 'district' in jur_type or jur_type == 'dc':
                        category_type = 'DISTRICT_COURT'
            elif doc_type == 'treatise' or 'book' in doc_type:
                authority_level = 'SECONDARY'
                category_type = 'TREATISE'
            elif doc_type == 'law_review' or 'journal' in doc_type:
                authority_level = 'SECONDARY'
                category_type = 'LAW_REVIEW'
            elif doc_type == 'encyclopedia' or 'encyclopedia' in doc_type:
                authority_level = 'SECONDARY'
                category_type = 'LEGAL_ENCYCLOPEDIA'
            elif doc_type == 'dictionary' or 'dictionary' in doc_type:
                authority_level = 'TERTIARY'
                category_type = 'LEGAL_DICTIONARY'
            elif doc_type == 'blog' or 'blog' in doc_type:
                authority_level = 'TERTIARY'
                category_type = 'LEGAL_BLOG'
        
        # Calculate jurisdiction weight if available
        if jurisdiction and jurisdiction.lower() in self.jurisdiction_hierarchy:
            jurisdiction_weight = self.jurisdiction_hierarchy[jurisdiction.lower()]['level']
        
        # Calculate final weight
        level_weight = self.hierarchy_definition[authority_level]['weight']
        category_weight = self.hierarchy_definition[authority_level]['categories'][category_type]['weight']
        category_order = self.hierarchy_definition[authority_level]['categories'][category_type]['order']
        
        final_weight = level_weight * category_weight * jurisdiction_weight
        
        return {
            'authority_level': authority_level,
            'category_type': category_type,
            'level_weight': level_weight,
            'category_weight': category_weight,
            'jurisdiction_weight': jurisdiction_weight,
            'final_weight': final_weight,
            'category_order': category_order
        }
    
    async def register_source(self, source_data):
        """
        Register a legal source with authority information
        
        Args:
            source_data: Source information
            
        Returns:
            Created source with authority information
        """
        try:
            name = source_data.get('name')
            source_type = source_data.get('source_type')
            jurisdiction = source_data.get('jurisdiction')
            url = source_data.get('url')
            description = source_data.get('description')
            
            # Create test document to calculate authority weights
            test_doc = {
                'document_type': source_type,
                'jurisdiction': jurisdiction
            }
            
            authority_info = self.get_authority_weight(test_doc)
            
            # Store in Supabase
            source_id = str(uuid.uuid4())
            result = await self.supabase.table('legal_sources') \
                .insert({
                    'id': source_id,
                    'name': name,
                    'source_type': source_type,
                    'jurisdiction': jurisdiction,
                    'url': url,
                    'description': description,
                    'authority_level': authority_info['authority_level'],
                    'authority_weight': authority_info['final_weight'],
                    'authority_category': authority_info['category_type'],
                    'created_at': datetime.now().isoformat()
                }) \
                .execute()
                
            data = result.data[0]
            
            # Store in Neo4j if available
            if self.neo4j:
                query = """
                CREATE (s:LegalSource {
                    id: $id,
                    name: $name,
                    source_type: $source_type,
                    jurisdiction: $jurisdiction,
                    url: $url,
                    authority_level: $authority_level,
                    authority_weight: $authority_weight,
                    authority_category: $authority_category
                })
                RETURN s
                """
                
                await self.neo4j.execute_query(query, {
                    'id': data['id'],
                    'name': data['name'],
                    'source_type': data['source_type'],
                    'jurisdiction': data['jurisdiction'],
                    'url': data['url'],
                    'authority_level': data['authority_level'],
                    'authority_weight': data['authority_weight'],
                    'authority_category': data['authority_category']
                })
            
            return data
            
        except Exception as e:
            print(f"Error registering legal source: {e}")
            raise
    
    def compare_authority(self, doc_a, doc_b):
        """
        Compare authority levels between two documents
        
        Args:
            doc_a: First document
            doc_b: Second document
            
        Returns:
            Comparison result
        """
        weight_a = self.get_authority_weight(doc_a)
        weight_b = self.get_authority_weight(doc_b)
        
        # Compare by category order first (lower order means higher precedence)
        if weight_a['category_order'] != weight_b['category_order']:
            comparison = weight_a['category_order'] - weight_b['category_order']
        else:
            # If same category, compare by final weight
            comparison = weight_b['final_weight'] - weight_a['final_weight']
        
        return {
            'higher_authority': 'doc_a' if comparison < 0 else ('doc_b' if comparison > 0 else 'equal'),
            'weight_a': weight_a,
            'weight_b': weight_b,
            'comparison': comparison
        }
    
    async def get_relevant_authorities(self, legal_domain, jurisdiction=None):
        """
        Get a list of relevant authorities for a given legal domain
        
        Args:
            legal_domain: Legal domain
            jurisdiction: Optional jurisdiction filter
            
        Returns:
            Relevant authorities list
        """
        try:
            # Build base query
            query = self.supabase.table('legal_sources').select('*')
            
            if legal_domain:
                query = query.ilike('description', f'%{legal_domain}%')
            
            if jurisdiction:
                query = query.eq('jurisdiction', jurisdiction)
                
            # Execute query
            result = await query.order('authority_weight', {'ascending': False}).execute()
            
            return result.data
            
        except Exception as e:
            print(f"Error getting relevant authorities: {e}")
            return []
            
    async def get_authority_hierarchy(self, category=None):
        """
        Get the authority hierarchy definition
        
        Args:
            category: Optional category filter
            
        Returns:
            Hierarchy definition
        """
        if category and category in self.hierarchy_definition:
            return self.hierarchy_definition[category]
        return self.hierarchy_definition
    
    async def build_authority_graph(self, document_id):
        """
        Build an authority graph for a document
        
        Args:
            document_id: Document ID
            
        Returns:
            Authority graph data
        """
        try:
            if not self.neo4j:
                return {'error': 'Neo4j client not available'}
                
            # Fetch document
            doc_result = await self.supabase.table('documents') \
                .select('*') \
                .eq('id', document_id) \
                .single() \
                .execute()
                
            document = doc_result.data
            if not document:
                return {'error': f'Document {document_id} not found'}
                
            # Calculate authority weight
            authority_info = self.get_authority_weight(document)
            
            # Build graph query - get cited documents and their weights
            query = """
            MATCH (d:Document {id: $document_id})-[c:CITES]->(cited:Document)
            OPTIONAL MATCH (citing:Document)-[c2:CITES]->(d)
            RETURN d, collect(distinct cited) as cited_docs, collect(distinct citing) as citing_docs
            """
            
            result = await self.neo4j.execute_query(query, {'document_id': document_id})
            
            if not result or not result.records:
                return {
                    'document': document,
                    'authority': authority_info,
                    'cited_documents': [],
                    'citing_documents': []
                }
            
            # Process results
            record = result.records[0]
            cited_docs = record.get('cited_docs', [])
            citing_docs = record.get('citing_docs', [])
            
            # Calculate authority for cited documents
            cited_with_authority = []
            for doc in cited_docs:
                doc_data = dict(doc.items())
                doc_authority = self.get_authority_weight(doc_data)
                cited_with_authority.append({
                    'document': doc_data,
                    'authority': doc_authority
                })
                
            # Calculate authority for citing documents
            citing_with_authority = []
            for doc in citing_docs:
                doc_data = dict(doc.items())
                doc_authority = self.get_authority_weight(doc_data)
                citing_with_authority.append({
                    'document': doc_data,
                    'authority': doc_authority
                })
            
            # Sort by authority weight
            cited_with_authority.sort(key=lambda x: x['authority']['final_weight'], reverse=True)
            citing_with_authority.sort(key=lambda x: x['authority']['final_weight'], reverse=True)
            
            return {
                'document': document,
                'authority': authority_info,
                'cited_documents': cited_with_authority,
                'citing_documents': citing_with_authority
            }
            
        except Exception as e:
            print(f"Error building authority graph: {e}")
            return {'error': str(e)}
