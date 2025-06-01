import re
import json
from datetime import datetime
import httpx
import uuid

class SourceVerificationSystem:
    """
    Source Verification System for validating legal document sources
    """
    def __init__(self, supabase_client, neo4j_client=None):
        self.supabase = supabase_client
        self.neo4j = neo4j_client
        
        # Source authority levels
        self.authority_levels = {
            'OFFICIAL_GOVERNMENT': {
                'level': 5,
                'description': 'Official government source (direct from government website or API)',
                'verification_method': 'domain_verification'
            },
            'LICENSED_PUBLISHER': {
                'level': 4,
                'description': 'Licensed legal publisher (e.g., LexisNexis, Westlaw, SCC)',
                'verification_method': 'api_verification'
            },
            'VERIFIED_ACADEMIC': {
                'level': 3,
                'description': 'Verified academic or institutional source',
                'verification_method': 'domain_verification'
            },
            'RECOGNIZED_LEGAL_SITE': {
                'level': 2, 
                'description': 'Recognized legal resource site (e.g., IndianKanoon)',
                'verification_method': 'domain_verification'
            },
            'UNVERIFIED': {
                'level': 1,
                'description': 'Unverified or user-submitted source',
                'verification_method': 'manual_verification'
            }
        }
        
        # Official domain patterns for verification
        self.official_domain_patterns = [
            # Government domains
            r'gov\.in$',
            r'nic\.in$',
            r'judiciary\.gov\.in$',
            r'ecourts\.gov\.in$',
            r'sci\.gov\.in$',
            # High courts
            r'hc\.[a-z]+\.gov\.in$',
            # Licensed publishers
            r'lexisnexis\.com$',
            r'westlaw\.com$',
            r'scconline\.com$',
            # Recognized legal sites
            r'indiankanoon\.org$',
            r'legalserviceindia\.com$',
            r'manupatra\.com$',
            r'legitquest\.com$'
        ]
    
    async def verify_source(self, document):
        """
        Verify a document source
        
        Args:
            document: Document information to verify
            
        Returns:
            Verification result
        """
        try:
            source_url = document.get('source_url')
            source_type = document.get('source_type')
            citation = document.get('citation')
            
            print(f"Verifying document source: {source_url or 'No URL provided'}")
            
            # Start with unverified level
            source_authority = self.authority_levels['UNVERIFIED']
            verification_notes = []
            
            # Determine verification method based on available information
            if source_url:
                url_verification = await self._verify_url(source_url)
                source_authority = url_verification['authority']
                verification_notes.append(url_verification['note'])
            elif citation:
                citation_verification = await self._verify_citation(citation)
                source_authority = citation_verification['authority']
                verification_notes.append(citation_verification['note'])
            
            # Additional verification based on source type
            if source_type:
                type_verification = self._verify_source_type(source_type)
                # Take the higher authority level
                if type_verification['authority']['level'] > source_authority['level']:
                    source_authority = type_verification['authority']
                verification_notes.append(type_verification['note'])
            
            # Store verification result
            verification_result = {
                'verified': source_authority['level'] > 1,
                'authority_level': source_authority['level'],
                'authority_description': source_authority['description'],
                'verification_method': source_authority['verification_method'],
                'verification_notes': '; '.join(verification_notes),
                'timestamp': datetime.now().isoformat()
            }
            
            # Update document with verification result
            await self._store_verification_result(document['id'], verification_result)
            
            return verification_result
            
        except Exception as e:
            print(f"Error verifying document source: {e}")
            return {
                'verified': False,
                'authority_level': self.authority_levels['UNVERIFIED']['level'],
                'authority_description': self.authority_levels['UNVERIFIED']['description'],
                'verification_method': 'failed',
                'verification_notes': f"Verification failed: {str(e)}",
                'timestamp': datetime.now().isoformat()
            }
    
    async def _verify_url(self, url):
        """
        Verify a URL source
        
        Args:
            url: Source URL
            
        Returns:
            Verification result
        """
        try:
            # Extract domain from URL
            from urllib.parse import urlparse
            domain = urlparse(url).netloc.lower()
            
            # Check against official domain patterns
            for pattern in self.official_domain_patterns:
                if re.search(pattern, domain):
                    # If it's a government domain
                    if re.search(r'gov\.in$', domain) or re.search(r'nic\.in$', domain):
                        return {
                            'authority': self.authority_levels['OFFICIAL_GOVERNMENT'],
                            'note': f"Verified official government domain: {domain}"
                        }
                    
                    # If it's a licensed publisher domain
                    if re.search(r'lexisnexis\.com$', domain) or re.search(r'westlaw\.com$', domain) or re.search(r'scconline\.com$', domain):
                        return {
                            'authority': self.authority_levels['LICENSED_PUBLISHER'],
                            'note': f"Verified licensed publisher domain: {domain}"
                        }
                    
                    # If it's a recognized legal site
                    return {
                        'authority': self.authority_levels['RECOGNIZED_LEGAL_SITE'],
                        'note': f"Verified recognized legal domain: {domain}"
                    }
            
            # Try to verify URL accessibility (without downloading full content)
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.head(url, timeout=5.0, follow_redirects=True)
                    
                if 200 <= response.status_code < 300:
                    return {
                        'authority': self.authority_levels['UNVERIFIED'],
                        'note': f"URL is accessible but domain not in verified list: {domain}"
                    }
                else:
                    return {
                        'authority': self.authority_levels['UNVERIFIED'],
                        'note': f"URL returned status code {response.status_code}: {domain}"
                    }
            except Exception as e:
                return {
                    'authority': self.authority_levels['UNVERIFIED'],
                    'note': f"URL verification failed: {str(e)}"
                }
                
        except Exception as e:
            return {
                'authority': self.authority_levels['UNVERIFIED'],
                'note': f"Invalid URL format: {url}"
            }
    
    async def _verify_citation(self, citation):
        """
        Verify a citation
        
        Args:
            citation: Citation to verify
            
        Returns:
            Verification result
        """
        try:
            # Check if citation exists in our database
            result = await self.supabase.table('documents') \
                .select('id, document_type, source_id') \
                .eq('citation', citation) \
                .maybeSingle() \
                .execute()
                
            data = result.data
                
            if data:
                # If the document has a verified source already
                if data.get('source_id'):
                    # Get source information
                    source_result = await self.supabase.table('legal_sources') \
                        .select('*') \
                        .eq('id', data['source_id']) \
                        .maybeSingle() \
                        .execute()
                        
                    source = source_result.data
                        
                    if source:
                        # Map source type to authority level
                        authority_mapping = {
                            'government': self.authority_levels['OFFICIAL_GOVERNMENT'],
                            'publisher': self.authority_levels['LICENSED_PUBLISHER'],
                            'academic': self.authority_levels['VERIFIED_ACADEMIC'],
                            'legal_site': self.authority_levels['RECOGNIZED_LEGAL_SITE']
                        }
                        
                        authority = authority_mapping.get(source['source_type'], self.authority_levels['UNVERIFIED'])
                        
                        return {
                            'authority': authority,
                            'note': f"Citation verified against existing database record from {source['name']}"
                        }
                
                # If the document exists but no verified source
                return {
                    'authority': self.authority_levels['RECOGNIZED_LEGAL_SITE'],
                    'note': f"Citation exists in database but source not verified: {citation}"
                }
            
            # Check if it matches standard citation patterns
            valid_citation_patterns = [
                # Supreme Court citation patterns
                r'^\(\d{4}\)\s+\d+\s+SCC\s+\d+$',
                r'^\d{4}\s+AIR\s+SC\s+\d+$',
                # High Court citation patterns
                r'^\d{4}\s+AIR\s+[A-Z]+\s+\d+$',
                # Law reports
                r'^\[\d{4}\]\s+\d+\s+SCR\s+\d+$'
            ]
            
            for pattern in valid_citation_patterns:
                if re.match(pattern, citation):
                    return {
                        'authority': self.authority_levels['RECOGNIZED_LEGAL_SITE'],
                        'note': f"Citation matches standard format: {citation}"
                    }
            
            return {
                'authority': self.authority_levels['UNVERIFIED'],
                'note': f"Citation not found in database or doesn't match standard formats: {citation}"
            }
            
        except Exception as e:
            print(f"Error verifying citation: {e}")
            return {
                'authority': self.authority_levels['UNVERIFIED'],
                'note': f"Citation verification failed: {str(e)}"
            }
    
    def _verify_source_type(self, source_type):
        """
        Verify based on source type
        
        Args:
            source_type: Source type
            
        Returns:
            Verification result
        """
        type_mapping = {
            'supreme_court': self.authority_levels['OFFICIAL_GOVERNMENT'],
            'high_court': self.authority_levels['OFFICIAL_GOVERNMENT'],
            'district_court': self.authority_levels['OFFICIAL_GOVERNMENT'],
            'tribunal': self.authority_levels['OFFICIAL_GOVERNMENT'],
            'statute': self.authority_levels['OFFICIAL_GOVERNMENT'],
            'regulation': self.authority_levels['OFFICIAL_GOVERNMENT'],
            'gazette': self.authority_levels['OFFICIAL_GOVERNMENT'],
            'legal_publisher': self.authority_levels['LICENSED_PUBLISHER'],
            'academic_journal': self.authority_levels['VERIFIED_ACADEMIC'],
            'legal_blog': self.authority_levels['UNVERIFIED']
        }
        
        authority = type_mapping.get(source_type.lower(), self.authority_levels['UNVERIFIED'])
        
        return {
            'authority': authority,
            'note': f"Source type verification: {source_type}"
        }
    
    async def _store_verification_result(self, document_id, verification_result):
        """
        Store verification result
        
        Args:
            document_id: Document ID
            verification_result: Verification result
            
        Returns:
            None
        """
        try:
            # Store in Supabase
            await self.supabase.table('document_verifications') \
                .upsert({
                    'document_id': document_id,
                    'verified': verification_result['verified'],
                    'authority_level': verification_result['authority_level'],
                    'authority_description': verification_result['authority_description'],
                    'verification_method': verification_result['verification_method'],
                    'verification_notes': verification_result['verification_notes'],
                    'created_at': verification_result['timestamp']
                }) \
                .execute()
            
            # Store in Neo4j if available
            if self.neo4j:
                query = """
                MATCH (d:Document {id: $document_id})
                SET d.verified = $verified,
                    d.authority_level = $authority_level,
                    d.verification_notes = $verification_notes,
                    d.verification_timestamp = $timestamp
                RETURN d
                """
                
                await self.neo4j.execute_query(query, {
                    'document_id': document_id,
                    'verified': verification_result['verified'],
                    'authority_level': verification_result['authority_level'],
                    'verification_notes': verification_result['verification_notes'],
                    'timestamp': verification_result['timestamp']
                })
                
        except Exception as e:
            print(f"Error storing verification result: {e}")
