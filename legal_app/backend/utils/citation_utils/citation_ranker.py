import math
from datetime import datetime

class CitationRanker:
    """
    Citation Ranker for scoring and ranking legal citations based on authority, recency, and relevance
    Implements a modified PageRank-like algorithm for legal authorities
    """
    def __init__(self, supabase_client, neo4j_client=None, authority_manager=None):
        self.supabase = supabase_client
        self.neo4j = neo4j_client
        self.authority_manager = authority_manager
        
        # Default ranking parameters
        self.parameters = {
            'authority_weight': 0.45,   # Weight given to authority level
            'recency_weight': 0.25,     # Weight given to how recent the source is
            'relevance_weight': 0.30,   # Weight given to relevance to query
            'citation_count_weight': 0.20,  # Weight given to citation count
            'dampening_factor': 0.85,   # PageRank dampening factor
            'max_iterations': 20,       # Maximum iterations for PageRank
            'convergence_threshold': 0.001  # Convergence threshold for PageRank
        }
    
    async def rank_citations(self, citations, query=None, context=None):
        """
        Rank a list of citations based on authority, recency, and relevance
        
        Args:
            citations: List of citation objects
            query: Optional search query for relevance calculation
            context: Optional context information (legal domain, jurisdiction, etc.)
            
        Returns:
            Sorted list of citations with ranking scores
        """
        if not citations:
            return []
            
        # Get document information for all citations
        document_ids = [citation.get('document_id') for citation in citations if citation.get('document_id')]
        
        if not document_ids:
            return citations
            
        # Fetch documents from Supabase
        documents_result = await self.supabase.table('documents') \
            .select('*') \
            .in_('id', document_ids) \
            .execute()
            
        documents = {doc['id']: doc for doc in documents_result.data}
        
        # Calculate scores for each citation
        for citation in citations:
            doc_id = citation.get('document_id')
            if not doc_id or doc_id not in documents:
                citation['rank_score'] = 0
                continue
                
            document = documents[doc_id]
            
            # Calculate individual scores
            authority_score = self._calculate_authority_score(document)
            recency_score = self._calculate_recency_score(document)
            relevance_score = self._calculate_relevance_score(document, query, context)
            citation_score = self._calculate_citation_score(document)
            
            # Combine scores
            rank_score = (
                authority_score * self.parameters['authority_weight'] +
                recency_score * self.parameters['recency_weight'] +
                relevance_score * self.parameters['relevance_weight'] +
                citation_score * self.parameters['citation_count_weight']
            )
            
            # Store scores for debugging/transparency
            citation['authority_score'] = authority_score
            citation['recency_score'] = recency_score
            citation['relevance_score'] = relevance_score
            citation['citation_score'] = citation_score
            citation['rank_score'] = rank_score
        
        # Sort by rank score
        ranked_citations = sorted(citations, key=lambda x: x.get('rank_score', 0), reverse=True)
        
        return ranked_citations
    
    def _calculate_authority_score(self, document):
        """
        Calculate authority score based on document type and source
        
        Args:
            document: Document object
            
        Returns:
            Authority score (0-1)
        """
        # If authority manager is available, use it
        if self.authority_manager:
            authority_info = self.authority_manager.get_authority_weight(document)
            
            # Normalize the final weight to 0-1 range (assuming max weight is around 10000)
            max_weight = 10000
            return min(authority_info['final_weight'] / max_weight, 1.0)
            
        # Fallback authority calculation if no manager available
        # Define authority levels for different document types
        authority_levels = {
            'constitution': 1.0,
            'statute': 0.95,
            'supreme_court': 0.9,
            'high_court': 0.85,
            'district_court': 0.8,
            'regulation': 0.75,
            'treatise': 0.7,
            'law_review': 0.6,
            'legal_encyclopedia': 0.5,
            'legal_dictionary': 0.4,
            'legal_blog': 0.3
        }
        
        # Get document type
        doc_type = document.get('document_type', '').lower()
        
        # Check document type
        for type_key, level in authority_levels.items():
            if type_key in doc_type:
                return level
        
        # Check jurisdiction for court cases
        if 'case' in doc_type or 'judgment' in doc_type:
            jurisdiction = document.get('jurisdiction', '').lower()
            
            if 'supreme' in jurisdiction or 'sc' == jurisdiction:
                return authority_levels['supreme_court']
            elif 'high' in jurisdiction or 'hc' == jurisdiction:
                return authority_levels['high_court']
            elif 'district' in jurisdiction or 'dc' == jurisdiction:
                return authority_levels['district_court']
        
        # Default authority score
        return 0.5
    
    def _calculate_recency_score(self, document):
        """
        Calculate recency score based on document date
        
        Args:
            document: Document object
            
        Returns:
            Recency score (0-1)
        """
        # Get document date
        doc_date_str = document.get('effective_date') or document.get('publication_date') or document.get('created_at')
        
        if not doc_date_str:
            return 0.5  # Default if no date available
        
        try:
            # Parse date
            if isinstance(doc_date_str, str):
                doc_date = datetime.fromisoformat(doc_date_str.replace('Z', '+00:00'))
            else:
                doc_date = doc_date_str
                
            # Calculate age in years
            age_in_years = (datetime.now() - doc_date).days / 365.0
            
            # Recent documents get higher scores, with exponential decay
            recency_score = math.exp(-0.1 * age_in_years)
            
            return min(recency_score, 1.0)
        except ValueError:
            # If date parsing fails
            return 0.5
    
    def _calculate_relevance_score(self, document, query=None, context=None):
        """
        Calculate relevance score based on query and context
        
        Args:
            document: Document object
            query: Search query
            context: Context information
            
        Returns:
            Relevance score (0-1)
        """
        if not query:
            return 0.5  # Default if no query
        
        relevance_score = 0.5  # Default mid-range relevance
        
        # Simple relevance calculation based on keyword matching
        # A more sophisticated implementation would use vector embeddings or semantic matching
        
        query_terms = query.lower().split()
        
        # Check for matches in title
        title = document.get('title', '').lower()
        title_matches = sum(1 for term in query_terms if term in title)
        
        # Check for matches in content/summary
        content = document.get('content', '') or document.get('summary', '')
        if content:
            content = content.lower()
            content_matches = sum(1 for term in query_terms if term in content)
        else:
            content_matches = 0
            
        # Check for matches in legal domain
        domain = document.get('legal_domain', '').lower()
        domain_matches = sum(1 for term in query_terms if term in domain)
        
        # Calculate relevance score
        if query_terms:
            # Title matches are weighted higher
            relevance_score = min(
                1.0,
                (title_matches * 3 + content_matches + domain_matches * 2) / (len(query_terms) * 6)
            )
        
        # Adjust for context if provided
        if context and isinstance(context, dict):
            # Check for jurisdiction match
            if 'jurisdiction' in context and document.get('jurisdiction') == context['jurisdiction']:
                relevance_score += 0.1
                
            # Check for legal domain match
            if 'legal_domain' in context and document.get('legal_domain') == context['legal_domain']:
                relevance_score += 0.1
                
            # Cap at 1.0
            relevance_score = min(relevance_score, 1.0)
        
        return relevance_score
    
    def _calculate_citation_score(self, document):
        """
        Calculate citation score based on how often a document is cited
        
        Args:
            document: Document object
            
        Returns:
            Citation score (0-1)
        """
        # Get citation count
        citation_count = document.get('citation_count', 0)
        
        # Apply logarithmic scaling (1 citation = 0.1, 10 citations = 0.5, 100 citations = 0.9)
        if citation_count > 0:
            citation_score = min(0.9, 0.1 + 0.2 * math.log10(citation_count))
        else:
            citation_score = 0.1
            
        return citation_score
    
    async def calculate_pagerank_scores(self, document_ids=None, legal_domain=None):
        """
        Calculate PageRank-like scores for legal documents based on citation network
        
        Args:
            document_ids: Optional list of document IDs to calculate scores for
            legal_domain: Optional legal domain to filter documents
            
        Returns:
            Dictionary of document IDs and their PageRank scores
        """
        if not self.neo4j:
            return {'error': 'Neo4j client not available for PageRank calculation'}
            
        try:
            # Build query
            if document_ids:
                # Calculate PageRank for specific documents
                query = """
                MATCH (d:Document)
                WHERE d.id IN $document_ids
                CALL gds.pageRank.stream({
                    nodeQuery: 'MATCH (d:Document) WHERE d.id IN $document_ids RETURN id(d) AS id',
                    relationshipQuery: 'MATCH (d1:Document)-[:CITES]->(d2:Document) WHERE d1.id IN $document_ids AND d2.id IN $document_ids RETURN id(d1) AS source, id(d2) AS target',
                    dampingFactor: $dampening_factor,
                    maxIterations: $max_iterations,
                    tolerance: $convergence_threshold
                })
                YIELD nodeId, score
                MATCH (d:Document) WHERE id(d) = nodeId
                RETURN d.id AS document_id, score
                ORDER BY score DESC
                """
                
                params = {
                    'document_ids': document_ids,
                    'dampening_factor': self.parameters['dampening_factor'],
                    'max_iterations': self.parameters['max_iterations'],
                    'convergence_threshold': self.parameters['convergence_threshold']
                }
            elif legal_domain:
                # Calculate PageRank for documents in a specific legal domain
                query = """
                MATCH (d:Document {legal_domain: $legal_domain})
                CALL gds.pageRank.stream({
                    nodeQuery: 'MATCH (d:Document {legal_domain: $legal_domain}) RETURN id(d) AS id',
                    relationshipQuery: 'MATCH (d1:Document {legal_domain: $legal_domain})-[:CITES]->(d2:Document) RETURN id(d1) AS source, id(d2) AS target',
                    dampingFactor: $dampening_factor,
                    maxIterations: $max_iterations,
                    tolerance: $convergence_threshold
                })
                YIELD nodeId, score
                MATCH (d:Document) WHERE id(d) = nodeId
                RETURN d.id AS document_id, score
                ORDER BY score DESC
                """
                
                params = {
                    'legal_domain': legal_domain,
                    'dampening_factor': self.parameters['dampening_factor'],
                    'max_iterations': self.parameters['max_iterations'],
                    'convergence_threshold': self.parameters['convergence_threshold']
                }
            else:
                # Calculate PageRank for all documents
                query = """
                CALL gds.pageRank.stream({
                    nodeQuery: 'MATCH (d:Document) RETURN id(d) AS id',
                    relationshipQuery: 'MATCH (d1:Document)-[:CITES]->(d2:Document) RETURN id(d1) AS source, id(d2) AS target',
                    dampingFactor: $dampening_factor,
                    maxIterations: $max_iterations,
                    tolerance: $convergence_threshold
                })
                YIELD nodeId, score
                MATCH (d:Document) WHERE id(d) = nodeId
                RETURN d.id AS document_id, score
                ORDER BY score DESC
                """
                
                params = {
                    'dampening_factor': self.parameters['dampening_factor'],
                    'max_iterations': self.parameters['max_iterations'],
                    'convergence_threshold': self.parameters['convergence_threshold']
                }
                
            # Execute PageRank calculation
            result = await self.neo4j.execute_query(query, params)
            
            # Process results
            pagerank_scores = {}
            for record in result.records:
                document_id = record.get('document_id')
                score = record.get('score')
                if document_id and score:
                    pagerank_scores[document_id] = score
                    
            return pagerank_scores
            
        except Exception as e:
            print(f"Error calculating PageRank scores: {e}")
            return {'error': str(e)}
            
    async def update_citation_counts(self):
        """
        Update citation counts for all documents based on the citation network
        
        Returns:
            Number of documents updated
        """
        if not self.neo4j:
            return {'error': 'Neo4j client not available for citation count update'}
            
        try:
            # Calculate citation counts from Neo4j
            query = """
            MATCH (d:Document)<-[c:CITES]-()
            WITH d, count(c) AS citation_count
            SET d.citation_count = citation_count
            RETURN count(d) AS updated_count
            """
            
            result = await self.neo4j.execute_query(query)
            
            # Extract update count
            updated_count = result.records[0].get('updated_count', 0) if result.records else 0
            
            # Get all documents with citation counts
            docs_query = """
            MATCH (d:Document)
            RETURN d.id AS id, d.citation_count AS citation_count
            """
            
            docs_result = await self.neo4j.execute_query(docs_query)
            
            # Sync with Supabase
            for record in docs_result.records:
                doc_id = record.get('id')
                citation_count = record.get('citation_count', 0)
                
                if doc_id:
                    await self.supabase.table('documents') \
                        .update({'citation_count': citation_count}) \
                        .eq('id', doc_id) \
                        .execute()
            
            return {'updated_count': updated_count}
            
        except Exception as e:
            print(f"Error updating citation counts: {e}")
            return {'error': str(e)}
    
    async def calculate_authority_graph(self, document_id):
        """
        Calculate authority graph for a document showing citation relationships
        
        Args:
            document_id: Document ID
            
        Returns:
            Authority graph data
        """
        if not self.neo4j:
            return {'error': 'Neo4j client not available for authority graph calculation'}
            
        try:
            # Calculate authority graph (2 levels deep)
            query = """
            MATCH (d:Document {id: $document_id})
            OPTIONAL MATCH path1 = (d)-[:CITES]->(cited:Document)
            OPTIONAL MATCH path2 = (citing:Document)-[:CITES]->(d)
            WITH d, collect(DISTINCT cited) AS cited_docs, collect(DISTINCT citing) AS citing_docs
            
            OPTIONAL MATCH (cited:Document)<-[:CITES]-(co_citing:Document)
            WHERE cited IN cited_docs AND co_citing <> d
            WITH d, cited_docs, citing_docs, collect(DISTINCT co_citing) AS co_citing_docs
            
            RETURN 
                d AS document,
                cited_docs,
                citing_docs,
                co_citing_docs
            """
            
            result = await self.neo4j.execute_query(query, {'document_id': document_id})
            
            if not result.records:
                return {'error': f'Document {document_id} not found in graph database'}
                
            record = result.records[0]
            
            # Convert Neo4j nodes to Python dictionaries
            doc = dict(record.get('document').items())
            cited_docs = [dict(cited.items()) for cited in record.get('cited_docs', [])]
            citing_docs = [dict(citing.items()) for citing in record.get('citing_docs', [])]
            co_citing_docs = [dict(co_citing.items()) for co_citing in record.get('co_citing_docs', [])]
            
            # Get PageRank scores for all documents
            all_docs = [doc] + cited_docs + citing_docs + co_citing_docs
            all_doc_ids = [d['id'] for d in all_docs]
            
            pagerank_scores = await self.calculate_pagerank_scores(all_doc_ids)
            
            # Add PageRank scores to documents
            for d in all_docs:
                d['pagerank_score'] = pagerank_scores.get(d['id'], 0)
                
            # Calculate authority scores
            if self.authority_manager:
                for d in all_docs:
                    d['authority_info'] = self.authority_manager.get_authority_weight(d)
            
            # Build the graph data
            graph_data = {
                'document': doc,
                'cited_documents': cited_docs,
                'citing_documents': citing_docs,
                'co_citing_documents': co_citing_docs,
                'total_nodes': len(all_docs),
                'total_citations': len(cited_docs),
                'total_citing': len(citing_docs),
                'total_co_citing': len(co_citing_docs)
            }
            
            return graph_data
            
        except Exception as e:
            print(f"Error calculating authority graph: {e}")
            return {'error': str(e)}
