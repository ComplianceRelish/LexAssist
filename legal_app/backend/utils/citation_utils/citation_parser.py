import re
import json
from collections import defaultdict
import uuid

class CitationParser:
    """
    Citation Parser for extracting and parsing legal citations from text
    """
    def __init__(self, supabase_client=None, citation_formatter=None):
        self.supabase = supabase_client
        self.citation_formatter = citation_formatter
        
        # Citation patterns for different types
        self.case_patterns = [
            # Bluebook: Marbury v. Madison, 5 U.S. 137 (1803)
            r'(?P<parties>[\w\s\.,&\']+ v\.? [\w\s\.,&\']+),\s+(?P<volume>\d+)\s+(?P<reporter>[\w\.\s]+)\s+(?P<page>\d+)\s+\((?:(?P<court>[\w\s]+)\s+)?(?P<year>\d{4})\)',
            # AGLC: Mabo v Queensland (No 2) (1992) 175 CLR 1
            r'(?P<parties>[\w\s\.,&\']+ v [\w\s\.,&\']+(?:\s+\([\w\s]+\))?)\s+\((?P<year>\d{4})\)\s+(?P<volume>\d+)\s+(?P<reporter>[\w\s]+)\s+(?P<page>\d+)',
            # Indian: State of Punjab v. Baldev Singh, (1999) 6 SCC 172
            r'(?P<parties>[\w\s\.,&\']+ v\.? [\w\s\.,&\']+),\s+\((?P<year>\d{4})\)\s+(?P<volume>\d+)\s+(?P<reporter>[\w\s]+)\s+(?P<page>\d+)'
        ]
        
        self.statute_patterns = [
            # Bluebook: Civil Rights Act of 1964, 42 U.S.C. § 2000e (2012)
            r'(?P<title>[\w\s\.,&\']+(?:\sof\s\d{4})?),\s+(?P<volume>\d+)\s+(?P<code>[\w\.\s]+)\s+§\s+(?P<section>[\w\-\.]+)\s+\((?P<year>\d{4})\)',
            # AGLC: Criminal Code 1995 (Cth) s 80.2C
            r'(?P<title>[\w\s\.,&\']+)\s+(?P<year>\d{4})\s+\((?P<jurisdiction>[\w]+)\)\s+s\s+(?P<section>[\w\-\.]+)',
            # Indian: Income Tax Act, 1961 (43 of 1961)
            r'(?P<title>[\w\s\.,&\']+),\s+(?P<year>\d{4})\s+\((?P<act_number>\d+)\s+of\s+(?P<act_year>\d{4})\)'
        ]
        
        self.constitution_patterns = [
            # Bluebook: U.S. Const. art. I, § 8
            r'(?P<constitution>[\w\.\s]+)\s+(?P<article>art\.?\s+[IVX]+),\s+§\s+(?P<section>\d+)',
            # Indian: Constitution of India, Article 21
            r'(?P<constitution>Constitution\s+of\s+India),\s+(?P<article>Article\s+\d+)'
        ]
        
        # Reporter information
        self.reporter_info = {
            'U.S.': {'country': 'United States', 'court': 'Supreme Court', 'full_name': 'United States Reports'},
            'S. Ct.': {'country': 'United States', 'court': 'Supreme Court', 'full_name': 'Supreme Court Reporter'},
            'L. Ed.': {'country': 'United States', 'court': 'Supreme Court', 'full_name': 'Lawyers\' Edition'},
            'F.': {'country': 'United States', 'court': 'Federal', 'full_name': 'Federal Reporter'},
            'F.2d': {'country': 'United States', 'court': 'Federal', 'full_name': 'Federal Reporter, Second Series'},
            'F.3d': {'country': 'United States', 'court': 'Federal', 'full_name': 'Federal Reporter, Third Series'},
            'F. Supp.': {'country': 'United States', 'court': 'Federal District', 'full_name': 'Federal Supplement'},
            'SCC': {'country': 'India', 'court': 'Supreme Court', 'full_name': 'Supreme Court Cases'},
            'SCR': {'country': 'India', 'court': 'Supreme Court', 'full_name': 'Supreme Court Reports'},
            'AIR SC': {'country': 'India', 'court': 'Supreme Court', 'full_name': 'All India Reporter (Supreme Court)'},
            'AIR': {'country': 'India', 'court': 'Various', 'full_name': 'All India Reporter'}
        }
    
    def extract_citations(self, text):
        """
        Extract all citations from text
        
        Args:
            text: Text to extract citations from
            
        Returns:
            List of extracted citation objects
        """
        all_citations = []
        
        # Track positions of identified citations to avoid duplicate extractions
        identified_positions = set()
        
        # Extract case law citations
        case_citations = self._extract_by_patterns(text, self.case_patterns, 'case_law', identified_positions)
        all_citations.extend(case_citations)
        
        # Extract statute citations
        statute_citations = self._extract_by_patterns(text, self.statute_patterns, 'statute', identified_positions)
        all_citations.extend(statute_citations)
        
        # Extract constitution citations
        constitution_citations = self._extract_by_patterns(text, self.constitution_patterns, 'constitution', identified_positions)
        all_citations.extend(constitution_citations)
        
        # Sort citations by position in text
        all_citations.sort(key=lambda x: x.get('position', {}).get('start', 0))
        
        return all_citations
    
    def _extract_by_patterns(self, text, patterns, citation_type, identified_positions):
        """
        Extract citations by a list of patterns
        
        Args:
            text: Text to extract from
            patterns: List of regex patterns
            citation_type: Type of citation
            identified_positions: Set of already identified positions
            
        Returns:
            List of extracted citations
        """
        citations = []
        
        # Try each pattern
        for pattern in patterns:
            for match in re.finditer(pattern, text):
                start_pos = match.start()
                end_pos = match.end()
                
                # Check if this position overlaps with an already identified citation
                overlaps = any(
                    (start_pos >= pos[0] and start_pos < pos[1]) or
                    (end_pos > pos[0] and end_pos <= pos[1]) or
                    (start_pos <= pos[0] and end_pos >= pos[1])
                    for pos in identified_positions
                )
                
                if not overlaps:
                    # Add the position to the identified set
                    identified_positions.add((start_pos, end_pos))
                    
                    # Extract citation data
                    citation_text = text[start_pos:end_pos]
                    citation_data = match.groupdict()
                    
                    # Clean up data
                    citation_data = {k: v.strip() if v else v for k, v in citation_data.items()}
                    
                    # Add metadata
                    citation = {
                        'id': str(uuid.uuid4()),
                        'type': citation_type,
                        'text': citation_text,
                        'data': citation_data,
                        'position': {'start': start_pos, 'end': end_pos}
                    }
                    
                    # Add additional metadata based on type
                    if citation_type == 'case_law' and 'reporter' in citation_data:
                        reporter = citation_data['reporter'].strip()
                        citation['reporter_info'] = self._get_reporter_info(reporter)
                    
                    citations.append(citation)
        
        return citations
    
    def _get_reporter_info(self, reporter):
        """
        Get information about a reporter
        
        Args:
            reporter: Reporter abbreviation
            
        Returns:
            Reporter information
        """
        # Try exact match
        if reporter in self.reporter_info:
            return self.reporter_info[reporter]
        
        # Try to find closest match
        for abbr, info in self.reporter_info.items():
            if abbr in reporter:
                return info
        
        # Return minimal info if no match found
        return {
            'country': 'Unknown',
            'court': 'Unknown',
            'full_name': reporter
        }
    
    async def enrich_citations(self, citations):
        """
        Enrich citations with additional information from database
        
        Args:
            citations: List of citations to enrich
            
        Returns:
            Enriched citations
        """
        if not self.supabase or not citations:
            return citations
            
        enriched_citations = []
        
        for citation in citations:
            citation_type = citation.get('type')
            citation_data = citation.get('data', {})
            
            if citation_type == 'case_law':
                # Try to find case by citation
                query = self._build_case_query(citation_data)
                result = await self.supabase.table('cases').select('*').or_(query).execute()
                
                if result.data:
                    # Case found, enrich citation with case information
                    case = result.data[0]
                    citation['document_id'] = case.get('id')
                    citation['document_info'] = {
                        'title': case.get('title'),
                        'jurisdiction': case.get('jurisdiction'),
                        'legal_domain': case.get('legal_domain'),
                        'summary': case.get('summary'),
                        'url': case.get('url')
                    }
            
            elif citation_type == 'statute':
                # Try to find statute by citation
                query = self._build_statute_query(citation_data)
                result = await self.supabase.table('statutes').select('*').or_(query).execute()
                
                if result.data:
                    # Statute found, enrich citation with statute information
                    statute = result.data[0]
                    citation['document_id'] = statute.get('id')
                    citation['document_info'] = {
                        'title': statute.get('title'),
                        'jurisdiction': statute.get('jurisdiction'),
                        'legal_domain': statute.get('legal_domain'),
                        'summary': statute.get('summary'),
                        'url': statute.get('url')
                    }
            
            elif citation_type == 'constitution':
                # Try to find constitution provision by citation
                query = self._build_constitution_query(citation_data)
                result = await self.supabase.table('constitution_provisions').select('*').or_(query).execute()
                
                if result.data:
                    # Constitution provision found, enrich citation
                    provision = result.data[0]
                    citation['document_id'] = provision.get('id')
                    citation['document_info'] = {
                        'title': provision.get('title'),
                        'country': provision.get('country'),
                        'summary': provision.get('summary'),
                        'url': provision.get('url')
                    }
            
            # Format citation if formatter available
            if self.citation_formatter:
                citation['formatted'] = {}
                
                # Format in different styles
                for style in ['bluebook', 'aglc', 'indian']:
                    try:
                        citation['formatted'][style] = self.citation_formatter.format_citation(
                            citation_data,
                            style=style,
                            citation_type=citation_type
                        )
                    except Exception as e:
                        citation['formatted'][style] = f"Formatting error: {str(e)}"
            
            enriched_citations.append(citation)
        
        return enriched_citations
        
    def _build_case_query(self, citation_data):
        """
        Build query to find case by citation
        
        Args:
            citation_data: Citation data
            
        Returns:
            Query string
        """
        query_conditions = []
        
        # Search by parties
        if 'parties' in citation_data:
            parties = citation_data['parties']
            query_conditions.append(f"parties.ilike.%{parties}%")
        
        # Search by reporter and citation
        if 'reporter' in citation_data and 'volume' in citation_data and 'page' in citation_data:
            reporter = citation_data['reporter']
            volume = citation_data['volume']
            page = citation_data['page']
            
            # Try exact citation match
            citation_str = f"{volume} {reporter} {page}"
            query_conditions.append(f"citation.eq.{citation_str}")
            
            # Try broader citation match
            query_conditions.append(f"citation.ilike.%{reporter}%{page}%")
        
        # Search by year
        if 'year' in citation_data:
            year = citation_data['year']
            query_conditions.append(f"year.eq.{year}")
        
        return ','.join(query_conditions)
    
    def _build_statute_query(self, citation_data):
        """
        Build query to find statute by citation
        
        Args:
            citation_data: Citation data
            
        Returns:
            Query string
        """
        query_conditions = []
        
        # Search by title
        if 'title' in citation_data:
            title = citation_data['title']
            query_conditions.append(f"title.ilike.%{title}%")
        
        # Search by year
        if 'year' in citation_data:
            year = citation_data['year']
            query_conditions.append(f"year.eq.{year}")
        
        # Search by section
        if 'section' in citation_data:
            section = citation_data['section']
            query_conditions.append(f"sections.cs.{{{section}}}")
        
        # Search by code
        if 'code' in citation_data:
            code = citation_data['code']
            query_conditions.append(f"code.ilike.%{code}%")
        
        return ','.join(query_conditions)
    
    def _build_constitution_query(self, citation_data):
        """
        Build query to find constitution provision by citation
        
        Args:
            citation_data: Citation data
            
        Returns:
            Query string
        """
        query_conditions = []
        
        # Search by constitution
        if 'constitution' in citation_data:
            constitution = citation_data['constitution']
            query_conditions.append(f"constitution.ilike.%{constitution}%")
        
        # Search by article
        if 'article' in citation_data:
            article = citation_data['article']
            query_conditions.append(f"article.ilike.%{article}%")
        
        # Search by section
        if 'section' in citation_data:
            section = citation_data['section']
            query_conditions.append(f"section.eq.{section}")
        
        return ','.join(query_conditions)
    
    async def store_citations(self, document_id, citations):
        """
        Store citations in database
        
        Args:
            document_id: Document ID
            citations: List of citations
            
        Returns:
            Result of storage operation
        """
        if not self.supabase or not citations:
            return {'success': False, 'message': 'Supabase client not available or no citations to store'}
            
        try:
            # Prepare citations for storage
            citation_records = []
            
            for citation in citations:
                record = {
                    'id': citation.get('id') or str(uuid.uuid4()),
                    'document_id': document_id,
                    'cited_document_id': citation.get('document_id'),
                    'citation_type': citation.get('type'),
                    'citation_text': citation.get('text'),
                    'citation_data': json.dumps(citation.get('data', {})),
                    'start_position': citation.get('position', {}).get('start'),
                    'end_position': citation.get('position', {}).get('end'),
                    'created_at': datetime.now().isoformat()
                }
                
                citation_records.append(record)
            
            # Store citations
            if citation_records:
                result = await self.supabase.table('document_citations').insert(citation_records).execute()
                
                # Update citation relationships in graph database if Neo4j is available
                if hasattr(self, 'neo4j') and self.neo4j:
                    for citation in citations:
                        if citation.get('document_id'):
                            query = """
                            MATCH (d:Document {id: $document_id})
                            MATCH (cited:Document {id: $cited_document_id})
                            MERGE (d)-[r:CITES {id: $citation_id}]->(cited)
                            SET r.citation_text = $citation_text,
                                r.citation_type = $citation_type,
                                r.created_at = $created_at
                            RETURN d, r, cited
                            """
                            
                            await self.neo4j.execute_query(query, {
                                'document_id': document_id,
                                'cited_document_id': citation.get('document_id'),
                                'citation_id': citation.get('id'),
                                'citation_text': citation.get('text'),
                                'citation_type': citation.get('type'),
                                'created_at': datetime.now().isoformat()
                            })
                
                return {
                    'success': True,
                    'message': f'Stored {len(citation_records)} citations',
                    'data': result.data
                }
            
            return {'success': True, 'message': 'No citations to store'}
            
        except Exception as e:
            print(f"Error storing citations: {e}")
            return {'success': False, 'message': f'Error storing citations: {str(e)}'}